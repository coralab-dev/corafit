import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ClientSessionStatus,
  ClientTrainingPlanAssignmentStatus,
  DayOfWeek,
  TrainingDayType,
  type Client,
  type ClientAccess,
  type ClientSessionLog,
  type ClientTrainingPlanAssignment,
  type Organization,
  type TrainingPlan,
  type TrainingPlanDay,
  type TrainingPlanWeek,
  type TrainingSession,
} from 'db';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ClientSessionSnapshotService,
  type ClientSessionSnapshotProgress,
  type ClientSessionSnapshotV1,
} from './client-session-snapshot.service';

export type OpenClientSessionLogDto = {
  scheduledDate: string;
  trainingSessionId: string;
};

export type CompleteClientSessionExerciseDto = {
  sessionExerciseId: string;
};

export type UseClientSessionAlternativeDto = {
  alternativeId: string;
  sessionExerciseId: string;
};

type AssignmentWithPlan = ClientTrainingPlanAssignment & {
  assignedPlan: Pick<TrainingPlan, 'id' | 'durationWeeks' | 'name'> & {
    weeks: Array<Pick<TrainingPlanWeek, 'weekNumber'> & {
      days: Array<Pick<TrainingPlanDay, 'dayOfWeek' | 'dayType'> & {
        session: Pick<TrainingSession, 'id'> | null;
      }>;
    }>;
  };
};

type ClientWithOrganization = Client & {
  organization: Pick<Organization, 'timezone'> | null;
};

type LogWithSnapshot = Omit<ClientSessionLog, 'snapshotData'> & {
  snapshotData: ClientSessionSnapshotV1;
};

export type ClientSessionCompletionCard = {
  sessionName: string;
  scheduledDate: string;
  status: ClientSessionStatus;
  completedExercises: number;
  totalExercises: number;
  completionPercentage: number;
  streak: number;
};

