export type ExerciseSearchQueryFilters = {
  equipment?: string;
  limit?: number;
  page?: number;
  primaryMuscle?: string;
  search?: string;
  type?: string;
};

export function buildExerciseSearchParams(filters: ExerciseSearchQueryFilters) {
  const searchParams = new URLSearchParams({
    page: String(filters.page ?? 1),
    limit: String(filters.limit ?? 20),
    type: filters.type ?? "all",
  });

  if (filters.search?.trim()) {
    searchParams.set("search", filters.search.trim());
  }
  if (filters.primaryMuscle && filters.primaryMuscle !== "all") {
    searchParams.set("primaryMuscle", filters.primaryMuscle);
  }
  if (filters.equipment && filters.equipment !== "all") {
    searchParams.set("equipment", filters.equipment);
  }

  return searchParams;
}

export function filterSelectableExercises<T extends { id: string }>(
  items: T[],
  excludedExerciseIds: string[],
) {
  return items.filter((exercise) => !excludedExerciseIds.includes(exercise.id));
}

export function getExercisePageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}

export function shouldShowExcludedPageMessage<T>(total: number, visibleItems: T[]) {
  return total > 0 && visibleItems.length === 0;
}

export function isExerciseSelectionDisabled(isUpdating: boolean) {
  return isUpdating;
}
