"use client";

import {
  ImageIcon,
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
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const handleSelect: ExerciseSearchProps["onSelect"] = (exercise) => {
    setSelectedExercise(exercise);
  };

  function handleExerciseChange(exercise: Exercise | null) {
    setSelectedExercise(exercise);
    setReloadToken((current) => current + 1);
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
              onClick={() => document.dispatchEvent(new CustomEvent("corafit:create-exercise"))}
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
          presentation="table"
          reloadToken={reloadToken}
          selectedId={selectedExercise?.id}
          onSelect={handleSelect}
        />
      </section>
      <Dialog
        open={Boolean(selectedExercise)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedExercise(null);
          }
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border !border-transparent bg-background p-0 shadow-[var(--surface-shadow)] sm:max-w-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalle de ejercicio</DialogTitle>
            <DialogDescription>
              Preview operativo del ejercicio seleccionado.
            </DialogDescription>
          </DialogHeader>
          <SelectedExerciseCard
            exercise={selectedExercise}
            onExerciseChange={handleExerciseChange}
          />
        </DialogContent>
      </Dialog>
    </WorkspaceFrame>
  );
}

function SelectedExerciseCard({
  exercise,
  onExerciseChange,
}: {
  exercise: Exercise | null;
  onExerciseChange: (exercise: Exercise | null) => void;
}) {
  const { deactivateExercise, updateExercise } = useExerciseActions();
  const { removeExerciseMedia, uploadExerciseImage } = useExerciseMediaActions();
  const [isEditOpen, setIsEditOpen] = useState(false);
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
      notify.success("Media eliminada");
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

  async function handleUpdate(input: {
    equipment: Equipment;
    instructions: string | null;
    mediaType?: Exercise["mediaType"];
    mediaUrl?: string | null;
    name: string;
    primaryMuscle: PrimaryMuscle;
  }) {
    if (!visibleExercise) {
      return;
    }

    const updatedExercise = await updateExercise(visibleExercise.id, input);
    onExerciseChange(updatedExercise);
    setIsEditOpen(false);
    notify.success("Ejercicio actualizado");
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
        <section className="hidden">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Media</p>
            {visibleExercise.videoUrl ? (
              <Badge variant="outline">Video</Badge>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {visibleExercise.mediaUrl ? "Imagen registrada." : "Sin imagen registrada."}
            {visibleExercise.videoUrl ? " Video registrado." : ""}
          </p>
          {canEditExercise ? (
            <div className="mt-3 flex flex-col gap-2">
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border !border-transparent bg-card px-3 text-sm font-semibold shadow-[var(--surface-shadow-soft)] transition-colors hover:bg-accent hover:text-accent-foreground">
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
                disabled={isSavingMedia || !visibleExercise.mediaUrl}
                size="sm"
                type="button"
                variant="outline"
                onClick={handleRemoveMedia}
              >
                Quitar imagen
              </Button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              La media de ejercicios globales se administra desde Admin SaaS.
            </p>
          )}
        </section>
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
              onClick={() => setIsEditOpen(true)}
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
      {isEditOpen ? (
        <ExerciseEditDialog
          key={`${visibleExercise.id}-${visibleExercise.updatedAt}`}
          exercise={visibleExercise}
          isOpen={isEditOpen}
          onOpenChange={setIsEditOpen}
          onUpdate={handleUpdate}
        />
      ) : null}
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
  onUpdate: (input: {
    equipment: Equipment;
    instructions: string | null;
    mediaType?: Exercise["mediaType"];
    mediaUrl?: string | null;
    name: string;
    primaryMuscle: PrimaryMuscle;
    videoUrl?: string | null;
  }) => Promise<void>;
}) {
  const [equipment, setEquipment] = useState<Equipment>(exercise.equipment);
  const [instructions, setInstructions] = useState(exercise.instructions ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(exercise.name);
  const [primaryMuscle, setPrimaryMuscle] = useState<PrimaryMuscle>(exercise.primaryMuscle);
  const [videoUrl, setVideoUrl] = useState(exercise.videoUrl ?? "");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      notify.error("El nombre debe tener al menos 2 caracteres");
      return;
    }

    const trimmedVideoUrl = videoUrl.trim();
    if (trimmedVideoUrl && !isValidUrl(trimmedVideoUrl)) {
      notify.error("La URL de video no es válida");
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate({
        equipment,
        instructions: instructions.trim() || null,
        name: trimmedName,
        primaryMuscle,
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
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-hidden rounded-2xl border !border-transparent bg-background p-0 shadow-[var(--surface-shadow)] sm:max-w-xl">
        <DialogHeader className="border-b border-border/55 bg-card/90 px-5 py-4 pr-14">
          <DialogTitle>Editar ejercicio</DialogTitle>
          <DialogDescription>
            Solo puedes editar ejercicios personalizados de tu organización.
          </DialogDescription>
        </DialogHeader>
        <form className="flex max-h-[calc(100vh-2rem)] flex-col" onSubmit={handleSubmit}>
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Nombre
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Músculo principal
            <select
              className="h-10 rounded-xl border bg-card px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
              value={primaryMuscle}
              onChange={(event) => setPrimaryMuscle(event.target.value as PrimaryMuscle)}
            >
              {Object.entries(muscleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Equipamiento
            <select
              className="h-10 rounded-xl border bg-card px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
              value={equipment}
              onChange={(event) => setEquipment(event.target.value as Equipment)}
            >
              {Object.entries(equipmentLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Instrucciones
            <textarea
              className="min-h-28 w-full rounded-xl border bg-card px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            URL de video externo
            <Input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} />
          </label>
          </div>
          <DialogFooter className="border-t border-border/55 bg-card/90 px-5 py-4">
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

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
