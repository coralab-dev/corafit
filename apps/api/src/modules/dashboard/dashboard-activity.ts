import {
  ClientOperationalStatus,
  ClientSessionStatus,
  ClientTrainingPlanAssignmentStatus,
  DayOfWeek,
  TrainingDayType,
} from 'db';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type CoachAttentionStatus =
  | 'without_plan'
  | 'future_plan'
  | 'plan_finished'
  | 'without_activity'
  | 'at_risk';

type DashboardSession = {
  id: string;
};

type DashboardPlanDay = {
  dayOfWeek: DayOfWeek;
  dayType: TrainingDayType;
  session: DashboardSession | null;
};

type DashboardPlanWeek = {
  weekNumber: number;
  days: DashboardPlanDay[];
};

type DashboardAssignedPlan = {
  id: string;
  name: string;
  durationWeeks: number;
  weeks: DashboardPlanWeek[];
};

export type DashboardAssignment = {
  id: string;
  assignedPlanId: string;
  startDate: Date;
  endedAt: Date | null;
  status: ClientTrainingPlanAssignmentStatus;
  assignedPlan: DashboardAssignedPlan;
};

export type DashboardSessionLog = {
  assignmentId: string;
  trainingSessionId: string;
  scheduledDate: Date;
  status: ClientSessionStatus;
  completedAt: Date | null;
};

export type DashboardClient = {
  id: string;
  name: string;
  operationalStatus: ClientOperationalStatus;
  planAssignments: DashboardAssignment[];
  sessionLogs: DashboardSessionLog[];
};

export type ClassifiedClientActivity = {
  status: CoachAttentionStatus | 'up_to_date' | 'paused' | 'inactive';
  reason: string;
  lastCompletedSessionAt: Date | null;
  nextExpectedSessionDate: string | null;
  currentPlan: {
    assignmentId: string;
    assignedPlanId: string;
    name: string;
    startDate: Date;
  } | null;
};

export type ClientActivityContext = {
  todayKey: string;
  last7StartKey: string;
  last14StartKey: string;
};

export function toLocalDateKey(date: Date, timezone: string) {
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
    throw new Error('Invalid timezone');
  }

  return `${year}-${month}-${day}`;
}

export function addDays(dateKey: string, days: number) {
  const date = toScheduledDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);

  return toDateKeyFromUtcDate(date);
}

export function daysBetween(startDateKey: string, endDateKey: string) {
  return Math.floor(
    (toScheduledDate(endDateKey).getTime() -
      toScheduledDate(startDateKey).getTime()) /
      MS_PER_DAY,
  );
}

export function getCurrentWeekRange(todayKey: string) {
  const day = toScheduledDate(todayKey).getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const start = addDays(todayKey, -daysSinceMonday);

  return {
    start,
    end: addDays(start, 6),
  };
}

export function getExpectedSessionsInRange(
  assignment: DashboardAssignment,
  startDateKey: string,
  endDateKey: string,
) {
  const assignmentStartKey = toDateKeyFromUtcDate(assignment.startDate);
  const rangeStart = startDateKey > assignmentStartKey
    ? startDateKey
    : assignmentStartKey;
  const planEndKey = addDays(
    assignmentStartKey,
    assignment.assignedPlan.durationWeeks * 7 - 1,
  );
  const rangeEnd = endDateKey < planEndKey ? endDateKey : planEndKey;

  if (rangeStart > rangeEnd) {
    return [];
  }

  const expectedSessions: Array<{
    dateKey: string;
    trainingSessionId: string;
  }> = [];

  for (
    let dateKey = rangeStart;
    dateKey <= rangeEnd;
    dateKey = addDays(dateKey, 1)
  ) {
    const session = getExpectedSessionForDate(assignment, dateKey);
    if (session) {
      expectedSessions.push({
        dateKey,
        trainingSessionId: session.id,
      });
    }
  }

  return expectedSessions;
}

export function getLastCompletedSession(logs: DashboardSessionLog[]) {
  return logs
    .filter(isCompletedActivity)
    .sort((a, b) => getActivityDate(b).getTime() - getActivityDate(a).getTime())[0] ??
    null;
}

