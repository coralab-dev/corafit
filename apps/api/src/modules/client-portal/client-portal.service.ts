import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import {
  ClientAccessStatus,
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
import type { VerifyPinDto } from './dto/verify-pin.dto';

export type TokenStatusResult = {
  valid: boolean;
  requiresPin: boolean;
  clientName?: string;
  locked?: boolean;
  lockedUntil?: Date | null;
  remainingAttempts?: number;
};

export type VerifyPinResult = {
  success: boolean;
  remainingAttempts: number;
  locked: boolean;
  lockedUntil?: Date | null;
  sessionToken?: string;
};

export type ClientPortalCalendarQuery = {
  date?: string;
};

type CalendarState = 'no_plan' | 'not_started' | 'active' | 'plan_finished' | 'outside_plan';
type ComputedCalendarStatus =
  | 'no_session'
  | 'pending'
  | 'overdue'
  | ClientSessionStatus;

type AssignedPlanWithWeeks = Pick<TrainingPlan, 'id' | 'name' | 'durationWeeks'> & {
  weeks: Array<Pick<TrainingPlanWeek, 'id' | 'weekNumber'> & {
    days: Array<Pick<TrainingPlanDay, 'dayOfWeek' | 'dayOrder' | 'dayType'> & {
      session: Pick<TrainingSession, 'id' | 'name' | 'description' | 'coachNote'> | null;
    }>;
  }>;
};

type CalendarAssignment = ClientTrainingPlanAssignment & {
  assignedPlan: AssignedPlanWithWeeks;
};

type CalendarClient = Client & {
  organization: Pick<Organization, 'timezone'> | null;
};

export type ClientPortalCalendarResult = {
  state: CalendarState;
  timezone: string;
  client: {
    id: string;
    name: string;
  };
  assignment: null | {
    id: string;
    status: string;
    startDate: Date;
    endedAt: Date | null;
    assignedPlan: {
      id: string;
      name: string;
      durationWeeks: number;
    };
  };
  calendar: null | {
    referenceDate: string;
    today: string;
    weekNumber: number;
    weekStartDate: string;
    weekEndDate: string;
    days: Array<{
      date: string;
      dayOfWeek: DayOfWeek;
      dayOrder: number;
      dayType: TrainingDayType;
      status: ComputedCalendarStatus;
      canOpen: boolean;
      session: null | {
        id: string;
        name: string;
        description: string | null;
        coachNote: string | null;
      };
      log: null | {
        id: string;
        status: ClientSessionStatus;
        openedAt: Date;
        completedAt: Date | null;
      };
    }>;
  };
};

type ClientPortalCalendarDay = NonNullable<ClientPortalCalendarResult['calendar']>['days'][number];

export type ClientPortalHomeResult = {
  state: Exclude<CalendarState, 'outside_plan'>;
  timezone: string;
  client: ClientPortalCalendarResult['client'];
  currentPlan: null | {
    assignmentId: string;
    status: string;
    startDate: Date;
    endedAt: Date | null;
    id: string;
    name: string;
    durationWeeks: number;
  };
  week: null | {
    weekNumber: number;
    weekStartDate: string;
    weekEndDate: string;
    summary: {
      totalTrainingSessions: number;
      completedSessions: number;
      pendingSessions: number;
      openedSessions: number;
      restDays: number;
    };
  };
  todaySession: ClientPortalCalendarDay | null;
  nextPendingSession: ClientPortalCalendarDay | null;
  latestSession: ClientPortalCalendarDay | null;
  calendarLink: {
    href: string;
    query: {
      date: string;
    };
  };
};

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RETRY_AFTER_SECONDS = LOCKOUT_MS / 1000;
const DEFAULT_TIMEZONE = 'America/Mexico_City';
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WEEK_DAYS: DayOfWeek[] = [
  DayOfWeek.monday,
  DayOfWeek.tuesday,
  DayOfWeek.wednesday,
  DayOfWeek.thursday,
  DayOfWeek.friday,
  DayOfWeek.saturday,
  DayOfWeek.sunday,
];

@Injectable()
export class ClientPortalService {
  constructor(private readonly prismaService: PrismaService) {}

  getStatus() {
    return { module: 'client-portal', status: 'ready' };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateToken() {
    return randomBytes(32).toString('base64url');
  }

  async getTokenStatus(token: string): Promise<TokenStatusResult> {
    const tokenHash = this.hashToken(token);

    const access = await this.prismaService.clientAccess.findUnique({
      where: { tokenHash },
      include: { client: true },
    });

    if (!access) {
      return { valid: false, requiresPin: false };
    }

    if (access.status === ClientAccessStatus.disabled) {
      return { valid: false, requiresPin: false };
    }

    const now = new Date();
    const isLocked = access.lockedUntil && access.lockedUntil > now;

    return {
      valid: true,
      requiresPin: !isLocked,
      clientName: access.client?.name,
      locked: isLocked || undefined,
      lockedUntil: isLocked ? access.lockedUntil : undefined,
      remainingAttempts: isLocked ? 0 : Math.max(0, MAX_FAILED_ATTEMPTS - access.failedAttempts),
    };
  }

  async getCalendar(
    access: ClientAccess & { client: Client },
    query: ClientPortalCalendarQuery = {},
  ): Promise<ClientPortalCalendarResult> {
    const referenceDate = query.date ? this.parseDateQuery(query.date) : undefined;
    const client = await this.prismaService.client.findUnique({
      where: { id: access.clientId },
      include: { organization: true },
    }) as CalendarClient | null;

    if (!client) {
      throw new UnauthorizedException('Invalid client portal session');
    }

    const timezone = client.organization?.timezone || DEFAULT_TIMEZONE;
    const today = this.toLocalDateKey(this.getCurrentDate(), timezone);
    const effectiveReferenceDate = referenceDate || today;
    const activeAssignment = await this.findCalendarAssignment(
      access.clientId,
      ClientTrainingPlanAssignmentStatus.active,
    );

    if (!activeAssignment) {
      const finishedAssignment = await this.findCalendarAssignment(
        access.clientId,
        ClientTrainingPlanAssignmentStatus.finished,
      );

      return {
        state: finishedAssignment ? 'plan_finished' : 'no_plan',
        timezone,
        client: this.toCalendarClient(client),
        assignment: finishedAssignment ? this.toCalendarAssignment(finishedAssignment) : null,
        calendar: null,
      };
    }

    const assignmentStartDate = this.toLocalDateKey(activeAssignment.startDate, timezone);
    const daysSinceStart = this.daysBetweenDateKeys(assignmentStartDate, effectiveReferenceDate);

    if (daysSinceStart < 0) {
      return {
        state: 'not_started',
        timezone,
        client: this.toCalendarClient(client),
        assignment: this.toCalendarAssignment(activeAssignment),
        calendar: null,
      };
    }

    const weekNumber = Math.floor(daysSinceStart / 7) + 1;
    if (weekNumber > activeAssignment.assignedPlan.durationWeeks) {
      return {
        state: 'plan_finished',
        timezone,
        client: this.toCalendarClient(client),
        assignment: this.toCalendarAssignment(activeAssignment),
        calendar: null,
      };
    }

    const weekStartDate = this.addDaysToDateKey(assignmentStartDate, (weekNumber - 1) * 7);
    const weekEndDate = this.addDaysToDateKey(weekStartDate, 6);
    const logs = await this.prismaService.clientSessionLog.findMany({
      where: {
        clientId: access.clientId,
        assignmentId: activeAssignment.id,
        scheduledDate: {
          gte: this.toScheduledDate(weekStartDate),
          lte: this.toScheduledDate(weekEndDate),
        },
      },
    });
    const logsBySessionAndDate = new Map(
      logs.map((log) => [
        this.getLogKey(log.trainingSessionId, this.toDateKeyFromUtcDate(log.scheduledDate)),
        log,
      ]),
    );
    const planWeek = activeAssignment.assignedPlan.weeks.find(
      (week) => week.weekNumber === weekNumber,
    );
    const planDaysByDayOfWeek = new Map(
      (planWeek?.days || []).map((day) => [day.dayOfWeek, day]),
    );

    return {
      state: 'active',
      timezone,
      client: this.toCalendarClient(client),
      assignment: this.toCalendarAssignment(activeAssignment),
      calendar: {
        referenceDate: effectiveReferenceDate,
        today,
        weekNumber,
        weekStartDate,
        weekEndDate,
        days: WEEK_DAYS.map((dayOfWeek, index) => {
          const date = this.addDaysToDateKey(weekStartDate, index);
          const planDay = planDaysByDayOfWeek.get(dayOfWeek);
          const session = planDay?.session || null;
          const log = session
            ? logsBySessionAndDate.get(this.getLogKey(session.id, date)) || null
            : null;
          const status = this.getCalendarDayStatus(date, today, session, log);
          const canOpen = this.canOpenCalendarDay(date, today, session, log);

          return {
            date,
            dayOfWeek,
            dayOrder: planDay?.dayOrder ?? index + 1,
            dayType: planDay?.dayType ?? TrainingDayType.rest,
            status,
            canOpen,
            session: session
              ? {
                  id: session.id,
                  name: session.name,
                  description: session.description,
                  coachNote: session.coachNote,
                }
              : null,
            log: log
              ? {
                  id: log.id,
                  status: log.status,
                  openedAt: log.openedAt,
                  completedAt: log.completedAt,
                }
              : null,
          };
        }),
      },
    };
  }

  async getHome(
    access: ClientAccess & { client: Client },
    token: string,
  ): Promise<ClientPortalHomeResult> {
    const calendarResult = await this.getCalendar(access);
    const calendarDate = calendarResult.calendar?.today
      ?? this.toLocalDateKey(this.getCurrentDate(), calendarResult.timezone);

    if (!calendarResult.calendar) {
      return {
        state: this.toHomeState(calendarResult.state),
        timezone: calendarResult.timezone,
        client: calendarResult.client,
        currentPlan: this.toHomePlan(calendarResult.assignment),
        week: null,
        todaySession: null,
        nextPendingSession: null,
        latestSession: null,
        calendarLink: this.toCalendarLink(token, calendarDate),
      };
    }

    const days = calendarResult.calendar.days;

    return {
      state: this.toHomeState(calendarResult.state),
      timezone: calendarResult.timezone,
      client: calendarResult.client,
      currentPlan: this.toHomePlan(calendarResult.assignment),
      week: {
        weekNumber: calendarResult.calendar.weekNumber,
        weekStartDate: calendarResult.calendar.weekStartDate,
        weekEndDate: calendarResult.calendar.weekEndDate,
        summary: this.summarizeCalendarWeek(days),
      },
      todaySession: days.find((day) => day.date === calendarResult.calendar?.today) ?? null,
      nextPendingSession: this.findNextPendingSession(days, calendarResult.calendar.today),
      latestSession: this.findLatestSession(days),
      calendarLink: this.toCalendarLink(token, calendarDate),
    };
  }

  async verifyPin(token: string, body: VerifyPinDto): Promise<VerifyPinResult> {
    const pin = this.parsePin(body.pin);
    const tokenHash = this.hashToken(token);

    const access = await this.prismaService.clientAccess.findUnique({
      where: { tokenHash },
      include: { client: true },
    });

    if (!access) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (access.status === ClientAccessStatus.disabled) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const now = new Date();
    if (access.lockedUntil && access.lockedUntil > now) {
      throw new HttpException({
        message: 'Too many failed PIN attempts',
        retryAfter: Math.ceil((access.lockedUntil.getTime() - now.getTime()) / 1000),
        lockedUntil: access.lockedUntil,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    if (!access.pinHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const failedAttempts = access.lockedUntil && access.lockedUntil <= now
      ? 0
      : access.failedAttempts;

    if (failedAttempts !== access.failedAttempts || access.lockedUntil) {
      await this.prismaService.clientAccess.update({
        where: { id: access.id },
        data: { failedAttempts, lockedUntil: null, status: ClientAccessStatus.active },
      });
    }

    const isPinValid = await this.verifyPinHash(pin, access.pinHash);

    if (!isPinValid) {
      const updatedAccess = await this.prismaService.clientAccess.update({
        where: { id: access.id },
        data: {
          failedAttempts: { increment: 1 },
        },
      });
      const shouldLock = updatedAccess.failedAttempts >= MAX_FAILED_ATTEMPTS;
      const lockedUntil = shouldLock
        ? new Date(now.getTime() + LOCKOUT_MS)
        : null;

      if (shouldLock) {
        await this.prismaService.clientAccess.update({
          where: { id: access.id },
          data: {
            lockedUntil,
            status: ClientAccessStatus.temporarily_locked,
          },
        });
        throw new HttpException({
          message: 'Too many failed PIN attempts',
          retryAfter: RETRY_AFTER_SECONDS,
          lockedUntil,
        }, HttpStatus.TOO_MANY_REQUESTS);
      }

      return {
        success: false,
        remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - updatedAccess.failedAttempts),
        locked: shouldLock,
        lockedUntil: lockedUntil || undefined,
      };
    }

    await this.prismaService.clientAccess.update({
      where: { id: access.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        status: ClientAccessStatus.active,
        lastAccessAt: now,
      },
    });

    const sessionToken = this.generateToken();
    await this.prismaService.clientPortalSession.create({
      data: {
        accessId: access.id,
        sessionTokenHash: this.hashToken(sessionToken),
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      },
    });

    return {
      success: true,
      remainingAttempts: MAX_FAILED_ATTEMPTS,
      locked: false,
      sessionToken,
    };
  }

  async logout(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) {
      return;
    }

    await this.prismaService.clientPortalSession.updateMany({
      where: {
        sessionTokenHash: this.hashToken(sessionToken),
        invalidated: false,
      },
      data: { invalidated: true },
    });
  }

  private parsePin(value: unknown) {
    if (typeof value !== 'string' || !/^\d{6}$/.test(value)) {
      throw new BadRequestException('PIN must be 6 digits');
    }

    return value;
  }

  private async findCalendarAssignment(
    clientId: string,
    status: ClientTrainingPlanAssignmentStatus,
  ): Promise<CalendarAssignment | null> {
    return await this.prismaService.clientTrainingPlanAssignment.findFirst({
      where: { clientId, status },
      orderBy: status === ClientTrainingPlanAssignmentStatus.finished
        ? [{ endedAt: 'desc' }, { updatedAt: 'desc' }]
        : { createdAt: 'desc' },
      include: {
        assignedPlan: {
          include: {
            weeks: {
              orderBy: { weekNumber: 'asc' },
              include: {
                days: {
                  orderBy: [{ dayOrder: 'asc' }, { dayOfWeek: 'asc' }],
                  include: { session: true },
                },
              },
            },
          },
        },
      },
    });
  }

  private parseDateQuery(value: string) {
    if (!DATE_KEY_PATTERN.test(value)) {
      throw new BadRequestException('date must use YYYY-MM-DD format');
    }

    const { year, month, day } = this.parseDateKey(value);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new BadRequestException('date must use YYYY-MM-DD format');
    }

    return value;
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
    const start = this.toScheduledDate(startDateKey).getTime();
    const end = this.toScheduledDate(endDateKey).getTime();

    return Math.floor((end - start) / (24 * 60 * 60 * 1000));
  }

  private addDaysToDateKey(dateKey: string, days: number) {
    const date = this.toScheduledDate(dateKey);
    date.setUTCDate(date.getUTCDate() + days);

    return this.toDateKeyFromUtcDate(date);
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

  private getLogKey(trainingSessionId: string, dateKey: string) {
    return `${trainingSessionId}:${dateKey}`;
  }

  private getCalendarDayStatus(
    date: string,
    today: string,
    session: Pick<TrainingSession, 'id'> | null,
    log: ClientSessionLog | null,
  ): ComputedCalendarStatus {
    if (!session) {
      return 'no_session';
    }

    if (log) {
      return log.status;
    }

    return date < today ? 'overdue' : 'pending';
  }

  private canOpenCalendarDay(
    date: string,
    today: string,
    session: Pick<TrainingSession, 'id'> | null,
    log: ClientSessionLog | null,
  ) {
    if (!session || date > today) {
      return false;
    }

    return !(
      log?.status === ClientSessionStatus.completed ||
      log?.status === ClientSessionStatus.partially_completed
    );
  }

  private toCalendarClient(client: Client) {
    return {
      id: client.id,
      name: client.name,
    };
  }

  private toCalendarAssignment(assignment: CalendarAssignment) {
    return {
      id: assignment.id,
      status: assignment.status,
      startDate: assignment.startDate,
      endedAt: assignment.endedAt,
      assignedPlan: {
        id: assignment.assignedPlan.id,
        name: assignment.assignedPlan.name,
        durationWeeks: assignment.assignedPlan.durationWeeks,
      },
    };
  }

  private toHomeState(state: CalendarState): ClientPortalHomeResult['state'] {
    return state === 'outside_plan' ? 'plan_finished' : state;
  }

  private toHomePlan(assignment: ClientPortalCalendarResult['assignment']) {
    if (!assignment) {
      return null;
    }

    return {
      assignmentId: assignment.id,
      status: assignment.status,
      startDate: assignment.startDate,
      endedAt: assignment.endedAt,
      id: assignment.assignedPlan.id,
      name: assignment.assignedPlan.name,
      durationWeeks: assignment.assignedPlan.durationWeeks,
    };
  }

  private summarizeCalendarWeek(days: ClientPortalCalendarDay[]) {
    return days.reduce(
      (summary, day) => {
        if (day.session) {
          summary.totalTrainingSessions += 1;
        }

        if (day.dayType === TrainingDayType.rest) {
          summary.restDays += 1;
        }

        if (
          day.status === ClientSessionStatus.completed ||
          day.status === ClientSessionStatus.partially_completed
        ) {
          summary.completedSessions += 1;
        }

        if (day.status === 'pending' || day.status === 'overdue') {
          summary.pendingSessions += 1;
        }

        if (
          day.status === ClientSessionStatus.opened ||
          day.status === ClientSessionStatus.in_progress
        ) {
          summary.openedSessions += 1;
        }

        return summary;
      },
      {
        totalTrainingSessions: 0,
        completedSessions: 0,
        pendingSessions: 0,
        openedSessions: 0,
        restDays: 0,
      },
    );
  }

  private findNextPendingSession(days: ClientPortalCalendarDay[], today: string) {
    const openableOrUpcoming = days.find(
      (day) =>
        day.session &&
        day.date >= today &&
        (day.status === 'pending' || day.status === 'overdue'),
    );

    return openableOrUpcoming ?? days.find(
      (day) => day.session && (day.status === 'pending' || day.status === 'overdue'),
    ) ?? null;
  }

  private findLatestSession(days: ClientPortalCalendarDay[]) {
    return [...days].reverse().find(
      (day) =>
        day.log &&
        (
          day.log.status === ClientSessionStatus.opened ||
          day.log.status === ClientSessionStatus.in_progress ||
          day.log.status === ClientSessionStatus.completed ||
          day.log.status === ClientSessionStatus.partially_completed
        ),
    ) ?? null;
  }

  private toCalendarLink(token: string, date: string) {
    return {
      href: `/client-portal/${encodeURIComponent(token)}/calendar`,
      query: { date },
    };
  }

  private async verifyPinHash(pin: string, hash: string): Promise<boolean> {
    const { default: argon2 } = await import('argon2');
    try {
      return await argon2.verify(hash, pin);
    } catch {
      return false;
    }
  }
}
