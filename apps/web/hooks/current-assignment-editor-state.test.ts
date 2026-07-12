import { assert, test } from "vitest";
import {
  appendAssignedSessionExercise,
  findAssignedSessionExercise,
  findAssignedWeek,
  mergeCurrentAssignmentUpdate,
  normalizeAssignedPlan,
  replaceAssignedSessionExercise,
  replaceAssignedSession,
  removeAssignedSessionExercise,
  requireHydratedMutationResult,
} from "./current-assignment-editor-state.ts";
import type { Exercise } from "./use-exercises.ts";

const baseExercise: Exercise = {
  createdAt: "2026-01-01T00:00:00.000Z",
  createdByUserId: null,
  equipment: "dumbbell",
  id: "exercise-1",
  instructions: null,
  mediaType: "image",
  mediaUrl: null,
  name: "Goblet squat",
  organizationId: null,
  primaryMuscle: "legs",
  recommendations: null,
  secondaryMuscles: [],
  status: "active",
  updatedAt: "2026-01-01T00:00:00.000Z",
  videoUrl: null,
};

function createPlan() {
  return normalizeAssignedPlan({
    createdAt: "2026-01-01T00:00:00.000Z",
    createdByMemberId: "member-1",
    durationWeeks: 1,
    generalNotes: null,
    goal: "Strength",
    id: "plan-1",
    isSystemTemplate: false,
    level: "beginner",
    name: "Assigned strength",
    organizationId: "org-1",
    planType: "assigned_copy",
    sourcePlanId: "template-1",
    assignedClientId: "client-1",
    status: "active",
    updatedAt: "2026-01-01T00:00:00.000Z",
    weeks: [
      {
        days: [
          {
            dayOfWeek: "monday",
            dayOrder: null,
            dayType: "training",
            id: "day-1",
            session: {
              coachNote: null,
              description: null,
              exercises: [
                {
                  alternatives: [],
                  coachNote: "Tempo",
                  exercise: baseExercise,
                  exerciseId: "exercise-1",
                  id: "row-1",
                  orderIndex: 0,
                  reps: "10-12",
                  restSeconds: 60,
                  sets: 3,
                  trainingSessionId: "session-1",
                },
              ],
              id: "session-1",
              name: "Lower",
              trainingPlanDayId: "day-1",
            },
            trainingPlanWeekId: "week-1",
          },
        ],
        id: "week-1",
        notes: null,
        trainingPlanId: "plan-1",
        weekNumber: 1,
      },
    ],
  });
}

function createPlanWithoutExercises() {
  const plan = createPlan();
  return {
    ...plan,
    weeks: plan.weeks?.map((week) => ({
      ...week,
      days: week.days.map((day) => ({
        ...day,
        session: day.session ? { ...day.session, exercises: [] } : null,
      })),
    })),
  };
}

test("normalizes optional assigned-plan collections for shared editor components", () => {
  const normalized = normalizeAssignedPlan({
    ...createPlan(),
    weeks: [
      {
        id: "week-empty",
        notes: null,
        trainingPlanId: "plan-1",
        weekNumber: 1,
      },
    ],
  });

  assert.deepEqual(normalized.weeks?.[0]?.days, []);
});

test("applies assigned exercise mutations locally while preserving exercise snapshots", () => {
  const withExercise = appendAssignedSessionExercise(
    createPlanWithoutExercises(),
    {
      alternatives: [],
      coachNote: null,
      exerciseId: "exercise-1",
      id: "row-1",
      orderIndex: 0,
      reps: "10-12",
      restSeconds: 60,
      sets: 3,
      trainingSessionId: "session-1",
    },
    baseExercise,
  );

  assert.equal(
    withExercise.weeks?.[0]?.days[0]?.session?.exercises[0]?.exercise?.name,
    "Goblet squat",
  );

  const updated = replaceAssignedSessionExercise(
    withExercise,
    {
      alternatives: [],
      coachNote: null,
      exerciseId: "exercise-2",
      id: "row-1",
      orderIndex: 0,
      reps: "8-10",
      restSeconds: 90,
      sets: 4,
      trainingSessionId: "session-1",
    },
    { sets: 4 },
  );

  assert.deepEqual(updated.weeks?.[0]?.days[0]?.session?.exercises[0], {
    alternatives: [],
    coachNote: null,
    exercise: baseExercise,
    exerciseId: "exercise-1",
    id: "row-1",
    orderIndex: 0,
    reps: "10-12",
    restSeconds: 60,
    sets: 4,
    trainingSessionId: "session-1",
  });

  const removed = removeAssignedSessionExercise(updated, "row-1");
  assert.deepEqual(removed.weeks?.[0]?.days[0]?.session?.exercises, []);
});

