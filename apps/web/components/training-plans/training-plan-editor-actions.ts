import type { SaveState } from "./training-plan-editor-utils";

export type ArchivePlanOptions = {
  blurActiveEditorField: () => void;
  globalActionInFlightRef: { current: boolean };
  isBusy: boolean;
  notifyError: (error: unknown) => void;
  notifySuccess: () => void;
  plan: {
    isSystemTemplate?: boolean;
    status: string;
  } | null;
  redirect: () => void;
  saveAllDrafts: () => Promise<boolean>;
  getErrorMessage?: (error: unknown) => string;
  setIsArchiving: (isArchiving: boolean) => void;
  setErrorMessage?: (message: string | null) => void;
  setPublishState: (state: SaveState) => void;
  updatePlanStatus: () => Promise<unknown>;
  waitForMutations: () => Promise<void>;
};

export async function archiveTrainingPlan({
  blurActiveEditorField,
  globalActionInFlightRef,
  isBusy,
  notifyError,
  notifySuccess,
  plan,
  redirect,
  saveAllDrafts,
  getErrorMessage,
  setIsArchiving,
  setErrorMessage,
  setPublishState,
  updatePlanStatus,
  waitForMutations,
}: ArchivePlanOptions): Promise<boolean> {
  if (
    !plan ||
    plan.isSystemTemplate ||
    plan.status === "archived" ||
    isBusy ||
    globalActionInFlightRef.current
  ) {
    return false;
  }

  globalActionInFlightRef.current = true;
  setIsArchiving(true);
  setPublishState("saving");
  setErrorMessage?.(null);

  try {
    blurActiveEditorField();

    const didSave = await saveAllDrafts();
    if (!didSave) {
      setPublishState("error");
      setErrorMessage?.(
        "No se pueden archivar los cambios pendientes. Corrige los campos inválidos y vuelve a intentarlo.",
      );
      return false;
    }

    await waitForMutations();
    await updatePlanStatus();

    setPublishState("saved");
    setErrorMessage?.(null);
    notifySuccess();
    redirect();
    return true;
  } catch (error) {
    setPublishState("error");
    setErrorMessage?.(getErrorMessage?.(error) ?? "No se pudo archivar el plan.");
    notifyError(error);
    return false;
  } finally {
    globalActionInFlightRef.current = false;
    setIsArchiving(false);
  }
}
