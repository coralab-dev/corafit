import { assert, test } from "vitest";
import {
  appendAssignedSessionExercise,
  normalizeAssignedPlan,
  replaceAssignedSessionExercise,
  removeAssignedSessionExercise,
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
              exercises: [],
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
    createPlan(),
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
