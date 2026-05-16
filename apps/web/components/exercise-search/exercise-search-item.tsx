"use client";

import { ImageIcon, PlayCircleIcon } from "lucide-react";
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
  const hasVideo = exercise.mediaType === "video_url";
  const isExplicit = selectionMode === "explicit";

  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25",
        isSelected && "border-primary bg-muted",
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
      <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground">
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
          <ImageIcon aria-hidden="true" />
        )}
        {hasVideo ? (
          <span className="absolute bottom-1 right-1 rounded-full bg-background p-1 shadow-sm">
            <PlayCircleIcon aria-label="Video disponible" />
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-sm font-semibold">{exercise.name}</p>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={isCustom ? "secondary" : "outline"}>
              {isCustom ? "Personalizado" : "Global"}
            </Badge>
            {isExplicit ? (
              <Button size="sm" type="button" onClick={() => onSelect?.(exercise)}>
                Agregar
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="muted">{muscleLabels[exercise.primaryMuscle]}</Badge>
          <Badge variant="outline">{equipmentLabels[exercise.equipment]}</Badge>
          {hasVideo ? <Badge variant="outline">Video</Badge> : null}
        </div>
      </div>
    </div>
  );
}

export { equipmentLabels, muscleLabels };
