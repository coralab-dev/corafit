"use client";

/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  CopyIcon,
  EditIcon,
  DumbbellIcon,
  ImageIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type React from "react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { notify } from "@/lib/notify";
import { ExerciseSearch } from "@/components/exercise-search";
import {
  WorkspaceFrame,
  WorkspaceHeader,
  WorkspacePanel,
} from "@/components/layout/workspace-shell";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { MetricStrip } from "@/components/shared/metric-strip";
import { PlanTree } from "@/components/training-plans/training-plan-tree";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  type SessionExercise,
  type SessionExerciseAlternative,
  type TrainingPlan,
  type TrainingSession,
  useTrainingPlanEditor,
} from "@/hooks/use-training-plans";
import type { Exercise } from "@/hooks/use-exercises";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
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

const muscleLabels: Record<string, string> = {
  back: "Espalda",
  biceps: "Biceps",
  chest: "Pecho",
  core: "Core",
  glute: "Gluteo",
  legs: "Pierna",
  shoulder: "Hombro",
  triceps: "Triceps",
};

const equipmentLabels: Record<string, string> = {
  barbell: "Barra",
  bodyweight: "Peso corporal",
  cable: "Cable",
  dumbbell: "Mancuernas",
  machine: "Maquina",
  other: "Otro",
};

const statusLabels: Record<string, string> = {
  active: "Activo",
  archived: "Archivado",
  draft: "Draft",
};

