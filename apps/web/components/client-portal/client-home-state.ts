import type { ClientPortalDay, ClientPortalHome } from "@/lib/client-portal/api";

export type ClientHomePlanView =
  | {
      kind: "no_plan";
      title: string;
      description: string;
      actions: [];
    }
  | {
      kind: "not_started";
      title: string;
      description: string;
      planName: string;
      durationLabel: string;
      startDateLabel: string;
      actions: ["profile"] | [];
    }
  | {
      kind: "plan_finished";
      title: string;
      description: string;
      actions: Array<"progress" | "calendar">;
    }
  | {
      kind: "active";
    };

export type ClientHomeHeroView = {
  actionLabel: string;
  day: ClientPortalDay;
  detail: string;
  eyebrow: string;
  sessionName: string;
  title: string;
};

export type ClientHomeWeekView = {
  completedSessions: number;
  completionPercent: number;
  currentStreak: number;
  days: ClientHomeWeekDayView[];
  openedSessions: number;
  pendingLabel: string;
  pendingSessions: number;
  rangeLabel: string;
  progressLabel: string;
  restDays: number;
  totalTrainingSessions: number;
  weekLabel: string;
};

export type ClientHomeWeekDayView = {
  date: string;
  dayLabel: string;
  dateNumber: string;
  sessionName: string;
  statusLabel: string;
  tone:
    | "rest"
    | "pending"
    | "upcoming"
    | "overdue"
    | "active"
    | "completed"
    | "partial";
  isToday: boolean;
  isRest: boolean;
};

export type ClientHomeNextActivityView = {
  dateLabel: string;
  day: ClientPortalDay;
  sessionName: string;
};

export type ClientHomeViewModel = {
  clientFirstName: string;
  emptyNextActivityMessage: string | null;
  hero: ClientHomeHeroView | null;
  hideCalendarNav: boolean;
  nextActivity: ClientHomeNextActivityView | null;
  plan: ClientHomePlanView;
  week: ClientHomeWeekView | null;
};

export type ClientHomeSessionAction =
  | {
      kind: "none";
    }
  | {
      kind: "existing-log";
      href: string;
    }
  | {
      kind: "preview";
      href: string;
    }
  | {
      kind: "open";
    };

export function buildClientHomeViewModel(
  data: ClientPortalHome,
  options: {
    activeSessionProgress?: {
      completedExercises: number;
      sessionLogId: string;
      totalExercises: number;
    };
  } = {},
): ClientHomeViewModel {
  const plan = buildPlanView(data);
  const hero = data.state === "active" ? buildHero(data, options) : null;
  const nextActivity = buildNextActivity(data, hero?.day ?? null);

  return {
    clientFirstName: firstName(data.client.name),
    emptyNextActivityMessage: null,
    hero,
    hideCalendarNav: data.state === "no_plan",
    nextActivity,
    plan,
    week: data.state === "active" ? buildWeekView(data) : null,
  };
}

export function getClientHomeSessionAction({
  day,
  token,
}: {
  day: ClientPortalDay | null;
  token: string;
}): ClientHomeSessionAction {
  if (!day?.session) return { kind: "none" };
  if (day.log) {
    return {
      href: `/c/${encodeURIComponent(token)}/session/${encodeURIComponent(day.log.id)}`,
      kind: "existing-log",
    };
  }
  if (!day.canOpen) {
    return {
      href: `/c/${encodeURIComponent(token)}/session-preview?date=${encodeURIComponent(day.date)}&session=${encodeURIComponent(day.session.id)}`,
      kind: "preview",
    };
  }
  return { kind: "open" };
}

function buildPlanView(data: ClientPortalHome): ClientHomePlanView {
  if (data.state === "no_plan") {
    return {
      actions: [],
      description:
        "Cuando este listo, aqui veras tu proxima sesion y tu avance semanal.",
      kind: "no_plan",
      title: "Tu coach esta preparando tu plan",
    };
  }

  if (data.state === "not_started") {
    const startDateLabel = data.currentPlan?.startDate
      ? formatLongDate(data.currentPlan.startDate)
      : "la fecha indicada por tu coach";
    return {
      actions: ["profile"],
      description: `Tu plan comienza el ${startDateLabel}.`,
      durationLabel: `${data.currentPlan?.durationWeeks ?? 0} semanas`,
      kind: "not_started",
      planName: data.currentPlan?.name ?? "Tu plan",
      startDateLabel,
      title: `Tu plan comienza el ${startDateLabel}`,
    };
  }

  if (data.state === "plan_finished") {
    const planName = data.currentPlan?.name ?? "tu plan";
    return {
      actions: ["progress", "calendar"],
      description: `Terminaste ${planName}.`,
      kind: "plan_finished",
      title: "Plan completado",
    };
  }

  return {
    kind: "active",
  };
}

