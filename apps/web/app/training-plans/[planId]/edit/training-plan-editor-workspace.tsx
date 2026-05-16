"use client";

/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

import {
  ArrowDownIcon,
  ArrowLeftIcon,
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
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  type SessionExercise,
  type TrainingPlan,
  type TrainingPlanDay,
  type TrainingSession,
  useTrainingPlanEditor,
} from "@/hooks/use-training-plans";
import type { Exercise } from "@/hooks/use-exercises";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
type DraftPlan = Pick<TrainingPlan, "name" | "goal" | "level" | "durationWeeks" | "generalNotes">;
type DraftSession = Pick<TrainingSession, "name" | "description" | "coachNote">;

const dayLabels: Record<string, string> = {
  friday: "Viernes",
  monday: "Lunes",
  saturday: "Sabado",
  sunday: "Domingo",
  thursday: "Jueves",
  tuesday: "Martes",
  wednesday: "Miercoles",
};

const levelLabels: Record<string, string> = {
  advanced: "Avanzado",
  beginner: "Principiante",
  intermediate: "Intermedio",
};

export function TrainingPlanEditorWorkspace() {
  const params = useParams<{ planId: string }>();
  const planId = params.planId;
  const editor = useTrainingPlanEditor(planId);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [planSaveState, setPlanSaveState] = useState<SaveState>("idle");
  const [sessionSaveState, setSessionSaveState] = useState<SaveState>("idle");
  const [planDraft, setPlanDraft] = useState<DraftPlan | null>(null);
  const [sessionDraft, setSessionDraft] = useState<DraftSession | null>(null);

  const plan = editor.plan;
  const sessions = useMemo(() => getSessions(plan), [plan]);
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? sessions[0];
  const isReadOnly = plan?.status !== "draft";
  const saveState = getCombinedSaveState(planSaveState, sessionSaveState);

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
      await editor.loadPlan();
      setPlanSaveState("saved");
    } catch (caughtError) {
      setPlanSaveState("error");
      toast.error(getErrorMessage(caughtError));
    }
  }

  async function saveSessionDraft() {
    if (!selectedSession || !sessionDraft || isReadOnly) {
      return;
    }

    setSessionSaveState("saving");
    try {
      const updatedSession = await editor.updateSession(selectedSession.id, sessionDraft);
      setSessionDraft({
        coachNote: updatedSession.coachNote,
        description: updatedSession.description,
        name: updatedSession.name,
      });
      await editor.loadPlan();
      setSessionSaveState("saved");
    } catch (caughtError) {
      setSessionSaveState("error");
      toast.error(getErrorMessage(caughtError));
    }
  }

  async function mutateStructure(action: () => Promise<unknown>, success: string) {
    if (isReadOnly) {
      return;
    }

    setSessionSaveState("saving");
    try {
      await action();
      await editor.loadPlan();
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
          Cargando plan
        </span>
      </main>
    );
  }

  if (editor.error || !plan || !planDraft) {
    return (
      <main className="min-h-screen bg-background p-4 text-foreground">
        <div className="mx-auto max-w-3xl rounded-lg border bg-card p-6">
          <p className="text-sm text-destructive">{editor.error || "Plan no disponible."}</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/training-plans">Volver a planes</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-4 p-4 lg:p-6">
        <header className="flex flex-col gap-4 rounded-xl border bg-card p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild size="icon" variant="outline">
              <Link href="/training-plans" aria-label="Volver">
                <ArrowLeftIcon className="size-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Editor de plan</p>
              <h1 className="truncate text-2xl font-semibold leading-tight">{plan.name}</h1>
            </div>
            {plan.isSystemTemplate ? (
              <Badge variant="secondary">Base del sistema</Badge>
            ) : null}
            <Badge variant={plan.status === "draft" ? "secondary" : "outline"}>
              {plan.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <SaveIndicator state={saveState} />
            <ThemeToggle />
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <PlanTree
            plan={plan}
            selectedSessionId={selectedSession?.id}
            onSelectSession={setSelectedSessionId}
          />

          <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <PlanDetails
              draft={planDraft}
              isReadOnly={isReadOnly}
                onChange={(draft) => {
                  setPlanDraft(draft);
                setPlanSaveState("dirty");
              }}
              onSave={() => void savePlanDraft()}
            />
            {selectedSession && sessionDraft ? (
              <SessionEditor
                draft={sessionDraft}
                isReadOnly={isReadOnly}
                session={selectedSession}
                onAddExercise={(exercise) =>
                  mutateStructure(
                    () =>
                      editor.addSessionExercise(selectedSession.id, {
                        exerciseId: exercise.id,
                        reps: "10-12",
                        sets: 3,
                      }),
                    "Ejercicio agregado",
                  )
                }
                onAddAlternative={(sessionExerciseId, exercise) =>
                  mutateStructure(
                    () =>
                      editor.addAlternative(sessionExerciseId, {
                        alternativeExerciseId: exercise.id,
                      }),
                    "Alternativa agregada",
                  )
                }
                onChange={(draft) => {
                  setSessionDraft(draft);
                  setSessionSaveState("dirty");
                }}
                onDeleteExercise={(sessionExerciseId) =>
                  mutateStructure(
                    () => editor.deleteSessionExercise(sessionExerciseId),
                    "Ejercicio eliminado",
                  )
                }
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
                  const index = exercises.findIndex((item) => item.id === sessionExercise.id);
                  const swapIndex = direction === "up" ? index - 1 : index + 1;
                  if (swapIndex < 0 || swapIndex >= exercises.length) {
                    return;
                  }
                  const reordered = [...exercises];
                  [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
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
                onSave={() => void saveSessionDraft()}
                onUpdateExercise={(sessionExerciseId, body) =>
                  mutateStructure(
                    () => editor.updateSessionExercise(sessionExerciseId, body),
                    "Ejercicio actualizado",
                  )
                }
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Sesion</CardTitle>
                  <CardDescription>Selecciona una sesion para editarla.</CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function PlanTree({
  onSelectSession,
  plan,
  selectedSessionId,
}: {
  onSelectSession: (sessionId: string) => void;
  plan: TrainingPlan;
  selectedSessionId?: string;
}) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Estructura</CardTitle>
        <CardDescription>Semanas, dias y sesiones del template.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {plan.weeks?.map((week) => (
          <details key={week.id} className="rounded-lg border bg-background p-2" open>
            <summary className="cursor-pointer text-sm font-semibold">
              Semana {week.weekNumber}
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              {week.days.map((day) => (
                <DayNode
                  key={day.id}
                  day={day}
                  isSelected={day.session?.id === selectedSessionId}
                  onSelectSession={onSelectSession}
                />
              ))}
            </div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}

function DayNode({
  day,
  isSelected,
  onSelectSession,
}: {
  day: TrainingPlanDay;
  isSelected: boolean;
  onSelectSession: (sessionId: string) => void;
}) {
  return (
    <details className="rounded-md border bg-card p-2" open>
      <summary className="cursor-pointer text-sm text-muted-foreground">
        {dayLabels[day.dayOfWeek] ?? day.dayOfWeek}
      </summary>
      {day.session ? (
        <button
          className={cn(
            "mt-2 w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
            isSelected ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
          )}
          type="button"
          onClick={() => onSelectSession(day.session?.id ?? "")}
        >
          {day.session.name}
        </button>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Sin sesion</p>
      )}
    </details>
  );
}

function PlanDetails({
  draft,
  isReadOnly,
  onChange,
  onSave,
}: {
  draft: DraftPlan;
  isReadOnly: boolean;
  onChange: (draft: DraftPlan) => void;
  onSave: () => void;
}) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Datos del plan</CardTitle>
        <CardDescription>El autosave guarda cambios cada 2 segundos.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Field label="Nombre">
          <Input
            disabled={isReadOnly}
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
          />
        </Field>
        <Field label="Objetivo">
          <Input
            disabled={isReadOnly}
            value={draft.goal ?? ""}
            onChange={(event) => onChange({ ...draft, goal: event.target.value })}
          />
        </Field>
        <Field label="Nivel">
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
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
        <Field label="Semanas">
          <Input
            disabled={isReadOnly}
            min={1}
            type="number"
            value={draft.durationWeeks}
            onChange={(event) =>
              onChange({ ...draft, durationWeeks: Number(event.target.value) })
            }
          />
        </Field>
        <Field label="Notas generales">
          <textarea
            className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
            disabled={isReadOnly}
            value={draft.generalNotes ?? ""}
            onChange={(event) => onChange({ ...draft, generalNotes: event.target.value })}
          />
        </Field>
        <Button disabled={isReadOnly} type="button" onClick={onSave}>
          <SaveIcon data-icon="inline-start" />
          Guardar ahora
        </Button>
      </CardContent>
    </Card>
  );
}

function SessionEditor({
  draft,
  isReadOnly,
  onAddExercise,
  onAddAlternative,
  onChange,
  onDeleteAlternative,
  onDeleteExercise,
  onDuplicateExercise,
  onMoveExercise,
  onSave,
  onUpdateExercise,
  session,
}: {
  draft: DraftSession;
  isReadOnly: boolean;
  onAddExercise: (exercise: Exercise) => void;
  onAddAlternative: (sessionExerciseId: string, exercise: Exercise) => void;
  onChange: (draft: DraftSession) => void;
  onDeleteAlternative: (alternativeId: string) => void;
  onDeleteExercise: (sessionExerciseId: string) => void;
  onDuplicateExercise: (sessionExerciseId: string) => void;
  onMoveExercise: (exercise: SessionExercise, direction: "up" | "down") => void;
  onSave: () => void;
  onUpdateExercise: (sessionExerciseId: string, body: Partial<Pick<SessionExercise, "sets" | "reps" | "restSeconds" | "coachNote">>) => void;
  session: TrainingSession;
}) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Sesion</CardTitle>
            <CardDescription>Ejercicios, cargas prescritas y notas del coach.</CardDescription>
          </div>
          <Button disabled={isReadOnly} type="button" onClick={() => setIsAdding((value) => !value)}>
            <PlusIcon data-icon="inline-start" />
            Agregar
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nombre">
            <Input
              disabled={isReadOnly}
              value={draft.name}
              onChange={(event) => onChange({ ...draft, name: event.target.value })}
            />
          </Field>
          <Field label="Descripcion">
            <Input
              disabled={isReadOnly}
              value={draft.description ?? ""}
              onChange={(event) => onChange({ ...draft, description: event.target.value })}
            />
          </Field>
          <Field label="Nota del coach">
            <Input
              disabled={isReadOnly}
              value={draft.coachNote ?? ""}
              onChange={(event) => onChange({ ...draft, coachNote: event.target.value })}
            />
          </Field>
          <div className="flex items-end">
            <Button disabled={isReadOnly} type="button" variant="outline" onClick={onSave}>
              <SaveIcon data-icon="inline-start" />
              Guardar sesion
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isAdding && !isReadOnly ? (
          <ExerciseSearch
            selectionMode="explicit"
            onSelect={(exercise) => {
              onAddExercise(exercise);
              setIsAdding(false);
            }}
          />
        ) : null}
        <div className="flex flex-col gap-3">
          {[...session.exercises]
            .sort((first, second) => first.orderIndex - second.orderIndex)
            .map((exercise, index, exercises) => (
              <SessionExerciseRow
                key={exercise.id}
                exercise={exercise}
                isFirst={index === 0}
                isLast={index === exercises.length - 1}
                isReadOnly={isReadOnly}
                onDelete={() => onDeleteExercise(exercise.id)}
                onDeleteAlternative={onDeleteAlternative}
                onDuplicate={() => onDuplicateExercise(exercise.id)}
                onMoveDown={() => onMoveExercise(exercise, "down")}
                onMoveUp={() => onMoveExercise(exercise, "up")}
                onAddAlternative={(alternative) => onAddAlternative(exercise.id, alternative)}
                onUpdate={(body) => onUpdateExercise(exercise.id, body)}
              />
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SessionExerciseRow({
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
}: {
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
  onUpdate: (body: Partial<Pick<SessionExercise, "sets" | "reps" | "restSeconds" | "coachNote">>) => void;
}) {
  const [draft, setDraft] = useState({
    coachNote: exercise.coachNote ?? "",
    reps: exercise.reps,
    restSeconds: exercise.restSeconds ?? "",
    sets: exercise.sets ?? "",
  });
  const [isAddingAlternative, setIsAddingAlternative] = useState(false);

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
          <p className="truncate font-semibold">
            {exercise.exercise?.name ?? `Ejercicio ${exercise.exerciseId}`}
          </p>
          <p className="text-xs text-muted-foreground">Orden {exercise.orderIndex + 1}</p>
        </div>
        <div className="flex gap-2">
          <Button disabled={isReadOnly || isFirst} size="icon" type="button" variant="outline" onClick={onMoveUp}>
            <ArrowUpIcon className="size-4" />
          </Button>
          <Button disabled={isReadOnly || isLast} size="icon" type="button" variant="outline" onClick={onMoveDown}>
            <ArrowDownIcon className="size-4" />
          </Button>
          <Button disabled={isReadOnly} size="icon" type="button" variant="outline" onClick={onDuplicate}>
            <CopyIcon className="size-4" />
          </Button>
          <Button disabled={isReadOnly} size="icon" type="button" variant="outline" onClick={onDelete}>
            <Trash2Icon className="size-4" />
          </Button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <Field label="Sets">
          <Input
            disabled={isReadOnly}
            min={1}
            type="number"
            value={draft.sets}
            onChange={(event) => setDraft({ ...draft, sets: event.target.value })}
            onBlur={() => onUpdate({ sets: draft.sets === "" ? null : Number(draft.sets) })}
          />
        </Field>
        <Field label="Reps">
          <Input
            disabled={isReadOnly}
            value={draft.reps}
            onChange={(event) => setDraft({ ...draft, reps: event.target.value })}
            onBlur={() => onUpdate({ reps: draft.reps })}
          />
        </Field>
        <Field label="Descanso">
          <Input
            disabled={isReadOnly}
            min={1}
            type="number"
            value={draft.restSeconds}
            onChange={(event) => setDraft({ ...draft, restSeconds: event.target.value })}
            onBlur={() =>
              onUpdate({ restSeconds: draft.restSeconds === "" ? null : Number(draft.restSeconds) })
            }
          />
        </Field>
        <Field label="Nota">
          <Input
            disabled={isReadOnly}
            value={draft.coachNote}
            onChange={(event) => setDraft({ ...draft, coachNote: event.target.value })}
            onBlur={() => onUpdate({ coachNote: draft.coachNote })}
          />
        </Field>
      </div>
      {exercise.alternatives.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {exercise.alternatives.map((alternative) => (
            <span
              key={alternative.id}
              className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
            >
              Alt: {alternative.alternativeExercise?.name ?? alternative.alternativeExerciseId}
              <button
                className="text-muted-foreground hover:text-destructive"
                disabled={isReadOnly}
                type="button"
                onClick={() => onDeleteAlternative(alternative.id)}
              >
                Quitar
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-3">
        <Button
          disabled={isReadOnly || exercise.alternatives.length >= 3}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => setIsAddingAlternative((value) => !value)}
        >
          <PlusIcon data-icon="inline-start" />
          Alternativa
        </Button>
      </div>
      {isAddingAlternative && !isReadOnly ? (
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
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const label = {
    dirty: "Cambios pendientes",
    error: "Error al guardar",
    idle: "Sin cambios",
    saved: "Guardado",
    saving: "Guardando...",
  }[state];

  return (
    <span className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
      {state === "saving" ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
      {label}
    </span>
  );
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
  return error instanceof Error ? error.message : "No se pudo guardar el cambio";
}

function getCombinedSaveState(planState: SaveState, sessionState: SaveState): SaveState {
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
