"use client";

import { CheckIcon, ImageIcon, PlayCircleIcon, PlusIcon } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/hooks/use-exercises";

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

export function ExerciseSearchItem({
  exercise,
  isSelected,
  onSelect,
  selectionMode = "card",
}: {
  exercise: Exercise;
  isSelected?: boolean;
  onSelect?: (exercise: Exercise) => void;
  selectionMode?: "card" | "explicit";
}) {
  const isCustom = Boolean(exercise.organizationId);
  const hasVideo = Boolean(exercise.videoUrl);
  const isExplicit = selectionMode === "explicit";

  return (
    <div
      className={cn(
        "group flex w-full items-center gap-3 border-b bg-background px-2.5 py-2 text-left transition-colors last:border-b-0 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25",
        isSelected && "bg-primary/5 shadow-[inset_3px_0_0_var(--primary)]",
      )}
      role={isExplicit ? undefined : "button"}
      tabIndex={isExplicit ? undefined : 0}
      onClick={isExplicit ? undefined : () => onSelect?.(exercise)}
      onKeyDown={
        isExplicit
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
            {isExplicit ? (
              <Button className="h-8" size="sm" type="button" onClick={() => onSelect?.(exercise)}>
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
  );
}

export { equipmentLabels, muscleLabels };
