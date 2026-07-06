"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  CopyIcon,
  DumbbellIcon,
  EditIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ExerciseSearch } from "@/components/exercise-search";
import { PlanTree } from "@/components/training-plans/assigned-plan-tree";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  WorkspaceFrame,
  WorkspaceHeader,
  WorkspacePanel,
} from "@/components/layout/workspace-shell";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { MetricStrip } from "@/components/shared/metric-strip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentAssignmentEditor, type CurrentAssignmentEditor } from "@/hooks/use-current-assignment-editor";
import type { Exercise } from "@/hooks/use-exercises";
import { levelLabels } from "@/lib/clients/api";
import type { SessionExercise, TrainingPlan, TrainingSession } from "@/lib/clients/types";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
type DraftPlan = Pick<TrainingPlan, "name" | "goal" | "level" | "durationWeeks" | "generalNotes">;
type DraftSession = Pick<TrainingSession, "name" | "description" | "coachNote">;

export function AssignedPlanEditorWorkspace() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const editor = useCurrentAssignmentEditor(clientId);
  const plan = editor.plan;
  const sessions = useMemo(() => getSessions(plan), [plan]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? sessions[0];
  const [planDraft, setPlanDraft] = useState<DraftPlan | null>(null);
  const [sessionDraft, setSessionDraft] = useState<DraftSession | null>(null);
  const [planSaveState, setPlanSaveState] = useState<SaveState>("idle");
  const [sessionSaveState, setSessionSaveState] = useState<SaveState>("idle");
  const [isPlanInfoOpen, setIsPlanInfoOpen] = useState(false);
  const isDirty = planSaveState === "dirty" || sessionSaveState === "dirty";
  const saveState = getCombinedSaveState(planSaveState, sessionSaveState);
  const totalExercises = useMemo(
    () => sessions.reduce((total, session) => total + (session.exercises?.length ?? 0), 0),
    [sessions],
  );

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
    if (!isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  async function savePlanDraft() {
    if (!planDraft) {
      return;
    }

    setPlanSaveState("saving");
    try {
      await editor.updatePlan(planDraft);
      await editor.loadAssignment();
      setPlanSaveState("saved");
      toast.success("Plan asignado actualizado");
    } catch (caughtError) {
      setPlanSaveState("error");
      toast.error(getErrorMessage(caughtError));
    }
  }

  async function saveSessionDraft() {
    if (!selectedSession || !sessionDraft) {
      return;
    }

    setSessionSaveState("saving");
    try {
      await editor.updateSession(selectedSession.id, sessionDraft);
      await editor.loadAssignment();
      setSessionSaveState("saved");
      toast.success("Sesion actualizada");
    } catch (caughtError) {
      setSessionSaveState("error");
      toast.error(getErrorMessage(caughtError));
    }
  }

  async function mutateStructure(action: () => Promise<unknown>, success: string) {
    setSessionSaveState("saving");
    try {
      await action();
      await editor.loadAssignment();
      setSessionSaveState("saved");
      toast.success(success);
    } catch (caughtError) {
      setSessionSaveState("error");
      toast.error(getErrorMessage(caughtError));
    }
  }

  const isSaving = planSaveState === "saving" || sessionSaveState === "saving";

  if (editor.isLoading && !plan) {
    return (
      <WorkspaceFrame
        header={<WorkspaceHeader title="Editar plan asignado" />}
      >
        <div className="flex min-h-96 items-center justify-center">
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Cargando plan asignado
          </span>
        </div>
      </WorkspaceFrame>
    );
  }

  if (editor.error || !editor.assignment?.assignedPlan || !plan || !planDraft) {
    return (
      <WorkspaceFrame
        header={<WorkspaceHeader title="Editar plan asignado" />}
      >
        <div className="p-6">
          <div className="mx-auto max-w-3xl rounded-lg border bg-card p-6">
            <p className="text-sm font-semibold">Sin asignacion activa</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {editor.error || "Este cliente no tiene un plan activo para editar."}
            </p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/clients">Volver a clientes</Link>
            </Button>
          </div>
        </div>
      </WorkspaceFrame>
    );
  }

  return (
    <WorkspaceFrame
      header={
        <EditorHeader
          clientId={clientId}
          isSaving={isSaving}
          plan={plan}
          saveState={saveState}
          onEditInformation={() => setIsPlanInfoOpen(true)}
          onSave={() => {
            void savePlanDraft();
            void saveSessionDraft();
          }}
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
              helper: "Solo en esta asignacion",
              icon: <DumbbellIcon className="size-4" />,
              label: "Ejercicios",
              tone: "green",
              value: totalExercises,
            },
            {
              helper: "Copia asignada editable",
              icon: <SaveIcon className="size-4" />,
              label: "Estado",
              tone: saveState === "error" ? "amber" : "green",
              value: getSaveStateLabel(saveState),
            },
          ]}
        />

        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <PlanTree
            editor={editor}
            plan={plan}
            selectedSessionId={selectedSession?.id}
            onMutate={mutateStructure}
            onSaveSessionInfo={async (sessionId, draft) => {
              setSessionSaveState("saving");
              try {
                await editor.updateSession(sessionId, draft);
                await editor.loadAssignment();
                setSessionSaveState("saved");
                toast.success("Sesion actualizada");
                return true;
              } catch (caughtError) {
                setSessionSaveState("error");
                toast.error(getErrorMessage(caughtError));
                return false;
              }
            }}
            onSelectSession={setSelectedSessionId}
          />
          <div className="min-w-0">
            {selectedSession && sessionDraft ? (
              <SessionEditor
                editor={editor}
                session={selectedSession}
                onMutate={mutateStructure}
              />
            ) : (
              <WorkspacePanel
                className="min-h-72"
                description="Selecciona una sesion o crea una desde el arbol."
                title="Sesion"
              >
                <div className="p-4 text-sm text-muted-foreground">
                  No hay una sesion activa.
                </div>
              </WorkspacePanel>
            )}
          </div>
        </div>
      </div>
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
  clientId,
  isSaving,
  onEditInformation,
  onSave,
  plan,
  saveState,
}: {
  clientId: string;
  isSaving: boolean;
  onEditInformation: () => void;
  onSave: () => void;
  plan: TrainingPlan;
  saveState: SaveState;
}) {
  return (
    <WorkspaceHeader
      description={`${plan.goal || "Sin objetivo"} / ${
        plan.level ? (levelLabels[plan.level] ?? plan.level) : "Sin nivel"
      } / ${plan.durationWeeks} semanas`}
      title={plan.name}
      actions={
        <>
          <Button asChild size="sm" variant="outline">
            <Link href={`/clients/${clientId}`}>
              <ChevronLeftIcon data-icon="inline-start" />
              Cliente
            </Link>
          </Button>
          <Button disabled={isSaving} size="sm" type="button" variant="outline" onClick={onSave}>
            {isSaving ? (
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : (
              <SaveIcon data-icon="inline-start" />
            )}
            {saveState === "dirty" ? "Guardar cambios" : "Guardar"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="Mas acciones del plan asignado" size="icon" type="button" variant="outline">
                <MoreVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={onEditInformation}>
                  <EditIcon data-icon="inline-start" />
                  Editar informacion
                </DropdownMenuItem>
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
  saveState,
  onChange,
  onSave,
}: {
  draft: DraftPlan;
  saveState: SaveState;
  onChange: (draft: DraftPlan) => void;
  onSave: () => void;
}) {
  return (
    <WorkspacePanel
      className="h-fit overflow-hidden"
      description="Guarda cuando termines de ajustar la copia."
      title="Datos del plan"
    >
      <div className="flex flex-col gap-3 p-4">
        <SaveStatus state={saveState} />
        <Field label="Nombre">
          <Input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
        </Field>
        <Field label="Objetivo">
          <Input value={draft.goal ?? ""} onChange={(event) => onChange({ ...draft, goal: event.target.value })} />
        </Field>
        <Field label="Nivel">
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
            value={draft.level ?? ""}
            onChange={(event) => onChange({ ...draft, level: event.target.value || null })}
          >
            <option value="">Sin nivel</option>
            <option value="beginner">{levelLabels.beginner}</option>
            <option value="intermediate">{levelLabels.intermediate}</option>
            <option value="advanced">{levelLabels.advanced}</option>
          </select>
        </Field>
        <Field label="Semanas">
          <Input
            min={1}
            type="number"
            value={draft.durationWeeks}
            onChange={(event) => onChange({ ...draft, durationWeeks: Number(event.target.value) })}
          />
        </Field>
        <Field label="Notas generales">
          <textarea
            className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
            value={draft.generalNotes ?? ""}
            onChange={(event) => onChange({ ...draft, generalNotes: event.target.value })}
          />
        </Field>
        <Button type="button" onClick={onSave}>
          <SaveIcon data-icon="inline-start" />
          Guardar plan
        </Button>
      </div>
    </WorkspacePanel>
  );
}

function SessionEditor({
  editor,
  onMutate,
  session,
}: {
  editor: CurrentAssignmentEditor;
  onMutate: (action: () => Promise<unknown>, success: string) => Promise<void>;
  session: TrainingSession;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const exercises = [...(session.exercises ?? [])].sort((first, second) => first.orderIndex - second.orderIndex);

  return (
    <WorkspacePanel className="overflow-hidden">
      <div className="gap-3 border-b p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{session.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {session.description || "Ejercicios, orden, cargas y notas del coach."}
            </p>
          </div>
          <Button size="sm" type="button" onClick={() => setIsAdding((value) => !value)}>
            <PlusIcon data-icon="inline-start" />
            Agregar ejercicio
          </Button>
        </div>
        {session.coachNote ? (
          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {session.coachNote}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-4 p-4">
        {isAdding ? (
          <div className="border-b bg-background">
            <ExerciseSearch
              selectionMode="explicit"
              onSelect={(exercise) => {
                void onMutate(
                  () => editor.addSessionExercise(session.id, { exerciseId: exercise.id, reps: "10-12", sets: 3 }),
                  "Ejercicio agregado",
                );
                setIsAdding(false);
              }}
            />
          </div>
        ) : null}
        <section>
          <div className="overflow-hidden rounded-md border">
            {exercises.map((exercise, index) => (
              <SessionExerciseRow
                key={exercise.id}
                editor={editor}
                exercise={exercise}
                isFirst={index === 0}
                isLast={index === exercises.length - 1}
                onMutate={onMutate}
                onMove={(direction) => {
                  const swapIndex = direction === "up" ? index - 1 : index + 1;
                  if (swapIndex < 0 || swapIndex >= exercises.length) {
                    return;
                  }
                  const reordered = [...exercises];
                  [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
                  void onMutate(
                    () =>
                      editor.reorderSessionExercises(
                        reordered.map((item, orderIndex) => ({ sessionExerciseId: item.id, orderIndex })),
                      ),
                    "Orden actualizado",
                  );
                }}
              />
            ))}
            {exercises.length === 0 ? (
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

function SessionExerciseRow({
  editor,
  exercise,
  isFirst,
  isLast,
  onMove,
  onMutate,
}: {
  editor: CurrentAssignmentEditor;
  exercise: SessionExercise;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: "up" | "down") => void;
  onMutate: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    reps: exercise.reps,
    restSeconds: exercise.restSeconds ?? "",
    sets: exercise.sets ?? "",
  });
  const [isAddingAlternative, setIsAddingAlternative] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);

  useEffect(() => {
    setDraft({
      reps: exercise.reps,
      restSeconds: exercise.restSeconds ?? "",
      sets: exercise.sets ?? "",
    });
  }, [exercise]);

  return (
    <div className="border-b bg-card last:border-b-0">
      <div className="grid gap-2 p-3 transition-colors hover:bg-background lg:grid-cols-[minmax(0,1fr)_76px_112px_88px_160px] lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-medium text-muted-foreground">
            {exercise.orderIndex + 1}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{exercise.exercise?.name ?? exercise.exerciseId ?? "Ejercicio"}</p>
            <p className="text-xs text-muted-foreground">Ejercicio asignado</p>
          </div>
        </div>
        <CompactField label="Series">
          <Input
            min={1}
            type="number"
            value={draft.sets}
            onChange={(event) => setDraft({ ...draft, sets: event.target.value })}
            onBlur={() => void onMutate(() => editor.updateSessionExercise(exercise.id, { sets: draft.sets === "" ? null : Number(draft.sets) }), "Sets actualizados")}
          />
        </CompactField>
        <CompactField label="Repeticiones">
          <Input
            value={draft.reps}
            onChange={(event) => setDraft({ ...draft, reps: event.target.value })}
            onBlur={() => void onMutate(() => editor.updateSessionExercise(exercise.id, { reps: draft.reps }), "Reps actualizadas")}
          />
        </CompactField>
        <CompactField label="Descanso">
          <Input
            min={1}
            type="number"
            value={draft.restSeconds}
            onChange={(event) => setDraft({ ...draft, restSeconds: event.target.value })}
            onBlur={() => void onMutate(() => editor.updateSessionExercise(exercise.id, { restSeconds: draft.restSeconds === "" ? null : Number(draft.restSeconds) }), "Descanso actualizado")}
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
              <DropdownMenuItem disabled={isFirst} onSelect={() => onMove("up")}>
                <ArrowUpIcon data-icon="inline-start" />
                Subir
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isLast} onSelect={() => onMove("down")}>
                <ArrowDownIcon data-icon="inline-start" />
                Bajar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setIsReplacing((value) => !value)}>
                <CopyIcon data-icon="inline-start" />
                Reemplazar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void onMutate(() => editor.duplicateSessionExercise(exercise.id), "Ejercicio duplicado")}>
                <PlusIcon data-icon="inline-start" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setIsAddingAlternative((value) => !value)}>
                <PlusIcon data-icon="inline-start" />
                Alternativa
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  if (window.confirm("Quitar este ejercicio?")) {
                    void onMutate(() => editor.deleteSessionExercise(exercise.id), "Ejercicio eliminado");
                  }
                }}
              >
                <Trash2Icon data-icon="inline-start" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isReplacing ? (
        <div className="mt-3">
          <ExerciseSearch
            selectionMode="explicit"
            onSelect={(replacement) => {
              void onMutate(
                () => editor.updateSessionExercise(exercise.id, { exerciseId: replacement.id }),
                "Ejercicio reemplazado",
              );
              setIsReplacing(false);
            }}
          />
        </div>
      ) : null}
      {(exercise.alternatives ?? []).length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {(exercise.alternatives ?? []).map((alternative) => (
            <span key={alternative.id} className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
              Alt: {alternative.alternativeExercise?.name ?? alternative.alternativeExerciseId ?? "Alternativa"}
              <button
                className="text-muted-foreground hover:text-destructive"
                type="button"
                onClick={() => void onMutate(() => editor.deleteAlternative(alternative.id), "Alternativa eliminada")}
              >
                Quitar
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {isAddingAlternative ? (
        <div className="border-t bg-background">
          <ExerciseSearch
            selectionMode="explicit"
            onSelect={(alternative: Exercise) => {
              void onMutate(
                () => editor.addAlternative(exercise.id, { alternativeExerciseId: alternative.id }),
                "Alternativa agregada",
              );
              setIsAddingAlternative(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
      {state === "saving" ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : (
        <SaveIcon className="size-3.5" />
      )}
      {getSaveStateLabel(state)}
    </span>
  );
}

function CompactField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

function getSessions(plan: TrainingPlan | null) {
  if (!plan?.weeks) {
    return [];
  }

  return plan.weeks.flatMap((week) => (week.days ?? []).flatMap((day) => (day.session ? [day.session] : [])));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo guardar el cambio";
}

function getCombinedSaveState(
  planState: SaveState,
  sessionState: SaveState,
): SaveState {
  if (planState === "saving" || sessionState === "saving") return "saving";
  if (planState === "error" || sessionState === "error") return "error";
  if (planState === "dirty" || sessionState === "dirty") return "dirty";
  if (planState === "saved" || sessionState === "saved") return "saved";
  return "idle";
}

function getSaveStateLabel(state: SaveState) {
  if (state === "dirty") return "Cambios sin guardar";
  if (state === "saving") return "Guardando";
  if (state === "saved") return "Guardado";
  if (state === "error") return "Error al guardar";
  return "Sin cambios";
}
