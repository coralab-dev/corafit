import assert from "node:assert/strict";
import test from "node:test";
import {
  getEditorContext,
  getPublicationChecklist,
  getSaveStateLabel,
  mergeSessionExerciseUpdate,
  parsePrescriptionUpdate,
} from "./training-plan-editor-utils.ts";

const basePlan = {
  isSystemTemplate: false,
  status: "draft",
  weeks: [],
};

test("selects the editor title and primary action from the plan context", () => {
  assert.deepEqual(getEditorContext(basePlan), {
    isReadOnly: false,
    primaryAction: "publish",
    title: "Editar plan",
  });
  assert.deepEqual(getEditorContext({ ...basePlan, status: "active" }), {
    isReadOnly: true,
    primaryAction: "unpublish",
    title: "Ver plan",
  });
  assert.deepEqual(getEditorContext({ ...basePlan, status: "archived" }), {
    isReadOnly: true,
    primaryAction: "duplicate-archived",
    title: "Ver plan archivado",
  });
  assert.deepEqual(getEditorContext({ ...basePlan, isSystemTemplate: true }), {
    isReadOnly: true,
    primaryAction: "duplicate-template",
    title: "Ver plantilla",
  });
});

test("builds a publication checklist and only blocks missing weeks or sessions", () => {
  assert.deepEqual(getPublicationChecklist(basePlan), {
    canPublish: false,
    emptySessionCount: 0,
    hasSessions: false,
    hasWeeks: false,
  });

  assert.deepEqual(
    getPublicationChecklist({
      ...basePlan,
      weeks: [
        {
          days: [
            { session: { exercises: [] } },
            { session: { exercises: [{ id: "exercise-1" }] } },
            { session: null },
          ],
        },
      ],
    }),
    {
      canPublish: true,
      emptySessionCount: 1,
      hasSessions: true,
      hasWeeks: true,
    },
  );
});

test("maps every save state to one of the four visible labels", () => {
  assert.equal(getSaveStateLabel("idle"), "Cambios guardados.");
  assert.equal(getSaveStateLabel("saved"), "Cambios guardados.");
  assert.equal(getSaveStateLabel("dirty"), "Cambios pendientes.");
  assert.equal(getSaveStateLabel("saving"), "Guardando…");
  assert.equal(getSaveStateLabel("error"), "Error al guardar.");
});

test("validates prescription values and avoids unchanged patches", () => {
  assert.deepEqual(parsePrescriptionUpdate("sets", "4", 3), {
    changed: true,
    error: null,
    value: 4,
  });
  assert.deepEqual(parsePrescriptionUpdate("sets", "3", 3), {
    changed: false,
    error: null,
    value: 3,
  });
  assert.deepEqual(parsePrescriptionUpdate("sets", "0", 3), {
    changed: false,
    error: "Usa un entero positivo o deja el campo vacío.",
  });
  assert.deepEqual(parsePrescriptionUpdate("restSeconds", "", 90), {
    changed: true,
    error: null,
    value: null,
  });
  assert.deepEqual(parsePrescriptionUpdate("reps", "   ", "10-12"), {
    changed: false,
    error: "Las repeticiones no pueden quedar vacías.",
  });
  assert.deepEqual(parsePrescriptionUpdate("reps", "8-10", "10-12"), {
    changed: true,
    error: null,
    value: "8-10",
  });
});

test("merges an exercise response without replacing newer local fields", () => {
  const current = {
    alternatives: [],
    coachNote: null,
    exerciseId: "exercise-1",
    id: "row-1",
    orderIndex: 0,
    reps: "8-10",
    restSeconds: 60,
    sets: 4,
    trainingSessionId: "session-1",
  };
  const staleResponse = { ...current, reps: "10-12", restSeconds: 90, sets: 3 };

  assert.deepEqual(
    mergeSessionExerciseUpdate(current, staleResponse, { sets: 3 }),
    { ...current, sets: 3 },
  );
});
