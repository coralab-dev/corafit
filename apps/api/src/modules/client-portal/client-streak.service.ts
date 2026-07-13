import { Injectable } from '@nestjs/common';
import {
  ClientSessionStatus,
  DayOfWeek,
  TrainingDayType,
  type ClientTrainingPlanAssignment,
  type TrainingPlan,
  type TrainingPlanDay,
  type TrainingPlanWeek,
  type TrainingSession,
} from 'db';
import { PrismaService } from '../../common/prisma/prisma.service';

export type ClientStreakAssignment = ClientTrainingPlanAssignment & {
  assignedPlan: Pick<TrainingPlan, 'durationWeeks'> & {
    weeks: Array<Pick<TrainingPlanWeek, 'weekNumber'> & {
      days: Array<Pick<TrainingPlanDay, 'dayOfWeek' | 'dayType'> & {
        session: Pick<TrainingSession, 'id'> | null;
      }>;
    }>;
  };
};

type ScheduledStreakSession = {
  date: string;
  trainingSessionId: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class ClientStreakService {
  constructor(private readonly prismaService: PrismaService) {}

  async getCurrentStreak({
    anchorDate,
    assignment,
    clientId,
  }: {
    anchorDate: string;
    assignment: ClientStreakAssignment;
    clientId: string;
  }) {
    const scheduledSessions = this.buildScheduledSessions(assignment, anchorDate);
    if (scheduledSessions.length === 0) return 0;

    const logs = await this.prismaService.clientSessionLog.findMany({
      where: {
        assignmentId: assignment.id,
        clientId,
        scheduledDate: {
          gte: this.toScheduledDate(this.toDateKeyFromUtcDate(assignment.startDate)),
          lte: this.toScheduledDate(anchorDate),
        },
      },
    });
    const logsBySessionAndDate = new Map(
      logs.filter((log) => log.assignmentId === assignment.id && log.clientId === clientId).map((log) => [
        this.getLogKey(log.trainingSessionId, this.toDateKeyFromUtcDate(log.scheduledDate)),
        log,
      ]),
    );
    let streak = 0;

    for (const session of [...scheduledSessions].reverse()) {
      const log = logsBySessionAndDate.get(this.getLogKey(
        session.trainingSessionId,
        session.date,
      ));
      const status = log?.status;
      const isToday = session.date === anchorDate;
      const isUnfinishedToday = isToday && (
        !log ||
        status === ClientSessionStatus.opened ||
        status === ClientSessionStatus.in_progress
      );

      if (isUnfinishedToday) continue;
      if (status !== ClientSessionStatus.completed) break;

      streak += 1;
    }

    return streak;
  }

  private buildScheduledSessions(
    assignment: ClientStreakAssignment,
    anchorDate: string,
  ): ScheduledStreakSession[] {
    const assignmentStartDate = this.toDateKeyFromUtcDate(assignment.startDate);
    const lastPlanDate = this.addDaysToDateKey(
      assignmentStartDate,
      assignment.assignedPlan.durationWeeks * 7 - 1,
    );
    const endDate = anchorDate < lastPlanDate ? anchorDate : lastPlanDate;
    const totalDays = this.daysBetweenDateKeys(assignmentStartDate, endDate);

    if (totalDays < 0) return [];

    const sessions: ScheduledStreakSession[] = [];

    for (let offset = 0; offset <= totalDays; offset += 1) {
      const date = this.addDaysToDateKey(assignmentStartDate, offset);
      const weekNumber = Math.floor(offset / 7) + 1;
      const dayOfWeek = this.getDayOfWeekFromDateKey(date);
      const planWeek = assignment.assignedPlan.weeks.find(
        (week) => week.weekNumber === weekNumber,
      );
      const planDay = planWeek?.days.find(
        (day) => day.dayOfWeek === dayOfWeek && day.dayType === TrainingDayType.training,
      );

      if (planDay?.session) {
        sessions.push({
          date,
          trainingSessionId: planDay.session.id,
        });
      }
    }

    return sessions;
  }

  private getLogKey(trainingSessionId: string, date: string) {
    return `${trainingSessionId}:${date}`;
  }

  private addDaysToDateKey(dateKey: string, days: number) {
    const date = this.toScheduledDate(dateKey);
    date.setUTCDate(date.getUTCDate() + days);

    return this.toDateKeyFromUtcDate(date);
  }

  private daysBetweenDateKeys(startDateKey: string, endDateKey: string) {
    return Math.floor(
      (this.toScheduledDate(endDateKey).getTime() - this.toScheduledDate(startDateKey).getTime()) /
        MS_PER_DAY,
    );
  }

  private toScheduledDate(dateKey: string) {
    const [year, month, day] = dateKey.split('-').map(Number);

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
