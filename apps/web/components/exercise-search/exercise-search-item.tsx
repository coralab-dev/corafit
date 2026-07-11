"use client";

import { useState } from "react";
import {
  CheckIcon,
  ExpandIcon,
  ImageIcon,
  InfoIcon,
  PlayCircleIcon,
  PlusIcon,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/hooks/use-exercises";

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

export function ExerciseSearchItem({
  exercise,
  isDisabled = false,
  isSelected,
  onSelect,
  selectionMode = "card",
}: {
  exercise: Exercise;
  isDisabled?: boolean;
  isSelected?: boolean;
  onSelect?: (exercise: Exercise) => void;
  selectionMode?: "card" | "explicit";
}) {
  const isCustom = Boolean(exercise.organizationId);
  const hasVideo = Boolean(exercise.videoUrl);
  const isExplicit = selectionMode === "explicit";
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "group flex w-full items-center gap-3 border-b bg-background px-2.5 py-2 text-left transition-colors last:border-b-0 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25",
          isSelected && "bg-primary/5 shadow-[inset_3px_0_0_var(--primary)]",
          isDisabled && "cursor-not-allowed opacity-60",
        )}
        aria-disabled={isDisabled || undefined}
        role={isExplicit ? undefined : "button"}
        tabIndex={isExplicit || isDisabled ? undefined : 0}
        onClick={isExplicit || isDisabled ? undefined : () => onSelect?.(exercise)}
        onKeyDown={
          isExplicit || isDisabled
            ? undefined
            : (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect?.(exercise);
                }
              }
        }
      >
        <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground">
          {exercise.mediaUrl && exercise.mediaType === "image" ? (
            <Image
              alt=""
              className="size-full object-cover"
              height={64}
              loading="lazy"
              src={exercise.mediaUrl}
              unoptimized
              width={64}
            />
          ) : (
            <ImageIcon className="size-5" aria-hidden="true" />
          )}
          {hasVideo ? (
            <span className="absolute bottom-1 right-1 rounded-full bg-background p-1 shadow-sm">
              <PlayCircleIcon className="size-3.5" aria-label="Video disponible" />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                {isSelected ? (
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon className="size-3" aria-hidden="true" />
                  </span>
                ) : null}
                <p className="truncate text-sm font-semibold leading-5">{exercise.name}</p>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {muscleLabels[exercise.primaryMuscle]} / {equipmentLabels[exercise.equipment]}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge
                className="hidden sm:inline-flex"
                variant={isCustom ? "secondary" : "outline"}
              >
                {isCustom ? "Personalizado" : "Global"}
              </Badge>
              <Button
                className="h-8"
                disabled={isDisabled}
                size="sm"
                type="button"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsDetailsOpen(true);
                }}
              >
                <InfoIcon data-icon="inline-start" />
                Ver detalles
              </Button>
              {isExplicit ? (
                <Button
                  className="h-8"
                  disabled={isDisabled}
                  size="sm"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect?.(exercise);
                  }}
                >
                  <PlusIcon data-icon="inline-start" />
                  Agregar
                </Button>
              ) : null}
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge className="sm:hidden" variant={isCustom ? "secondary" : "outline"}>
              {isCustom ? "Personalizado" : "Global"}
            </Badge>
            <Badge variant="muted">{muscleLabels[exercise.primaryMuscle]}</Badge>
            <Badge variant="outline">{equipmentLabels[exercise.equipment]}</Badge>
            {hasVideo ? <Badge variant="outline">Video</Badge> : null}
          </div>
        </div>
      </div>
      <ExerciseDetailsDialog
        exercise={exercise}
        isCustom={isCustom}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />
    </>
  );
}

export function ExerciseDetailsDialog({
  exercise,
  isCustom,
  isOpen,
  onOpenChange,
}: {
  exercise: Exercise;
  isCustom: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const hasImage = Boolean(exercise.mediaUrl && exercise.mediaType === "image");
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{exercise.name}</DialogTitle>
            <DialogDescription>
              {muscleLabels[exercise.primaryMuscle]} / {equipmentLabels[exercise.equipment]}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground">
              {hasImage ? (
                <>
                  <Image
                    alt={exercise.name}
                    className="size-full object-contain"
                    height={440}
                    src={exercise.mediaUrl ?? ""}
                    unoptimized
                    width={440}
                  />
                  <Button
                    aria-label="Expandir imagen"
                    className="absolute bottom-2 right-2 bg-background/90 shadow-sm backdrop-blur"
                    size="icon"
                    type="button"
                    variant="outline"
                    onClick={() => setIsImageExpanded(true)}
                  >
                    <ExpandIcon className="size-4" />
                  </Button>
                </>
              ) : (
                <ImageIcon className="size-10" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={isCustom ? "secondary" : "outline"}>
                  {isCustom ? "Personalizado" : "Global"}
                </Badge>
                <Badge variant="muted">{muscleLabels[exercise.primaryMuscle]}</Badge>
                <Badge variant="outline">{equipmentLabels[exercise.equipment]}</Badge>
                {exercise.videoUrl ? <Badge variant="outline">Video</Badge> : null}
              </div>
              <DetailSection title="Instrucciones" value={exercise.instructions} />
              <DetailSection title="Recomendaciones" value={exercise.recommendations} />
              {exercise.videoUrl ? (
                <a
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  href={exercise.videoUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <PlayCircleIcon className="size-4" />
                  Abrir video
                </a>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {hasImage ? (
        <Dialog open={isImageExpanded} onOpenChange={setIsImageExpanded}>
          <DialogContent className="h-[92vh] max-w-[min(96vw,1100px)] p-3">
            <DialogHeader className="sr-only">
              <DialogTitle>Imagen de {exercise.name}</DialogTitle>
              <DialogDescription>
                Vista ampliada de la imagen del ejercicio.
              </DialogDescription>
            </DialogHeader>
            <div className="flex size-full min-h-0 items-center justify-center rounded-lg bg-muted">
              <Image
                alt={exercise.name}
                className="max-h-full max-w-full object-contain"
                height={1000}
                src={exercise.mediaUrl ?? ""}
                unoptimized
                width={1000}
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

function DetailSection({ title, value }: { title: string; value: string | null }) {
  return (
    <section>
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
        {value?.trim() || "Sin información registrada."}
      </p>
    </section>
  );
}

export { equipmentLabels, muscleLabels };
