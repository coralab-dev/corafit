import type {
  ClientPortalDay,
  ClientSessionSnapshot,
} from "@/lib/client-portal/api";

export type CalendarProgress = {
  completed: number;
  percentage: number;
  total: number;
};

export type WeekNavigationDirection = "prev" | "next";

export type CoordinatedRequest<T> = {
  cancel: () => void;
  settled: Promise<T | null>;
};

export function createLatestRequestCoordinator<T>() {
  const cache = new Map<string, Promise<T | null>>();
  let generation = 0;

  return {
    run(
      key: string,
      load: () => Promise<T>,
      onResult: (value: T | null) => void,
    ): CoordinatedRequest<T> {
      const requestGeneration = ++generation;
      let cancelled = false;
      let request = cache.get(key);

      if (!request) {
        request = Promise.resolve()
          .then(load)
          .catch(() => null);
        cache.set(key, request);
      }

      const settled = request.then((value) => {
        if (cancelled || requestGeneration !== generation) return null;
        onResult(value);
        return value;
      });

      return {
        cancel() {
          if (cancelled) return;
          cancelled = true;
          if (requestGeneration === generation) generation += 1;
        },
        settled,
      };
    },
  };
}

export function selectCalendarDay(
  days: ClientPortalDay[],
  {
    selectedDate,
    today,
  }: {
    selectedDate: string | null;
    today: string;
  },
) {
  return (
    days.find((day) => day.date === selectedDate) ??
    days.find((day) => day.date === today) ??
    days.find((day) => day.session) ??
    days[0]
  );
}

export function selectMobileCalendarDay(
  days: ClientPortalDay[],
  {
    requestedDate,
    selectedDate,
    today,
  }: {
    requestedDate: string | null;
    selectedDate: string | null;
    today: string;
  },
) {
  return (
    days.find((day) => day.date === selectedDate) ??
    days.find((day) => day.date === requestedDate) ??
    selectCalendarDay(days, { selectedDate: null, today })
  );
}

export function getUpcomingCalendarDays(
  days: ClientPortalDay[],
  selectedDate: string,
) {
  return days.filter((day) => day.date > selectedDate);
}

export function shiftCalendarDate(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  const shiftedYear = shifted.getUTCFullYear();
  const shiftedMonth = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const shiftedDay = String(shifted.getUTCDate()).padStart(2, "0");

  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}

export function getWeekNavigationTarget(
  anchorDate: string,
  direction: WeekNavigationDirection,
) {
  return shiftCalendarDate(anchorDate, direction === "prev" ? -7 : 7);
}

export function isDateInsideCalendarDays(
  days: ClientPortalDay[],
  date: string | null,
) {
  return Boolean(date && days.some((day) => day.date === date));
}

export function getCalendarProgress(
  snapshotData: ClientSessionSnapshot | null,
): CalendarProgress | null {
  const total = snapshotData?.exercises.length ?? 0;
  if (total === 0) return null;

  const completed = snapshotData?.progress?.completedExerciseIds.length ?? 0;
  return {
    completed,
    percentage: Math.round((completed / total) * 100),
    total,
  };
}
