"use client";

import { DumbbellIcon, Loader2Icon, PencilIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col gap-4 p-4 lg:p-6">
        <header className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-primary">
              <DumbbellIcon />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Biblioteca</p>
              <h1 className="text-3xl font-semibold leading-tight">Ejercicios</h1>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <ExerciseSearch
            reloadToken={reloadToken}
            selectedId={selectedExercise?.id}
            onSelect={handleSelect}
          />
          <SelectedExerciseCard
            exercise={selectedExercise}
            onExerciseChange={handleExerciseChange}
          />
        </div>
      </div>
    </main>
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
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Seleccion</CardTitle>
          <CardDescription>
            Elige un ejercicio para revisar sus detalles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border bg-background p-6 text-center">
            <DumbbellIcon className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              La seleccion queda lista para conectarse con planes o bloques de rutina.
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
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">{visibleExercise.name}</CardTitle>
            <CardDescription>
              {muscleLabels[visibleExercise.primaryMuscle]} / {equipmentLabels[visibleExercise.equipment]}
            </CardDescription>
          </div>
          <Badge variant={visibleExercise.organizationId ? "secondary" : "outline"}>
            {visibleExercise.organizationId ? "Personalizado" : "Global"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canEditExercise ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="sm:flex-1"
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
          <p className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">
            Los ejercicios globales solo se administran desde Admin SaaS.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Badge variant="muted">{muscleLabels[visibleExercise.primaryMuscle]}</Badge>
          <Badge variant="outline">{equipmentLabels[visibleExercise.equipment]}</Badge>
          {visibleExercise.mediaType === "video_url" ? (
            <Badge variant="outline">Video</Badge>
          ) : null}
        </div>
        <div className="rounded-lg border bg-background p-4">
          <p className="text-sm font-semibold">Media</p>
          <p className="mt-2 break-all text-sm text-muted-foreground">
            {visibleExercise.mediaUrl || "Sin media registrada."}
          </p>
          {canEditExercise ? (
            <div className="mt-3 flex flex-col gap-2">
              <input
                accept="image/jpeg,image/png,image/webp"
                className="text-sm"
                disabled={isSavingMedia}
                type="file"
                onChange={(event) => {
                  void handleImageChange(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
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
        </div>
        <div className="rounded-lg border bg-background p-4">
          <p className="text-sm font-semibold">Instrucciones</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {visibleExercise.instructions || "Sin instrucciones registradas."}
          </p>
        </div>
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
