"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { CopyIcon, PlusIcon, Trash2Icon } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type CurrentAssignmentEditor } from "@/hooks/use-current-assignment-editor";
import { dayLabels } from "@/lib/clients/api";
import type { DayOfWeek, TrainingPlan, TrainingPlanDay } from "@/lib/clients/types";
import { cn } from "@/lib/utils";

const dayOfWeekValues: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function PlanTree({
  editor,
  onMutate,
  onSelectSession,
  plan,
  selectedSessionId,
}: {
  editor: CurrentAssignmentEditor;
  onMutate: (action: () => Promise<unknown>, success: string) => Promise<void>;
  onSelectSession: (sessionId: string) => void;
  plan: TrainingPlan;
  selectedSessionId?: string;
}) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Estructura</CardTitle>
            <CardDescription>Semanas, dias y sesiones de la copia.</CardDescription>
          </div>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void onMutate(() => editor.createWeek({}), "Semana agregada")}
          >
            <PlusIcon data-icon="inline-start" />
            Semana
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {plan.weeks?.map((week) => (
          <details key={week.id} className="rounded-lg border bg-background p-2" open>
            <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold">
              <span>Semana {week.weekNumber}</span>
              <span className="flex gap-1">
                <IconButton
                  label="Duplicar semana"
                  onClick={(event) => {
                    event.stopPropagation();
                    void onMutate(() => editor.duplicateWeek(week.id), "Semana duplicada");
                  }}
                >
                  <CopyIcon className="size-3" />
                </IconButton>
                <IconButton
                  label="Eliminar semana"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (window.confirm("Eliminar esta semana y todo su contenido?")) {
                      void onMutate(() => editor.deleteWeek(week.id), "Semana eliminada");
                    }
                  }}
                >
                  <Trash2Icon className="size-3" />
                </IconButton>
              </span>
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              {week.days?.map((day) => (
                <DayNode
                  key={day.id}
                  day={day}
                  editor={editor}
                  isSelected={day.session?.id === selectedSessionId}
                  onMutate={onMutate}
                  onSelectSession={onSelectSession}
                />
              ))}
              <AddDayControl
                editor={editor}
                onMutate={onMutate}
                usedDays={(week.days ?? []).map((day) => day.dayOfWeek)}
                weekId={week.id}
              />
            </div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}

function DayNode({
  day,
  editor,
  isSelected,
  onMutate,
  onSelectSession,
}: {
  day: TrainingPlanDay;
  editor: CurrentAssignmentEditor;
  isSelected: boolean;
  onMutate: (action: () => Promise<unknown>, success: string) => Promise<void>;
  onSelectSession: (sessionId: string) => void;
}) {
  return (
    <details className="rounded-md border bg-card p-2" open>
      <summary className="flex cursor-pointer items-center justify-between text-sm text-muted-foreground">
        <span>{dayLabels[day.dayOfWeek]}</span>
        <IconButton
          label="Eliminar dia"
          onClick={(event) => {
            event.stopPropagation();
            if (window.confirm("Eliminar este dia y su contenido?")) {
              void onMutate(() => editor.deleteDay(day.id), "Dia eliminado");
            }
          }}
        >
          <Trash2Icon className="size-3" />
        </IconButton>
      </summary>
      {day.session ? (
        <div className="mt-2 flex items-center gap-2">
          <button
            className={cn(
              "min-w-0 flex-1 rounded-md border px-3 py-2 text-left text-sm transition-colors",
              isSelected ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
            )}
            type="button"
            onClick={() => onSelectSession(day.session?.id ?? "")}
          >
            <span className="block truncate">{day.session.name}</span>
          </button>
          <IconButton
            label="Eliminar sesion"
            onClick={() => {
              const sessionId = day.session?.id;
              if (sessionId && window.confirm("Eliminar esta sesion y sus ejercicios?")) {
                void onMutate(() => editor.deleteSession(sessionId), "Sesion eliminada");
              }
            }}
          >
            <Trash2Icon className="size-3" />
          </IconButton>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <span className="flex-1 text-xs text-muted-foreground">Sin sesion</span>
          <Button
            size="sm"
            type="button"
            variant="ghost"
            onClick={() =>
              void onMutate(
                () => editor.createSession(day.id, { name: `Sesion ${dayLabels[day.dayOfWeek]}` }),
                "Sesion agregada",
              )
            }
          >
            <PlusIcon data-icon="inline-start" />
            Sesion
          </Button>
        </div>
      )}
    </details>
  );
}

function AddDayControl({
  editor,
  onMutate,
  usedDays,
  weekId,
}: {
  editor: CurrentAssignmentEditor;
  onMutate: (action: () => Promise<unknown>, success: string) => Promise<void>;
  usedDays: string[];
  weekId: string;
}) {
  const availableDays = dayOfWeekValues.filter((day) => !usedDays.includes(day));
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(availableDays[0] ?? "monday");

  useEffect(() => {
    if (!availableDays.includes(selectedDay) && availableDays[0]) {
      setSelectedDay(availableDays[0]);
    }
  }, [availableDays, selectedDay]);

  return (
    <div className="flex gap-2">
      <select
        className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
        disabled={availableDays.length === 0}
        value={selectedDay}
        onChange={(event) => setSelectedDay(event.target.value as DayOfWeek)}
      >
        {availableDays.map((day) => (
          <option key={day} value={day}>
            {dayLabels[day]}
          </option>
        ))}
      </select>
      <Button
        disabled={availableDays.length === 0}
        size="sm"
        type="button"
        variant="ghost"
        onClick={() =>
          void onMutate(
            () => editor.createDay(weekId, { dayOfWeek: selectedDay }),
            "Dia agregado",
          )
        }
      >
        <PlusIcon className="size-3" />
      </Button>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      title={label}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
