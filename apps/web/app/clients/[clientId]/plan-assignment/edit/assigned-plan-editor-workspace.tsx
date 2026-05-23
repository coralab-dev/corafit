"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  Loader2Icon,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const isDirty = planSaveState === "dirty" || sessionSaveState === "dirty";

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

  if (editor.isLoading && !plan) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Cargando plan asignado
        </span>
      </main>
    );
  }

  if (editor.error || !editor.assignment?.assignedPlan || !plan || !planDraft) {
    return (
      <main className="min-h-screen bg-background p-4 text-foreground">
        <div className="mx-auto max-w-3xl rounded-lg border bg-card p-6">
          <p className="text-sm font-semibold">Sin asignacion activa</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {editor.error || "Este cliente no tiene un plan activo para editar."}
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/clients">Volver a clientes</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
        <span className="font-semibold">Estos cambios solo aplican a este cliente.</span>{" "}
        El template original no se modifica desde esta pantalla.
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <PlanTree
            editor={editor}
            plan={plan}
            selectedSessionId={selectedSession?.id}
            onMutate={mutateStructure}
            onSelectSession={setSelectedSessionId}
          />

          <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <PlanDetails
              draft={planDraft}
              onChange={(draft) => {
                setPlanDraft(draft);
                setPlanSaveState("dirty");
              }}
              onSave={() => void savePlanDraft()}
            />
            {selectedSession && sessionDraft ? (
              <SessionEditor
                draft={sessionDraft}
                editor={editor}
                session={selectedSession}
                onChange={(draft) => {
                  setSessionDraft(draft);
                  setSessionSaveState("dirty");
                }}
                onMutate={mutateStructure}
                onSave={() => void saveSessionDraft()}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Sesion</CardTitle>
                  <CardDescription>Selecciona una sesion o crea una desde el arbol.</CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      </div>
  );
}

function PlanDetails({
  draft,
  onChange,
  onSave,
}: {
  draft: DraftPlan;
  onChange: (draft: DraftPlan) => void;
  onSave: () => void;
}) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Datos del plan</CardTitle>
        <CardDescription>Guarda cuando termines de ajustar la copia.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
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
      </CardContent>
    </Card>
  );
}

function SessionEditor({
  draft,
  editor,
  onChange,
  onMutate,
  onSave,
  session,
}: {
  draft: DraftSession;
  editor: CurrentAssignmentEditor;
  onChange: (draft: DraftSession) => void;
  onMutate: (action: () => Promise<unknown>, success: string) => Promise<void>;
  onSave: () => void;
  session: TrainingSession;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const exercises = [...(session.exercises ?? [])].sort((first, second) => first.orderIndex - second.orderIndex);

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Sesion</CardTitle>
            <CardDescription>Ejercicios, orden, cargas y notas del coach.</CardDescription>
          </div>
          <Button type="button" onClick={() => setIsAdding((value) => !value)}>
            <PlusIcon data-icon="inline-start" />
            Agregar
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nombre">
            <Input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
          </Field>
          <Field label="Descripcion">
            <Input value={draft.description ?? ""} onChange={(event) => onChange({ ...draft, description: event.target.value })} />
          </Field>
          <Field label="Nota del coach">
            <Input value={draft.coachNote ?? ""} onChange={(event) => onChange({ ...draft, coachNote: event.target.value })} />
          </Field>
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={onSave}>
              <SaveIcon data-icon="inline-start" />
              Guardar sesion
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isAdding ? (
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
        ) : null}
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
      </CardContent>
    </Card>
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
    coachNote: exercise.coachNote ?? "",
    reps: exercise.reps,
    restSeconds: exercise.restSeconds ?? "",
    sets: exercise.sets ?? "",
  });
  const [isAddingAlternative, setIsAddingAlternative] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);

  useEffect(() => {
    setDraft({
      coachNote: exercise.coachNote ?? "",
      reps: exercise.reps,
      restSeconds: exercise.restSeconds ?? "",
      sets: exercise.sets ?? "",
    });
  }, [exercise]);

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="truncate font-semibold">{exercise.exercise?.name ?? exercise.exerciseId ?? "Ejercicio"}</p>
          <p className="text-xs text-muted-foreground">Orden {exercise.orderIndex + 1}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={isFirst} size="icon" type="button" variant="outline" onClick={() => onMove("up")}>
            <ArrowUpIcon className="size-4" />
          </Button>
          <Button disabled={isLast} size="icon" type="button" variant="outline" onClick={() => onMove("down")}>
            <ArrowDownIcon className="size-4" />
          </Button>
          <Button size="icon" type="button" variant="outline" onClick={() => setIsReplacing((value) => !value)}>
            <CopyIcon className="size-4" />
          </Button>
          <Button
            size="icon"
            type="button"
            variant="outline"
            onClick={() => void onMutate(() => editor.duplicateSessionExercise(exercise.id), "Ejercicio duplicado")}
          >
            <PlusIcon className="size-4" />
          </Button>
          <Button
            size="icon"
            type="button"
            variant="outline"
            onClick={() => {
              if (window.confirm("Quitar este ejercicio?")) {
                void onMutate(() => editor.deleteSessionExercise(exercise.id), "Ejercicio eliminado");
              }
            }}
          >
            <Trash2Icon className="size-4" />
          </Button>
        </div>
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
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <Field label="Sets">
          <Input
            min={1}
            type="number"
            value={draft.sets}
            onChange={(event) => setDraft({ ...draft, sets: event.target.value })}
            onBlur={() => void onMutate(() => editor.updateSessionExercise(exercise.id, { sets: draft.sets === "" ? null : Number(draft.sets) }), "Sets actualizados")}
          />
        </Field>
        <Field label="Reps">
          <Input
            value={draft.reps}
            onChange={(event) => setDraft({ ...draft, reps: event.target.value })}
            onBlur={() => void onMutate(() => editor.updateSessionExercise(exercise.id, { reps: draft.reps }), "Reps actualizadas")}
          />
        </Field>
        <Field label="Descanso">
          <Input
            min={1}
            type="number"
            value={draft.restSeconds}
            onChange={(event) => setDraft({ ...draft, restSeconds: event.target.value })}
            onBlur={() => void onMutate(() => editor.updateSessionExercise(exercise.id, { restSeconds: draft.restSeconds === "" ? null : Number(draft.restSeconds) }), "Descanso actualizado")}
          />
        </Field>
        <Field label="Nota">
          <Input
            value={draft.coachNote}
            onChange={(event) => setDraft({ ...draft, coachNote: event.target.value })}
            onBlur={() => void onMutate(() => editor.updateSessionExercise(exercise.id, { coachNote: draft.coachNote }), "Nota actualizada")}
          />
        </Field>
      </div>
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
      <div className="mt-3">
        <Button
          disabled={(exercise.alternatives ?? []).length >= 3}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => setIsAddingAlternative((value) => !value)}
        >
          <PlusIcon data-icon="inline-start" />
          Alternativa
        </Button>
      </div>
      {isAddingAlternative ? (
        <div className="mt-3">
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
