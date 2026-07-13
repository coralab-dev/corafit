import type { Exercise } from "@/hooks/use-exercises";
import type {
  SessionExercise,
  SessionExerciseAlternative,
  TrainingPlan,
  TrainingPlanDay,
  TrainingPlanWeek,
  TrainingSession,
} from "@/hooks/use-training-plans";
import { dayOfWeekValues } from "../components/training-plans/training-plan-days";
import { mergeSessionExerciseUpdate } from "../components/training-plans/training-plan-editor-utils";

type AssignedTrainingPlan = Omit<TrainingPlan, "weeks"> & {
  weeks?: Array<Partial<TrainingPlanWeek> & { days?: AssignedTrainingPlanDay[] }>;
};

type AssignedTrainingPlanDay = Omit<Partial<TrainingPlanDay>, "session"> & {
  session?: AssignedTrainingSession | null;
};

type AssignedTrainingSession = Omit<Partial<TrainingSession>, "exercises"> & {
  exercises?: AssignedSessionExercise[];
};

type AssignedSessionExercise = Partial<SessionExercise> & {
  alternatives?: SessionExerciseAlternative[];
};

type CurrentAssignmentShape = {
  assignment: {
    id: string;
    assignedPlanId: string;
    sourceTrainingPlanId: string;
    startDate: string;
    endedAt: string | null;
    status: "active" | "finished" | "removed";
  };
  sourcePlan: { id: string; name: string } | null;
  assignedPlan: TrainingPlan | null;
};

type PartialCurrentAssignmentShape = Partial<
  Omit<CurrentAssignmentShape, "assignedPlan" | "assignment">
> & {
  assignedPlan?: AssignedTrainingPlan | null;
  assignment?: Partial<CurrentAssignmentShape["assignment"]>;
};

export class AssignmentRefreshRequiredError extends Error {
  constructor(entityLabel: string) {
    super(
      `La ${entityLabel} se guardo, pero no se pudo actualizar la vista. Recarga antes de repetir la accion.`,
    );
    this.name = "AssignmentRefreshRequiredError";
  }
}

export class AssignmentDayMovePartialFailureError extends Error {
  constructor() {
    super(
      "El dia fue copiado, pero no se pudo eliminar el original. Se actualizo la vista; recarga antes de repetir la accion.",
    );
    this.name = "AssignmentDayMovePartialFailureError";
  }
}

export function normalizeAssignedPlan(plan: AssignedTrainingPlan): TrainingPlan {
  return {
    ...plan,
    weeks: (plan.weeks ?? []).map((week) => ({
      ...week,
      days: (week.days ?? []).map((day) => ({
        ...day,
        session: day.session ? normalizeAssignedSession(day.session) : null,
      })) as TrainingPlanDay[],
    })) as TrainingPlanWeek[],
  };
}

export function replaceAssignedSession(
  plan: TrainingPlan,
  updatedSession: Partial<TrainingSession> & { id: string },
): TrainingPlan {
  return updateAssignedPlanSessions(plan, (session) =>
    session.id === updatedSession.id
      ? normalizeAssignedSession({
          ...session,
          ...updatedSession,
          exercises: updatedSession.exercises ?? session.exercises,
        })
      : session,
  );
}

export function mergeCurrentAssignmentUpdate(
  current: CurrentAssignmentShape | null,
  update: PartialCurrentAssignmentShape | null,
): CurrentAssignmentShape | null {
  if (!update) {
    return current;
  }

  if (!current) {
    if (!update.assignment || update.assignedPlan === undefined) {
      return null;
    }

    return {
      assignment: update.assignment as CurrentAssignmentShape["assignment"],
      assignedPlan: update.assignedPlan ? normalizeAssignedPlan(update.assignedPlan) : null,
      sourcePlan: update.sourcePlan ?? null,
    };
  }

  const nextAssignedPlan =
    update.assignedPlan === undefined
      ? current.assignedPlan
      : update.assignedPlan
        ? normalizeAssignedPlan({
            ...current.assignedPlan,
            ...update.assignedPlan,
            weeks: update.assignedPlan.weeks ?? current.assignedPlan?.weeks,
          } as AssignedTrainingPlan)
        : null;

  return {
    assignment: {
      ...current.assignment,
      ...(update.assignment ?? {}),
    },
    assignedPlan: nextAssignedPlan,
    sourcePlan: update.sourcePlan === undefined ? current.sourcePlan : update.sourcePlan,
  };
}

export function findAssignedWeek(
  plan: TrainingPlan | null,
  weekId: string,
): TrainingPlanWeek | null {
  return plan?.weeks?.find((week) => week.id === weekId) ?? null;
}

