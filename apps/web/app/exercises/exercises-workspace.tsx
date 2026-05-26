"use client";

import {
  DumbbellIcon,
  ImageIcon,
  Loader2Icon,
  PencilIcon,
  PlayCircleIcon,
  SaveIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  biceps: "Biceps",
  triceps: "Triceps",
  core: "Core",
  glute: "Gluteo",
};

const equipmentLabels: Record<Exercise["equipment"], string> = {
  barbell: "Barra",
  dumbbell: "Mancuerna",
  cable: "Cable",
  machine: "Maquina",
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
    <div className="flex min-h-0 flex-col gap-4">
      <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Biblioteca
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            Ejercicios
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Administra la base de movimientos que reutilizas en planes y sesiones.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
          <DumbbellIcon className="size-4" aria-hidden="true" />
          {selectedExercise ? "Ejercicio seleccionado" : "Selecciona un ejercicio"}
        </div>
      </div>

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">
          <ExerciseSearch
            reloadToken={reloadToken}
            selectedId={selectedExercise?.id}
            onSelect={handleSelect}
          />
        </section>
        <aside className="min-w-0 xl:sticky xl:top-8 xl:self-start">
          <SelectedExerciseCard
            exercise={selectedExercise}
            onExerciseChange={handleExerciseChange}
          />
        </aside>
      </div>
    </div>
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
    return (
    <Card className="min-w-0 overflow-hidden rounded-lg border-border/80 shadow-none">
      <CardHeader className="border-b p-4">
        <CardTitle className="text-base">Detalle</CardTitle>
        <CardDescription>
          Elige un ejercicio para revisar sus detalles.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-background p-5 text-center">
          <DumbbellIcon className="size-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            La seleccion queda lista para revisar media, instrucciones y permisos.
          </p>
        </div>
      </CardContent>
      </Card>
    );
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
      toast.success("Imagen actualizada");
    } catch (caughtError) {
      toast.error(
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
      toast.success("Media eliminada");
    } catch (caughtError) {
      toast.error(
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
    toast.success("Ejercicio actualizado");
  }

  async function handleDeactivate() {
    if (!visibleExercise) {
      return;
    }

    const confirmed = window.confirm(
      `Desactivar "${visibleExercise.name}"? Ya no aparecera en la biblioteca activa.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await deactivateExercise(visibleExercise.id);
      onExerciseChange(null);
      toast.success("Ejercicio desactivado");
    } catch (caughtError) {
      toast.error(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo desactivar el ejercicio",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Card className="min-w-0 overflow-hidden rounded-lg border-border/80 shadow-none">
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden border-b bg-muted text-muted-foreground">
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
            {visibleExercise.mediaType === "video_url" ? (
              <PlayCircleIcon className="size-8" aria-hidden="true" />
            ) : (
              <ImageIcon className="size-8" aria-hidden="true" />
            )}
            {visibleExercise.mediaType === "video_url" ? "Video externo" : "Sin imagen"}
          </div>
        )}
      </div>
      <CardHeader className="border-b p-4">
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
        {canEditExercise ? (
          <div className="flex flex-col gap-2 sm:flex-row">
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
        ) : (
          <p className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
            Los ejercicios globales solo se administran desde Admin SaaS.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <DetailMetric label="Musculo" value={muscleLabels[visibleExercise.primaryMuscle]} />
          <DetailMetric label="Equipo" value={equipmentLabels[visibleExercise.equipment]} />
        </div>
        <section className="border-t pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Media</p>
            {visibleExercise.mediaType === "video_url" ? (
              <Badge variant="outline">Video</Badge>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {visibleExercise.mediaUrl
              ? visibleExercise.mediaType === "video_url"
                ? "Video registrado."
                : "Imagen registrada."
              : "Sin media registrada."}
          </p>
          {canEditExercise ? (
            <div className="mt-3 flex flex-col gap-2">
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-semibold shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
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
                Quitar media
              </Button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              La media de ejercicios globales se administra desde Admin SaaS.
            </p>
          )}
        </section>
        <section className="border-t pt-4">
          <p className="text-sm font-semibold">Instrucciones</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {visibleExercise.instructions || "Sin instrucciones registradas."}
          </p>
        </section>
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
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
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
  }) => Promise<void>;
}) {
  const [equipment, setEquipment] = useState<Equipment>(exercise.equipment);
  const [instructions, setInstructions] = useState(exercise.instructions ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(exercise.name);
  const [primaryMuscle, setPrimaryMuscle] = useState<PrimaryMuscle>(exercise.primaryMuscle);
  const [videoUrl, setVideoUrl] = useState(
    exercise.mediaType === "video_url" ? exercise.mediaUrl ?? "" : "",
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres");
      return;
    }

    const trimmedVideoUrl = videoUrl.trim();
    if (trimmedVideoUrl && !isValidUrl(trimmedVideoUrl)) {
      toast.error("La URL de video no es valida");
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate({
        equipment,
        instructions: instructions.trim() || null,
        mediaType: trimmedVideoUrl ? "video_url" : exercise.mediaType === "video_url" ? null : undefined,
        mediaUrl: trimmedVideoUrl || (exercise.mediaType === "video_url" ? null : undefined),
        name: trimmedName,
        primaryMuscle,
      });
    } catch (caughtError) {
      toast.error(
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
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar ejercicio</DialogTitle>
          <DialogDescription>
            Solo puedes editar ejercicios personalizados de tu organizacion.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Nombre
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Musculo principal
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
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
              className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
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
              className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
            />
          </label>
          {exercise.mediaType !== "image" ? (
            <label className="flex flex-col gap-2 text-sm font-medium">
              URL de video externo
              <Input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} />
            </label>
          ) : null}
          <DialogFooter>
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
