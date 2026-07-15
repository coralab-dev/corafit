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
  requestedDate: string | null,
  today: string,
) {
  return (
    days.find((day) => day.date === requestedDate) ??
    days.find((day) => day.date === today) ??
    days.find((day) => day.session) ??
    days[0]
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
