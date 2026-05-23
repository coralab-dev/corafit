"use client";

/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
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
import { PlanTree } from "@/components/training-plans/training-plan-tree";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type SessionExercise,
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
  const planId = params.planId;
  const editor = useTrainingPlanEditor(planId);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [planSaveState, setPlanSaveState] = useState<SaveState>("idle");
  const [sessionSaveState, setSessionSaveState] = useState<SaveState>("idle");
  const [publishState, setPublishState] = useState<SaveState>("idle");
  const [planDraft, setPlanDraft] = useState<DraftPlan | null>(null);
  const [sessionDraft, setSessionDraft] = useState<DraftSession | null>(null);

  const plan = editor.plan;
  const sessions = useMemo(() => getSessions(plan), [plan]);
  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? sessions[0];
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
      const updatedSession = await editor.updateSession(
        selectedSession.id,
        sessionDraft,
      );
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
      await editor.loadPlan();
      setSessionSaveState("saved");
      toast.success(success);
    } catch (caughtError) {
      setSessionSaveState("error");
      toast.error(getErrorMessage(caughtError));
    }
  }

  async function publishPlan() {
    if (isReadOnly || publishState === "saving") {
      return;
    }

    setPublishState("saving");
    try {
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
      toast.success("Plan publicado");
    } catch (caughtError) {
      setPublishState("error");
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
    <div className="flex flex-col gap-6">
      <EditorHeader
        isReadOnly={isReadOnly}
        plan={plan}
        saveState={saveState}
        publishState={publishState}
        onPublish={() => void publishPlan()}
        onSave={() => void saveAllDrafts()}
      />

      <Tabs className="flex flex-col gap-5" defaultValue="structure">
        <TabsList className="w-fit">
          <TabsTrigger value="structure">Estructura</TabsTrigger>
          <TabsTrigger value="details">Informacion general</TabsTrigger>
        </TabsList>

        <TabsContent className="m-0" value="structure">
          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <PlanTree
              editor={editor}
              plan={plan}
              selectedSessionId={selectedSession?.id}
              onSelectSession={setSelectedSessionId}
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
                onSave={() => void saveSessionDraft()}
                onUpdateExercise={(sessionExerciseId, body) =>
                  mutateStructure(
                    () => editor.updateSessionExercise(sessionExerciseId, body),
                    "Ejercicio actualizado",
                  )
                }
              />
            ) : (
              <Card className="min-h-72">
                <CardHeader>
                  <CardTitle>Sesion</CardTitle>
                  <CardDescription>
                    Selecciona una sesion para editarla.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent className="m-0" value="details">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EditorHeader({
  isReadOnly,
  onPublish,
  onSave,
  plan,
  saveState,
  publishState,
}: {
  isReadOnly: boolean;
  onPublish: () => void;
  onSave: () => void;
  plan: TrainingPlan;
  saveState: SaveState;
  publishState: SaveState;
}) {
  const isSaving = saveState === "saving";
  const isPublishing = publishState === "saving";

  return (
    <header className="rounded-xl border bg-card px-4 py-5 shadow-sm md:px-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Button asChild size="icon" variant="ghost">
              <Link aria-label="Volver a planes" href="/training-plans">
                <ChevronLeftIcon />
              </Link>
            </Button>
            <Link className="hover:text-foreground" href="/training-plans">
              Planes
            </Link>
            <ChevronRightIcon className="size-4" />
            <span className="truncate">{plan.name}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-3xl font-semibold leading-tight">
              {plan.name}
            </h1>
            <Badge variant={plan.status === "draft" ? "secondary" : "outline"}>
              {statusLabels[plan.status] ?? plan.status}
            </Badge>
          </div>
          <dl className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <dt className="font-medium text-foreground">Objetivo:</dt>
              <dd>{plan.goal || "Sin objetivo"}</dd>
            </div>
            <span aria-hidden="true">/</span>
            <div className="flex items-center gap-1.5">
              <dt className="font-medium text-foreground">Nivel:</dt>
              <dd>
                {plan.level
                  ? (levelLabels[plan.level] ?? plan.level)
                  : "Sin nivel"}
              </dd>
            </div>
            <span aria-hidden="true">/</span>
            <div className="flex items-center gap-1.5">
              <dt className="font-medium text-foreground">Duracion:</dt>
              <dd>{plan.durationWeeks} semanas</dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Button disabled type="button" variant="outline">
            Vista previa
            <Badge variant="secondary">Proximamente</Badge>
          </Button>
          <Button
            disabled={isReadOnly || isSaving}
            type="button"
            variant="outline"
            onClick={onSave}
          >
            {isSaving ? (
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : (
              <SaveIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
          <Button
            disabled={isReadOnly || isPublishing}
            type="button"
            onClick={onPublish}
          >
            {isPublishing ? (
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : null}
            Publicar
          </Button>
        </div>
      </div>
    </header>
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
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle>Informacion general</CardTitle>
        <CardDescription>
          El autosave guarda cambios cada 2 segundos.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
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
            onChange={(event) =>
              onChange({ ...draft, generalNotes: event.target.value })
            }
          />
        </Field>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {getSaveStateLabel(saveState)}
        </p>
        <Button
          disabled={isReadOnly || saveState === "saving"}
          type="button"
          onClick={onSave}
        >
          {saveState === "saving" ? (
            <Loader2Icon className="animate-spin" data-icon="inline-start" />
          ) : null}
          <SaveIcon data-icon="inline-start" />
          Guardar ahora
        </Button>
      </CardFooter>
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
  onUpdateExercise: (
    sessionExerciseId: string,
    body: Partial<
      Pick<SessionExercise, "sets" | "reps" | "restSeconds" | "coachNote">
    >,
  ) => void;
  session: TrainingSession;
}) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>{session.name}</CardTitle>
            <CardDescription>
              Ejercicios, cargas prescritas y notas del coach.
            </CardDescription>
          </div>
          <Button
            disabled={isReadOnly}
            type="button"
            onClick={() => setIsAdding((value) => !value)}
          >
            <PlusIcon data-icon="inline-start" />
            Agregar ejercicio
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nombre">
            <Input
              disabled={isReadOnly}
              value={draft.name}
              onChange={(event) =>
                onChange({ ...draft, name: event.target.value })
              }
            />
          </Field>
          <Field label="Descripcion">
            <Input
              disabled={isReadOnly}
              value={draft.description ?? ""}
              onChange={(event) =>
                onChange({ ...draft, description: event.target.value })
              }
            />
          </Field>
          <Field label="Nota del coach">
            <Input
              disabled={isReadOnly}
              value={draft.coachNote ?? ""}
              onChange={(event) =>
                onChange({ ...draft, coachNote: event.target.value })
              }
            />
          </Field>
          <div className="flex items-end">
            <Button
              disabled={isReadOnly}
              type="button"
              variant="outline"
              onClick={onSave}
            >
              <SaveIcon data-icon="inline-start" />
              Guardar sesion
            </Button>
          </div>
        </div>
        <Field label="Nota de la sesion (opcional)">
          <textarea
            className="min-h-16 rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
            disabled={isReadOnly}
            placeholder="Escribe una nota general para esta sesion..."
            value={draft.coachNote ?? ""}
            onChange={(event) =>
              onChange({ ...draft, coachNote: event.target.value })
            }
          />
        </Field>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {isAdding && !isReadOnly ? (
          <ExerciseSearch
            selectionMode="explicit"
            onSelect={(exercise) => {
              onAddExercise(exercise);
              setIsAdding(false);
            }}
          />
        ) : null}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Ejercicios</h2>
            <Button
              disabled={isReadOnly}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setIsAdding((value) => !value)}
            >
              <PlusIcon data-icon="inline-start" />
              Agregar ejercicio
            </Button>
          </div>
          <div className="overflow-hidden rounded-lg border">
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
  onUpdate: (
    body: Partial<
      Pick<SessionExercise, "sets" | "reps" | "restSeconds" | "coachNote">
    >,
  ) => void;
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
    <div className="border-b bg-background last:border-b-0">
      <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_88px_120px_96px_44px] lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-medium text-muted-foreground">
            {exercise.orderIndex + 1}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">
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
              <DropdownMenuItem disabled={isReadOnly} onSelect={onDelete}>
                <Trash2Icon data-icon="inline-start" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="px-3 pb-3">
        <Field label="Nota">
          <Input
            disabled={isReadOnly}
            value={draft.coachNote}
            onChange={(event) =>
              setDraft({ ...draft, coachNote: event.target.value })
            }
            onBlur={() => onUpdate({ coachNote: draft.coachNote })}
          />
        </Field>
      </div>
      {exercise.alternatives.length ? (
        <div className="flex flex-wrap gap-2 border-t px-3 py-3">
          {exercise.alternatives.map((alternative) => (
            <span
              key={alternative.id}
              className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
            >
              Alt:{" "}
              {alternative.alternativeExercise?.name ??
                alternative.alternativeExerciseId}
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
      <div className="border-t px-3 py-3">
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
