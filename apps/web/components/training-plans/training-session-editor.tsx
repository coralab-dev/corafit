"use client";

import {
  CalendarDaysIcon,
  ChevronDownIcon,
  CopyIcon,
  EditIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
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
import type {
  DayOfWeek,
  SessionExercise,
  TrainingPlanDay,
  TrainingSession,
} from "@/hooks/use-training-plans";
import type { Exercise } from "@/hooks/use-exercises";
import { ExercisePickerDialog } from "./exercise-picker-dialog";
import { TrainingSessionExerciseRow } from "./training-session-exercise-row";
import { dayLabels, dayOfWeekValues } from "./training-plan-days";
import type { PrescriptionField } from "./training-plan-editor-utils";
type SessionDraft = Pick<TrainingSession, "name" | "description" | "coachNote">;
type ExerciseUpdate = Partial<
  Pick<SessionExercise, "sets" | "reps" | "restSeconds" | "coachNote">
>;

export function TrainingSessionEditor({
  day,
  isBusy,
  isReadOnly,
  onDraftChange,
  onDraftCommit,
  onDraftValidationChange,
  onAddAlternative,
  onAddExercise,
  onDeleteAlternative,
  onDeleteExercise,
  onDeleteSession,
  onDuplicateDay,
  onDuplicateExercise,
  onMoveDay,
  onMoveExercise,
  onSaveSessionInfo,
  onUpdateExercise,
  session,
  usedDays,
}: {
  day: TrainingPlanDay;
  isBusy: boolean;
  isReadOnly: boolean;
  onDraftChange: (sessionExerciseId: string, field: PrescriptionField) => void;
  onDraftCommit: (sessionExerciseId: string, field: PrescriptionField) => void;
  onDraftValidationChange: (
    sessionExerciseId: string,
    field: PrescriptionField,
    hasError: boolean,
  ) => void;
  onAddAlternative: (sessionExerciseId: string, exercise: Exercise) => Promise<boolean>;
  onAddExercise: (exercise: Exercise) => Promise<string | null>;
  onDeleteAlternative: (alternativeId: string) => void;
  onDeleteExercise: (sessionExerciseId: string) => Promise<boolean>;
  onDeleteSession: () => Promise<boolean>;
  onDuplicateDay: (targetDay: DayOfWeek) => Promise<boolean>;
  onDuplicateExercise: (sessionExerciseId: string) => void;
  onMoveDay: (targetDay: DayOfWeek) => Promise<boolean>;
  onMoveExercise: (exercise: SessionExercise, direction: "up" | "down") => void;
  onSaveSessionInfo: (sessionId: string, draft: SessionDraft) => Promise<boolean>;
  onUpdateExercise: (sessionExerciseId: string, body: ExerciseUpdate) => Promise<boolean>;
  session: TrainingSession;
  usedDays: DayOfWeek[];
}) {
  const [dayDialogMode, setDayDialogMode] = useState<"copy" | "move" | null>(null);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingInformation, setIsEditingInformation] = useState(false);
  const sortedExercises = useMemo(
    () => [...session.exercises].sort((first, second) => first.orderIndex - second.orderIndex),
    [session.exercises],
  );
  const totalSets = sortedExercises.reduce((total, exercise) => total + (exercise.sets ?? 0), 0);

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border !border-transparent bg-card shadow-[var(--surface-shadow)]">
      <header className="border-b p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-normal">{session.name}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              {session.description || "Ejercicios, prescripciones y notas de esta sesión."}
            </p>
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              {sortedExercises.length} ejercicios · {totalSets} series
            </p>
          </div>
          {!isReadOnly ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={isBusy} type="button" onClick={() => setIsAddingExercise(true)}>
                <PlusIcon data-icon="inline-start" />
                Agregar ejercicio
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline">
                    <MoreVerticalIcon data-icon="inline-start" />
                    Opciones
                    <ChevronDownIcon className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-60 rounded-xl border !border-transparent shadow-[var(--surface-shadow-soft)]"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuItem disabled={isBusy} onSelect={() => setIsEditingInformation(true)}>
                      <EditIcon data-icon="inline-start" />
                      Editar información de sesión
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={isBusy} onSelect={() => setDayDialogMode("copy")}>
                      <CopyIcon data-icon="inline-start" />
                      Duplicar día
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={isBusy} onSelect={() => setDayDialogMode("move")}>
                      <CalendarDaysIcon data-icon="inline-start" />
                      Cambiar día
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      disabled={isBusy}
                      onSelect={() => setIsConfirmingDelete(true)}
                    >
                      <Trash2Icon data-icon="inline-start" />
                      Eliminar sesión
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
        </div>
        {session.coachNote ? (
          <p className="mt-4 rounded-xl bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Nota del coach:</span>{" "}
            {session.coachNote}
          </p>
        ) : null}
      </header>

      <div className="p-3 sm:p-4">
        {sortedExercises.length ? (
          <>
            <div className="hidden overflow-x-auto rounded-xl border border-border/55 lg:block">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-muted/35">
                  <tr className="border-b text-xs font-semibold text-muted-foreground">
                    <th className="px-4 py-3">Ejercicio</th>
                    <th className="px-3 py-3">Series</th>
                    <th className="px-3 py-3">Repeticiones</th>
                    <th className="px-3 py-3">Descanso</th>
                    <th className="px-3 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedExercises.map((exercise, index) => (
                    <TrainingSessionExerciseRow
                      key={`${exercise.id}-table`}
                      exercise={exercise}
                      isFirst={index === 0}
                      isLast={index === sortedExercises.length - 1}
                      isBusy={isBusy}
                      isReadOnly={isReadOnly}
                      onDraftChange={(field) => onDraftChange(exercise.id, field)}
                      onDraftCommit={(field) => onDraftCommit(exercise.id, field)}
                      onDraftValidationChange={(field, hasError) =>
                        onDraftValidationChange(exercise.id, field, hasError)}
                      presentation="table"
                      sessionName={session.name}
                      onAddAlternative={(alternative) => onAddAlternative(exercise.id, alternative)}
                      onDelete={() => onDeleteExercise(exercise.id)}
                      onDeleteAlternative={onDeleteAlternative}
                      onDuplicate={() => onDuplicateExercise(exercise.id)}
                      onMoveDown={() => onMoveExercise(exercise, "down")}
                      onMoveUp={() => onMoveExercise(exercise, "up")}
                      onUpdate={(body) => onUpdateExercise(exercise.id, body)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 lg:hidden">
              {sortedExercises.map((exercise, index) => (
                <TrainingSessionExerciseRow
                  key={`${exercise.id}-card`}
                  exercise={exercise}
                  isFirst={index === 0}
                  isLast={index === sortedExercises.length - 1}
                  isBusy={isBusy}
                  isReadOnly={isReadOnly}
                  onDraftChange={(field) => onDraftChange(exercise.id, field)}
                  onDraftCommit={(field) => onDraftCommit(exercise.id, field)}
                  onDraftValidationChange={(field, hasError) =>
                    onDraftValidationChange(exercise.id, field, hasError)}
                  presentation="card"
                  sessionName={session.name}
                  onAddAlternative={(alternative) => onAddAlternative(exercise.id, alternative)}
                  onDelete={() => onDeleteExercise(exercise.id)}
                  onDeleteAlternative={onDeleteAlternative}
                  onDuplicate={() => onDuplicateExercise(exercise.id)}
                  onMoveDown={() => onMoveExercise(exercise, "down")}
                  onMoveUp={() => onMoveExercise(exercise, "up")}
                  onUpdate={(body) => onUpdateExercise(exercise.id, body)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
              <PlusIcon className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold">Esta sesión todavía no tiene ejercicios</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Agrega el primer ejercicio desde la biblioteca.
              </p>
            </div>
            {!isReadOnly ? (
              <Button disabled={isBusy} type="button" onClick={() => setIsAddingExercise(true)}>
                <PlusIcon data-icon="inline-start" />
                Agregar ejercicio
              </Button>
            ) : null}
          </div>
        )}
      </div>

      <ExercisePickerDialog
        open={isAddingExercise}
        sessionName={session.name}
        onOpenChange={setIsAddingExercise}
        onSelect={async (exercise) => {
          const createdId = await onAddExercise(exercise);
          if (!createdId) {
            return false;
          }

          window.setTimeout(() => {
            const createdRow = Array.from(
              document.querySelectorAll<HTMLElement>(
                `[data-session-exercise-id="${createdId}"]`,
              ),
            ).find((element) => element.offsetParent !== null);
            createdRow?.focus({ preventScroll: true });
            createdRow?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 50);
          return true;
        }}
      />

      <SessionInformationDialog
        open={isEditingInformation}
        session={session}
        onOpenChange={setIsEditingInformation}
        onSave={onSaveSessionInfo}
      />

      <DayTargetDialog
        key={`${day.id}-${dayDialogMode ?? "closed"}`}
        currentDay={day.dayOfWeek}
        mode={dayDialogMode ?? "move"}
        open={dayDialogMode !== null}
        usedDays={usedDays}
        onOpenChange={(open) => !open && setDayDialogMode(null)}
        onSubmit={async (targetDay) => {
          const didSave =
            dayDialogMode === "copy"
              ? await onDuplicateDay(targetDay)
              : await onMoveDay(targetDay);
          if (didSave) {
            setDayDialogMode(null);
          }
        }}
      />

      <ConfirmActionDialog
        confirmLabel="Eliminar sesión"
        consequence="También se eliminarán sus ejercicios y alternativas. Esta acción no se puede deshacer."
        description={session.name}
        isLoading={isDeleting}
        open={isConfirmingDelete}
        title={`Eliminar ${session.name}`}
        onOpenChange={setIsConfirmingDelete}
        onConfirm={async () => {
          setIsDeleting(true);
          const didDelete = await onDeleteSession();
          setIsDeleting(false);
          return didDelete;
        }}
      />
    </section>
  );
}

function SessionInformationDialog({
  onOpenChange,
  onSave,
  open,
  session,
}: {
  onOpenChange: (open: boolean) => void;
  onSave: (sessionId: string, draft: SessionDraft) => Promise<boolean>;
  open: boolean;
  session: TrainingSession;
}) {
  const [draft, setDraft] = useState<SessionDraft>({
    coachNote: session.coachNote,
    description: session.description,
    name: session.name,
  });
  const [isSaving, setIsSaving] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setDraft({
            coachNote: session.coachNote,
            description: session.description,
            name: session.name,
          });
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="rounded-2xl border !border-transparent shadow-[var(--surface-shadow)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar información de sesión</DialogTitle>
          <DialogDescription>Actualiza el nombre, descripción y nota del coach.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Nombre
            <Input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Descripción
            <Input
              value={draft.description ?? ""}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value || null }))
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Nota del coach
            <textarea
              className="min-h-24 rounded-xl border bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
              value={draft.coachNote ?? ""}
              onChange={(event) =>
                setDraft((current) => ({ ...current, coachNote: event.target.value || null }))
              }
            />
          </label>
        </div>
        <DialogFooter>
          <Button
            disabled={isSaving || !draft.name.trim()}
            type="button"
            onClick={() => {
              setIsSaving(true);
              void onSave(session.id, draft).then((didSave) => {
                setIsSaving(false);
                if (didSave) {
                  onOpenChange(false);
                }
              });
            }}
          >
            {isSaving ? (
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : (
              <SaveIcon data-icon="inline-start" />
            )}
            Guardar sesión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DayTargetDialog({
  currentDay,
  mode,
  onOpenChange,
  onSubmit,
  open,
  usedDays,
}: {
  currentDay: DayOfWeek;
  mode: "copy" | "move";
  onOpenChange: (open: boolean) => void;
  onSubmit: (day: DayOfWeek) => Promise<void>;
  open: boolean;
  usedDays: DayOfWeek[];
}) {
  const options = dayOfWeekValues.filter((day) => {
    if (mode === "copy") {
      return day !== currentDay && !usedDays.includes(day);
    }
    return day === currentDay || !usedDays.includes(day);
  });
  const [targetDay, setTargetDay] = useState<DayOfWeek>(options[0] ?? currentDay);
  const [isSaving, setIsSaving] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
      <DialogContent className="rounded-2xl border !border-transparent shadow-[var(--surface-shadow)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "copy" ? "Duplicar día" : "Cambiar día"}</DialogTitle>
          <DialogDescription>Elige un día disponible dentro de la misma semana.</DialogDescription>
        </DialogHeader>
        <label className="grid gap-2 text-sm font-medium">
          Día
          <select
            className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
            value={targetDay}
            onChange={(event) => setTargetDay(event.target.value as DayOfWeek)}
          >
            {options.map((day) => (
              <option key={day} value={day}>{dayLabels[day]}</option>
            ))}
          </select>
        </label>
        <DialogFooter>
          <Button disabled={isSaving} type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={isSaving || options.length === 0}
            type="button"
            onClick={() => {
              setIsSaving(true);
              void onSubmit(targetDay).finally(() => setIsSaving(false));
            }}
          >
            {isSaving ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : null}
            {mode === "copy" ? "Duplicar" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
