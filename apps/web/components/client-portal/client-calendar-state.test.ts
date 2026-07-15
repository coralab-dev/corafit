import { describe, expect, test } from "vitest";
import type {
  ClientPortalDay,
  ClientSessionSnapshot,
} from "@/lib/client-portal/api";
import {
  createLatestCalendarRequestCoordinator,
  createLatestRequestCoordinator,
  getActivePendingWeekNavigation,
  getCalendarProgress,
  getUpcomingCalendarDays,
  getWeekNavigationTarget,
  isDateInsideCalendarDays,
  selectCalendarDay,
  selectMobileCalendarDay,
  shiftCalendarDate,
} from "./client-calendar-state";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

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
  test("calendar request coordinator suppresses older responses", async () => {
    const pendingB = deferred<string>();
    const pendingC = deferred<string>();
    const delivered: string[] = [];
    const errors: unknown[] = [];
    const coordinator = createLatestCalendarRequestCoordinator<string>();

    const requestB = coordinator.run({
      load: () => pendingB.promise,
      onError: (error) => errors.push(error),
      onResult: (value) => delivered.push(value),
    });
    const requestC = coordinator.run({
      load: () => pendingC.promise,
      onError: (error) => errors.push(error),
      onResult: (value) => delivered.push(value),
    });

    pendingB.resolve("week-b");
    pendingC.resolve("week-c");

    await expect(requestB.settled).resolves.toBeNull();
    await expect(requestC.settled).resolves.toBe("week-c");
    expect(delivered).toEqual(["week-c"]);
    expect(errors).toEqual([]);
  });

  test("calendar request coordinator aborts without applying data or visible errors", async () => {
    const pending = deferred<string>();
    const delivered: string[] = [];
    const errors: unknown[] = [];
    const coordinator = createLatestCalendarRequestCoordinator<string>();

    const request = coordinator.run({
      load: (signal) => {
        signal.addEventListener("abort", () =>
          pending.reject(new DOMException("Aborted", "AbortError")),
        );
        return pending.promise;
      },
      onError: (error) => errors.push(error),
      onResult: (value) => delivered.push(value),
    });

    request.cancel();

    await expect(request.settled).resolves.toBeNull();
    expect(delivered).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("calendar request coordinator reports the latest non-abort error", async () => {
    const delivered: string[] = [];
    const errors: unknown[] = [];
    const coordinator = createLatestCalendarRequestCoordinator<string>();

    const request = coordinator.run({
      load: () => Promise.reject(new Error("refresh failed")),
      onError: (error) => errors.push(error),
      onResult: (value) => delivered.push(value),
    });

    await expect(request.settled).resolves.toBeNull();
    expect(delivered).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(Error);
  });

  test("pending week navigation only remains active for the current URL date", () => {
    const pending = {
      direction: "next" as const,
      targetDate: "2026-07-21",
    };

    expect(getActivePendingWeekNavigation(pending, "2026-07-21")).toBe(
      pending,
    );
    expect(getActivePendingWeekNavigation(pending, "2026-07-14")).toBeNull();
    expect(getActivePendingWeekNavigation(pending, null)).toBeNull();
  });

  test("week navigation shifts exactly seven days from the selected anchor", () => {
    expect(getWeekNavigationTarget("2026-07-14", "next")).toBe("2026-07-21");
    expect(getWeekNavigationTarget("2026-07-14", "prev")).toBe("2026-07-07");
  });

  test("date key shifting preserves weekdays across month, year, and February boundaries", () => {
    expect(shiftCalendarDate("2026-01-29", 7)).toBe("2026-02-05");
    expect(shiftCalendarDate("2026-01-03", -7)).toBe("2025-12-27");
    expect(shiftCalendarDate("2024-02-26", 7)).toBe("2024-03-04");
    expect(shiftCalendarDate("2026-03-01", -7)).toBe("2026-02-22");
  });

  test("date key shifting uses UTC date math instead of local timezone offsets", () => {
    expect(shiftCalendarDate("2026-03-08", 7)).toBe("2026-03-15");
    expect(shiftCalendarDate("2026-11-01", 7)).toBe("2026-11-08");
  });

  test("detects whether a requested date belongs to loaded calendar days", () => {
    const days = [
      day("2026-07-13"),
      day("2026-07-14"),
      day("2026-07-15"),
    ];

    expect(isDateInsideCalendarDays(days, "2026-07-14")).toBe(true);
    expect(isDateInsideCalendarDays(days, "2026-07-20")).toBe(false);
    expect(isDateInsideCalendarDays(days, null)).toBe(false);
  });

  test("ignoring an out-of-week requested date keeps old week selection stable", () => {
    const rest = day("2026-07-13", { session: null });
    const selected = day("2026-07-14");
    const later = day("2026-07-15");
    const days = [rest, selected, later];
    const requestedDate = "2026-07-21";
    const requestedDateForLoadedWeek = isDateInsideCalendarDays(
      days,
      requestedDate,
    )
      ? requestedDate
      : null;

    expect(
      selectMobileCalendarDay(days, {
        requestedDate: requestedDateForLoadedWeek,
        selectedDate: "2026-07-14",
        today: "2026-07-13",
      }),
    ).toBe(selected);
  });

  test("selects the navigation target when the new week arrives", () => {
    const target = day("2026-07-21");
    const days = [day("2026-07-20"), target, day("2026-07-22")];

    expect(
      selectMobileCalendarDay(days, {
        requestedDate: "2026-07-21",
        selectedDate: null,
        today: "2026-07-20",
      }),
    ).toBe(target);
  });

  test("progress coordinator caches the same request key", async () => {
    const pending = deferred<number>();
    const delivered: Array<number | null> = [];
    let loadCount = 0;
    const coordinator = createLatestRequestCoordinator<number>();
    const load = () => {
      loadCount += 1;
      return pending.promise;
    };

    const first = coordinator.run("log-a", load, (value) =>
      delivered.push(value),
    );
    const second = coordinator.run("log-a", load, (value) =>
      delivered.push(value),
    );
    pending.resolve(60);

    expect(await first.settled).toBeNull();
    expect(await second.settled).toBe(60);
    expect(loadCount).toBe(1);
    expect(delivered).toEqual([60]);
  });

  test("progress coordinator suppresses an older A result after B starts", async () => {
    const pendingA = deferred<number>();
    const pendingB = deferred<number>();
    const delivered: Array<number | null> = [];
    const coordinator = createLatestRequestCoordinator<number>();

    const requestA = coordinator.run("log-a", () => pendingA.promise, (value) =>
      delivered.push(value),
    );
    const requestB = coordinator.run("log-b", () => pendingB.promise, (value) =>
      delivered.push(value),
    );
    pendingA.resolve(20);
    pendingB.resolve(80);

    expect(await requestA.settled).toBeNull();
    expect(await requestB.settled).toBe(80);
    expect(delivered).toEqual([80]);
  });

  test("progress coordinator cancellation suppresses delivery", async () => {
    const pending = deferred<number>();
    const delivered: Array<number | null> = [];
    const coordinator = createLatestRequestCoordinator<number>();
    const request = coordinator.run("log-a", () => pending.promise, (value) =>
      delivered.push(value),
    );

    request.cancel();
    pending.resolve(40);

    expect(await request.settled).toBeNull();
    expect(delivered).toEqual([]);
  });

  test("progress coordinator resolves request failures to null", async () => {
    const pending = deferred<number>();
    const delivered: Array<number | null> = [];
    const coordinator = createLatestRequestCoordinator<number>();
    const request = coordinator.run("log-a", () => pending.promise, (value) =>
      delivered.push(value),
    );

    pending.reject(new Error("network failed"));

    await expect(request.settled).resolves.toBeNull();
    expect(delivered).toEqual([null]);
  });

  test("desktop ignores query date while mobile honors it", () => {
    const rest = day("2026-07-13", { session: null });
    const training = day("2026-07-14");
    const later = day("2026-07-15");
    const days = [rest, training, later];

    expect(
      selectCalendarDay(days, {
        selectedDate: null,
        today: "2026-07-13",
      }),
    ).toBe(rest);
    expect(
      selectMobileCalendarDay(days, {
        requestedDate: "2026-07-15",
        selectedDate: null,
        today: "2026-07-13",
      }),
    ).toBe(later);
  });

  test("mobile falls back through stale selections, today, sessions, and days", () => {
    const rest = day("2026-07-13", { session: null });
    const training = day("2026-07-14");
    const later = day("2026-07-15");
    const days = [rest, training, later];

    expect(
      selectMobileCalendarDay(days, {
        requestedDate: "2026-07-15",
        selectedDate: "2026-07-20",
        today: "2026-07-14",
      }),
    ).toBe(later);
    expect(
      selectMobileCalendarDay(days, {
        requestedDate: null,
        selectedDate: null,
        today: "2026-07-13",
      }),
    ).toBe(rest);
    expect(
      selectMobileCalendarDay(days, {
        requestedDate: null,
        selectedDate: null,
        today: "2026-07-20",
      }),
    ).toBe(training);
    expect(
      selectMobileCalendarDay([rest], {
        requestedDate: null,
        selectedDate: null,
        today: "2026-07-20",
      }),
    ).toBe(rest);
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
