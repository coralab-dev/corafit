"use client";

import {
  ImageIcon,
  LinkIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  UploadIcon,
  PlayCircleIcon,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { notify } from "@/lib/notify";
import { isValidExternalUrl } from "@/lib/external-url";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkspaceFrame, WorkspaceHeader } from "@/components/layout/workspace-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  ExerciseSearch,
  type ExerciseSearchProps,
} from "@/components/exercise-search";
import {
  type Equipment,
  type Exercise,
  type PrimaryMuscle,
  type UpdateExerciseInput,
  useExerciseActions,
  useExerciseMediaActions,
} from "@/hooks/use-exercises";

const muscleLabels: Record<Exercise["primaryMuscle"], string> = {
  chest: "Pecho",
  back: "Espalda",
  legs: "Piernas",
  shoulder: "Hombro",
  biceps: "Bíceps",
  triceps: "Tríceps",
  core: "Core",
  glute: "Glúteo",
};

const equipmentLabels: Record<Exercise["equipment"], string> = {
  barbell: "Barra",
  dumbbell: "Mancuerna",
  cable: "Cable",
  machine: "Máquina",
  bodyweight: "Peso corporal",
  other: "Otro",
};

export function ExercisesWorkspace() {
  const { updateExercise } = useExerciseActions();
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const handleSelect: ExerciseSearchProps["onSelect"] = (exercise) => {
    setSelectedExercise(exercise);
    setIsDetailOpen(true);
  };

  function handleExerciseChange(exercise: Exercise | null) {
    setSelectedExercise(exercise);
    if (!exercise) {
      setIsDetailOpen(false);
    }
    setReloadToken((current) => current + 1);
  }

  async function handleUpdate(input: UpdateExerciseInput) {
    if (!editingExercise) {
      return;
    }

    const updatedExercise = await updateExercise(editingExercise.id, input);
    setSelectedExercise(updatedExercise);
    setEditingExercise(null);
    setReloadToken((current) => current + 1);
    notify.success("Ejercicio actualizado");
  }

  return (
    <WorkspaceFrame
      header={
        <WorkspaceHeader
          description="Busca ejercicios globales y personalizados para tu organización."
          title="Ejercicios"
          actions={
            <Button
              type="button"
              onClick={() => setIsCreateOpen(true)}
            >
              <PlusIcon data-icon="inline-start" />
              Nuevo ejercicio
            </Button>
          }
        />
      }
    >
      <section className="min-w-0 flex-1 bg-background p-5">
        <ExerciseSearch
          createDialogOpen={isCreateOpen}
          presentation="table"
          reloadToken={reloadToken}
          selectedId={selectedExercise?.id}
          onCreateDialogOpenChange={setIsCreateOpen}
          onSelect={handleSelect}
        />
      </section>
      <Dialog
        open={isDetailOpen && Boolean(selectedExercise)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setIsDetailOpen(false);
          }
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border !border-transparent bg-background p-0 shadow-[var(--surface-shadow)] sm:max-w-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalle de ejercicio</DialogTitle>
            <DialogDescription>
              Vista previa operativa del ejercicio seleccionado.
            </DialogDescription>
          </DialogHeader>
          <SelectedExerciseCard
            exercise={selectedExercise}
            onExerciseChange={handleExerciseChange}
            onEditRequest={(exercise) => {
              setIsDetailOpen(false);
              setEditingExercise(exercise);
            }}
          />
        </DialogContent>
      </Dialog>
      {editingExercise ? (
        <ExerciseEditDialog
          key={`${editingExercise.id}-${editingExercise.updatedAt}`}
          exercise={editingExercise}
          isOpen={Boolean(editingExercise)}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setEditingExercise(null);
            }
          }}
          onUpdate={handleUpdate}
        />
      ) : null}
    </WorkspaceFrame>
  );
}

