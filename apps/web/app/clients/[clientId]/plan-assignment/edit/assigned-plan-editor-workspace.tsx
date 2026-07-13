"use client";

/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  EditIcon,
  Loader2Icon,
  MenuIcon,
  SaveIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { WorkspaceFrame, WorkspacePanel } from "@/components/layout/workspace-shell";
import { PlanTree, type PlanTreeEditor } from "@/components/training-plans/training-plan-tree";
import { TrainingSessionEditor } from "@/components/training-plans/training-session-editor";
import { dayLabels } from "@/components/training-plans/training-plan-days";
import {
  createExerciseDraftTracker,
  type ExerciseDraftTracker,
} from "@/components/training-plans/training-plan-editor-draft-state";
import {
  getSaveStateLabel,
  type SaveState,
} from "@/components/training-plans/training-plan-editor-utils";
import {
  createExerciseMutationQueue,
  createMutationQueue,
  type ExerciseMutationQueue,
  type MutationQueue,
} from "@/components/training-plans/training-plan-mutation-queue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCurrentAssignmentEditor } from "@/hooks/use-current-assignment-editor";
import type { Exercise } from "@/hooks/use-exercises";
import type {
  SessionExercise,
  TrainingPlan,
  TrainingPlanDay,
  TrainingPlanWeek,
  TrainingSession,
} from "@/hooks/use-training-plans";
import { levelLabels } from "@/lib/clients/api";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

type DraftPlan = Pick<
  TrainingPlan,
  "name" | "goal" | "level" | "durationWeeks" | "generalNotes"
>;
type DraftSession = Pick<TrainingSession, "name" | "description" | "coachNote">;
type ExerciseUpdate = Partial<
  Pick<SessionExercise, "exerciseId" | "sets" | "reps" | "restSeconds" | "coachNote">
>;

