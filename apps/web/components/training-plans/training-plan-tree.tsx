"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import {
  ChevronRightIcon,
  CopyIcon,
  DumbbellIcon,
  GripVerticalIcon,
  MoreVerticalIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type DayOfWeek,
  type TrainingPlan,
  type TrainingPlanDay,
  useTrainingPlanEditor,
} from "@/hooks/use-training-plans";
import { cn } from "@/lib/utils";

const dayLabels: Record<string, string> = {
  friday: "Viernes",
  monday: "Lunes",
  saturday: "Sabado",
  sunday: "Domingo",
  thursday: "Jueves",
  tuesday: "Martes",
  wednesday: "Miercoles",
};

const dayOfWeekValues: Array<DayOfWeek> = [
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
  onSelectSession,
  plan,
  selectedSessionId,
}: {
  editor: ReturnType<typeof useTrainingPlanEditor>;
  onSelectSession: (sessionId: string) => void;
  plan: TrainingPlan;
  selectedSessionId?: string;
}) {
  const isReadOnly = plan.status !== "draft";

  return (
    <Card className="h-fit overflow-hidden">
      <CardHeader>
        <CardTitle>Estructura del plan</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {plan.weeks?.map((week) => (
          <details key={week.id} className="group rounded-lg bg-card" open>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-2 text-sm font-semibold">
              <span className="flex min-w-0 items-center gap-2">
                <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
                Semana {week.weekNumber}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label={`Acciones de semana ${week.weekNumber}`}
                    disabled={isReadOnly}
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MoreVerticalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onSelect={() => {
                        void editor.duplicateWeek(week.id).then(() => {
                          void editor.loadPlan();
                          toast.success("Semana duplicada");
                        });
                      }}
                    >
                      <CopyIcon data-icon="inline-start" />
                      Duplicar semana
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        if (
                          window.confirm(
                            "Eliminar esta semana y todo su contenido?",
                          )
                        ) {
                          void editor.deleteWeek(week.id).then(() => {
                            void editor.loadPlan();
                            toast.success("Semana eliminada");
                          });
                        }
                      }}
                    >
                      <Trash2Icon data-icon="inline-start" />
                      Eliminar semana
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </summary>
            <div className="ml-4 flex flex-col border-l pl-3">
              {week.days.map((day) => (
                <DayNode
                  key={day.id}
                  day={day}
                  editor={editor}
                  isReadOnly={isReadOnly}
                  isSelected={day.session?.id === selectedSessionId}
                  onSelectSession={onSelectSession}
                />
              ))}
              <AddDayControl
                editor={editor}
                isReadOnly={isReadOnly}
                usedDays={week.days.map((day) => day.dayOfWeek)}
                weekId={week.id}
              />
            </div>
          </details>
        ))}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={isReadOnly}
          type="button"
          variant="outline"
          onClick={() =>
            void editor
              .createWeek({ weekNumber: (plan.weeks?.length ?? 0) + 1 })
              .then(() => {
                void editor.loadPlan();
                toast.success("Semana agregada");
              })
          }
        >
          <PlusIcon data-icon="inline-start" />
          Agregar semana
        </Button>
      </CardFooter>
    </Card>
  );
}

function AddDayControl({
  editor,
  isReadOnly,
  usedDays,
  weekId,
}: {
  editor: ReturnType<typeof useTrainingPlanEditor>;
  isReadOnly: boolean;
  usedDays: string[];
  weekId: string;
}) {
  const availableDays = dayOfWeekValues.filter(
    (day) => !usedDays.includes(day),
  );
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(
    availableDays[0] ?? "monday",
  );

  useEffect(() => {
    if (!availableDays.includes(selectedDay) && availableDays[0]) {
      setSelectedDay(availableDays[0]);
    }
  }, [availableDays, selectedDay]);

  return (
    <div className="flex gap-2 py-2">
      <select
        className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
        disabled={isReadOnly || availableDays.length === 0}
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
        disabled={isReadOnly || availableDays.length === 0}
        size="sm"
        type="button"
        variant="ghost"
        onClick={() =>
          void editor.createDay(weekId, { dayOfWeek: selectedDay }).then(() => {
            void editor.loadPlan();
            toast.success("Dia agregado");
          })
        }
      >
        <PlusIcon data-icon="inline-start" />
        Agregar
      </Button>
    </div>
  );
}

function DayNode({
  day,
  editor,
  isReadOnly,
  isSelected,
  onSelectSession,
}: {
  day: TrainingPlanDay;
  editor: ReturnType<typeof useTrainingPlanEditor>;
  isReadOnly: boolean;
  isSelected: boolean;
  onSelectSession: (sessionId: string) => void;
}) {
  return (
    <div className="py-1">
      {day.session ? (
        <div className="flex items-center gap-2">
          <GripVerticalIcon className="size-4 shrink-0 text-muted-foreground" />
          <button
            className={cn(
              "min-w-0 flex-1 rounded-md px-3 py-2 text-left text-sm transition-colors",
              isSelected
                ? "border border-primary bg-muted shadow-sm"
                : "border border-transparent hover:bg-muted",
            )}
            type="button"
            onClick={() => onSelectSession(day.session?.id ?? "")}
          >
            <span className="flex min-w-0 items-center gap-2">
              <DumbbellIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {dayLabels[day.dayOfWeek] ?? day.dayOfWeek} - {day.session.name}
              </span>
            </span>
          </button>
          <DayActions day={day} editor={editor} isReadOnly={isReadOnly} />
        </div>
      ) : (
        <div className="flex items-center gap-2 py-1 pl-6">
          <span className="flex-1 rounded-md px-3 py-2 text-sm text-muted-foreground">
            {dayLabels[day.dayOfWeek] ?? day.dayOfWeek} - Descanso
          </span>
          <Button
            disabled={isReadOnly}
            size="sm"
            type="button"
            variant="ghost"
            onClick={() =>
              void editor
                .createSession(day.id, {
                  name: `Sesion ${dayLabels[day.dayOfWeek] ?? day.dayOfWeek}`,
                })
                .then(() => {
                  void editor.loadPlan();
                  toast.success("Sesion agregada");
                })
            }
          >
            <PlusIcon data-icon="inline-start" />
            Sesion
          </Button>
          <DayActions day={day} editor={editor} isReadOnly={isReadOnly} />
        </div>
      )}
    </div>
  );
}

function DayActions({
  day,
  editor,
  isReadOnly,
}: {
  day: TrainingPlanDay;
  editor: ReturnType<typeof useTrainingPlanEditor>;
  isReadOnly: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Acciones del dia"
          disabled={isReadOnly}
          size="icon"
          type="button"
          variant="ghost"
        >
          <MoreVerticalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {day.session ? (
            <DropdownMenuItem
              onSelect={() => {
                if (
                  window.confirm("Eliminar esta sesion y todos sus ejercicios?")
                ) {
                  const sessionId = day.session?.id;
                  if (sessionId) {
                    void editor.deleteSession(sessionId).then(() => {
                      void editor.loadPlan();
                      toast.success("Sesion eliminada");
                    });
                  }
                }
              }}
            >
              <Trash2Icon data-icon="inline-start" />
              Eliminar sesion
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onSelect={() => {
              if (window.confirm("Eliminar este dia y su contenido?")) {
                void editor.deleteDay(day.id).then(() => {
                  void editor.loadPlan();
                  toast.success("Dia eliminado");
                });
              }
            }}
          >
            <Trash2Icon data-icon="inline-start" />
            Eliminar dia
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
