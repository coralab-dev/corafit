"use client";

import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BedIcon,
  DumbbellIcon,
  ReplaceIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TrainingPlan } from "@/lib/clients/types";
import {
  getSortedWeeks,
  getWeekPreview,
  type WeekPreviewDay,
} from "./assign-plan-state";

export function AssignmentWeekPreview({
  plan,
  selectedDayKey,
  selectedWeekNumber,
  startDate,
  onSelectDay,
  onSelectWeek,
}: {
  plan: TrainingPlan;
  selectedDayKey: string | null;
  selectedWeekNumber: number | null;
  startDate: string;
  onSelectDay: (dayKey: string) => void;
  onSelectWeek: (weekNumber: number) => void;
}) {
  const weeks = getSortedWeeks(plan);
  const weekNumber = selectedWeekNumber ?? weeks[0]?.weekNumber ?? 1;
  const weekIndex = weeks.findIndex((week) => week.weekNumber === weekNumber);
  const preview = getWeekPreview(plan, weekNumber, startDate);
  const selectedDay =
    preview?.days.find((day) => day.key === selectedDayKey) ??
    preview?.days.find((day) => !day.isRest) ??
    preview?.days[0] ??
    null;

  if (!weeks.length || !preview) {
    return (
      <div className="mt-4 rounded-md border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
        <AlertTriangleIcon className="mr-2 inline size-4 align-text-bottom" />
        Este plan no tiene semanas cargadas todavia. Puedes asignarlo, pero conviene completarlo antes.
      </div>
    );
  }

  const previousWeek = weeks[weekIndex - 1]?.weekNumber ?? null;
  const nextWeek = weeks[weekIndex + 1]?.weekNumber ?? null;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold">Vista previa del calendario</p>
          <p className="mt-1 text-xl font-semibold tracking-normal">
            Semana {preview.weekNumber} de {weeks.length}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{preview.rangeLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={previousWeek === null}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => previousWeek !== null && onSelectWeek(previousWeek)}
          >
            <ArrowLeftIcon className="size-4" />
            Semana anterior
          </Button>
          <Button
            disabled={nextWeek === null}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => nextWeek !== null && onSelectWeek(nextWeek)}
          >
            Semana siguiente
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid auto-cols-[minmax(150px,1fr)] grid-flow-col gap-3 overflow-x-auto overscroll-x-contain pb-2 [scroll-snap-type:x_mandatory] lg:grid-flow-row lg:grid-cols-7 lg:overflow-visible lg:pb-0">
        {preview.days.map((day) => (
          <button
            key={day.key}
            className={cn(
              "min-h-32 scroll-ml-4 rounded-md border p-3 text-left transition [scroll-snap-align:start]",
              day.isRest
                ? "bg-muted/35 text-muted-foreground"
                : "bg-background hover:border-primary/50",
              selectedDay?.key === day.key &&
                "border-primary bg-primary/5 shadow-[0_0_0_1px_var(--primary)]",
            )}
            type="button"
            onClick={() => onSelectDay(day.key)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                {day.shortLabel} {day.dayNumber}
              </span>
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-md",
                  day.isRest ? "bg-background/70" : "bg-primary text-primary-foreground",
                )}
              >
                {day.isRest ? <BedIcon className="size-3.5" /> : <DumbbellIcon className="size-3.5" />}
              </span>
            </div>
            <div className="mt-5">
              <p className={cn("line-clamp-2 text-sm font-semibold", day.isRest && "font-medium")}>
                {day.session?.name ?? "Descanso"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {day.isRest ? "Sin entrenamiento" : `${day.exerciseCount} ejercicios`}
              </p>
            </div>
          </button>
        ))}
      </div>

      <DayDetail day={selectedDay} />
    </div>
  );
}

function DayDetail({ day }: { day: WeekPreviewDay | null }) {
  if (!day) {
    return null;
  }

  if (day.isRest) {
    return (
      <div className="rounded-md border bg-muted/30 p-5">
        <p className="text-base font-semibold">Dia de descanso</p>
        <p className="mt-2 text-sm text-muted-foreground">
          No hay una sesion programada para este dia.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-background p-5">
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-lg font-semibold">{day.session?.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{day.exerciseCount} ejercicios</p>
        </div>
        {day.exercises.some((exercise) => exercise.hasAlternatives) ? (
          <Badge variant="secondary">
            <ReplaceIcon className="mr-1 size-3.5" />
            Alternativas
          </Badge>
        ) : null}
      </div>

      {day.session?.description ? (
        <p className="mt-4 text-sm text-muted-foreground">{day.session.description}</p>
      ) : null}
      {day.session?.coachNote ? (
        <div className="mt-3 rounded-md bg-primary/5 px-3 py-2 text-sm text-primary">
          {day.session.coachNote}
        </div>
      ) : null}

      {day.exercises.length ? (
        <div className="mt-4 divide-y rounded-md border">
          {day.exercises.map((exercise) => (
            <div
              key={exercise.id}
              className="grid gap-2 px-3 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_110px_70px]"
            >
              <div className="min-w-0">
                <p className="font-medium">{exercise.name}</p>
                {exercise.coachNote ? (
                  <p className="mt-1 text-xs text-muted-foreground">{exercise.coachNote}</p>
                ) : null}
              </div>
              <p className="font-medium">
                {exercise.sets ?? "-"} x {exercise.reps || "-"}
              </p>
              <p className="text-muted-foreground">
                {exercise.restSeconds === null ? "-" : `${exercise.restSeconds} s`}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Esta sesion todavia no tiene ejercicios.
        </p>
      )}
    </div>
  );
}
