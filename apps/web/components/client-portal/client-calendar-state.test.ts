import { describe, expect, test } from "vitest";
import type {
  ClientPortalDay,
  ClientSessionSnapshot,
} from "@/lib/client-portal/api";
import {
  getCalendarProgress,
  getUpcomingCalendarDays,
  selectCalendarDay,
} from "./client-calendar-state";

function day(
  date: string,
  options: {
    session?: ClientPortalDay["session"];
  } = {},
): ClientPortalDay {
  return {
    canOpen: false,
    date,
    dayOfWeek: "monday",
    dayOrder: 1,
    dayType: options.session === null ? "rest" : "training",
    log: null,
    session:
      options.session === undefined
        ? {
            coachNote: null,
            description: null,
            id: `session-${date}`,
            name: "Sesion",
          }
        : options.session,
    status: options.session === null ? "no_session" : "pending",
  };
}

function snapshot(
  exerciseIds: string[],
  completedExerciseIds: string[] = [],
): ClientSessionSnapshot {
  return {
    capturedAt: "2026-07-14T12:00:00.000Z",
    exercises: exerciseIds.map((id, index) => ({
      alternatives: [],
      coachNote: null,
      exercise: {
        equipment: "bodyweight",
        id,
        instructions: null,
        mediaType: null,
        mediaUrl: null,
        name: id,
        primaryMuscle: "full_body",
        recommendations: null,
        secondaryMuscles: [],
        videoUrl: null,
      },
      exerciseId: id,
      orderIndex: index,
      reps: "10",
      restSeconds: null,
      sessionExerciseId: id,
      sets: 1,
    })),
    progress: {
      completedExerciseIds,
      usedAlternatives: [],
    },
    session: {
      coachNote: null,
      description: null,
      id: "session-1",
      name: "Sesion",
    },
    version: 1,
  };
}

describe("client calendar state", () => {
  test("uses a requested date, then today, first session, and first day", () => {
    const rest = day("2026-07-13", { session: null });
    const training = day("2026-07-14");
    const later = day("2026-07-15");
    const days = [rest, training, later];

    expect(selectCalendarDay(days, "2026-07-15", "2026-07-14")).toBe(
      later,
    );
    expect(selectCalendarDay(days, null, "2026-07-14")).toBe(training);
    expect(selectCalendarDay(days, null, "2026-07-20")).toBe(training);
    expect(selectCalendarDay([rest], null, "2026-07-20")).toBe(rest);
  });

  test("returns only days after the selected day in the returned week", () => {
    const days = [
      day("2026-07-13"),
      day("2026-07-14"),
      day("2026-07-15", { session: null }),
    ];

    expect(getUpcomingCalendarDays(days, "2026-07-14")).toEqual([days[2]]);
  });

  test("computes real session progress from the snapshot", () => {
    expect(
      getCalendarProgress(
        snapshot(["one", "two", "three", "four", "five"], [
          "one",
          "two",
          "three",
        ]),
      ),
    ).toEqual({ completed: 3, percentage: 60, total: 5 });
  });

  test("returns no progress without a snapshot or exercises", () => {
    expect(getCalendarProgress(null)).toBeNull();
    expect(getCalendarProgress(snapshot([]))).toBeNull();
  });
});
