"use client";

/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  Loader2Icon,
  MenuIcon,
  SaveIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { WorkspaceFrame, WorkspacePanel } from "@/components/layout/workspace-shell";
import { PlanTree } from "@/components/training-plans/training-plan-tree";
import { TrainingPlanEditorHeader } from "@/components/training-plans/training-plan-editor-header";
import { TrainingSessionEditor } from "@/components/training-plans/training-session-editor";
import {
  getEditorContext,
  getPublicationChecklist,
  type SaveState,
} from "@/components/training-plans/training-plan-editor-utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  DayOfWeek,
  TrainingPlan,
  TrainingPlanDay,
  TrainingPlanWeek,
  TrainingSession,
} from "@/hooks/use-training-plans";
import { useTrainingPlanEditor } from "@/hooks/use-training-plans";
import type { Exercise } from "@/hooks/use-exercises";
import { notify } from "@/lib/notify";

type DraftPlan = Pick<
  TrainingPlan,
  "name" | "goal" | "level" | "durationWeeks" | "generalNotes"
>;
type DraftSession = Pick<TrainingSession, "name" | "description" | "coachNote">;

const levelLabels: Record<string, string> = {
  advanced: "Avanzado",
  beginner: "Principiante",
  intermediate: "Intermedio",
};

const dayLabels: Record<DayOfWeek, string> = {
  friday: "Viernes",
  monday: "Lunes",
  saturday: "Sábado",
  sunday: "Domingo",
  thursday: "Jueves",
  tuesday: "Martes",
  wednesday: "Miércoles",
};

