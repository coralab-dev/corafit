import { describe, expect, test } from "vitest";
import type { ClientPortalDay, ClientPortalHome } from "@/lib/client-portal/api";
import {
  buildClientHomeViewModel,
  getClientHomeSessionAction,
} from "./client-home-state";

const token = "portal-token";

function day(
  overrides: Partial<ClientPortalDay> & {
    date: string;
    session?: ClientPortalDay["session"];
  },
): ClientPortalDay {
  const { date, ...rest } = overrides;
  return {
    canOpen: false,
    date,
    dayOfWeek: "monday",
    dayOrder: 1,
    dayType: overrides.session === null ? "rest" : "training",
    log: null,
    session: {
      coachNote: null,
      description: null,
      id: "session-push",
      name: "Push",
    },
    status: "pending",
    ...rest,
  };
}

function home(overrides: Partial<ClientPortalHome> = {}): ClientPortalHome {
  const weekDays = [
    day({ canOpen: true, date: "2026-07-13", dayOfWeek: "monday" }),
    day({
      date: "2026-07-14",
      dayOfWeek: "tuesday",
      session: null,
      status: "no_session",
    }),
    day({
      date: "2026-07-15",
      dayOfWeek: "wednesday",
      session: {
        coachNote: null,
        description: null,
        id: "session-leg",
        name: "Pierna",
      },
    }),
    day({
      date: "2026-07-16",
      dayOfWeek: "thursday",
      session: null,
      status: "no_session",
    }),
    day({ date: "2026-07-17", dayOfWeek: "friday" }),
    day({
      date: "2026-07-18",
      dayOfWeek: "saturday",
      session: null,
      status: "no_session",
    }),
    day({
      date: "2026-07-19",
      dayOfWeek: "sunday",
      session: null,
      status: "no_session",
    }),
  ];

  return {
    calendarLink: {
      href: "/calendar",
      query: {
        date: "2026-07-13",
      },
    },
    client: {
      id: "client-1",
      name: "Juan Perez",
    },
    currentPlan: {
      assignmentId: "assignment-1",
      durationWeeks: 4,
      endedAt: null,
      id: "plan-1",
      name: "Intermedio Hipertrofia Dividido",
      startDate: "2026-07-13",
      status: "active",
    },
    latestSession: null,
    nextPendingSession: day({
      date: "2026-07-15",
      dayOfWeek: "wednesday",
      session: {
        coachNote: null,
        description: null,
        id: "session-leg",
        name: "Pierna",
      },
    }),
    state: "active",
    timezone: "America/Mexico_City",
    todaySession: day({ canOpen: true, date: "2026-07-13" }),
    week: {
      days: weekDays,
      summary: {
        completedSessions: 3,
        openedSessions: 0,
        pendingSessions: 1,
        restDays: 3,
        totalTrainingSessions: 4,
      },
      weekEndDate: "2026-07-19",
      weekNumber: 2,
      weekStartDate: "2026-07-13",
    },
    ...overrides,
  };
}

