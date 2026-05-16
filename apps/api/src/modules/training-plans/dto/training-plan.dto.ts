export type QuickCreatePlanDto = {
  name: string;
  weeks: number;
  daysPerWeek: number[];
  exercises: string[];
  goal?: string;
  level?: string;
  generalNotes?: string;
};

export type CreatePlanDto = {
  name: string;
  goal?: string;
  level?: string;
  durationWeeks: number;
  generalNotes?: string;
};

export type DuplicatePlanDto = {
  name?: string;
};

export type CopyDayDto = {
  dayOfWeek: string;
};

export type ListPlansQuery = {
  limit?: string;
  page?: string;
  status?: string;
  search?: string;
};

export type UpdatePlanDto = {
  name?: string;
  goal?: string | null;
  level?: string | null;
  durationWeeks?: number;
  generalNotes?: string | null;
};

export type UpdateSessionDto = {
  name?: string;
  description?: string | null;
  coachNote?: string | null;
};

export type CreateSessionExerciseDto = {
  exerciseId: string;
  orderIndex?: number;
  sets?: number | null;
  reps: string;
  restSeconds?: number | null;
  coachNote?: string | null;
};

export type UpdateSessionExerciseDto = {
  exerciseId?: string;
  orderIndex?: number;
  sets?: number | null;
  reps?: string;
  restSeconds?: number | null;
  coachNote?: string | null;
};

export type ReorderSessionExercisesDto = {
  items: Array<{
    sessionExerciseId: string;
    orderIndex: number;
  }>;
};

export type CreateSessionExerciseAlternativeDto = {
  alternativeExerciseId: string;
  note?: string | null;
};

export type UpdateSessionExerciseAlternativeDto = {
  alternativeExerciseId?: string;
  note?: string | null;
};