export function findAssignedDay(
  plan: TrainingPlan | null,
  dayId: string,
): TrainingPlanDay | null {
  return plan?.weeks
    ?.flatMap((week) => week.days)
    .find((day) => day.id === dayId) ?? null;
}

export function findAssignedSessionExercise(
  plan: TrainingPlan | null,
  sessionExerciseId: string,
): SessionExercise | null {
  return plan?.weeks
    ?.flatMap((week) => week.days)
    .flatMap((day) => day.session?.exercises ?? [])
    .find((exercise) => exercise.id === sessionExerciseId) ?? null;
}

export function requireHydratedMutationResult<T>(
  result: T | null | undefined,
  entityLabel: string,
): T {
  if (!result) {
    throw new AssignmentRefreshRequiredError(entityLabel);
  }

  return result;
}

export function appendAssignedSessionExercise(
  plan: TrainingPlan,
  createdExercise: SessionExercise,
  exerciseSnapshot?: Exercise,
): TrainingPlan {
  const normalizedExercise = normalizeAssignedSessionExercise(
    createdExercise,
    exerciseSnapshot,
  );

  return updateAssignedPlanSessions(plan, (session) =>
    session.id === normalizedExercise.trainingSessionId
      ? {
          ...session,
          exercises: [...session.exercises, normalizedExercise].sort(
            (first, second) => first.orderIndex - second.orderIndex,
          ),
        }
      : session,
  );
}

export function replaceAssignedSessionExercise(
  plan: TrainingPlan,
  updatedExercise: SessionExercise,
  requestedFields?: Partial<SessionExercise>,
  exerciseSnapshot?: Exercise,
): TrainingPlan {
  const normalizedExercise = normalizeAssignedSessionExercise(
    updatedExercise,
    exerciseSnapshot,
  );

  return updateAssignedPlanSessions(plan, (session) =>
    session.id === normalizedExercise.trainingSessionId
      ? {
          ...session,
          exercises: session.exercises.map((exercise) =>
            exercise.id === normalizedExercise.id
              ? requestedFields
                ? {
                    ...mergeSessionExerciseUpdate(
                      exercise,
                      normalizedExercise,
                      requestedFields,
                    ),
                    exercise:
                      requestedFields.exerciseId && exerciseSnapshot
                        ? exerciseSnapshot
                        : exercise.exercise,
                  }
                : normalizedExercise
              : exercise,
          ),
        }
      : session,
  );
}

export function removeAssignedSessionExercise(
  plan: TrainingPlan,
  sessionExerciseId: string,
): TrainingPlan {
  return updateAssignedPlanSessions(plan, (session) => ({
    ...session,
    exercises: session.exercises.filter(
      (exercise) => exercise.id !== sessionExerciseId,
    ),
  }));
}

export function reorderAssignedSessionExercises(
  plan: TrainingPlan,
  items: Array<{ sessionExerciseId: string; orderIndex: number }>,
): TrainingPlan {
  const orderById = new Map(
    items.map((item) => [item.sessionExerciseId, item.orderIndex]),
  );

  return updateAssignedPlanSessions(plan, (session) => ({
    ...session,
    exercises: session.exercises
      .map((exercise) =>
        orderById.has(exercise.id)
          ? { ...exercise, orderIndex: orderById.get(exercise.id) ?? exercise.orderIndex }
          : exercise,
      )
      .sort((first, second) => first.orderIndex - second.orderIndex),
  }));
}

export function appendAssignedAlternative(
  plan: TrainingPlan,
  createdAlternative: SessionExerciseAlternative,
  alternativeExerciseSnapshot?: Exercise,
): TrainingPlan {
  const normalizedAlternative = {
    ...createdAlternative,
    alternativeExercise:
      createdAlternative.alternativeExercise ?? alternativeExerciseSnapshot,
  };

  return updateAssignedPlanExercises(plan, (exercise) =>
    exercise.id === createdAlternative.sessionExerciseId
      ? {
          ...exercise,
          alternatives: [...exercise.alternatives, normalizedAlternative],
        }
      : exercise,
  );
}

export function removeAssignedAlternative(
  plan: TrainingPlan,
  alternativeId: string,
): TrainingPlan {
  return updateAssignedPlanExercises(plan, (exercise) => ({
    ...exercise,
    alternatives: exercise.alternatives.filter(
      (alternative) => alternative.id !== alternativeId,
    ),
  }));
}

