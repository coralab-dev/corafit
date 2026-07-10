"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  EditIcon,
  ImageIcon,
  InfoIcon,
  MoreVerticalIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import { memo, useEffect, useRef, useState } from "react";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { equipmentLabels, muscleLabels } from "@/components/exercise-search/exercise-search-item";
import { Badge } from "@/components/ui/badge";
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
import type { SessionExercise, SessionExerciseAlternative } from "@/hooks/use-training-plans";
import type { Exercise } from "@/hooks/use-exercises";
import { ExercisePickerDialog } from "./exercise-picker-dialog";
import {
  parsePrescriptionUpdate,
  type PrescriptionField,
} from "./training-plan-editor-utils";

type ExerciseUpdate = Partial<
  Pick<SessionExercise, "sets" | "reps" | "restSeconds" | "coachNote">
>;

export type TrainingSessionExerciseRowProps = {
  exercise: SessionExercise;
  isFirst: boolean;
  isLast: boolean;
  isBusy: boolean;
  isReadOnly: boolean;
  onDraftChange: () => void;
  onDraftCommit: () => void;
  onAddAlternative: (exercise: Exercise) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onDeleteAlternative: (alternativeId: string) => void;
  onDuplicate: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onUpdate: (body: ExerciseUpdate) => Promise<boolean>;
  presentation: "table" | "card";
  sessionName: string;
};