export function TrainingPlanEditorWorkspace() {
  const params = useParams<{ planId: string }>();
  const router = useRouter();
  const editor = useTrainingPlanEditor(params.planId);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [planSaveState, setPlanSaveState] = useState<SaveState>("idle");
  const [sessionSaveState, setSessionSaveState] = useState<SaveState>("idle");
  const [publishState, setPublishState] = useState<SaveState>("idle");
  const [planDraft, setPlanDraft] = useState<DraftPlan | null>(null);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isPlanInfoOpen, setIsPlanInfoOpen] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isStructureOpen, setIsStructureOpen] = useState(false);
  const planDraftRef = useRef<DraftPlan | null>(null);
  const planDraftVersionRef = useRef(0);
  const planRef = useRef<TrainingPlan | null>(null);
  const planSaveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));

  const plan = editor.plan;
  planRef.current = plan;
  const sessions = useMemo(() => getSessions(plan), [plan]);
  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? sessions[0],
    [selectedSessionId, sessions],
  );
  const selectedLocation = useMemo(
    () => findSessionLocation(plan, selectedSession?.id),
    [plan, selectedSession?.id],
  );
  const totalExercises = useMemo(
    () => sessions.reduce((total, session) => total + session.exercises.length, 0),
    [sessions],
  );
  const context = plan ? getEditorContext(plan) : null;
  const isReadOnly = context?.isReadOnly ?? true;
  const saveState = getCombinedSaveState(planSaveState, sessionSaveState);
  const publicationChecklist = plan ? getPublicationChecklist(plan) : null;

  useEffect(() => {
    if (!plan) {
      return;
    }

    if (planSaveState === "idle" || planSaveState === "saved") {
      const nextDraft = {
        durationWeeks: plan.durationWeeks,
        generalNotes: plan.generalNotes,
        goal: plan.goal,
        level: plan.level,
        name: plan.name,
      };
      planDraftRef.current = nextDraft;
      setPlanDraft(nextDraft);
    }

    if (!selectedSessionId && sessions[0]) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [plan, planSaveState, selectedSessionId, sessions]);

  useEffect(() => {
    if (planSaveState !== "dirty" || isReadOnly || !planDraft) {
      return;
    }

    const timer = window.setTimeout(() => {
      void savePlanDraft();
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [isReadOnly, planDraft, planSaveState]);

  useEffect(() => {
    if (planSaveState !== "dirty" && sessionSaveState !== "dirty") {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [planSaveState, sessionSaveState]);

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") {
        return;
      }
      if (isReadOnly) {
        return;
      }

      event.preventDefault();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.setTimeout(() => {
        void saveAllDrafts();
      }, 0);
    };

    window.addEventListener("keydown", handleSaveShortcut);
    return () => window.removeEventListener("keydown", handleSaveShortcut);
  }, [isReadOnly, planSaveState, sessionSaveState, planDraft]);

  async function savePlanDraft() {
    const operation = planSaveQueueRef.current.then(async () => {
      const draftToSave = planDraftRef.current;
      const currentPlan = planRef.current;
      if (!draftToSave || isReadOnly || !currentPlan) {
        return true;
      }
      if (!hasPlanDraftChanged(draftToSave, currentPlan)) {
        setPlanSaveState("saved");
        return true;
      }

      const versionAtStart = planDraftVersionRef.current;
      setPlanSaveState("saving");
      try {
        await editor.updatePlan(draftToSave);
        setPlanSaveState(
          planDraftVersionRef.current === versionAtStart ? "saved" : "dirty",
        );
        return true;
      } catch (error) {
        setPlanSaveState("error");
        notify.error(getErrorMessage(error));
        return false;
      }
    });

    planSaveQueueRef.current = operation.catch(() => false);
    return operation;
  }

  async function saveAllDrafts() {
    return savePlanDraft();
  }

  async function saveSessionInfo(sessionId: string, draft: DraftSession) {
    if (isReadOnly) {
      return false;
    }

    setSessionSaveState("saving");
    try {
      await editor.updateSession(sessionId, draft);
      setSessionSaveState("saved");
      return true;
    } catch (error) {
      setSessionSaveState("error");
      notify.error(getErrorMessage(error));
      return false;
    }
  }

  async function mutateStructure<T>(action: () => Promise<T>, success: string) {
    if (isReadOnly) {
      return null;
    }

    setSessionSaveState("saving");
    try {
      const result = await action();
      setSessionSaveState("saved");
      notify.success(success);
      return result;
    } catch (error) {
      setSessionSaveState("error");
      notify.error(getErrorMessage(error));
      return null;
    }
  }

  async function mutateExercise(action: () => Promise<unknown>) {
    if (isReadOnly) {
      return false;
    }

    setSessionSaveState("saving");
    try {
      await action();
      setSessionSaveState("saved");
      return true;
    } catch (error) {
      setSessionSaveState("error");
      notify.error(getErrorMessage(error));
      return false;
    }
  }

  async function publishPlan() {
    if (!plan || !publicationChecklist?.canPublish || publishState === "saving") {
      return;
    }

    setPublishState("saving");
    const didSave = await saveAllDrafts();
    if (!didSave) {
      setPublishState("error");
      return;
    }

    try {
      await editor.updatePlanStatus("active");
      await editor.loadPlan();
      setPublishState("saved");
      setIsPublishDialogOpen(false);
      notify.success("Plan publicado");
    } catch (error) {
      setPublishState("error");
      notify.error(getErrorMessage(error));
    }
  }

  async function unpublishPlan() {
    if (!plan || publishState === "saving") {
      return;
    }

    setPublishState("saving");
    try {
      await editor.updatePlanStatus("draft");
      await editor.loadPlan();
      setPublishState("saved");
      notify.success("Plan despublicado");
    } catch (error) {
      setPublishState("error");
      notify.error(getErrorMessage(error));
    }
  }

  async function duplicateForEditing() {
    if (!plan || publishState === "saving") {
      return;
    }

    setPublishState("saving");
    try {
      const copy = await editor.duplicatePlan();
      notify.success("Copia creada para editar");
      router.push(`/training-plans/${copy.id}/edit`);
    } catch (error) {
      setPublishState("error");
      notify.error(getErrorMessage(error));
    }
  }

  async function archivePlan() {
    if (!plan || plan.isSystemTemplate || plan.status === "archived") {
      return false;
    }

    setIsArchiving(true);
    setPublishState("saving");
    try {
      await editor.updatePlanStatus("archived");
      setPublishState("saved");
      notify.success("Plan archivado");
      router.push("/training-plans");
      return true;
    } catch (error) {
      setPublishState("error");
      notify.error(getErrorMessage(error));
      return false;
    } finally {
      setIsArchiving(false);
    }
  }

  if (editor.isLoading && !plan) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
          Cargando plan
        </span>
      </main>
    );
  }

  if (editor.error || !plan || !planDraft || !context) {
    return (
      <main className="min-h-screen bg-background p-4 text-foreground">
        <div className="mx-auto max-w-3xl rounded-2xl border !border-transparent bg-card p-6 shadow-[var(--surface-shadow)]">
          <p className="text-sm text-destructive">{editor.error || "Plan no disponible."}</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/training-plans">Volver a planes</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <WorkspaceFrame
      header={
        <TrainingPlanEditorHeader
          exerciseCount={totalExercises}
          plan={plan}
          publishState={publishState}
          saveState={saveState}
          sessionCount={sessions.length}
          onArchivePlan={() => setIsArchiveDialogOpen(true)}
          onDuplicatePlan={() => void duplicateForEditing()}
          onEditInformation={() => setIsPlanInfoOpen(true)}
          onPublish={() => setIsPublishDialogOpen(true)}
          onSave={() => void saveAllDrafts()}
          onUnpublish={() => void unpublishPlan()}
        />
      }
    >
      <div className="flex flex-1 flex-col gap-3 bg-background p-3 sm:p-4 md:p-5">
        <button
          className="flex w-full items-center justify-between gap-3 rounded-2xl border !border-transparent bg-card px-4 py-3 text-left shadow-[var(--surface-shadow-soft)] lg:hidden"
          type="button"
          onClick={() => setIsStructureOpen(true)}
        >
          <span className="min-w-0">
            <span className="block text-xs font-medium text-muted-foreground">Estructura</span>
            <span className="mt-1 block truncate text-sm font-semibold">
              {selectedLocation
                ? `Semana ${selectedLocation.week.weekNumber} / ${dayLabels[selectedLocation.day.dayOfWeek]} — ${selectedSession?.name}`
                : "Selecciona una sesión"}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary">
            <MenuIcon className="size-4" aria-hidden="true" />
            Abrir
          </span>
        </button>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="hidden lg:block">
            <PlanTree
              className="sticky top-4"
              editor={editor}
              isReadOnly={isReadOnly}
              plan={plan}
              selectedSessionId={selectedSession?.id}
              onMutationStateChange={setSessionSaveState}
              onSelectSession={setSelectedSessionId}
            />
          </div>

          {selectedSession && selectedLocation ? (
            <TrainingSessionEditor
              day={selectedLocation.day}
              isReadOnly={isReadOnly}
              session={selectedSession}
              usedDays={selectedLocation.week.days.map((day) => day.dayOfWeek)}
              onAddExercise={async (exercise: Exercise) => {
                const created = await mutateStructure(
                  () =>
                    editor.addSessionExercise(
                      selectedSession.id,
                      { exerciseId: exercise.id, reps: "10-12", sets: 3 },
                      exercise,
                    ),
                  "Ejercicio agregado",
                );
                return created?.id ?? null;
              }}
              onAddAlternative={async (sessionExerciseId, exercise) =>
                Boolean(
                  await mutateStructure(
                    () =>
                      editor.addAlternative(
                        sessionExerciseId,
                        { alternativeExerciseId: exercise.id },
                        exercise,
                      ),
                    "Alternativa agregada",
                  ),
                )
              }
              onDeleteAlternative={(alternativeId) => {
                void mutateStructure(
                  () => editor.deleteAlternative(alternativeId),
                  "Alternativa eliminada",
                );
              }}
              onDeleteExercise={async (sessionExerciseId) =>
                Boolean(
                  await mutateStructure(
                    () => editor.deleteSessionExercise(sessionExerciseId),
                    "Ejercicio eliminado",
                  ),
                )
              }
              onDeleteSession={async () => {
                const didDelete = Boolean(
                  await mutateStructure(
                    () => editor.deleteSession(selectedSession.id),
                    "Sesión eliminada",
                  ),
                );
                if (didDelete) {
                  setSelectedSessionId("");
                }
                return didDelete;
              }}
              onDuplicateDay={async (targetDay) => {
                const copiedDay = await mutateStructure(
                  () => editor.copyDay(selectedLocation.day.id, { dayOfWeek: targetDay }),
                  "Día duplicado",
                );
                if (copiedDay?.session) {
                  setSelectedSessionId(copiedDay.session.id);
                }
                return Boolean(copiedDay);
              }}
              onDuplicateExercise={(sessionExerciseId) => {
                void mutateStructure(
                  () => editor.duplicateSessionExercise(sessionExerciseId),
                  "Ejercicio duplicado",
                );
              }}
              onMoveDay={async (targetDay) =>
                Boolean(
                  await mutateStructure(
                    () => editor.updateDay(selectedLocation.day.id, { dayOfWeek: targetDay }),
                    "Día actualizado",
                  ),
                )
              }
              onMoveExercise={(sessionExercise, direction) => {
                const exercises = [...selectedSession.exercises].sort(
                  (first, second) => first.orderIndex - second.orderIndex,
                );
                const index = exercises.findIndex((item) => item.id === sessionExercise.id);
                const swapIndex = direction === "up" ? index - 1 : index + 1;
                if (swapIndex < 0 || swapIndex >= exercises.length) {
                  return;
                }
                const reordered = [...exercises];
                [reordered[index], reordered[swapIndex]] = [
                  reordered[swapIndex],
                  reordered[index],
                ];
                void mutateStructure(
                  () =>
                    editor.reorderSessionExercises(
                      reordered.map((item, orderIndex) => ({
                        orderIndex,
                        sessionExerciseId: item.id,
                      })),
                    ),
                  "Orden actualizado",
                );
              }}
              onSaveSessionInfo={saveSessionInfo}
              onUpdateExercise={(sessionExerciseId, body) =>
                mutateExercise(() => editor.updateSessionExercise(sessionExerciseId, body))
              }
            />
          ) : (
            <WorkspacePanel className="min-h-72">
              <div className="flex min-h-72 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Crea o selecciona una sesión desde la estructura.
              </div>
            </WorkspacePanel>
          )}
        </div>
      </div>

      <Sheet open={isStructureOpen} onOpenChange={setIsStructureOpen}>
        <SheetContent side="left" className="flex w-[92vw] flex-col gap-0 border-none bg-background p-0 sm:max-w-md">
          <SheetHeader className="sr-only">
            <SheetTitle>Estructura del plan</SheetTitle>
            <SheetDescription>Semanas, días y sesiones del plan.</SheetDescription>
          </SheetHeader>
          <PlanTree
            className="h-full max-h-none rounded-none shadow-none"
            editor={editor}
            isReadOnly={isReadOnly}
            plan={plan}
            selectedSessionId={selectedSession?.id}
            onMutationStateChange={setSessionSaveState}
            onSelectSession={(sessionId) => {
              setSelectedSessionId(sessionId);
              setIsStructureOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>

      <DetailDrawer
        description="Nombre, objetivo, nivel y notas del plan."
        open={isPlanInfoOpen}
        title="Información general"
        onOpenChange={setIsPlanInfoOpen}
      >
        <PlanDetails
          draft={planDraft}
          isReadOnly={isReadOnly}
          saveState={planSaveState}
          onChange={(draft) => {
            planDraftVersionRef.current += 1;
            planDraftRef.current = draft;
            setPlanDraft(draft);
            setPlanSaveState("dirty");
          }}
          onSave={() => void savePlanDraft()}
        />
      </DetailDrawer>

      {publicationChecklist ? (
        <PublishPlanDialog
          checklist={publicationChecklist}
          isLoading={publishState === "saving"}
          open={isPublishDialogOpen}
          onOpenChange={setIsPublishDialogOpen}
          onPublish={() => void publishPlan()}
        />
      ) : null}

      <ConfirmActionDialog
        confirmLabel="Archivar plan"
        consequence="El plan dejará de aparecer en la biblioteca principal. Podrás duplicarlo más adelante para volver a editarlo."
        description={plan.name}
        isLoading={isArchiving}
        open={isArchiveDialogOpen}
        title={`Archivar ${plan.name}`}
        onOpenChange={setIsArchiveDialogOpen}
        onConfirm={archivePlan}
      />
    </WorkspaceFrame>
  );
}

function PublishPlanDialog({
  checklist,
  isLoading,
  onOpenChange,
  onPublish,
  open,
}: {
  checklist: ReturnType<typeof getPublicationChecklist>;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: () => void;
  open: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isLoading && onOpenChange(nextOpen)}>
      <DialogContent className="rounded-2xl border !border-transparent shadow-[var(--surface-shadow)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publicar plan</DialogTitle>
          <DialogDescription>
            Revisa la estructura antes de hacer visible este plan.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <ChecklistItem
            complete={checklist.hasWeeks}
            label={checklist.hasWeeks ? "El plan tiene semanas" : "Agrega al menos una semana"}
          />
          <ChecklistItem
            complete={checklist.hasSessions}
            label={checklist.hasSessions ? "Existe al menos una sesión" : "Agrega al menos una sesión"}
          />
          {checklist.emptySessionCount > 0 ? (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/45 dark:text-amber-200">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                {checklist.emptySessionCount} sesiones todavía no tienen ejercicios. Puedes publicar de todas formas.
              </span>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button disabled={isLoading} type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!checklist.canPublish || isLoading} type="button" onClick={onPublish}>
            {isLoading ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : null}
            Publicar plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChecklistItem({ complete, label }: { complete: boolean; label: string }) {
  const Icon = complete ? CheckCircle2Icon : XCircleIcon;
  return (
    <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-3 text-sm">
      <Icon className={complete ? "size-4 text-emerald-600 dark:text-emerald-300" : "size-4 text-destructive"} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function PlanDetails({
  draft,
  isReadOnly,
  onChange,
  onSave,
  saveState,
}: {
  draft: DraftPlan;
  isReadOnly: boolean;
  onChange: (draft: DraftPlan) => void;
  onSave: () => void;
  saveState: SaveState;
}) {
  return (
    <aside className="flex min-h-0 flex-1 flex-col">
      <div className="border-b bg-card px-5 py-5 pr-16">
        <h2 className="text-lg font-semibold">Información general</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Nombre, objetivo, nivel y notas del plan.
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto bg-background px-5 py-5">
        <div className="grid gap-4">
          <Field label="Nombre">
            <Input disabled={isReadOnly} value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
          </Field>
          <Field label="Objetivo">
            <Input disabled={isReadOnly} value={draft.goal ?? ""} onChange={(event) => onChange({ ...draft, goal: event.target.value || null })} />
          </Field>
          <Field label="Nivel">
            <select
              className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
              disabled={isReadOnly}
              value={draft.level ?? ""}
              onChange={(event) => onChange({ ...draft, level: event.target.value || null })}
            >
              <option value="">Sin nivel</option>
              <option value="beginner">{levelLabels.beginner}</option>
              <option value="intermediate">{levelLabels.intermediate}</option>
              <option value="advanced">{levelLabels.advanced}</option>
            </select>
          </Field>
          <DurationSummary weeks={draft.durationWeeks} />
          <Field label="Notas generales">
            <textarea
              className="min-h-28 rounded-xl border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
              disabled={isReadOnly}
              value={draft.generalNotes ?? ""}
              onChange={(event) => onChange({ ...draft, generalNotes: event.target.value || null })}
            />
          </Field>
        </div>
      </div>
      {!isReadOnly ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">Autosave cada 2 segundos · Ctrl/Cmd + S</p>
          <Button disabled={saveState === "saving"} type="button" variant="outline" onClick={onSave}>
            {saveState === "saving" ? (
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : (
              <SaveIcon data-icon="inline-start" />
            )}
            Guardar ahora
          </Button>
        </div>
      ) : null}
    </aside>
  );
}

function DurationSummary({ weeks }: { weeks: number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/35 p-3">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-card text-muted-foreground">
          <CalendarDaysIcon className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-medium">Duración calculada</p>
          <p className="text-xs text-muted-foreground">Se actualiza desde Estructura.</p>
        </div>
      </div>
      <p className="text-right text-sm font-semibold">{weeks} semanas</p>
    </div>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

function getSessions(plan: TrainingPlan | null) {
  return (
    plan?.weeks?.flatMap((week) =>
      week.days.flatMap((day) => (day.session ? [day.session] : [])),
    ) ?? []
  );
}

function findSessionLocation(
  plan: TrainingPlan | null,
  sessionId?: string,
): { day: TrainingPlanDay; week: TrainingPlanWeek } | null {
  if (!plan || !sessionId) {
    return null;
  }

  for (const week of plan.weeks ?? []) {
    const day = week.days.find((item) => item.session?.id === sessionId);
    if (day) {
      return { day, week };
    }
  }
  return null;
}

function hasPlanDraftChanged(draft: DraftPlan, plan: TrainingPlan) {
  return (
    draft.name !== plan.name ||
    draft.goal !== plan.goal ||
    draft.level !== plan.level ||
    draft.durationWeeks !== plan.durationWeeks ||
    draft.generalNotes !== plan.generalNotes
  );
}

function getCombinedSaveState(planState: SaveState, sessionState: SaveState): SaveState {
  if (planState === "error" || sessionState === "error") return "error";
  if (planState === "saving" || sessionState === "saving") return "saving";
  if (planState === "dirty" || sessionState === "dirty") return "dirty";
  if (planState === "saved" || sessionState === "saved") return "saved";
  return "idle";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado";
}