export function appendAssignedWeek(
  plan: TrainingPlan,
  createdWeek: TrainingPlanWeek,
): TrainingPlan {
  const week = { ...createdWeek, days: createdWeek.days ?? [] };

  return {
    ...plan,
    durationWeeks: Math.max(plan.durationWeeks, week.weekNumber),
    weeks: [...(plan.weeks ?? []), week].sort(
      (first, second) => first.weekNumber - second.weekNumber,
    ),
  };
}

export function removeAssignedWeek(plan: TrainingPlan, weekId: string): TrainingPlan {
  const weeks = (plan.weeks ?? []).filter((week) => week.id !== weekId);

  return {
    ...plan,
    durationWeeks: Math.max(
      weeks.reduce((max, week) => Math.max(max, week.weekNumber), 1),
      1,
    ),
    weeks,
  };
}

export function appendAssignedDay(
  plan: TrainingPlan,
  createdDay: TrainingPlanDay,
): TrainingPlan {
  return {
    ...plan,
    weeks: plan.weeks?.map((week) =>
      week.id === createdDay.trainingPlanWeekId
        ? {
            ...week,
            days: [...week.days, normalizeAssignedDay(createdDay)].sort(
              compareDays,
            ),
          }
        : week,
    ),
  };
}

export function replaceAssignedDay(
  plan: TrainingPlan,
  updatedDay: TrainingPlanDay,
): TrainingPlan {
  return {
    ...plan,
    weeks: plan.weeks?.map((week) => ({
      ...week,
      days: week.days
        .map((day) =>
          day.id === updatedDay.id
            ? {
                ...day,
                ...normalizeAssignedDay(updatedDay),
                session: updatedDay.session ? normalizeAssignedSession(updatedDay.session) : day.session,
              }
            : day,
        )
        .sort(compareDays),
    })),
  };
}

export function removeAssignedDay(plan: TrainingPlan, dayId: string): TrainingPlan {
  return {
    ...plan,
    weeks: plan.weeks?.map((week) => ({
      ...week,
      days: week.days.filter((day) => day.id !== dayId),
    })),
  };
}

export function replaceAssignedDaySession(
  plan: TrainingPlan,
  dayId: string,
  session: TrainingSession | null,
): TrainingPlan {
  return {
    ...plan,
    weeks: plan.weeks?.map((week) => ({
      ...week,
      days: week.days.map((day) =>
        day.id === dayId
          ? { ...day, session: session ? normalizeAssignedSession(session) : null }
          : day,
      ),
    })),
  };
}

export function removeAssignedSession(
  plan: TrainingPlan,
  sessionId: string,
): TrainingPlan {
  return {
    ...plan,
    weeks: plan.weeks?.map((week) => ({
      ...week,
      days: week.days.map((day) =>
        day.session?.id === sessionId ? { ...day, session: null } : day,
      ),
    })),
  };
}

function updateAssignedPlanSessions(
  plan: TrainingPlan,
  updateSession: (session: TrainingSession) => TrainingSession,
): TrainingPlan {
  return {
    ...plan,
    weeks: plan.weeks?.map((week) => ({
      ...week,
      days: week.days.map((day) =>
        day.session ? { ...day, session: updateSession(day.session) } : day,
      ),
    })),
  };
}

function updateAssignedPlanExercises(
  plan: TrainingPlan,
  updateExercise: (exercise: SessionExercise) => SessionExercise,
) {
  return updateAssignedPlanSessions(plan, (session) => ({
    ...session,
    exercises: session.exercises.map((exercise) =>
      updateExercise(normalizeAssignedSessionExercise(exercise)),
    ),
  }));
}

function normalizeAssignedDay(day: TrainingPlanDay): TrainingPlanDay {
  return {
    ...day,
    session: day.session ? normalizeAssignedSession(day.session) : null,
  };
}

function normalizeAssignedSession(session: AssignedTrainingSession): TrainingSession {
  return {
    ...session,
    exercises: (session.exercises ?? []).map((exercise) =>
      normalizeAssignedSessionExercise(exercise),
    ),
  } as TrainingSession;
}

function normalizeAssignedSessionExercise(
  exercise: AssignedSessionExercise,
  exerciseSnapshot?: Exercise,
): SessionExercise {
  return {
    ...exercise,
    alternatives: exercise.alternatives ?? [],
    exercise: exercise.exercise ?? exerciseSnapshot,
  } as SessionExercise;
}

function compareDays(first: TrainingPlanDay, second: TrainingPlanDay) {
  return (
    dayOfWeekValues.indexOf(first.dayOfWeek) -
    dayOfWeekValues.indexOf(second.dayOfWeek)
  );
}