export function classifyClientActivity(
  client: DashboardClient,
  context: ClientActivityContext,
): ClassifiedClientActivity {
  if (client.operationalStatus === ClientOperationalStatus.paused) {
    return baseClassification(client, 'paused', 'Client is paused.');
  }

  if (client.operationalStatus === ClientOperationalStatus.inactive) {
    return baseClassification(client, 'inactive', 'Client is inactive.');
  }

  const activeAssignment = client.planAssignments.find(
    (assignment) =>
      assignment.status === ClientTrainingPlanAssignmentStatus.active,
  );
  const finishedAssignment = client.planAssignments.find(
    (assignment) =>
      assignment.status === ClientTrainingPlanAssignmentStatus.finished,
  );
  const assignment = activeAssignment ?? finishedAssignment ?? null;
  const lastCompletedSessionAt = getLastCompletedSession(client.sessionLogs);

  if (!assignment) {
    return {
      status: 'without_plan',
      reason: 'Client does not have an active training plan.',
      lastCompletedSessionAt: lastCompletedSessionAt
        ? getActivityDate(lastCompletedSessionAt)
        : null,
      nextExpectedSessionDate: null,
      currentPlan: null,
    };
  }

  const currentPlan = toCurrentPlan(assignment);

  if (assignment.status === ClientTrainingPlanAssignmentStatus.finished) {
    return {
      status: 'plan_finished',
      reason: 'Client latest plan is finished.',
      lastCompletedSessionAt: lastCompletedSessionAt
        ? getActivityDate(lastCompletedSessionAt)
        : null,
      nextExpectedSessionDate: null,
      currentPlan,
    };
  }

  const assignmentStartKey = toDateKeyFromUtcDate(assignment.startDate);

  if (assignmentStartKey > context.todayKey) {
    return {
      status: 'future_plan',
      reason: 'Client plan starts in the future.',
      lastCompletedSessionAt: lastCompletedSessionAt
        ? getActivityDate(lastCompletedSessionAt)
        : null,
      nextExpectedSessionDate: getNextExpectedSessionDate(
        assignment,
        assignmentStartKey,
      ),
      currentPlan,
    };
  }

  if (isBeyondPlanDuration(assignment, context.todayKey)) {
    return {
      status: 'plan_finished',
      reason: 'Client active plan is beyond its configured duration.',
      lastCompletedSessionAt: lastCompletedSessionAt
        ? getActivityDate(lastCompletedSessionAt)
        : null,
      nextExpectedSessionDate: null,
      currentPlan,
    };
  }

  if (hasCompletedActivityInRange(client.sessionLogs, context.last7StartKey, context.todayKey)) {
    return {
      status: 'up_to_date',
      reason: 'Client completed activity in the last 7 days.',
      lastCompletedSessionAt: lastCompletedSessionAt
        ? getActivityDate(lastCompletedSessionAt)
        : null,
      nextExpectedSessionDate: null,
      currentPlan,
    };
  }

  const expectedLast14 = getExpectedSessionsInRange(
    assignment,
    context.last14StartKey,
    context.todayKey,
  );
  const expectedLast7 = getExpectedSessionsInRange(
    assignment,
    context.last7StartKey,
    context.todayKey,
  );

  if (
    expectedLast14.length > 0 &&
    !hasCompletedActivityInRange(
      client.sessionLogs,
      context.last14StartKey,
      context.todayKey,
    )
  ) {
    return {
      status: 'without_activity',
      reason: 'Client has expected sessions but no completed activity in the last 14 days.',
      lastCompletedSessionAt: lastCompletedSessionAt
        ? getActivityDate(lastCompletedSessionAt)
        : null,
      nextExpectedSessionDate: expectedLast14[0]?.dateKey ?? null,
      currentPlan,
    };
  }

  if (expectedLast7.length > 0) {
    return {
      status: 'at_risk',
      reason: 'Client has expected sessions but no completed activity in the last 7 days.',
      lastCompletedSessionAt: lastCompletedSessionAt
        ? getActivityDate(lastCompletedSessionAt)
        : null,
      nextExpectedSessionDate: expectedLast7[0]?.dateKey ?? null,
      currentPlan,
    };
  }

  return {
    status: 'up_to_date',
    reason: 'Client has no overdue expected sessions.',
    lastCompletedSessionAt: lastCompletedSessionAt
      ? getActivityDate(lastCompletedSessionAt)
      : null,
    nextExpectedSessionDate: null,
    currentPlan,
  };
}