const DEFAULT_TIMEZONE = 'America/Mexico_City';
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
@Injectable()
export class ClientSessionLogsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly snapshotService: ClientSessionSnapshotService,
  ) {}

  async openSession(
    access: ClientAccess & { client: Client },
    body: OpenClientSessionLogDto,
  ): Promise<LogWithSnapshot> {
    const trainingSessionId = this.parseRequiredString(body.trainingSessionId, 'trainingSessionId');
    const scheduledDateKey = this.parseDateKeyInput(body.scheduledDate, 'scheduledDate');
    const client = await this.getClient(access.clientId);
    const timezone = client.organization?.timezone || DEFAULT_TIMEZONE;
    const today = this.toLocalDateKey(this.getCurrentDate(), timezone);

    if (scheduledDateKey > today) {
      throw new BadRequestException('Cannot open a future session');
    }

    const assignment = await this.getActiveAssignment(access.clientId);
    const scheduledSession = this.findScheduledSession(assignment, scheduledDateKey, timezone);

    if (!scheduledSession || scheduledSession.id !== trainingSessionId) {
      throw new BadRequestException('Training session is not scheduled for this date');
    }

    const scheduledDate = this.toScheduledDate(scheduledDateKey);
    const existingLog = await this.prismaService.clientSessionLog.findFirst({
      where: {
        clientId: access.clientId,
        assignmentId: assignment.id,
        trainingSessionId,
        scheduledDate,
      },
    });

    if (existingLog) {
      return this.serializeLog(existingLog);
    }

    const snapshot = await this.snapshotService.buildSnapshotForSession(trainingSessionId);
    const createdLog = await this.prismaService.clientSessionLog.create({
      data: {
        clientId: access.clientId,
        assignmentId: assignment.id,
        trainingSessionId,
        scheduledDate,
        status: ClientSessionStatus.opened,
        snapshotData: snapshot,
      },
    });

    return this.serializeLog(createdLog);
  }

  async getSessionLog(
    access: ClientAccess & { client: Client },
    logId: string,
  ): Promise<LogWithSnapshot> {
    const log = await this.getClientLog(access.clientId, logId);

    return this.serializeLog(log);
  }

  async completeExercise(
    access: ClientAccess & { client: Client },
    logId: string,
    body: CompleteClientSessionExerciseDto,
  ): Promise<LogWithSnapshot> {
    const sessionExerciseId = this.parseRequiredString(
      body.sessionExerciseId,
      'sessionExerciseId',
    );
    const log = await this.getMutableClientLog(access.clientId, logId);
    const snapshot = this.snapshotService.parseSnapshotData(log.snapshotData);
    const exercise = snapshot.exercises.find(
      (snapshotExercise) => snapshotExercise.sessionExerciseId === sessionExerciseId,
    );

    if (!exercise) {
      throw new BadRequestException('Exercise does not exist in this session snapshot');
    }

    const progress = this.getProgress(snapshot);
    if (!progress.completedExerciseIds.includes(sessionExerciseId)) {
      progress.completedExerciseIds.push(sessionExerciseId);
    }

    return this.updateProgress(log, snapshot, progress);
  }

  async useAlternative(
    access: ClientAccess & { client: Client },
    logId: string,
    body: UseClientSessionAlternativeDto,
  ): Promise<LogWithSnapshot> {
    const sessionExerciseId = this.parseRequiredString(
      body.sessionExerciseId,
      'sessionExerciseId',
    );
    const alternativeId = this.parseRequiredString(body.alternativeId, 'alternativeId');
    const log = await this.getMutableClientLog(access.clientId, logId);
    const snapshot = this.snapshotService.parseSnapshotData(log.snapshotData);
    const exercise = snapshot.exercises.find(
      (snapshotExercise) => snapshotExercise.sessionExerciseId === sessionExerciseId,
    );
    const alternative = exercise?.alternatives.find(
      (snapshotAlternative) => snapshotAlternative.id === alternativeId,
    );

    if (!exercise || !alternative) {
      throw new BadRequestException('Alternative does not exist in this session snapshot');
    }

    const progress = this.getProgress(snapshot);
    progress.usedAlternatives = progress.usedAlternatives.filter(
      (usedAlternative) => usedAlternative.sessionExerciseId !== sessionExerciseId,
    );
    progress.usedAlternatives.push({
      sessionExerciseId,
      alternativeId,
      alternativeExerciseId: alternative.alternativeExerciseId,
    });

    return this.updateProgress(log, snapshot, progress);
  }

  async finalizeSession(
    access: ClientAccess & { client: Client },
    logId: string,
  ): Promise<LogWithSnapshot> {
    const log = await this.getMutableClientLog(access.clientId, logId);
    const snapshot = this.snapshotService.parseSnapshotData(log.snapshotData);
    const progress = this.getProgress(snapshot);
    const totalExercises = snapshot.exercises.length;
    const completedExercises = progress.completedExerciseIds.length;

    if (completedExercises === 0) {
      throw new BadRequestException('Cannot finalize a session without completed exercises');
    }

    const status = completedExercises >= totalExercises
      ? ClientSessionStatus.completed
      : ClientSessionStatus.partially_completed;
    const updatedLog = await this.prismaService.clientSessionLog.update({
      where: { id: log.id },
      data: {
        status,
        completedAt: this.getCurrentDate(),
      },
    });

    return this.serializeLog(updatedLog);
  }

  async getCompletionCard(
    access: ClientAccess & { client: Client },
    logId: string,
  ): Promise<ClientSessionCompletionCard> {
    const log = await this.getClientLog(access.clientId, logId);
    const snapshot = this.snapshotService.parseSnapshotData(log.snapshotData);
    const progress = this.getProgress(snapshot);
    const totalExercises = snapshot.exercises.length;
    const completedExercises = progress.completedExerciseIds.length;
    const completionPercentage = totalExercises === 0
      ? 0
      : Math.round((completedExercises / totalExercises) * 100);
    const completedLogs = await this.prismaService.clientSessionLog.findMany({
      where: {
        clientId: access.clientId,
        assignmentId: log.assignmentId,
      },
      orderBy: { scheduledDate: 'desc' },
    });

    return {
      sessionName: snapshot.session.name,
      scheduledDate: this.toDateKeyFromUtcDate(log.scheduledDate),
      status: log.status,
      completedExercises,
      totalExercises,
      completionPercentage,
      streak: this.calculateCompletedStreak(completedLogs),
    };
  }

  private async getClient(clientId: string): Promise<ClientWithOrganization> {
    const client = await this.prismaService.client.findUnique({
      where: { id: clientId },
      include: { organization: true },
    });

    if (!client) {
      throw new UnauthorizedException('Invalid client portal session');
    }

    return client;
  }

  private async getActiveAssignment(clientId: string): Promise<AssignmentWithPlan> {
    const assignment = await this.prismaService.clientTrainingPlanAssignment.findFirst({
      where: {
        clientId,
        status: ClientTrainingPlanAssignmentStatus.active,
      },
      include: {
        assignedPlan: {
          include: {
            weeks: {
              orderBy: { weekNumber: 'asc' },
              include: {
                days: {
                  orderBy: [{ dayOfWeek: 'asc' }],
                  include: { session: true },
                },
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new BadRequestException('Client does not have an active plan');
    }

    return assignment;
  }

  private async getClientLog(clientId: string, logId: string) {
    const log = await this.prismaService.clientSessionLog.findFirst({
      where: {
        id: logId,
        clientId,
      },
    });

    if (!log) {
      throw new NotFoundException('Session log was not found');
    }

    return log;
  }

  private async getMutableClientLog(clientId: string, logId: string) {
    const log = await this.getClientLog(clientId, logId);

    if (this.isFinalizedStatus(log.status)) {
      throw new ForbiddenException('Session log cannot be modified after finalization');
    }

    return log;
  }

  private findScheduledSession(
    assignment: AssignmentWithPlan,
    scheduledDateKey: string,
    timezone: string,
  ) {
    const assignmentStartDate = this.toLocalDateKey(assignment.startDate, timezone);
    const daysSinceStart = this.daysBetweenDateKeys(assignmentStartDate, scheduledDateKey);

    if (daysSinceStart < 0) {
      throw new BadRequestException('Plan has not started');
    }

    const weekNumber = Math.floor(daysSinceStart / 7) + 1;
    if (weekNumber > assignment.assignedPlan.durationWeeks) {
      throw new BadRequestException('Plan has already finished');
    }

    const dayOfWeek = this.getDayOfWeekFromDateKey(scheduledDateKey);
    const planWeek = assignment.assignedPlan.weeks.find((week) => week.weekNumber === weekNumber);
    const planDay = planWeek?.days.find(
      (day) => day.dayOfWeek === dayOfWeek && day.dayType === TrainingDayType.training,
    );

    return planDay?.session || null;
  }

  private updateProgress(
    log: ClientSessionLog,
    snapshot: ClientSessionSnapshotV1,
    progress: ClientSessionSnapshotProgress,
  ): Promise<LogWithSnapshot> {
    const updatedSnapshot = {
      ...snapshot,
      progress,
    };

    return this.prismaService.clientSessionLog.update({
      where: { id: log.id },
      data: {
        snapshotData: updatedSnapshot,
        status: log.status === ClientSessionStatus.opened
          ? ClientSessionStatus.in_progress
          : log.status,
      },
    }).then((updatedLog) => this.serializeLog(updatedLog));
  }

  private serializeLog(log: ClientSessionLog): LogWithSnapshot {
    return {
      ...log,
      snapshotData: this.snapshotService.parseSnapshotData(log.snapshotData),
    };
  }

  private getProgress(snapshot: ClientSessionSnapshotV1): ClientSessionSnapshotProgress {
    return {
      completedExerciseIds: [...(snapshot.progress?.completedExerciseIds || [])],
      usedAlternatives: (snapshot.progress?.usedAlternatives || []).map((alternative) => ({
        sessionExerciseId: alternative.sessionExerciseId,
        alternativeId: alternative.alternativeId,
        alternativeExerciseId: alternative.alternativeExerciseId,
      })),
    };
  }

  private calculateCompletedStreak(logs: ClientSessionLog[]) {
    const orderedLogs = [...logs].sort(
      (a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime(),
    );
    let streak = 0;

    for (const log of orderedLogs) {
      if (log.status !== ClientSessionStatus.completed) {
        break;
      }
      streak += 1;
    }

    return streak;
  }

  private isFinalizedStatus(status: ClientSessionStatus) {
    return (
      status === ClientSessionStatus.completed ||
      status === ClientSessionStatus.partially_completed
    );
  }

  private parseRequiredString(value: unknown, field: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} is required`);
    }

    return value.trim();
  }

  private parseDateKeyInput(value: unknown, field: string) {
    const dateKey = this.parseRequiredString(value, field);

    if (!DATE_KEY_PATTERN.test(dateKey)) {
      throw new BadRequestException(`${field} must use YYYY-MM-DD format`);
    }

    const { year, month, day } = this.parseDateKey(dateKey);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new BadRequestException(`${field} must use YYYY-MM-DD format`);
    }

    return dateKey;
  }

  private getCurrentDate() {
    return new Date();
  }

  private toLocalDateKey(date: Date, timezone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (!year || !month || !day) {
      throw new BadRequestException('Invalid organization timezone');
    }

    return `${year}-${month}-${day}`;
  }

  private parseDateKey(dateKey: string) {
    const [year, month, day] = dateKey.split('-').map(Number);

    return { year, month, day };
  }

  private daysBetweenDateKeys(startDateKey: string, endDateKey: string) {
    return Math.floor(
      (this.toScheduledDate(endDateKey).getTime() - this.toScheduledDate(startDateKey).getTime()) /
        MS_PER_DAY,
    );
  }

  private toScheduledDate(dateKey: string) {
    const { year, month, day } = this.parseDateKey(dateKey);

    return new Date(Date.UTC(year, month - 1, day));
  }

  private toDateKeyFromUtcDate(date: Date) {
    const year = date.getUTCFullYear().toString().padStart(4, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getDayOfWeekFromDateKey(dateKey: string) {
    const day = this.toScheduledDate(dateKey).getUTCDay();
    const days: Record<number, DayOfWeek> = {
      0: DayOfWeek.sunday,
      1: DayOfWeek.monday,
      2: DayOfWeek.tuesday,
      3: DayOfWeek.wednesday,
      4: DayOfWeek.thursday,
      5: DayOfWeek.friday,
      6: DayOfWeek.saturday,
    };

    return days[day];
  }
}
