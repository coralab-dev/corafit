export type ExerciseDraftTracker = {
  readonly currentRevision: number;
  hasErrors(): boolean;
  hasPendingDrafts(): boolean;
  markDraft(exerciseId: string, field: string): void;
  markMutationError(exerciseId: string, fields: string[], hasError: boolean): void;
  markPersisted(exerciseId: string, fields: string[], revisionAtStart: number): void;
  markUnchanged(exerciseId: string, field: string): void;
  markValidationError(exerciseId: string, field: string, hasError: boolean): void;
};

type ExerciseDraftState = {
  draftFields: Map<string, number>;
  invalidFields: Set<string>;
  mutationErrors: Set<string>;
};

export function createExerciseDraftTracker(): ExerciseDraftTracker {
  const states = new Map<string, ExerciseDraftState>();
  let revision = 0;

  function getState(exerciseId: string) {
    const current = states.get(exerciseId);
    if (current) {
      return current;
    }

    const next = {
      draftFields: new Map<string, number>(),
      invalidFields: new Set<string>(),
      mutationErrors: new Set<string>(),
    };
    states.set(exerciseId, next);
    return next;
  }

  function cleanup(exerciseId: string) {
    const state = states.get(exerciseId);
    if (
      state &&
      state.draftFields.size === 0 &&
      state.invalidFields.size === 0 &&
      state.mutationErrors.size === 0
    ) {
      states.delete(exerciseId);
    }
  }

  return {
    get currentRevision() {
      return revision;
    },
    hasErrors() {
      return [...states.values()].some(
        (state) => state.invalidFields.size > 0 || state.mutationErrors.size > 0,
      );
    },
    hasPendingDrafts() {
      return [...states.values()].some((state) => state.draftFields.size > 0);
    },
    markDraft(exerciseId: string, field: string) {
      revision += 1;
      getState(exerciseId).draftFields.set(field, revision);
    },
    markMutationError(exerciseId: string, fields: string[], hasError: boolean) {
      const state = getState(exerciseId);
      for (const field of fields) {
        if (hasError) {
          state.mutationErrors.add(field);
        } else {
          state.mutationErrors.delete(field);
        }
      }
      cleanup(exerciseId);
    },
    markPersisted(exerciseId: string, fields: string[], revisionAtStart: number) {
      const state = getState(exerciseId);
      for (const field of fields) {
        const draftRevision = state.draftFields.get(field);
        if (draftRevision !== undefined && draftRevision <= revisionAtStart) {
          state.draftFields.delete(field);
        }
        state.mutationErrors.delete(field);
      }
      cleanup(exerciseId);
    },
    markUnchanged(exerciseId: string, field: string) {
      const state = getState(exerciseId);
      state.draftFields.delete(field);
      state.mutationErrors.delete(field);
      cleanup(exerciseId);
    },
    markValidationError(exerciseId: string, field: string, hasError: boolean) {
      const state = getState(exerciseId);
      if (hasError) {
        state.invalidFields.add(field);
      } else {
        state.invalidFields.delete(field);
      }
      cleanup(exerciseId);
    },
  };
}
