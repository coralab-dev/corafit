import type {
  ClientPortalDay,
  ClientSessionSnapshot,
} from "@/lib/client-portal/api";

export type CalendarProgress = {
  completed: number;
  percentage: number;
  total: number;
};

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