function buildHero(
  data: ClientPortalHome,
  options: {
    activeSessionProgress?: {
      completedExercises: number;
      sessionLogId: string;
      totalExercises: number;
    };
  },
): ClientHomeHeroView | null {
  const today = data.todaySession;

  if (today?.session && isFinalized(today.log?.status ?? today.status)) {
    return {
      actionLabel: "Ver entrenamiento",
      day: today,
      detail: "Completaste tu sesion de hoy",
      eyebrow: "Entrenamiento completado",
      sessionName: today.session.name,
      title: today.session.name,
    };
  }

  if (today?.session && isActive(today.log?.status ?? today.status)) {
    const progress =
      options.activeSessionProgress?.sessionLogId === today.log?.id
        ? options.activeSessionProgress
        : null;
    return {
      actionLabel: "Continuar entrenamiento",
      day: today,
      detail: progress
        ? `${progress.completedExercises} de ${progress.totalExercises} ejercicios completados`
        : "Entrenamiento en progreso",
      eyebrow: "Continua tu entrenamiento",
      sessionName: today.session.name,
      title: today.session.name,
    };
  }

  if (today?.session) {
    return {
      actionLabel: "Comenzar entrenamiento",
      day: today,
      detail: `${statusLabel(today.status)} · Hoy`,
      eyebrow: "Entrenamiento de hoy",
      sessionName: today.session.name,
      title: today.session.name,
    };
  }

  if (data.nextPendingSession?.session) {
    return {
      actionLabel: "Ver proximo entrenamiento",
      day: data.nextPendingSession,
      detail: formatLongDate(data.nextPendingSession.date, {
        capitalizeFirst: true,
      }),
      eyebrow: "Hoy toca recuperacion",
      sessionName: data.nextPendingSession.session.name,
      title: `Tu proximo entrenamiento es ${data.nextPendingSession.session.name}`,
    };
  }

  return null;
}

function buildWeekView(data: ClientPortalHome): ClientHomeWeekView | null {
  if (!data.week) return null;

  const summary = data.week.summary;
  const completionPercent = summary.totalTrainingSessions
    ? Math.round(
        (summary.completedSessions / summary.totalTrainingSessions) * 100,
      )
    : 0;

  return {
    completedSessions: summary.completedSessions,
    completionPercent,
    currentStreak: calculateCurrentStreak(
      data.week.days,
      data.todaySession?.date ?? null,
    ),
    days: data.week.days.map((day) =>
      buildWeekDayView(day, data.todaySession?.date ?? null),
    ),
    openedSessions: summary.openedSessions,
    pendingLabel: `${summary.pendingSessions} ${plural(summary.pendingSessions, "pendiente", "pendientes")} · ${summary.restDays} ${plural(summary.restDays, "dia", "dias")} de descanso`,
    pendingSessions: summary.pendingSessions,
    progressLabel: `${summary.completedSessions} de ${summary.totalTrainingSessions} sesiones completadas`,
    rangeLabel: formatWeekRange(data.week.weekStartDate, data.week.weekEndDate),
    restDays: summary.restDays,
    totalTrainingSessions: summary.totalTrainingSessions,
    weekLabel: `Semana ${data.week.weekNumber}`,
  };
}

function buildWeekDayView(
  day: ClientPortalDay,
  todayDate: string | null,
): ClientHomeWeekDayView {
  const status = day.log?.status ?? day.status;
  const isRest = !day.session || day.status === "no_session";

  return {
    date: day.date,
    dateNumber: day.date.slice(-2),
    dayLabel: shortWeekday(day.dayOfWeek),
    isRest,
    isToday: day.date === todayDate,
    sessionName: day.session?.name ?? "Descanso",
    statusLabel: weekDayStatusLabel(day, status),
    tone: weekDayTone(day, status),
  };
}