function SelectedExerciseCard({
  exercise,
  onExerciseChange,
  onEditRequest,
}: {
  exercise: Exercise | null;
  onExerciseChange: (exercise: Exercise | null) => void;
  onEditRequest: (exercise: Exercise) => void;
}) {
  const { deactivateExercise } = useExerciseActions();
  const { removeExerciseMedia, uploadExerciseImage } = useExerciseMediaActions();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingMedia, setIsSavingMedia] = useState(false);

  if (!exercise) {
    return null;
  }

  const visibleExercise = exercise;
  const canEditExercise = Boolean(visibleExercise.organizationId);

  async function handleImageChange(file: File | undefined) {
    if (!file || !visibleExercise) {
      return;
    }

    setIsSavingMedia(true);
    try {
      const updatedExercise = await uploadExerciseImage(visibleExercise.id, file);
      onExerciseChange(updatedExercise);
      notify.success("Imagen actualizada");
    } catch (caughtError) {
      notify.error(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo actualizar la imagen",
      );
    } finally {
      setIsSavingMedia(false);
    }
  }

  async function handleRemoveMedia() {
    if (!visibleExercise) {
      return;
    }

    setIsSavingMedia(true);
    try {
      const updatedExercise = await removeExerciseMedia(visibleExercise.id);
      onExerciseChange(updatedExercise);
      notify.success("Imagen eliminada");
    } catch (caughtError) {
      notify.error(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo eliminar la media",
      );
    } finally {
      setIsSavingMedia(false);
    }
  }

  async function handleDeactivate() {
    if (!visibleExercise) {
      return;
    }

    const confirmed = window.confirm(
      `Desactivar "${visibleExercise.name}"? Ya no aparecerá en la biblioteca activa.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await deactivateExercise(visibleExercise.id);
      onExerciseChange(null);
      notify.success("Ejercicio desactivado");
    } catch (caughtError) {
      notify.error(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo desactivar el ejercicio",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Card className="min-w-0 overflow-hidden rounded-2xl border-0 !border-transparent shadow-none">
      <div className="relative m-4 mb-0 flex aspect-[16/9] items-center justify-center overflow-hidden rounded-2xl bg-muted text-muted-foreground shadow-[var(--surface-shadow-soft)]">
        {visibleExercise.mediaUrl && visibleExercise.mediaType === "image" ? (
          <Image
            alt=""
            className="size-full object-cover"
            fill
            sizes="(min-width: 1280px) 380px, 100vw"
            src={visibleExercise.mediaUrl}
            unoptimized
          />
          ) : (
            <div className="flex flex-col items-center gap-2 text-sm">
              <ImageIcon className="size-8" aria-hidden="true" />
              Sin imagen
            </div>
          )}
      </div>
      <CardHeader className="border-b border-border/55 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{visibleExercise.name}</CardTitle>
            <CardDescription className="mt-1">
              {muscleLabels[visibleExercise.primaryMuscle]} / {equipmentLabels[visibleExercise.equipment]}
            </CardDescription>
          </div>
          <Badge variant={visibleExercise.organizationId ? "secondary" : "outline"}>
            {visibleExercise.organizationId ? "Personalizado" : "Global"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-2 gap-2">
          <DetailMetric label="Músculo" value={muscleLabels[visibleExercise.primaryMuscle]} />
          <DetailMetric label="Equipo" value={equipmentLabels[visibleExercise.equipment]} />
        </div>
        <DetailSection title="Músculos secundarios">
          {visibleExercise.secondaryMuscles.length ? (
            <div className="flex flex-wrap gap-1.5">
              {visibleExercise.secondaryMuscles.map((muscle) => (
                <Badge key={muscle} variant="muted">
                  {formatSecondaryMuscle(muscle)}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin músculos secundarios registrados.
            </p>
          )}
        </DetailSection>

        {visibleExercise.videoUrl || canEditExercise ? (
          <section className="rounded-2xl border !border-transparent bg-muted/25 p-3 shadow-[var(--surface-shadow-soft)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Video y recursos</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {visibleExercise.videoUrl
                    ? "Video de referencia disponible para revisar la ejecución."
                    : "Agrega imagen o video externo para completar este ejercicio."}
                </p>
              </div>
              {visibleExercise.videoUrl ? (
                <Button asChild size="sm" variant="outline">
                  <a href={visibleExercise.videoUrl} rel="noreferrer" target="_blank">
                    <PlayCircleIcon data-icon="inline-start" />
                    Ver video
                  </a>
                </Button>
              ) : null}
            </div>
            {canEditExercise ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border !border-transparent bg-card px-3 text-sm font-semibold shadow-[var(--surface-shadow-soft)] transition-colors hover:bg-accent hover:text-accent-foreground sm:flex-1">
                  <UploadIcon className="size-4" aria-hidden="true" />
                  Subir imagen
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={isSavingMedia}
                    type="file"
                    onChange={(event) => {
                      void handleImageChange(event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <Button
                  className="sm:flex-1"
                  disabled={isSavingMedia || !visibleExercise.mediaUrl}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={handleRemoveMedia}
                >
                  Quitar imagen
                </Button>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="border-t border-border/55 pt-4">
          <p className="text-sm font-semibold">Instrucciones</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {visibleExercise.instructions || "Sin instrucciones registradas."}
          </p>
        </section>
        <DetailSection title="Recomendaciones">
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {visibleExercise.recommendations || "Sin recomendaciones registradas."}
          </p>
        </DetailSection>
        {canEditExercise ? (
          <div className="flex flex-col gap-2 border-t border-border/55 pt-4 sm:flex-row">
            <Button
              className="sm:flex-1"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => onEditRequest(visibleExercise)}
            >
              <PencilIcon data-icon="inline-start" />
              Editar
            </Button>
            <Button
              className="sm:flex-1"
              disabled={isDeleting}
              size="sm"
              type="button"
              variant="destructive"
              onClick={() => void handleDeactivate()}
            >
              {isDeleting ? (
                <Loader2Icon data-icon="inline-start" />
              ) : (
                <Trash2Icon data-icon="inline-start" />
              )}
              Desactivar
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border !border-transparent bg-muted/35 p-3 shadow-[var(--surface-shadow-soft)]">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function DetailSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="border-t border-border/55 pt-4">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function formatSecondaryMuscle(value: string) {
  const normalized = value.trim();
  const localLabel = muscleLabels[normalized as PrimaryMuscle];

  if (localLabel) {
    return localLabel;
  }

  return normalized
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ExerciseEditDialog({
  exercise,
  isOpen,
  onOpenChange,
  onUpdate,
}: {
  exercise: Exercise;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (input: UpdateExerciseInput) => Promise<void>;
}) {
  const [equipment, setEquipment] = useState<Equipment>(exercise.equipment);
  const [instructions, setInstructions] = useState(exercise.instructions ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(exercise.name);
  const [primaryMuscle, setPrimaryMuscle] = useState<PrimaryMuscle>(exercise.primaryMuscle);
  const [recommendations, setRecommendations] = useState(exercise.recommendations ?? "");
  const [secondaryMuscles, setSecondaryMuscles] = useState(
    exercise.secondaryMuscles.join(", "),
  );
  const [videoUrl, setVideoUrl] = useState(exercise.videoUrl ?? "");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      notify.error("El nombre debe tener al menos 2 caracteres");
      return;
    }

    const trimmedVideoUrl = videoUrl.trim();
    if (trimmedVideoUrl && !isValidExternalUrl(trimmedVideoUrl)) {
      notify.error("Ingresa una URL HTTP o HTTPS válida");
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate({
        equipment,
        instructions: instructions.trim() || null,
        name: trimmedName,
        primaryMuscle,
        recommendations: recommendations.trim() || null,
        secondaryMuscles: secondaryMuscles
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        videoUrl: trimmedVideoUrl || null,
      });
    } catch (caughtError) {
      notify.error(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo actualizar el ejercicio",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-hidden rounded-2xl border !border-transparent bg-background p-0 shadow-[var(--surface-shadow)] sm:max-w-2xl">
        <form
          className="flex max-h-[calc(100vh-2rem)] flex-col bg-background"
          onSubmit={handleSubmit}
        >
          <DialogHeader className="relative overflow-hidden border-b border-border/55 bg-card/90 px-5 py-5 pr-14">
            <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Biblioteca personalizada
            </p>
            <DialogTitle className="mt-1 text-xl font-semibold tracking-tight">
              Editar ejercicio personalizado
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Ajusta los datos del movimiento para mantener tu biblioteca actualizada.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            <EditFormSection title="Datos básicos">
              <EditTextField label="Nombre" value={name} onChange={setName} />
              <div className="grid gap-3 sm:grid-cols-2">
                <EditSelectField
                  label="Músculo principal"
                  options={Object.entries(muscleLabels)}
                  value={primaryMuscle}
                  onChange={(value) => setPrimaryMuscle(value as PrimaryMuscle)}
                />
                <EditSelectField
                  label="Equipamiento"
                  options={Object.entries(equipmentLabels)}
                  value={equipment}
                  onChange={(value) => setEquipment(value as Equipment)}
                />
              </div>
              <EditTextField
                label="Músculos secundarios"
                placeholder="Separados por coma"
                value={secondaryMuscles}
                onChange={setSecondaryMuscles}
              />
            </EditFormSection>

            <EditFormSection title="Guía del ejercicio">
              <EditTextAreaField
                label="Instrucciones"
                value={instructions}
                onChange={setInstructions}
              />
              <EditTextAreaField
                compact
                label="Recomendaciones"
                value={recommendations}
                onChange={setRecommendations}
              />
            </EditFormSection>

            <EditFormSection title="Recursos externos">
              <div className="rounded-2xl border !border-transparent bg-muted/25 p-3 shadow-[var(--surface-shadow-soft)]">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <LinkIcon className="size-4 text-primary" aria-hidden="true" />
                  URL de video externo
                </div>
                <EditTextField
                  label="URL de video externo"
                  value={videoUrl}
                  onChange={setVideoUrl}
                />
              </div>
            </EditFormSection>
          </div>
          <DialogFooter className="sticky bottom-0 border-t border-border/55 bg-card/95 px-5 py-4 backdrop-blur">
            <Button
              disabled={isSaving}
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? (
                <Loader2Icon data-icon="inline-start" />
              ) : (
                <SaveIcon data-icon="inline-start" />
              )}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditFormSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-2xl border !border-transparent bg-card/80 p-4 shadow-[var(--surface-shadow-soft)]">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function EditTextField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      <Input
        className="h-10 rounded-xl shadow-none"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function EditTextAreaField({
  compact = false,
  label,
  onChange,
  value,
}: {
  compact?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      <textarea
        className={`${compact ? "min-h-20" : "min-h-28"} w-full rounded-xl border bg-card px-3 py-2 text-sm shadow-none outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function EditSelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      <select
        className="h-10 rounded-xl border bg-card px-3 text-sm shadow-none outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