test("replaces an assigned exercise snapshot while preserving prescription and alternatives", () => {
  const replacementExercise: Exercise = {
    ...baseExercise,
    equipment: "barbell",
    id: "exercise-2",
    mediaUrl: "https://example.com/front-squat.jpg",
    name: "Front squat",
    primaryMuscle: "legs",
  };
  const plan = createPlan();

  const updated = replaceAssignedSessionExercise(
    plan,
    {
      alternatives: [],
      coachNote: null,
      exerciseId: "exercise-2",
      id: "row-1",
      orderIndex: 0,
      reps: "5",
      restSeconds: 180,
      sets: 5,
      trainingSessionId: "session-1",
    },
    { exerciseId: "exercise-2" },
    replacementExercise,
  );

  const exercise = updated.weeks?.[0]?.days[0]?.session?.exercises[0];
  assert.equal(exercise?.exerciseId, "exercise-2");
  assert.equal(exercise?.exercise?.name, "Front squat");
  assert.equal(exercise?.exercise?.mediaUrl, "https://example.com/front-squat.jpg");
  assert.equal(exercise?.sets, 3);
  assert.equal(exercise?.reps, "10-12");
  assert.equal(exercise?.restSeconds, 60);
  assert.equal(exercise?.coachNote, "Tempo");
  assert.deepEqual(exercise?.alternatives, []);
});

test("merges partial session updates without dropping existing exercises", () => {
  const plan = createPlan();

  const updated = replaceAssignedSession(plan, {
    coachNote: "Updated note",
    description: "Updated description",
    id: "session-1",
    name: "Updated lower",
  });

  const session = updated.weeks?.[0]?.days[0]?.session;
  assert.equal(session?.name, "Updated lower");
  assert.equal(session?.exercises.length, 1);
  assert.equal(session?.exercises[0]?.exercise?.name, "Goblet squat");
});

test("finds hydrated duplicated weeks and exercises after a refresh", () => {
  const refreshedPlan = normalizeAssignedPlan({
    ...createPlan(),
    weeks: [
      ...(createPlan().weeks ?? []),
      {
        days: [
          {
            dayOfWeek: "wednesday",
            dayOrder: null,
            dayType: "training",
            id: "day-copy",
            session: {
              coachNote: null,
              description: null,
              exercises: [
                {
                  alternatives: [
                    {
                      alternativeExercise: { ...baseExercise, id: "exercise-alt", name: "Split squat" },
                      alternativeExerciseId: "exercise-alt",
                      id: "alt-real",
                      note: null,
                      sessionExerciseId: "row-copy",
                    },
                  ],
                  coachNote: null,
                  exercise: { ...baseExercise, id: "exercise-copy", name: "Front squat" },
                  exerciseId: "exercise-copy",
                  id: "row-copy",
                  orderIndex: 0,
                  reps: "8-10",
                  restSeconds: 90,
                  sets: 4,
                  trainingSessionId: "session-copy",
                },
              ],
              id: "session-copy",
              name: "Lower copy",
              trainingPlanDayId: "day-copy",
            },
            trainingPlanWeekId: "week-copy",
          },
        ],
        id: "week-copy",
        notes: null,
        trainingPlanId: "plan-1",
        weekNumber: 2,
      },
    ],
  });

  assert.equal(findAssignedWeek(refreshedPlan, "week-copy")?.days[0]?.session?.name, "Lower copy");
  assert.equal(
    findAssignedSessionExercise(refreshedPlan, "row-copy")?.alternatives[0]?.id,
    "alt-real",
  );
});

test("merges partial assignment updates without losing source plan or assignment fields", () => {
  const currentAssignment = {
    assignedPlan: createPlan(),
    assignment: {
      assignedPlanId: "plan-1",
      endedAt: null,
      id: "assignment-1",
      sourceTrainingPlanId: "template-1",
      startDate: "2026-01-01",
      status: "active" as const,
    },
    sourcePlan: { id: "template-1", name: "Template" },
  };

  const updated = mergeCurrentAssignmentUpdate(currentAssignment, {
    assignedPlan: { ...createPlan(), name: "Renamed plan", weeks: undefined },
  });

  assert.equal(updated?.sourcePlan?.name, "Template");
  assert.equal(updated?.assignment.id, "assignment-1");
  assert.equal(updated?.assignedPlan?.name, "Renamed plan");
  assert.equal(updated?.assignedPlan?.weeks?.[0]?.days[0]?.session?.exercises.length, 1);
});

test("reports a saved mutation with a failed refresh as reload-required", () => {
  assert.throws(
    () => requireHydratedMutationResult(null, "semana duplicada"),
    /La semana duplicada se guardo, pero no se pudo actualizar la vista/,
  );
});
