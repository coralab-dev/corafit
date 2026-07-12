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
  updatedSession: TrainingSession,
): TrainingPlan {
  return updateAssignedPlanSessions(plan, (session) =>
    session.id === updatedSession.id
      ? normalizeAssignedSession(updatedSession)
      : session,
  );
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
): TrainingPlan {
  const normalizedExercise = normalizeAssignedSessionExercise(updatedExercise);

  return updateAssignedPlanSessions(plan, (session) =>
    session.id === normalizedExercise.trainingSessionId
      ? {
          ...session,
          exercises: session.exercises.map((exercise) =>
            exercise.id === normalizedExercise.id
              ? requestedFields
                ? mergeSessionExerciseUpdate(
                    exercise,
                    normalizedExercise,
                    requestedFields,
                  )
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