export const TrainingSessionExerciseRow = memo(function TrainingSessionExerciseRow({
  exercise,
  isFirst,
  isLast,
  isBusy,
  isReadOnly,
  onDraftChange,
  onDraftCommit,
  onAddAlternative,
  onDelete,
  onDeleteAlternative,
  onDuplicate,
  onMoveDown,
  onMoveUp,
  onUpdate,
  presentation,
  sessionName,
}: TrainingSessionExerciseRowProps) {
  const alternatives = exercise.alternatives ?? [];
  const exerciseName = exercise.exercise?.name ?? `Ejercicio ${exercise.exerciseId}`;
  const [draft, setDraft] = useState({
    coachNote: exercise.coachNote ?? "",
    reps: exercise.reps,
    restSeconds: exercise.restSeconds?.toString() ?? "",
    sets: exercise.sets?.toString() ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<PrescriptionField, string>>>({});
  const [isAlternativePickerOpen, setIsAlternativePickerOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const previousExerciseRef = useRef(exercise);

  useEffect(() => {
    const previousExercise = previousExerciseRef.current;
    setDraft((current) => ({
      coachNote:
        current.coachNote === (previousExercise.coachNote ?? "")
          ? (exercise.coachNote ?? "")
          : current.coachNote,
      reps:
        current.reps === previousExercise.reps ? exercise.reps : current.reps,
      restSeconds:
        current.restSeconds === (previousExercise.restSeconds?.toString() ?? "")
          ? (exercise.restSeconds?.toString() ?? "")
          : current.restSeconds,
      sets:
        current.sets === (previousExercise.sets?.toString() ?? "")
          ? (exercise.sets?.toString() ?? "")
          : current.sets,
    }));
    previousExerciseRef.current = exercise;
  }, [exercise]);

  async function commitField(field: PrescriptionField) {
    const currentValue =
      field === "sets"
        ? exercise.sets
        : field === "restSeconds"
          ? exercise.restSeconds
          : exercise.reps;
    const result = parsePrescriptionUpdate(field, draft[field], currentValue);

    if (result.error) {
      setErrors((current) => ({ ...current, [field]: result.error }));
      return;
    }

    setErrors((current) => ({ ...current, [field]: undefined }));
    if (!result.changed) {
      onDraftCommit();
      return;
    }

    await onUpdate({ [field]: result.value } as ExerciseUpdate);
  }

  function updateDraft(field: PrescriptionField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    onDraftChange();
  }

  async function saveNote() {
    const nextNote = draft.coachNote.trim() || null;
    if (nextNote === exercise.coachNote) {
      setIsEditingNote(false);
      return;
    }

    if (await onUpdate({ coachNote: nextNote })) {
      setIsEditingNote(false);
    }
  }

  const exerciseMeta = exercise.exercise
    ? `${muscleLabels[exercise.exercise.primaryMuscle]} · ${equipmentLabels[exercise.exercise.equipment]}`
    : "Ejercicio de la sesión";

  return (
    <>
      {presentation === "table" ? (
      <tr
        className="hidden border-b bg-card transition-colors last:border-b-0 hover:bg-muted/30 lg:table-row"
        data-session-exercise-id={exercise.id}
        tabIndex={-1}
      >
        <td className="px-4 py-4">
          <ExerciseIdentity
            alternatives={alternatives}
            exercise={exercise}
            exerciseMeta={exerciseMeta}
            exerciseName={exerciseName}
            isReadOnly={isReadOnly}
            onDeleteAlternative={onDeleteAlternative}
          />
        </td>
        <td className="w-24 px-3 py-4 align-top">
          <PrescriptionInput
            ariaLabel={`Series de ${exerciseName}`}
            disabled={isReadOnly}
            error={errors.sets}
            inputMode="numeric"
            value={draft.sets}
            onBlur={() => void commitField("sets")}
            onChange={(value) => updateDraft("sets", value)}
          />
        </td>
        <td className="w-32 px-3 py-4 align-top">
          <PrescriptionInput
            ariaLabel={`Repeticiones de ${exerciseName}`}
            disabled={isReadOnly}
            error={errors.reps}
            value={draft.reps}
            onBlur={() => void commitField("reps")}
            onChange={(value) => updateDraft("reps", value)}
          />
        </td>
        <td className="w-28 px-3 py-4 align-top">
          <PrescriptionInput
            ariaLabel={`Descanso de ${exerciseName}`}
            disabled={isReadOnly}
            error={errors.restSeconds}
            inputMode="numeric"
            value={draft.restSeconds}
            onBlur={() => void commitField("restSeconds")}
            onChange={(value) => updateDraft("restSeconds", value)}
          />
        </td>
        <td className="w-14 px-3 py-4 align-top">
          <ExerciseActions
            isFirst={isFirst}
            isLast={isLast}
            isBusy={isBusy}
            isReadOnly={isReadOnly}
            alternativesCount={alternatives.length}
            onAddAlternative={() => setIsAlternativePickerOpen(true)}
            onDelete={() => setIsConfirmingDelete(true)}
            onDuplicate={onDuplicate}
            onEditNote={() => setIsEditingNote(true)}
            onMoveDown={onMoveDown}
            onMoveUp={onMoveUp}
          />
        </td>
      </tr>
      ) : (
      <article
        className="rounded-2xl border !border-transparent bg-card p-4 shadow-[var(--surface-shadow-soft)] lg:hidden"
        data-session-exercise-id={exercise.id}
        tabIndex={-1}
      >
        <div className="flex items-start gap-3">
          <ExerciseThumbnail exercise={exercise} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold">{exerciseName}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{exerciseMeta}</p>
              </div>
              <ExerciseActions
                isFirst={isFirst}
                isLast={isLast}
                isBusy={isBusy}
                isReadOnly={isReadOnly}
                alternativesCount={alternatives.length}
                onAddAlternative={() => setIsAlternativePickerOpen(true)}
                onDelete={() => setIsConfirmingDelete(true)}
                onDuplicate={onDuplicate}
                onEditNote={() => setIsEditingNote(true)}
                onMoveDown={onMoveDown}
                onMoveUp={onMoveUp}
              />
            </div>
            <ExerciseIndicators alternatives={alternatives} exercise={exercise} />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MobilePrescriptionField label="Series" error={errors.sets}>
            <PrescriptionInput
              ariaLabel={`Series de ${exerciseName}`}
              disabled={isReadOnly}
              error={errors.sets}
              inputMode="numeric"
              value={draft.sets}
              onBlur={() => void commitField("sets")}
              onChange={(value) => updateDraft("sets", value)}
            />
          </MobilePrescriptionField>
          <MobilePrescriptionField label="Reps" error={errors.reps}>
            <PrescriptionInput
              ariaLabel={`Repeticiones de ${exerciseName}`}
              disabled={isReadOnly}
              error={errors.reps}
              value={draft.reps}
              onBlur={() => void commitField("reps")}
              onChange={(value) => updateDraft("reps", value)}
            />
          </MobilePrescriptionField>
          <MobilePrescriptionField label="Descanso" error={errors.restSeconds}>
            <PrescriptionInput
              ariaLabel={`Descanso de ${exerciseName}`}
              disabled={isReadOnly}
              error={errors.restSeconds}
              inputMode="numeric"
              value={draft.restSeconds}
              onBlur={() => void commitField("restSeconds")}
              onChange={(value) => updateDraft("restSeconds", value)}
            />
          </MobilePrescriptionField>
        </div>
        {alternatives.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {alternatives.map((alternative) => (
              <AlternativeChip
                key={alternative.id}
                alternative={alternative}
                isReadOnly={isReadOnly}
                onDelete={() => onDeleteAlternative(alternative.id)}
              />
            ))}
          </div>
        ) : null}
      </article>
      )}

      <Dialog open={isEditingNote} onOpenChange={setIsEditingNote}>
        <DialogContent className="rounded-2xl border !border-transparent shadow-[var(--surface-shadow)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar nota del ejercicio</DialogTitle>
            <DialogDescription>
              Esta nota queda asociada sólo a {exerciseName} dentro de la sesión.
            </DialogDescription>
          </DialogHeader>
          <label className="grid gap-2 text-sm font-medium">
            Nota
            <textarea
              className="min-h-28 rounded-xl border bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
              disabled={isReadOnly}
              value={draft.coachNote}
              onChange={(event) =>
                setDraft((current) => ({ ...current, coachNote: event.target.value }))
              }
            />
          </label>
          <DialogFooter>
            <Button disabled={isReadOnly || isBusy} type="button" onClick={() => void saveNote()}>
              <SaveIcon data-icon="inline-start" />
              Guardar nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExercisePickerDialog
        excludedExerciseIds={[
          exercise.exerciseId,
          ...alternatives.map((alternative) => alternative.alternativeExerciseId),
        ]}
        mode="alternative"
        open={isAlternativePickerOpen}
        sessionName={sessionName}
        onOpenChange={setIsAlternativePickerOpen}
        onSelect={onAddAlternative}
      />

      <ConfirmActionDialog
        confirmLabel="Eliminar ejercicio"
        consequence="También se eliminarán sus notas y alternativas. Esta acción no se puede deshacer."
        description={exerciseName}
        isLoading={isDeleting}
        open={isConfirmingDelete}
        title={`Eliminar ${exerciseName}`}
        onOpenChange={setIsConfirmingDelete}
        onConfirm={async () => {
          setIsDeleting(true);
          const didDelete = await onDelete();
          setIsDeleting(false);
          return didDelete;
        }}
      />
    </>
  );
});

function ExerciseIdentity({
  alternatives,
  exercise,
  exerciseMeta,
  exerciseName,
  isReadOnly,
  onDeleteAlternative,
}: {
  alternatives: SessionExerciseAlternative[];
  exercise: SessionExercise;
  exerciseMeta: string;
  exerciseName: string;
  isReadOnly: boolean;
  onDeleteAlternative: (alternativeId: string) => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ExerciseThumbnail exercise={exercise} />
      <div className="min-w-0">
        <p className="truncate font-semibold">{exerciseName}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{exerciseMeta}</p>
        <ExerciseIndicators alternatives={alternatives} exercise={exercise} />
        {alternatives.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {alternatives.map((alternative) => (
              <AlternativeChip
                key={alternative.id}
                alternative={alternative}
                isReadOnly={isReadOnly}
                onDelete={() => onDeleteAlternative(alternative.id)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ExerciseThumbnail({ exercise }: { exercise: SessionExercise }) {
  const source = exercise.exercise;

  return (
    <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
      {source?.mediaUrl && source.mediaType === "image" ? (
        <Image
          alt=""
          className="size-full object-cover"
          height={64}
          loading="lazy"
          src={source.mediaUrl}
          unoptimized
          width={64}
        />
      ) : (
        <ImageIcon className="size-5" aria-hidden="true" />
      )}
    </span>
  );
}

function ExerciseIndicators({
  alternatives,
  exercise,
}: {
  alternatives: SessionExerciseAlternative[];
  exercise: SessionExercise;
}) {
  if (!exercise.coachNote && alternatives.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {exercise.coachNote ? (
        <span className="inline-flex items-center gap-1">
          <InfoIcon className="size-3.5" aria-hidden="true" />
          Nota
        </span>
      ) : null}
      {alternatives.length ? (
        <span>{alternatives.length} alternativa{alternatives.length === 1 ? "" : "s"}</span>
      ) : null}
    </div>
  );
}

function ExerciseActions({
  alternativesCount,
  isFirst,
  isBusy,
  isLast,
  isReadOnly,
  onAddAlternative,
  onDelete,
  onDuplicate,
  onEditNote,
  onMoveDown,
  onMoveUp,
}: {
  alternativesCount: number;
  isFirst: boolean;
  isBusy: boolean;
  isLast: boolean;
  isReadOnly: boolean;
  onAddAlternative: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onEditNote: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Acciones de ejercicio" size="icon" type="button" variant="ghost">
          <MoreVerticalIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-xl border !border-transparent shadow-[var(--surface-shadow-soft)]"
      >
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={isReadOnly || isBusy || isFirst} onSelect={onMoveUp}>
            <ArrowUpIcon data-icon="inline-start" />
            Subir
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isReadOnly || isBusy || isLast} onSelect={onMoveDown}>
            <ArrowDownIcon data-icon="inline-start" />
            Bajar
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isReadOnly || isBusy} onSelect={onDuplicate}>
            <CopyIcon data-icon="inline-start" />
            Duplicar
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isReadOnly || isBusy} onSelect={onEditNote}>
            <EditIcon data-icon="inline-start" />
            Editar nota
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isReadOnly || isBusy || alternativesCount >= 3}
            onSelect={onAddAlternative}
          >
            <PlusIcon data-icon="inline-start" />
            {alternativesCount >= 3 ? "Máximo de 3 alternativas" : "Agregar alternativa"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            disabled={isReadOnly || isBusy}
            onSelect={onDelete}
          >
            <Trash2Icon data-icon="inline-start" />
            Eliminar ejercicio
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PrescriptionInput({
  ariaLabel,
  disabled,
  error,
  inputMode,
  onBlur,
  onChange,
  value,
}: {
  ariaLabel: string;
  disabled: boolean;
  error?: string;
  inputMode?: "numeric";
  onBlur: () => void;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <>
      <Input
        aria-invalid={Boolean(error)}
        aria-label={ariaLabel}
        className="h-10"
        disabled={disabled}
        inputMode={inputMode}
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className="mt-1 text-xs text-destructive" role="alert">{error}</p> : null}
    </>
  );
}

function MobilePrescriptionField({
  children,
  error,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      {children}
      {error ? <span className="sr-only">{error}</span> : null}
    </label>
  );
}

function AlternativeChip({
  alternative,
  isReadOnly,
  onDelete,
}: {
  alternative: SessionExerciseAlternative;
  isReadOnly: boolean;
  onDelete: () => void;
}) {
  return (
    <Badge className="gap-1" variant="info">
      {alternative.alternativeExercise?.name ?? "Alternativa"}
      {!isReadOnly ? (
        <button
          aria-label="Eliminar alternativa"
          className="ml-1 inline-flex size-5 items-center justify-center rounded-full hover:bg-black/10"
          type="button"
          onClick={onDelete}
        >
          <XIcon className="size-3" aria-hidden="true" />
        </button>
      ) : null}
    </Badge>
  );
}