function weekDayStatusLabel(day: ClientPortalDay, status: string) {
  if (!day.session || day.status === "no_session") return "Descanso";
  if (status === "completed") return "Completada";
  if (status === "partially_completed") return "Parcial";
  if (status === "opened" || status === "in_progress") return "En curso";
  if (status === "overdue") return "Atrasada";
  if (status === "pending" && day.canOpen) return "Pendiente";
  return "Proxima";
}

function weekDayTone(
  day: ClientPortalDay,
  status: string,
): ClientHomeWeekDayView["tone"] {
  if (!day.session || day.status === "no_session") return "rest";
  if (status === "completed") return "completed";
  if (status === "partially_completed") return "partial";
  if (status === "opened" || status === "in_progress") return "active";
  if (status === "overdue") return "overdue";
  if (status === "pending" && day.canOpen) return "pending";
  return "upcoming";
}

function calculateCurrentStreak(
  days: ClientPortalDay[],
  todayDate: string | null,
) {
  if (!todayDate) return 0;

  const visibleDays = [...days]
    .filter((day) => day.date <= todayDate)
    .sort((left, right) => left.date.localeCompare(right.date));

  const anchorIndex = visibleDays.findLastIndex(
    (day) => day.session && isFinalized(day.log?.status ?? day.status),
  );

  if (anchorIndex < 0) return 0;

  let streak = 0;

  for (let index = anchorIndex; index >= 0; index -= 1) {
    const day = visibleDays[index];

    if (!day?.session || day.status === "no_session") continue;

    const status = day.log?.status ?? day.status;
    if (!isFinalized(status)) break;

    streak += 1;
  }

  return streak;
}

function buildNextActivity(
  data: ClientPortalHome,
  heroDay: ClientPortalDay | null,
): ClientHomeNextActivityView | null {
  const next = data.nextPendingSession;
  if (!next?.session) return null;
  if (heroDay && sameSessionDate(heroDay, next)) return null;

  return {
    dateLabel: `${shortWeekdayDate(next)} · ${next.session.name}`,
    day: next,
    sessionName: next.session.name,
  };
}

function sameSessionDate(left: ClientPortalDay, right: ClientPortalDay) {
  return left.date === right.date && left.session?.id === right.session?.id;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function isActive(status?: string) {
  return status === "opened" || status === "in_progress";
}

function isFinalized(status?: string) {
  return status === "completed" || status === "partially_completed";
}

function statusLabel(status: string) {
  if (status === "overdue") return "Atrasado";
  if (status === "opened") return "Abierto";
  if (status === "in_progress") return "En progreso";
  if (status === "completed") return "Completado";
  return "Pendiente";
}

function formatLongDate(
  date: string,
  options: { capitalizeFirst?: boolean } = {},
) {
  const formatted = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
  })
    .format(new Date(`${date}T00:00:00.000Z`))
    .replace(",", "");

  return options.capitalizeFirst ? capitalize(formatted) : formatted;
}

function shortWeekdayDate(day: ClientPortalDay) {
  return `${shortWeekday(day.dayOfWeek)} ${Number(day.date.slice(-2))}`;
}

function shortWeekday(dayOfWeek: string) {
  const labels: Record<string, string> = {
    friday: "Vie",
    monday: "Lun",
    saturday: "Sab",
    sunday: "Dom",
    thursday: "Jue",
    tuesday: "Mar",
    wednesday: "Mie",
  };
  return labels[dayOfWeek] ?? capitalize(dayOfWeek);
}

function formatWeekRange(startDate: string, endDate: string) {
  const startDay = Number(startDate.slice(-2));
  const endDay = Number(endDate.slice(-2));
  const endMonth = new Intl.DateTimeFormat("es-MX", {
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${endDate}T00:00:00.000Z`))
    .replace(".", "");

  return `${startDay}-${endDay} ${endMonth}`;
}

function capitalize(value: string) {
  return value ? `${value.slice(0, 1).toUpperCase()}${value.slice(1)}` : value;
}

function plural(count: number, singular: string, pluralValue: string) {
  return count === 1 ? singular : pluralValue;
}
