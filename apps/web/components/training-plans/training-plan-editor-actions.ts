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
  setIsArchiving: (isArchiving: boolean) => void;
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
  setIsArchiving,
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

  try {
    blurActiveEditorField();

    const didSave = await saveAllDrafts();
    if (!didSave) {
      setPublishState("error");
      return false;
    }

    await waitForMutations();
    await updatePlanStatus();

    setPublishState("saved");
    notifySuccess();
    redirect();
    return true;
  } catch (error) {
    setPublishState("error");
    notifyError(error);
    return false;
  } finally {
    globalActionInFlightRef.current = false;
    setIsArchiving(false);
  }
}