export function toScheduledDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

export function toDateKeyFromUtcDate(date: Date) {
  const year = date.getUTCFullYear().toString().padStart(4, '0');
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getExpectedSessionForDate(
  assignment: DashboardAssignment,
  dateKey: string,
) {
  const assignmentStartDate = toDateKeyFromUtcDate(assignment.startDate);
  const daysSinceStart = daysBetween(assignmentStartDate, dateKey);

  if (daysSinceStart < 0) {
    return null;
  }

  const weekNumber = Math.floor(daysSinceStart / 7) + 1;
  if (weekNumber > assignment.assignedPlan.durationWeeks) {
    return null;
  }

  const dayOfWeek = getDayOfWeekFromDateKey(dateKey);
  const planWeek = assignment.assignedPlan.weeks.find(
    (week) => week.weekNumber === weekNumber,
  );
  const planDay = planWeek?.days.find(
    (day) =>
      day.dayOfWeek === dayOfWeek &&
      day.dayType === TrainingDayType.training,
  );

  return planDay?.session ?? null;
}

function getDayOfWeekFromDateKey(dateKey: string): DayOfWeek {
  const day = toScheduledDate(dateKey).getUTCDay();
  const map: Record<number, DayOfWeek> = {
    0: DayOfWeek.sunday,
    1: DayOfWeek.monday,
    2: DayOfWeek.tuesday,
    3: DayOfWeek.wednesday,
    4: DayOfWeek.thursday,
    5: DayOfWeek.friday,
    6: DayOfWeek.saturday,
  };

  return map[day];
}

function baseClassification(
  client: DashboardClient,
  status: 'paused' | 'inactive',
  reason: string,
): ClassifiedClientActivity {
  const lastCompletedSessionAt = getLastCompletedSession(client.sessionLogs);

  return {
    status,
    reason,
    lastCompletedSessionAt: lastCompletedSessionAt
      ? getActivityDate(lastCompletedSessionAt)
      : null,
    nextExpectedSessionDate: null,
    currentPlan: null,
  };
}

function toCurrentPlan(assignment: DashboardAssignment) {
  return {
    assignmentId: assignment.id,
    assignedPlanId: assignment.assignedPlanId,
    name: assignment.assignedPlan.name,
    startDate: assignment.startDate,
  };
}

function isBeyondPlanDuration(
  assignment: DashboardAssignment,
  todayKey: string,
) {
  const assignmentStartKey = toDateKeyFromUtcDate(assignment.startDate);
  const daysSinceStart = daysBetween(assignmentStartKey, todayKey);

  return daysSinceStart >= assignment.assignedPlan.durationWeeks * 7;
}

function hasCompletedActivityInRange(
  logs: DashboardSessionLog[],
  startDateKey: string,
  endDateKey: string,
) {
  return logs.some((log) => {
    if (!isCompletedActivity(log)) {
      return false;
    }

    const dateKey = toDateKeyFromUtcDate(log.scheduledDate);

    return dateKey >= startDateKey && dateKey <= endDateKey;
  });
}

function isCompletedActivity(log: DashboardSessionLog) {
  return (
    log.status === ClientSessionStatus.completed ||
    log.status === ClientSessionStatus.partially_completed
  );
}

function getActivityDate(log: DashboardSessionLog) {
  return log.completedAt ?? log.scheduledDate;
}

function getNextExpectedSessionDate(
  assignment: DashboardAssignment,
  startDateKey: string,
) {
  const expected = getExpectedSessionsInRange(
    assignment,
    startDateKey,
    addDays(startDateKey, assignment.assignedPlan.durationWeeks * 7 - 1),
  );

  return expected[0]?.dateKey ?? null;
}