describe("client home state", () => {
  test("no_plan shows a calm coach preparation card and hides calendar", () => {
    const view = buildClientHomeViewModel(home({
      currentPlan: null,
      nextPendingSession: null,
      state: "no_plan",
      todaySession: null,
      week: null,
    }));

    expect(view.plan).toMatchObject({ kind: "no_plan" });
    expect(view.hideCalendarNav).toBe(true);
    expect(view.plan).toMatchObject({
      title: "Tu coach esta preparando tu plan",
    });
    expect(view.hero).toBeNull();
    expect(view.week).toBeNull();
  });

  test("not_started presents the plan start details without today's workout copy", () => {
    const view = buildClientHomeViewModel(home({
      nextPendingSession: null,
      state: "not_started",
      todaySession: null,
      week: null,
    }));

    expect(view.plan).toMatchObject({
      durationLabel: "4 semanas",
      kind: "not_started",
      planName: "Intermedio Hipertrofia Dividido",
      title: "Tu plan comienza el lunes 13 de julio",
    });
    expect(view.hero).toBeNull();
  });

  test("active pending today shows a start workout hero", () => {
    const view = buildClientHomeViewModel(home());

    expect(view.plan.kind).toBe("active");
    expect(view.hero).toMatchObject({
      actionLabel: "Comenzar entrenamiento",
      eyebrow: "Entrenamiento de hoy",
      sessionName: "Push",
      title: "Push",
    });
    expect(view.hero?.detail).toBe("Pendiente · Hoy");
  });

  test("today in progress shows completed exercise progress and continue label", () => {
    const view = buildClientHomeViewModel(home({
      todaySession: day({
        canOpen: true,
        date: "2026-07-13",
        log: {
          completedAt: null,
          id: "log-1",
          openedAt: "2026-07-13T12:00:00.000Z",
          status: "in_progress",
        },
        status: "in_progress",
      }),
    }), {
      activeSessionProgress: {
        completedExercises: 3,
        sessionLogId: "log-1",
        totalExercises: 6,
      },
    });

    expect(view.hero).toMatchObject({
      actionLabel: "Continuar entrenamiento",
      detail: "3 de 6 ejercicios completados",
      eyebrow: "Continua tu entrenamiento",
      title: "Push",
    });
  });

  test("completed today recognizes the achievement before future sessions", () => {
    const view = buildClientHomeViewModel(home({
      todaySession: day({
        canOpen: true,
        date: "2026-07-13",
        log: {
          completedAt: "2026-07-13T13:00:00.000Z",
          id: "log-1",
          openedAt: "2026-07-13T12:00:00.000Z",
          status: "completed",
        },
        status: "completed",
      }),
    }));

    expect(view.hero).toMatchObject({
      actionLabel: "Ver entrenamiento",
      detail: "Completaste tu sesion de hoy",
      eyebrow: "Entrenamiento completado",
      title: "Push",
    });
    expect(view.nextActivity).toMatchObject({
      dateLabel: "Mie 15 · Pierna",
      sessionName: "Pierna",
    });
  });

  test("rest day with upcoming session points to recovery and the next date", () => {
    const view = buildClientHomeViewModel(home({
      todaySession: day({
        date: "2026-07-13",
        session: null,
        status: "no_session",
      }),
      nextPendingSession: day({
        date: "2026-07-14",
        dayOfWeek: "tuesday",
        session: {
          coachNote: null,
          description: null,
          id: "session-pull",
          name: "Pull",
        },
      }),
    }));

    expect(view.hero).toMatchObject({
      actionLabel: "Ver proximo entrenamiento",
      detail: "Martes 14 de julio",
      eyebrow: "Hoy toca recuperacion",
      title: "Tu proximo entrenamiento es Pull",
    });
    expect(view.nextActivity).toBeNull();
  });

  test("future session navigates to preview and does not open a log", () => {
    const future = day({
      canOpen: false,
      date: "2026-07-14",
      session: {
        coachNote: null,
        description: null,
        id: "session-pull",
        name: "Pull",
      },
    });

    expect(getClientHomeSessionAction({ day: future, token })).toEqual({
      href: "/c/portal-token/session-preview?date=2026-07-14&session=session-pull",
      kind: "preview",
    });
  });

  test("available session opens or continues a log", () => {
    const pending = day({ canOpen: true, date: "2026-07-13" });
    const opened = day({
      canOpen: true,
      date: "2026-07-13",
      log: {
        completedAt: null,
        id: "log-1",
        openedAt: "2026-07-13T12:00:00.000Z",
        status: "opened",
      },
      status: "opened",
    });

    expect(getClientHomeSessionAction({ day: pending, token })).toEqual({
      kind: "open",
    });
    expect(getClientHomeSessionAction({ day: opened, token })).toEqual({
      href: "/c/portal-token/session/log-1",
      kind: "existing-log",
    });
  });

  test("plan_finished presents progress and calendar actions", () => {
    const view = buildClientHomeViewModel(home({
      state: "plan_finished",
      todaySession: null,
    }));

    expect(view.plan).toMatchObject({
      description: "Terminaste Intermedio Hipertrofia Dividido.",
      kind: "plan_finished",
      title: "Plan completado",
    });
    expect(view.plan).toMatchObject({
      actions: ["progress", "calendar"],
    });
  });

  test("weekly progress handles zero training sessions without a fake streak", () => {
    const view = buildClientHomeViewModel(home({
      week: {
        days: [
          day({
            date: "2026-07-13",
            dayOfWeek: "monday",
            session: null,
            status: "no_session",
          }),
          day({
            date: "2026-07-14",
            dayOfWeek: "tuesday",
            session: null,
            status: "no_session",
          }),
          day({
            date: "2026-07-15",
            dayOfWeek: "wednesday",
            session: null,
            status: "no_session",
          }),
          day({
            date: "2026-07-16",
            dayOfWeek: "thursday",
            session: null,
            status: "no_session",
          }),
          day({
            date: "2026-07-17",
            dayOfWeek: "friday",
            session: null,
            status: "no_session",
          }),
          day({
            date: "2026-07-18",
            dayOfWeek: "saturday",
            session: null,
            status: "no_session",
          }),
          day({
            date: "2026-07-19",
            dayOfWeek: "sunday",
            session: null,
            status: "no_session",
          }),
        ],
        summary: {
          completedSessions: 0,
          openedSessions: 0,
          pendingSessions: 0,
          restDays: 7,
          totalTrainingSessions: 0,
        },
        weekEndDate: "2026-07-19",
        weekNumber: 2,
        weekStartDate: "2026-07-13",
      },
    }));

    expect(view.week).toMatchObject({
      completionPercent: 0,
      pendingLabel: "0 pendientes · 7 dias de descanso",
      progressLabel: "0 de 0 sesiones completadas",
      weekLabel: "Semana 2",
    });
    expect(JSON.stringify(view)).not.toContain("Racha actual");
  });

  test("next activity does not repeat the hero session", () => {
    const today = day({ canOpen: true, date: "2026-07-13" });
    const view = buildClientHomeViewModel(home({
      nextPendingSession: today,
      todaySession: today,
    }));

    expect(view.nextActivity).toBeNull();
    expect(view.emptyNextActivityMessage).toBeNull();
  });

  test("weekly days map every home day with today and complete status tones", () => {
    const longName =
      "Pierna posterior con tempo lento y bloque largo de accesorios";
    const view = buildClientHomeViewModel(home({
      todaySession: day({ canOpen: true, date: "2026-07-15" }),
      week: {
        days: [
          day({
            date: "2026-07-13",
            dayOfWeek: "monday",
            session: null,
            status: "no_session",
          }),
          day({
            canOpen: true,
            date: "2026-07-14",
            dayOfWeek: "tuesday",
          }),
          day({
            canOpen: false,
            date: "2026-07-15",
            dayOfWeek: "wednesday",
            session: {
              coachNote: null,
              description: null,
              id: "session-long",
              name: longName,
            },
          }),
          day({
            canOpen: true,
            date: "2026-07-16",
            dayOfWeek: "thursday",
            status: "overdue",
          }),
          day({
            canOpen: true,
            date: "2026-07-17",
            dayOfWeek: "friday",
            log: {
              completedAt: null,
              id: "log-active",
              openedAt: "2026-07-17T12:00:00.000Z",
              status: "opened",
            },
            status: "opened",
          }),
          day({
            canOpen: false,
            date: "2026-07-18",
            dayOfWeek: "saturday",
            log: {
              completedAt: "2026-07-18T13:00:00.000Z",
              id: "log-partial",
              openedAt: "2026-07-18T12:00:00.000Z",
              status: "partially_completed",
            },
            status: "partially_completed",
          }),
          day({
            canOpen: false,
            date: "2026-07-19",
            dayOfWeek: "sunday",
            log: {
              completedAt: "2026-07-19T13:00:00.000Z",
              id: "log-completed",
              openedAt: "2026-07-19T12:00:00.000Z",
              status: "completed",
            },
            status: "completed",
          }),
        ],
        summary: {
          completedSessions: 2,
          openedSessions: 1,
          pendingSessions: 3,
          restDays: 1,
          totalTrainingSessions: 6,
        },
        weekEndDate: "2026-07-19",
        weekNumber: 2,
        weekStartDate: "2026-07-13",
      },
    }));

    expect(view.week?.days).toHaveLength(7);
    expect(view.week?.days).toMatchObject([
      {
        dateNumber: "13",
        dayLabel: "Lun",
        isRest: true,
        isToday: false,
        sessionName: "Descanso",
        statusLabel: "Descanso",
        tone: "rest",
      },
      {
        statusLabel: "Pendiente",
        tone: "pending",
      },
      {
        isToday: true,
        sessionName: longName,
        statusLabel: "Proxima",
        tone: "upcoming",
      },
      {
        statusLabel: "Atrasada",
        tone: "overdue",
      },
      {
        statusLabel: "En curso",
        tone: "active",
      },
      {
        statusLabel: "Parcial",
        tone: "partial",
      },
      {
        statusLabel: "Completada",
        tone: "completed",
      },
    ]);
  });

  test("weekly range is compact and next activity is optional", () => {
    const view = buildClientHomeViewModel(home({
      nextPendingSession: null,
      week: {
        days: [],
        summary: {
          completedSessions: 0,
          openedSessions: 0,
          pendingSessions: 0,
          restDays: 7,
          totalTrainingSessions: 0,
        },
        weekEndDate: "2026-07-18",
        weekNumber: 1,
        weekStartDate: "2026-07-12",
      },
    }));

    expect(view.week).toMatchObject({
      completionPercent: 0,
      rangeLabel: "12-18 jul",
    });
    expect(view.nextActivity).toBeNull();
    expect(view.emptyNextActivityMessage).toBeNull();
  });
});
