"use client";

import { DumbbellIcon } from "lucide-react";
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
  ExerciseSearch,
  type ExerciseSearchProps,
} from "@/components/exercise-search";
import { type Exercise, useExerciseMediaActions } from "@/hooks/use-exercises";

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

  const handleSelect: ExerciseSearchProps["onSelect"] = (exercise) => {
    setSelectedExercise(exercise);
  };

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
            selectedId={selectedExercise?.id}
            onSelect={handleSelect}
          />
          <SelectedExerciseCard
            exercise={selectedExercise}
            onExerciseChange={setSelectedExercise}
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
  onExerciseChange: (exercise: Exercise) => void;
}) {
  const { removeExerciseMedia, uploadExerciseImage } = useExerciseMediaActions();
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
  const canEditMedia = Boolean(visibleExercise.organizationId);

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
          {canEditMedia ? (
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
    </Card>
  );
}