export function TrainingPlanEditorWorkspace() {
  const params = useParams<{ planId: string }>();
  const router = useRouter();
  const planId = params.planId;
  const editor = useTrainingPlanEditor(planId);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [planSaveState, setPlanSaveState] = useState<SaveState>("idle");
  const [sessionSaveState, setSessionSaveState] = useState<SaveState>("idle");
  const [publishState, setPublishState] = useState<SaveState>("idle");
  const [planDraft, setPlanDraft] = useState<DraftPlan | null>(null);
  const [sessionDraft, setSessionDraft] = useState<DraftSession | null>(null);
  const [isPlanInfoOpen, setIsPlanInfoOpen] = useState(false);

  const plan = editor.plan;
  const sessions = useMemo(() => getSessions(plan), [plan]);
  const selectedSession = useMemo(
    () =>
      sessions.find((session) => session.id === selectedSessionId) ??
      sessions[0],
    [selectedSessionId, sessions],
  );
  const totalExercises = useMemo(
    () =>
      sessions.reduce(
        (total, session) => total + (session.exercises?.length ?? 0),
        0,
      ),
    [sessions],
  );
  const isSystemTemplate = Boolean(plan?.isSystemTemplate);
  const isReadOnly = isSystemTemplate || plan?.status !== "draft";
  const saveState = getCombinedSaveState(planSaveState, sessionSaveState);
  const handleSelectSession = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
  }, []);

  useEffect(() => {
    if (!plan) {
      return;
    }
    if (planSaveState !== "dirty" && planSaveState !== "saving") {
      setPlanDraft({
        durationWeeks: plan.durationWeeks,
        generalNotes: plan.generalNotes,
        goal: plan.goal,
        level: plan.level,
        name: plan.name,
      });
    }
    if (!selectedSessionId && sessions[0]) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [plan, planSaveState, selectedSessionId, sessions]);

  useEffect(() => {
    if (!selectedSession) {
      setSessionDraft(null);
      return;
    }
    if (sessionSaveState === "dirty" || sessionSaveState === "saving") {
      return;
    }
    setSessionDraft({
      coachNote: selectedSession.coachNote,
      description: selectedSession.description,
      name: selectedSession.name,
    });
  }, [selectedSession, sessionSaveState]);

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

  async function savePlanDraft() {
    if (!planDraft || isReadOnly) {
      return;
    }

    setPlanSaveState("saving");
    try {
      await editor.updatePlan(planDraft);
      setPlanSaveState("saved");
    } catch (caughtError) {
      setPlanSaveState("error");
      notify.error(getErrorMessage(caughtError));
    }
  }

  async function saveSessionDraft() {
    if (!selectedSession || !sessionDraft || isReadOnly) {
      return;
    }

    setSessionSaveState("saving");
    try {
      const updatedSession = await editor.updateSession(
        selectedSession.id,
        sessionDraft,
      );
      setSessionDraft({
        coachNote: updatedSession.coachNote,
        description: updatedSession.description,
        name: updatedSession.name,
      });
      setSessionSaveState("saved");
    } catch (caughtError) {
      setSessionSaveState("error");
      notify.error(getErrorMessage(caughtError));
    }
  }

  async function saveSessionInfo(
    sessionId: string,
    draft: DraftSession,
  ): Promise<boolean> {
    if (isReadOnly) {
      return false;
    }

    setSessionSaveState("saving");
    try {
      const updatedSession = await editor.updateSession(sessionId, draft);
      if (selectedSession?.id === sessionId) {
        setSessionDraft({
          coachNote: updatedSession.coachNote,
          description: updatedSession.description,
          name: updatedSession.name,
        });
      }
      setSessionSaveState("saved");
      notify.success("Sesion actualizada");
      return true;
    } catch (caughtError) {
      setSessionSaveState("error");
      notify.error(getErrorMessage(caughtError));
      return false;
    }
  }

  async function saveAllDrafts() {
    await Promise.all([savePlanDraft(), saveSessionDraft()]);
  }

  async function mutateStructure(
    action: () => Promise<unknown>,
    success: string,
  ) {
    if (isReadOnly) {
      return;
    }

    setSessionSaveState("saving");
    try {
      await action();
      setSessionSaveState("saved");
      notify.success(success);
    } catch (caughtError) {
      setSessionSaveState("error");
      notify.error(getErrorMessage(caughtError));
    }
  }

  async function mutateExercise(
    action: () => Promise<unknown>,
    success: string,
  ) {
    if (isReadOnly) {
      return;
    }

    setSessionSaveState("saving");
    try {
      await action();
      setSessionSaveState("saved");
      notify.success(success);
    } catch (caughtError) {
      setSessionSaveState("error");
      notify.error(getErrorMessage(caughtError));
    }
  }

  async function deleteSelectedSession() {
    if (!selectedSession || isReadOnly) {
      return;
    }

    if (!window.confirm("Eliminar esta sesion y todos sus ejercicios?")) {
      return;
    }

    setSessionSaveState("saving");
    try {
      await editor.deleteSession(selectedSession.id);
      setSessionSaveState("saved");
      setSelectedSessionId("");
      notify.success("Sesion eliminada");
    } catch (caughtError) {
      setSessionSaveState("error");
      notify.error(getErrorMessage(caughtError));
    }
  }

  async function togglePlanPublication() {
    if (
      !plan ||
      plan.isSystemTemplate ||
      plan.status === "archived" ||
      publishState === "saving"
    ) {
      return;
    }

    setPublishState("saving");
    try {
      if (plan.status === "active") {
        await editor.updatePlanStatus("draft");
        await editor.loadPlan();
        setPublishState("saved");
        notify.success("Plan despublicado");
        return;
      }

      if (planSaveState === "dirty" && planDraft) {
        setPlanSaveState("saving");
        await editor.updatePlan(planDraft);
        setPlanSaveState("saved");
      }
      if (sessionSaveState === "dirty" && selectedSession && sessionDraft) {
        setSessionSaveState("saving");
        await editor.updateSession(selectedSession.id, sessionDraft);
        setSessionSaveState("saved");
      }
      await editor.updatePlanStatus("active");
      await editor.loadPlan();
      setPublishState("saved");
      notify.success("Plan publicado");
    } catch (caughtError) {
      setPublishState("error");
      notify.error(getErrorMessage(caughtError));
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
    } catch (caughtError) {
      setPublishState("error");
      notify.error(getErrorMessage(caughtError));
    }
  }

  async function archivePlan() {
    if (!plan || plan.isSystemTemplate || publishState === "saving") {
      return;
    }

    if (!window.confirm("Eliminar este plan? Se archivara y dejara de aparecer en la lista principal.")) {
      return;
    }

    setPublishState("saving");
    try {
      await editor.updatePlanStatus("archived");
      setPublishState("saved");
      notify.success("Plan eliminado");
      router.push("/training-plans");
    } catch (caughtError) {
      setPublishState("error");
      notify.error(getErrorMessage(caughtError));
    }
  }

  if (editor.isLoading && !plan) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Cargando plan
        </span>
      </main>
    );
  }

  if (editor.error || !plan || !planDraft) {
    return (
      <main className="min-h-screen bg-background p-4 text-foreground">
        <div className="mx-auto max-w-3xl rounded-lg border bg-card p-6">
          <p className="text-sm text-destructive">
            {editor.error || "Plan no disponible."}
          </p>
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
        <EditorHeader
          isReadOnly={isReadOnly}
          isSystemTemplate={isSystemTemplate}
          plan={plan}
          publishState={publishState}
          saveState={saveState}
          onArchivePlan={() => void archivePlan()}
          onDuplicateForEditing={() => void duplicateForEditing()}
          onEditInformation={() => setIsPlanInfoOpen(true)}
          onSave={() => void saveAllDrafts()}
          onTogglePublication={() => void togglePlanPublication()}
        />
      }
    >
      <div className="flex flex-1 flex-col gap-4 bg-background px-4 py-4 md:px-6">
        <MetricStrip
          items={[
            {
              helper: plan.goal || "Sin objetivo",
              icon: <DumbbellIcon className="size-4" />,
              label: "Objetivo",
              value: levelLabels[plan.level ?? ""] ?? "Sin nivel",
            },
            {
              helper: `${sessions.length} sesiones configuradas`,
              icon: <CalendarDaysIcon className="size-4" />,
              label: "Duracion",
              value: `${plan.durationWeeks} sem.`,
            },
            {
              helper: "Dentro de la estructura",
              icon: <DumbbellIcon className="size-4" />,
              label: "Ejercicios",
              tone: "green",
              value: totalExercises,
            },
            {
              helper: isReadOnly ? "Copia para editar" : "Editable",
              icon: <SaveIcon className="size-4" />,
              label: "Estado",
              tone: plan.status === "active" ? "green" : "amber",
              value: statusLabels[plan.status] ?? plan.status,
            },
          ]}
        />

        <div className="grid w-full gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <PlanTree
            editor={editor}
            isReadOnly={isReadOnly}
            plan={plan}
            selectedSessionId={selectedSession?.id}
            onSaveSessionInfo={saveSessionInfo}
            onSelectSession={handleSelectSession}
          />

          {selectedSession ? (
            <SessionEditor
              isReadOnly={isReadOnly}
              session={selectedSession}
              onAddExercise={(exercise) =>
                mutateStructure(
                  () =>
                    editor.addSessionExercise(
                      selectedSession.id,
                      {
                        exerciseId: exercise.id,
                        reps: "10-12",
                        sets: 3,
                      },
                      exercise,
                    ),
                  "Ejercicio agregado",
                )
              }
              onAddAlternative={(sessionExerciseId, exercise) =>
                mutateStructure(
                  () =>
                    editor.addAlternative(
                      sessionExerciseId,
                      {
                        alternativeExerciseId: exercise.id,
                      },
                      exercise,
                    ),
                  "Alternativa agregada",
                )
              }
              onDeleteExercise={(sessionExerciseId) =>
                mutateStructure(
                  () => editor.deleteSessionExercise(sessionExerciseId),
                  "Ejercicio eliminado",
                )
              }
              onDeleteSession={() => void deleteSelectedSession()}
              onDeleteAlternative={(alternativeId) =>
                mutateStructure(
                  () => editor.deleteAlternative(alternativeId),
                  "Alternativa eliminada",
                )
              }
              onDuplicateExercise={(sessionExerciseId) =>
                mutateStructure(
                  () => editor.duplicateSessionExercise(sessionExerciseId),
                  "Ejercicio duplicado",
                )
              }
              onMoveExercise={(sessionExercise, direction) => {
                const exercises = [...selectedSession.exercises].sort(
                  (first, second) => first.orderIndex - second.orderIndex,
                );
                const index = exercises.findIndex(
                  (item) => item.id === sessionExercise.id,
                );
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
              onUpdateExercise={(sessionExerciseId, body) =>
                mutateExercise(
                  () => editor.updateSessionExercise(sessionExerciseId, body),
                  "Ejercicio actualizado",
                )
              }
            />
          ) : (
            <WorkspacePanel
              className="min-h-72"
              description="Selecciona una sesion desde la estructura para editarla."
              title="Sesion"
            >
              <div className="p-4 text-sm text-muted-foreground">
                No hay una sesion activa.
              </div>
            </WorkspacePanel>
          )}
        </div>
      </div>
      <DetailDrawer
        description="Nombre, objetivo, nivel y notas del plan."
        open={isPlanInfoOpen}
        title="Informacion general"
        onOpenChange={setIsPlanInfoOpen}
      >
        <PlanDetails
          draft={planDraft}
          isReadOnly={isReadOnly}
          saveState={planSaveState}
          onChange={(draft) => {
            setPlanDraft(draft);
            setPlanSaveState("dirty");
          }}
          onSave={() => void savePlanDraft()}
        />
      </DetailDrawer>
    </WorkspaceFrame>
  );
}

function EditorHeader({
  isReadOnly,
  isSystemTemplate,
  onArchivePlan,
  onDuplicateForEditing,
  onEditInformation,
  onSave,
  onTogglePublication,
  plan,
  saveState,
  publishState,
}: {
  isReadOnly: boolean;
  isSystemTemplate: boolean;
  onArchivePlan: () => void;
  onDuplicateForEditing: () => void;
  onEditInformation: () => void;
  onSave: () => void;
  onTogglePublication: () => void;
  plan: TrainingPlan;
  saveState: SaveState;
  publishState: SaveState;
}) {
  const isSaving = saveState === "saving";
  const isPublishing = publishState === "saving";
  const canTogglePublication =
    plan.status === "draft" || plan.status === "active";
  const publicationLabel =
    plan.status === "active" ? "Despublicar" : "Publicar";
  const primaryAction = isSystemTemplate ? (
    <Button
      disabled={isPublishing}
      size="sm"
      type="button"
      onClick={onDuplicateForEditing}
    >
      {isPublishing ? (
        <Loader2Icon className="animate-spin" data-icon="inline-start" />
      ) : (
        <CopyIcon data-icon="inline-start" />
      )}
      Copiar para editar
    </Button>
  ) : (
    <Button
      disabled={!canTogglePublication || isPublishing}
      size="sm"
      type="button"
      variant={plan.status === "active" ? "outline" : "default"}
      onClick={onTogglePublication}
    >
      {isPublishing ? (
        <Loader2Icon className="animate-spin" data-icon="inline-start" />
      ) : null}
      {publicationLabel}
    </Button>
  );

  return (
    <WorkspaceHeader
      description={`${plan.goal || "Sin objetivo"} / ${
        plan.level ? (levelLabels[plan.level] ?? plan.level) : "Sin nivel"
      } / ${plan.durationWeeks} semanas`}
      title={plan.name}
      actions={
        <>
          <Button asChild size="sm" variant="outline">
            <Link href="/training-plans">
              <ChevronLeftIcon data-icon="inline-start" />
              Planes
            </Link>
          </Button>
          {primaryAction}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="Mas acciones del plan" size="icon" type="button" variant="outline">
                <MoreVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={onEditInformation}>
                  <EditIcon data-icon="inline-start" />
                  Editar informacion
                </DropdownMenuItem>
                {!isSystemTemplate ? (
                  <DropdownMenuItem disabled={isReadOnly || isSaving} onSelect={onSave}>
                    {isSaving ? (
                      <Loader2Icon className="animate-spin" data-icon="inline-start" />
                    ) : (
                      <SaveIcon data-icon="inline-start" />
                    )}
                    Guardar cambios
                  </DropdownMenuItem>
                ) : null}
                {!isSystemTemplate ? (
                  <DropdownMenuItem disabled={isPublishing} onSelect={onArchivePlan}>
                    <Trash2Icon data-icon="inline-start" />
                    Eliminar plan
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
}

function PlanDetails({
  draft,
  isReadOnly,
  saveState,
  onChange,
  onSave,
}: {
  draft: DraftPlan;
  isReadOnly: boolean;
  saveState: SaveState;
  onChange: (draft: DraftPlan) => void;
  onSave: () => void;
}) {
  return (
    <aside className="flex min-h-0 flex-1 flex-col">
      <div className="border-b bg-card px-5 py-5 pr-16">
        <div>
          <h2 className="text-lg font-semibold">Informacion general</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Nombre, objetivo, nivel y notas del plan.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!isReadOnly ? <SaveStatus state={saveState} /> : null}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-background px-5 py-5">
        <section className="grid gap-4">
          <div>
            <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">
              Identidad
            </p>
            <div className="grid gap-4">
              <Field label="Nombre">
                <Input
                  disabled={isReadOnly}
                  value={draft.name}
                  onChange={(event) =>
                    onChange({ ...draft, name: event.target.value })
                  }
                />
              </Field>
              <Field label="Objetivo">
                <Input
                  disabled={isReadOnly}
                  value={draft.goal ?? ""}
                  onChange={(event) =>
                    onChange({ ...draft, goal: event.target.value })
                  }
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="grid gap-4 border-t pt-4">
          <div>
            <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">
              Clasificacion
            </p>
            <Field label="Nivel">
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
                disabled={isReadOnly}
                value={draft.level ?? ""}
                onChange={(event) =>
                  onChange({ ...draft, level: event.target.value || null })
                }
              >
                <option value="">Sin nivel</option>
                <option value="beginner">{levelLabels.beginner}</option>
                <option value="intermediate">{levelLabels.intermediate}</option>
                <option value="advanced">{levelLabels.advanced}</option>
              </select>
            </Field>
          </div>
          <DurationSummary weeks={draft.durationWeeks} />
        </section>

        <section className="border-t pt-4">
          <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">
            Notas internas
          </p>
          <Field label="Notas generales">
            <textarea
              className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
              disabled={isReadOnly}
              value={draft.generalNotes ?? ""}
              onChange={(event) =>
                onChange({ ...draft, generalNotes: event.target.value })
              }
            />
          </Field>
        </section>
      </div>
      {!isReadOnly ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">
            El autosave guarda cambios cada 2 segundos.
          </p>
          <Button
            disabled={saveState === "saving"}
            size="sm"
            type="button"
            variant="outline"
            onClick={onSave}
          >
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

function SaveStatus({ state }: { state: SaveState }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
      {state === "saving" ? (
        <Loader2Icon className="animate-spin" />
      ) : (
        <SaveIcon />
      )}
      {getSaveStateLabel(state)}
    </span>
  );
}

function DurationSummary({ weeks }: { weeks: number }) {
  return (
    <div className="flex min-h-20 items-center justify-between gap-4 rounded-md border bg-background p-3">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <CalendarDaysIcon />
        </div>
        <div>
          <p className="text-sm font-medium">Duracion calculada</p>
          <p className="text-xs text-muted-foreground">
            Se actualiza desde Estructura.
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-2xl font-semibold leading-none">{weeks}</p>
        <p className="text-xs text-muted-foreground">semanas</p>
      </div>
    </div>
  );
}

function SessionEditor({
  isReadOnly,
  onAddExercise,
  onAddAlternative,
  onDeleteAlternative,
  onDeleteExercise,
  onDeleteSession,
  onDuplicateExercise,
  onMoveExercise,
  onUpdateExercise,
  session,
}: {
  isReadOnly: boolean;
  onAddExercise: (exercise: Exercise) => void;
  onAddAlternative: (sessionExerciseId: string, exercise: Exercise) => void;
  onDeleteAlternative: (alternativeId: string) => void;
  onDeleteExercise: (sessionExerciseId: string) => void;
  onDeleteSession: () => void;
  onDuplicateExercise: (sessionExerciseId: string) => void;
  onMoveExercise: (exercise: SessionExercise, direction: "up" | "down") => void;
  onUpdateExercise: (
    sessionExerciseId: string,
    body: Partial<
      Pick<SessionExercise, "sets" | "reps" | "restSeconds" | "coachNote">
    >,
  ) => void;
  session: TrainingSession;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const sortedExercises = useMemo(
    () =>
      [...session.exercises].sort(
        (first, second) => first.orderIndex - second.orderIndex,
      ),
    [session.exercises],
  );

  return (
    <WorkspacePanel className="overflow-hidden">
      <div className="gap-3 border-b p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{session.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {session.description ||
                "Ejercicios, cargas prescritas y notas del coach."}
            </p>
          </div>
          {!isReadOnly ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={onDeleteSession}
              >
                <Trash2Icon data-icon="inline-start" />
                Eliminar sesion
              </Button>
              <Button
                size="sm"
                type="button"
                onClick={() => setIsAdding((value) => !value)}
              >
                <PlusIcon data-icon="inline-start" />
                Agregar ejercicio
              </Button>
            </div>
          ) : null}
        </div>
        {session.coachNote ? (
          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {session.coachNote}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-4 p-4">
        {isAdding && !isReadOnly ? (
          <div className="border-b bg-background">
            <ExerciseSearch
              selectionMode="explicit"
              onSelect={(exercise) => {
                onAddExercise(exercise);
                setIsAdding(false);
              }}
            />
          </div>
        ) : null}
        <section>
          <div className="overflow-hidden rounded-md border">
            {sortedExercises.map((exercise, index) => (
              <SessionExerciseRow
                key={exercise.id}
                exercise={exercise}
                isFirst={index === 0}
                isLast={index === sortedExercises.length - 1}
                isReadOnly={isReadOnly}
                onDelete={() => onDeleteExercise(exercise.id)}
                onDeleteAlternative={onDeleteAlternative}
                onDuplicate={() => onDuplicateExercise(exercise.id)}
                onMoveDown={() => onMoveExercise(exercise, "down")}
                onMoveUp={() => onMoveExercise(exercise, "up")}
                onAddAlternative={(alternative) =>
                  onAddAlternative(exercise.id, alternative)
                }
                onUpdate={(body) => onUpdateExercise(exercise.id, body)}
              />
            ))}
            {session.exercises.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Esta sesion todavia no tiene ejercicios.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </WorkspacePanel>
  );
}

type SessionExerciseRowProps = {
  exercise: SessionExercise;
  isFirst: boolean;
  isLast: boolean;
  isReadOnly: boolean;
  onDelete: () => void;
  onDeleteAlternative: (alternativeId: string) => void;
  onDuplicate: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onAddAlternative: (exercise: Exercise) => void;
  onUpdate: (
    body: Partial<
      Pick<SessionExercise, "sets" | "reps" | "restSeconds" | "coachNote">
    >,
  ) => void;
};

const SessionExerciseRow = memo(function SessionExerciseRow({
  exercise,
  isFirst,
  isLast,
  isReadOnly,
  onDelete,
  onDeleteAlternative,
  onDuplicate,
  onMoveDown,
  onMoveUp,
  onAddAlternative,
  onUpdate,
}: SessionExerciseRowProps) {
  const alternatives = exercise.alternatives ?? [];
  const [draft, setDraft] = useState({
    coachNote: exercise.coachNote ?? "",
    reps: exercise.reps,
    restSeconds: exercise.restSeconds ?? "",
    sets: exercise.sets ?? "",
  });
  const [isAddingAlternative, setIsAddingAlternative] = useState(false);
  const [isAlternativesOpen, setIsAlternativesOpen] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);

  useEffect(() => {
    setDraft({
      coachNote: exercise.coachNote ?? "",
      reps: exercise.reps,
      restSeconds: exercise.restSeconds ?? "",
      sets: exercise.sets ?? "",
    });
  }, [exercise]);

  return (
    <div className="border-b bg-card last:border-b-0">
      <div className="grid gap-2 p-3 transition-colors hover:bg-background lg:grid-cols-[minmax(0,1fr)_76px_112px_88px_36px] lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-medium text-muted-foreground">
            {exercise.orderIndex + 1}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {exercise.exercise?.name ?? `Ejercicio ${exercise.exerciseId}`}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {exercise.exercise?.primaryMuscle
                ? (muscleLabels[exercise.exercise.primaryMuscle] ??
                  exercise.exercise.primaryMuscle)
                : "Ejercicio"}{" "}
              /{" "}
              {exercise.exercise?.equipment
                ? (equipmentLabels[exercise.exercise.equipment] ??
                  exercise.exercise.equipment)
                : "Sin equipo"}
            </p>
            {exercise.coachNote ? (
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Nota agregada
              </p>
            ) : null}
            {alternatives.length ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {alternatives.length} alternativa
                {alternatives.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
        </div>
        <CompactField label="Series">
          <Input
            disabled={isReadOnly}
            min={1}
            type="number"
            value={draft.sets}
            onChange={(event) =>
              setDraft({ ...draft, sets: event.target.value })
            }
            onBlur={() =>
              onUpdate({ sets: draft.sets === "" ? null : Number(draft.sets) })
            }
          />
        </CompactField>
        <CompactField label="Repeticiones">
          <Input
            disabled={isReadOnly}
            value={draft.reps}
            onChange={(event) =>
              setDraft({ ...draft, reps: event.target.value })
            }
            onBlur={() => onUpdate({ reps: draft.reps })}
          />
        </CompactField>
        <CompactField label="Descanso">
          <Input
            disabled={isReadOnly}
            min={1}
            type="number"
            value={draft.restSeconds}
            onChange={(event) =>
              setDraft({ ...draft, restSeconds: event.target.value })
            }
            onBlur={() =>
              onUpdate({
                restSeconds:
                  draft.restSeconds === "" ? null : Number(draft.restSeconds),
              })
            }
          />
        </CompactField>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Acciones de ejercicio"
              size="icon"
              type="button"
              variant="ghost"
            >
              <MoreVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem
                disabled={isReadOnly || isFirst}
                onSelect={onMoveUp}
              >
                <ArrowUpIcon data-icon="inline-start" />
                Subir
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isReadOnly || isLast}
                onSelect={onMoveDown}
              >
                <ArrowDownIcon data-icon="inline-start" />
                Bajar
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isReadOnly} onSelect={onDuplicate}>
                <CopyIcon data-icon="inline-start" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isReadOnly}
                onSelect={() => setIsEditingNote(true)}
              >
                <EditIcon data-icon="inline-start" />
                Editar nota
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setIsAlternativesOpen((value) => !value);
                  setIsAddingAlternative(false);
                }}
              >
                <PlusIcon data-icon="inline-start" />
                Alternativas
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isReadOnly} onSelect={onDelete}>
                <Trash2Icon data-icon="inline-start" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Dialog open={isEditingNote} onOpenChange={setIsEditingNote}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar nota del ejercicio</DialogTitle>
            <DialogDescription>
              Esta nota queda asociada solo a este ejercicio dentro de la sesion.
            </DialogDescription>
          </DialogHeader>
          <Field label="Nota">
            <textarea
              className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
              disabled={isReadOnly}
              value={draft.coachNote}
              onChange={(event) =>
                setDraft({ ...draft, coachNote: event.target.value })
              }
            />
          </Field>
          <DialogFooter>
            <Button
              disabled={isReadOnly}
              type="button"
              onClick={() => {
                onUpdate({ coachNote: draft.coachNote });
                setIsEditingNote(false);
              }}
            >
              <SaveIcon data-icon="inline-start" />
              Guardar nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isAlternativesOpen ? (
        <div className="grid gap-3 border-t bg-muted/20 px-3 py-2.5 lg:grid-cols-[minmax(0,1fr)_36px]">
          <div className="flex min-w-0 flex-wrap gap-2">
            {alternatives.length ? (
              alternatives.map((alternative) => (
                <AlternativeChip
                  key={alternative.id}
                  alternative={alternative}
                  isReadOnly={isReadOnly}
                  onDelete={() => onDeleteAlternative(alternative.id)}
                />
              ))
            ) : (
              <span className="text-xs text-muted-foreground">
                Sin alternativas
              </span>
            )}
          </div>
          <Button
            aria-label="Agregar alternativa"
            className="justify-self-start lg:justify-self-end"
            disabled={isReadOnly || alternatives.length >= 3}
            size="icon"
            type="button"
            variant="outline"
            onClick={() => setIsAddingAlternative((value) => !value)}
          >
            <PlusIcon />
          </Button>
        </div>
      ) : null}
      {isAlternativesOpen && isAddingAlternative && !isReadOnly ? (
        <div className="mt-3">
          <ExerciseSearch
            selectionMode="explicit"
            onSelect={(alternative) => {
              onAddAlternative(alternative);
              setIsAddingAlternative(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}, areSessionExerciseRowPropsEqual);

function AlternativeChip({
  alternative,
  isReadOnly,
  onDelete,
}: {
  alternative: SessionExerciseAlternative;
  isReadOnly: boolean;
  onDelete: () => void;
}) {
  const exercise = alternative.alternativeExercise;

  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs">
      <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted text-muted-foreground">
        {exercise?.mediaUrl && exercise.mediaType === "image" ? (
          <Image
            alt=""
            className="size-full object-cover"
            height={32}
            loading="lazy"
            src={exercise.mediaUrl}
            unoptimized
            width={32}
          />
        ) : (
          <ImageIcon className="size-4" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium">
          {exercise?.name ?? alternative.alternativeExerciseId}
        </span>
        <span className="block text-muted-foreground">Alternativa</span>
      </span>
      <button
        aria-label="Quitar alternativa"
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        disabled={isReadOnly}
        type="button"
        onClick={onDelete}
      >
        <Trash2Icon className="size-4" />
      </button>
    </span>
  );
}

function areSessionExerciseRowPropsEqual(
  previous: SessionExerciseRowProps,
  next: SessionExerciseRowProps,
) {
  return (
    previous.exercise === next.exercise &&
    previous.isFirst === next.isFirst &&
    previous.isLast === next.isLast &&
    previous.isReadOnly === next.isReadOnly
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

function CompactField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function getSaveStateLabel(state: SaveState) {
  const labels: Record<SaveState, string> = {
    dirty: "Cambios pendientes de guardar.",
    error: "No se pudo guardar el ultimo cambio.",
    idle: "Sin cambios pendientes.",
    saved: "Cambios guardados.",
    saving: "Guardando cambios...",
  };

  return labels[state];
}

function getCombinedSaveState(
  planState: SaveState,
  sessionState: SaveState,
): SaveState {
  if (planState === "saving" || sessionState === "saving") {
    return "saving";
  }
  if (planState === "error" || sessionState === "error") {
    return "error";
  }
  if (planState === "dirty" || sessionState === "dirty") {
    return "dirty";
  }
  if (planState === "saved" || sessionState === "saved") {
    return "saved";
  }
  return "idle";
}

function getSessions(plan: TrainingPlan | null) {
  if (!plan?.weeks) {
    return [];
  }

  return plan.weeks.flatMap((week) =>
    week.days.flatMap((day) => (day.session ? [day.session] : [])),
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No se pudo guardar el cambio";
}