export function AssignedPlanEditorWorkspace() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const editor = useCurrentAssignmentEditor(clientId);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [planSaveState, setPlanSaveState] = useState<SaveState>("idle");
  const [sessionSaveState, setSessionSaveState] = useState<SaveState>("idle");
  const [planDraft, setPlanDraft] = useState<DraftPlan | null>(null);
  const [isPlanInfoOpen, setIsPlanInfoOpen] = useState(false);
  const [isStructureOpen, setIsStructureOpen] = useState(false);
  const [pendingMutationCount, setPendingMutationCount] = useState(0);
  const planDraftRef = useRef<DraftPlan | null>(null);
  const planDraftVersionRef = useRef(0);
  const planRef = useRef<TrainingPlan | null>(null);
  const planSaveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const mutationQueueRef = useRef<MutationQueue | null>(null);
  const exerciseMutationQueuesRef = useRef<ExerciseMutationQueue | null>(null);
  const exerciseDraftTrackerRef = useRef<ExerciseDraftTracker | null>(null);

  if (mutationQueueRef.current === null) {
    mutationQueueRef.current = createMutationQueue(setPendingMutationCount);
  }
  const mutationQueue = mutationQueueRef.current;
  if (exerciseMutationQueuesRef.current === null) {
    exerciseMutationQueuesRef.current = createExerciseMutationQueue(
      <T,>(action: () => Promise<T>) => enqueueMutation(action),
    );
  }
  const exerciseMutationQueue = exerciseMutationQueuesRef.current;
  if (exerciseDraftTrackerRef.current === null) {
    exerciseDraftTrackerRef.current = createExerciseDraftTracker();
  }
  const exerciseDraftTracker = exerciseDraftTrackerRef.current;

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
  const saveState = pendingMutationCount > 0
    ? "saving"
    : getCombinedSaveState(planSaveState, sessionSaveState);
  const isBusy =
    pendingMutationCount > 0 ||
    planSaveState === "saving" ||
    sessionSaveState === "saving";

  async function enqueueMutation<T>(action: () => Promise<T>): Promise<T> {
    return mutationQueue.enqueue(action);
  }

  function enqueueStructureMutation<T>(action: () => Promise<T>): Promise<T> {
    return enqueueMutation(action);
  }

  function enqueueExerciseUpdate(
    exerciseId: string,
    body: Record<string, unknown>,
    revisionAtStart: number,
    action: () => Promise<unknown>,
  ) {
    return exerciseMutationQueue.enqueue(exerciseId, async () => {
      try {
        const result = await action();
        exerciseDraftTracker.markPersisted(exerciseId, Object.keys(body), revisionAtStart);
        return result;
      } catch (error) {
        exerciseDraftTracker.markMutationError(exerciseId, Object.keys(body), true);
        throw error;
      }
    });
  }

  const treeEditor: PlanTreeEditor = {
    copyDay: (dayId, body) => enqueueStructureMutation(() => editor.copyDay(dayId, body)),
    createDay: (weekId, body) => enqueueStructureMutation(() => editor.createDay(weekId, body)),
    createSession: (dayId, body) => enqueueStructureMutation(() => editor.createSession(dayId, body)),
    createWeek: (body) => enqueueStructureMutation(() => editor.createWeek(body)),
    deleteDay: (dayId) => enqueueStructureMutation(() => editor.deleteDay(dayId)),
    deleteSession: (sessionId) => enqueueStructureMutation(() => editor.deleteSession(sessionId)),
    deleteWeek: (weekId) => enqueueStructureMutation(() => editor.deleteWeek(weekId)),
    duplicateWeek: (weekId) => enqueueStructureMutation(() => editor.duplicateWeek(weekId)),
    updateDay: (dayId, body) => enqueueStructureMutation(() => editor.updateDay(dayId, body)),
  };

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
    if (planSaveState !== "dirty" || !planDraft) {
      return;
    }

    const timer = window.setTimeout(() => {
      void savePlanDraft();
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [planDraft, planSaveState]);

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
  }, [planSaveState, sessionSaveState, planDraft]);

  async function savePlanDraft() {
    const operation = planSaveQueueRef.current.then(async () => {
      const draftToSave = planDraftRef.current;
      const currentPlan = planRef.current;
      if (!draftToSave || !currentPlan) {
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
    const didSavePlan = await savePlanDraft();
    if (!didSavePlan) {
      return false;
    }

    await mutationQueue.waitForIdle();
    await exerciseMutationQueue.waitForAll();
    return !exerciseDraftTracker.hasPendingDrafts() && !exerciseDraftTracker.hasErrors();
  }

  async function saveSessionInfo(sessionId: string, draft: DraftSession) {
    setSessionSaveState("saving");
    try {
      await enqueueMutation(() => editor.updateSession(sessionId, draft));
      setSessionSaveState("saved");
      return true;
    } catch (error) {
      setSessionSaveState("error");
      notify.error(getErrorMessage(error));
      return false;
    }
  }

  async function mutateStructure<T>(action: () => Promise<T>, success: string) {
    setSessionSaveState("saving");
    try {
      const result = await enqueueStructureMutation(action);
      setSessionSaveState("saved");
      notify.success(success);
      return result;
    } catch (error) {
      setSessionSaveState("error");
      notify.error(getErrorMessage(error));
      return null;
    }
  }

  async function mutateExercise(
    exerciseId: string,
    body: ExerciseUpdate,
    action: () => Promise<unknown>,
  ) {
    const revisionAtStart = exerciseDraftTracker.currentRevision;
    setSessionSaveState("saving");
    try {
      await enqueueExerciseUpdate(exerciseId, body, revisionAtStart, action);
      setSessionSaveState(exerciseDraftTracker.hasErrors()
        ? "error"
        : exerciseDraftTracker.hasPendingDrafts() ? "dirty" : "saved");
      return true;
    } catch (error) {
      setSessionSaveState("error");
      notify.error(getErrorMessage(error));
      return false;
    }
  }

  if (editor.isLoading && !plan) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
          Cargando plan asignado
        </span>
      </main>
    );
  }

  if (editor.error || !editor.assignment?.assignedPlan || !plan || !planDraft) {
    return (
      <main className="min-h-screen bg-background p-4 text-foreground">
        <div className="mx-auto max-w-3xl rounded-2xl border !border-transparent bg-card p-6 shadow-[var(--surface-shadow)]">
          <p className="text-sm font-semibold">
            {editor.error ? "No se pudo cargar el plan asignado" : "Sin asignacion activa"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {editor.error || "Este cliente no tiene un plan activo para editar."}
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link href={`/clients/${clientId}`}>
              <ChevronLeftIcon data-icon="inline-start" />
              Volver al cliente
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <WorkspaceFrame
      header={
        <AssignedPlanEditorHeader
          clientId={clientId}
          isBusy={isBusy}
          plan={plan}
          saveState={saveState}
          sourcePlanName={editor.assignment.sourcePlan?.name ?? null}
          onEditInformation={() => setIsPlanInfoOpen(true)}
          onSave={() => void saveAllDrafts()}
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
                ? `Semana ${selectedLocation.week.weekNumber} / ${dayLabels[selectedLocation.day.dayOfWeek]} - ${selectedSession?.name}`
                : "Selecciona una sesion"}
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
              editor={treeEditor}
              isBusy={isBusy}
              isReadOnly={false}
              plan={plan}
              scopeDescription="Estos cambios solo aplican a este cliente. La plantilla original no se modifica."
              selectedSessionId={selectedSession?.id}
              onMutationStateChange={setSessionSaveState}
              onSelectSession={setSelectedSessionId}
            />
          </div>

          {selectedSession && selectedLocation ? (
            <TrainingSessionEditor
              day={selectedLocation.day}
              isBusy={isBusy}
              isReadOnly={false}
              session={selectedSession}
              usedDays={selectedLocation.week.days.map((day) => day.dayOfWeek)}
              onDraftChange={(sessionExerciseId, field) => {
                exerciseDraftTracker.markDraft(sessionExerciseId, field);
                setSessionSaveState("dirty");
              }}
              onDraftCommit={(sessionExerciseId, field) => {
                exerciseDraftTracker.markUnchanged(sessionExerciseId, field);
                setSessionSaveState(exerciseDraftTracker.hasErrors()
                  ? "error"
                  : exerciseDraftTracker.hasPendingDrafts() ? "dirty" : "saved");
              }}
              onDraftValidationChange={(sessionExerciseId, field, hasError) => {
                exerciseDraftTracker.markValidationError(sessionExerciseId, field, hasError);
                setSessionSaveState(exerciseDraftTracker.hasErrors()
                  ? "error"
                  : exerciseDraftTracker.hasPendingDrafts() ? "dirty" : "saved");
              }}
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
                    "Sesion eliminada",
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
                  "Dia duplicado",
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
              onMoveDay={async (targetDay) => {
                const updatedDay = await mutateStructure(
                  () => editor.updateDay(selectedLocation.day.id, { dayOfWeek: targetDay }),
                  "Dia actualizado",
                );
                if (updatedDay?.session) {
                  setSelectedSessionId(updatedDay.session.id);
                }
                return Boolean(updatedDay);
              }}
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
              onReplaceExercise={(sessionExerciseId, replacement) =>
                mutateExercise(sessionExerciseId, { exerciseId: replacement.id }, () =>
                  editor.updateSessionExercise(
                    sessionExerciseId,
                    { exerciseId: replacement.id },
                    replacement,
                  ),
                )
              }
              onUpdateExercise={(sessionExerciseId, body) =>
                mutateExercise(sessionExerciseId, body, () =>
                  editor.updateSessionExercise(sessionExerciseId, body),
                )
              }
            />
          ) : (
            <WorkspacePanel className="min-h-72">
              <div className="flex min-h-72 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Crea o selecciona una sesion desde la estructura.
              </div>
            </WorkspacePanel>
          )}
        </div>
      </div>

      <Sheet open={isStructureOpen} onOpenChange={setIsStructureOpen}>
        <SheetContent side="left" className="flex w-[92vw] flex-col gap-0 border-none bg-background p-0 sm:max-w-md">
          <SheetHeader className="sr-only">
            <SheetTitle>Estructura del plan asignado</SheetTitle>
            <SheetDescription>Semanas, dias y sesiones de esta copia asignada.</SheetDescription>
          </SheetHeader>
          <PlanTree
            className="h-full max-h-none rounded-none shadow-none"
            editor={treeEditor}
            isBusy={isBusy}
            isReadOnly={false}
            plan={plan}
            scopeDescription="Estos cambios solo aplican a este cliente. La plantilla original no se modifica."
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
        description="Nombre, objetivo, nivel y notas de la copia asignada."
        open={isPlanInfoOpen}
        title="Informacion general"
        onOpenChange={setIsPlanInfoOpen}
      >
        <PlanDetails
          draft={planDraft}
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
    </WorkspaceFrame>
  );
}

function AssignedPlanEditorHeader({
  clientId,
  isBusy,
  onEditInformation,
  onSave,
  plan,
  saveState,
  sourcePlanName,
}: {
  clientId: string;
  isBusy: boolean;
  onEditInformation: () => void;
  onSave: () => void;
  plan: TrainingPlan;
  saveState: SaveState;
  sourcePlanName: string | null;
}) {
  return (
    <header className="border-b bg-background/90 px-4 py-4 backdrop-blur md:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 truncate text-2xl font-bold tracking-normal">{plan.name}</h1>
            <Badge variant="success">Copia asignada editable</Badge>
          </div>
          {sourcePlanName ? (
            <p className="mt-2 truncate text-sm text-muted-foreground">
              {sourcePlanName}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <SaveStatusChip state={saveState} />
          <Button asChild variant="outline">
            <Link href={`/clients/${clientId}`}>
              <ChevronLeftIcon data-icon="inline-start" />
              Volver al cliente
            </Link>
          </Button>
          <Button disabled={isBusy} type="button" variant="outline" onClick={onEditInformation}>
            <EditIcon data-icon="inline-start" />
            Editar informacion
          </Button>
          <Button disabled={isBusy} type="button" onClick={onSave}>
            {saveState === "saving" ? (
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : (
              <SaveIcon data-icon="inline-start" />
            )}
            Guardar ahora
          </Button>
        </div>
      </div>
    </header>
  );
}

function SaveStatusChip({ state }: { state: SaveState }) {
  const isError = state === "error";
  const isPending = state === "dirty";
  const isSaving = state === "saving";
  const Icon = isError ? AlertCircleIcon : isSaving ? Loader2Icon : isPending ? SaveIcon : CheckCircle2Icon;

  return (
    <span
      aria-atomic="true"
      aria-live="polite"
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold",
        isError && "border-destructive/25 bg-destructive/5 text-destructive",
        isPending && "border-amber-500/25 bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300",
        isSaving && "border-sky-500/25 bg-sky-50 text-sky-700 dark:bg-sky-950/45 dark:text-sky-300",
        !isError && !isPending && !isSaving && "border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300",
      )}
    >
      <Icon className={cn("size-4", isSaving && "animate-spin")} aria-hidden="true" />
      {getSaveStateLabel(state)}
    </span>
  );
}

function PlanDetails({
  draft,
  onChange,
  onSave,
  saveState,
}: {
  draft: DraftPlan;
  onChange: (draft: DraftPlan) => void;
  onSave: () => void;
  saveState: SaveState;
}) {
  return (
    <aside className="flex min-h-0 flex-1 flex-col">
      <div className="border-b bg-card px-5 py-5 pr-16">
        <h2 className="text-lg font-semibold">Informacion general</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Ajusta solo la copia asignada a este cliente.
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto bg-background px-5 py-5">
        <div className="grid gap-4">
          <Field label="Nombre">
            <Input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
          </Field>
          <Field label="Objetivo">
            <Input value={draft.goal ?? ""} onChange={(event) => onChange({ ...draft, goal: event.target.value || null })} />
          </Field>
          <Field label="Nivel">
            <select
              className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
              value={draft.level ?? ""}
              onChange={(event) => onChange({ ...draft, level: event.target.value || null })}
            >
              <option value="">Sin nivel</option>
              <option value="beginner">{levelLabels.beginner}</option>
              <option value="intermediate">{levelLabels.intermediate}</option>
              <option value="advanced">{levelLabels.advanced}</option>
            </select>
          </Field>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/35 p-3">
            <div>
              <p className="text-sm font-medium">Duracion calculada</p>
              <p className="text-xs text-muted-foreground">Se actualiza desde Estructura.</p>
            </div>
            <p className="text-right text-sm font-semibold">{draft.durationWeeks} semanas</p>
          </div>
          <Field label="Notas generales">
            <textarea
              className="min-h-28 rounded-xl border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
              value={draft.generalNotes ?? ""}
              onChange={(event) => onChange({ ...draft, generalNotes: event.target.value || null })}
            />
          </Field>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-card px-5 py-4">
        <p className="text-sm text-muted-foreground">Autosave cada 2 segundos / Ctrl/Cmd + S</p>
        <Button disabled={saveState === "saving"} type="button" variant="outline" onClick={onSave}>
          {saveState === "saving" ? (
            <Loader2Icon className="animate-spin" data-icon="inline-start" />
          ) : (
            <SaveIcon data-icon="inline-start" />
          )}
          Guardar ahora
        </Button>
      </div>
    </aside>
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
  return error instanceof Error ? error.message : "No se pudo guardar el cambio";
}
