"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import {
  CalendarDaysIcon,
  ChevronRightIcon,
  CopyIcon,
  EditIcon,
  Loader2Icon,
  LockIcon,
  MoreVerticalIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WorkspacePanel } from "@/components/layout/workspace-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  type DayOfWeek,
  type TrainingPlan,
  type TrainingPlanDay,
  type TrainingSession,
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
  isReadOnly,
  onSelectSession,
  onSaveSessionInfo,
  plan,
  selectedSessionId,
}: {
  editor: ReturnType<typeof useTrainingPlanEditor>;
  isReadOnly: boolean;
  onSelectSession: (sessionId: string) => void;
  onSaveSessionInfo: (
    sessionId: string,
    draft: Pick<TrainingSession, "name" | "description" | "coachNote">,
  ) => Promise<boolean>;
  plan: TrainingPlan;
  selectedSessionId?: string;
}) {
  return (
    <WorkspacePanel className="flex h-[calc(100vh-9rem)] max-h-[calc(100vh-9rem)] flex-col overflow-hidden xl:sticky xl:top-4">
      <div className="gap-2 border-b p-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Estructura</h2>
          <span className="text-xs text-muted-foreground">
            {plan.weeks?.length ?? 0} semanas
          </span>
        </div>
        {isReadOnly ? (
          <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-2.5 text-xs text-muted-foreground">
            <LockIcon className="mt-0.5 shrink-0" />
            <p>
              {plan.isSystemTemplate
                ? "Base del sistema. Crea una copia para editar la estructura."
                : "Plan publicado. La estructura esta bloqueada para edicion."}
            </p>
          </div>
        ) : null}
      </div>
      <div className="plan-tree-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 pr-4">
        {plan.weeks?.map((week) => (
          <details key={week.id} className="group rounded-md border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-2 py-2 text-sm font-semibold hover:bg-background">
              <span className="flex min-w-0 items-center gap-2">
                <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
                <span>Semana {week.weekNumber}</span>
                <span className="rounded border bg-background px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">
                  {getWeekSummary(week.days)}
                </span>
              </span>
              {!isReadOnly ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      aria-label={`Acciones de semana ${week.weekNumber}`}
                      className="size-8"
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
              ) : null}
            </summary>
            <div className="flex flex-col border-t bg-background/50 p-2">
              {week.days.map((day) => (
                <DayNode
                  key={day.id}
                  day={day}
                  editor={editor}
                  isReadOnly={isReadOnly}
                  isSelected={day.session?.id === selectedSessionId}
                  onSaveSessionInfo={onSaveSessionInfo}
                  onSelectSession={onSelectSession}
                  usedDays={week.days.map((weekDay) => weekDay.dayOfWeek)}
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
      </div>
      {!isReadOnly ? (
        <div className="shrink-0 border-t bg-card p-3">
          <Button
            className="w-full"
            size="sm"
            type="button"
            variant="outline"
            onClick={() =>
              void editor
                .createWeek({})
                .then(() => {
                  toast.success("Semana agregada");
                })
            }
          >
            <PlusIcon data-icon="inline-start" />
            Agregar semana
          </Button>
        </div>
      ) : null}
    </WorkspacePanel>
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
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(
    availableDays[0] ?? "monday",
  );

  useEffect(() => {
    if (!availableDays.includes(selectedDay) && availableDays[0]) {
      setSelectedDay(availableDays[0]);
    }
  }, [availableDays, selectedDay]);

  if (isReadOnly || availableDays.length === 0) {
    return null;
  }

  if (!isOpen) {
    return (
      <div className="py-0.5">
        <Button
          className="w-full justify-start text-muted-foreground"
          size="sm"
          type="button"
          variant="ghost"
          onClick={() => setIsOpen(true)}
        >
          <PlusIcon data-icon="inline-start" />
          Agregar dia
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed bg-background p-2">
      <select
        aria-label="Dia de la semana"
        className="h-9 w-full rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
        value={selectedDay}
        onChange={(event) => setSelectedDay(event.target.value as DayOfWeek)}
      >
        {availableDays.map((day) => (
          <option key={day} value={day}>
            {dayLabels[day]}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <Button
          className="w-full"
          size="sm"
          type="button"
          variant="outline"
          onClick={() =>
            void editor.createDay(weekId, { dayOfWeek: selectedDay }).then(() => {
              setIsOpen(false);
              toast.success("Dia agregado");
            })
          }
        >
          <PlusIcon data-icon="inline-start" />
          Agregar
        </Button>
        <Button
          className="w-full"
          size="sm"
          type="button"
          variant="ghost"
          onClick={() => setIsOpen(false)}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function DayNode({
  day,
  editor,
  isReadOnly,
  isSelected,
  onSelectSession,
  onSaveSessionInfo,
  usedDays,
}: {
  day: TrainingPlanDay;
  editor: ReturnType<typeof useTrainingPlanEditor>;
  isReadOnly: boolean;
  isSelected: boolean;
  onSelectSession: (sessionId: string) => void;
  onSaveSessionInfo: (
    sessionId: string,
    draft: Pick<TrainingSession, "name" | "description" | "coachNote">,
  ) => Promise<boolean>;
  usedDays: string[];
}) {
  return (
    <div className="py-0.5">
      {day.session ? (
        <div className="flex items-center gap-2">
          <button
            className={cn(
              "relative min-w-0 flex-1 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
              isSelected
                ? "border border-primary/40 bg-primary/5 pl-3.5 before:absolute before:left-0 before:top-2 before:h-[calc(100%-16px)] before:w-1 before:rounded-full before:bg-primary"
                : "border border-transparent hover:bg-card",
            )}
            type="button"
            onClick={() => onSelectSession(day.session?.id ?? "")}
          >
            <span className="block min-w-0">
              <span className="block truncate font-medium">
                {dayLabels[day.dayOfWeek] ?? day.dayOfWeek}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {day.session.name} / {day.session.exercises.length} ejercicios
              </span>
            </span>
          </button>
          {!isReadOnly ? (
            <DayActions
              day={day}
              editor={editor}
              isReadOnly={isReadOnly}
              onSaveSessionInfo={onSaveSessionInfo}
              onSelectSession={onSelectSession}
              usedDays={usedDays}
            />
          ) : null}
        </div>
      ) : (
        <div className="flex items-center gap-2 py-0.5">
          <span className="flex-1 rounded-md border border-dashed bg-card px-2.5 py-2 text-sm text-muted-foreground">
            <span className="block font-medium text-foreground">
              {dayLabels[day.dayOfWeek] ?? day.dayOfWeek}
            </span>
            <span className="text-xs">Descanso</span>
          </span>
          {!isReadOnly ? (
            <>
              <Button
                size="sm"
                type="button"
                variant="ghost"
                onClick={() =>
                  void editor
                    .createSession(day.id, {
                      name: `Sesion ${dayLabels[day.dayOfWeek] ?? day.dayOfWeek}`,
                    })
                    .then(() => {
                      toast.success("Sesion agregada");
                    })
                    .catch((caughtError: unknown) => {
                      toast.error(
                        caughtError instanceof Error
                          ? caughtError.message
                          : "No se pudo crear la sesion",
                      );
                    })
                }
              >
                <PlusIcon data-icon="inline-start" />
                Sesion
              </Button>
              <DayActions
                day={day}
                editor={editor}
                isReadOnly={isReadOnly}
                onSaveSessionInfo={onSaveSessionInfo}
                onSelectSession={onSelectSession}
                usedDays={usedDays}
              />
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function getWeekSummary(days: TrainingPlanDay[]) {
  const sessionCount = days.filter((day) => day.session).length;
  const restCount = days.length - sessionCount;

  if (days.length === 0) {
    return "sin dias";
  }

  if (restCount === 0) {
    return `${sessionCount} sesiones`;
  }

  return `${sessionCount} sesiones / ${restCount} descanso`;
}

function DayActions({
  day,
  editor,
  isReadOnly,
  onSaveSessionInfo,
  onSelectSession,
  usedDays,
}: {
  day: TrainingPlanDay;
  editor: ReturnType<typeof useTrainingPlanEditor>;
  isReadOnly: boolean;
  onSaveSessionInfo: (
    sessionId: string,
    draft: Pick<TrainingSession, "name" | "description" | "coachNote">,
  ) => Promise<boolean>;
  onSelectSession: (sessionId: string) => void;
  usedDays: string[];
}) {
  const [isEditingSession, setIsEditingSession] = useState(false);
  const [dayDialogMode, setDayDialogMode] = useState<"copy" | "move" | null>(
    null,
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Acciones del dia"
            className="size-8"
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
              <DropdownMenuItem onSelect={() => setIsEditingSession(true)}>
                <EditIcon data-icon="inline-start" />
                Editar informacion
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={() => setDayDialogMode("move")}>
              <CalendarDaysIcon data-icon="inline-start" />
              Cambiar dia
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDayDialogMode("copy")}>
              <CopyIcon data-icon="inline-start" />
              Duplicar dia
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                if (window.confirm("Eliminar este dia y su contenido?")) {
                  void editor.deleteDay(day.id).then(() => {
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
      {day.session ? (
        <SessionInfoDialog
          isOpen={isEditingSession}
          isReadOnly={isReadOnly}
          session={day.session}
          onOpenChange={setIsEditingSession}
          onSave={onSaveSessionInfo}
        />
      ) : null}
      <DayTargetDialog
        currentDay={day.dayOfWeek}
        isOpen={dayDialogMode !== null}
        mode={dayDialogMode ?? "move"}
        usedDays={usedDays}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDayDialogMode(null);
          }
        }}
        onSubmit={(targetDay) => {
          if (dayDialogMode === "copy") {
            void editor.copyDay(day.id, { dayOfWeek: targetDay }).then((copiedDay) => {
              setDayDialogMode(null);
              if (copiedDay.session) {
                onSelectSession(copiedDay.session.id);
              }
              toast.success("Dia duplicado");
            });
            return;
          }

          void editor.updateDay(day.id, { dayOfWeek: targetDay }).then(() => {
            setDayDialogMode(null);
            toast.success("Dia actualizado");
          });
        }}
      />
    </>
  );
}

function DayTargetDialog({
  currentDay,
  isOpen,
  mode,
  onOpenChange,
  onSubmit,
  usedDays,
}: {
  currentDay: string;
  isOpen: boolean;
  mode: "copy" | "move";
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (targetDay: DayOfWeek) => void;
  usedDays: string[];
}) {
  const availableDays = dayOfWeekValues.filter(
    (day) => day === currentDay || !usedDays.includes(day),
  );
  const targetOptions =
    mode === "copy"
      ? availableDays.filter((day) => day !== currentDay)
      : availableDays;
  const [targetDay, setTargetDay] = useState<DayOfWeek>(
    targetOptions[0] ?? "monday",
  );

  useEffect(() => {
    if (targetOptions[0] && !targetOptions.includes(targetDay)) {
      setTargetDay(targetOptions[0]);
    }
  }, [targetDay, targetOptions]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {mode === "copy" ? "Duplicar dia" : "Cambiar dia"}
          </DialogTitle>
          <DialogDescription>
            Elige un dia disponible dentro de la misma semana.
          </DialogDescription>
        </DialogHeader>
        {targetOptions.length > 0 ? (
          <label className="grid gap-2 text-sm font-medium">
            Dia
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
              value={targetDay}
              onChange={(event) => setTargetDay(event.target.value as DayOfWeek)}
            >
              {targetOptions.map((day) => (
                <option key={day} value={day}>
                  {dayLabels[day]}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            No quedan dias disponibles en esta semana.
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            disabled={targetOptions.length === 0}
            type="button"
            onClick={() => onSubmit(targetDay)}
          >
            {mode === "copy" ? "Duplicar" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SessionInfoDialog({
  isOpen,
  isReadOnly,
  onOpenChange,
  onSave,
  session,
}: {
  isOpen: boolean;
  isReadOnly: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    sessionId: string,
    draft: Pick<TrainingSession, "name" | "description" | "coachNote">,
  ) => Promise<boolean>;
  session: TrainingSession;
}) {
  const [draft, setDraft] = useState({
    coachNote: session.coachNote,
    description: session.description,
    name: session.name,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setDraft({
      coachNote: session.coachNote,
      description: session.description,
      name: session.name,
    });
  }, [isOpen, session]);

  async function handleSave() {
    if (isReadOnly || isSaving) {
      return;
    }

    setIsSaving(true);
    const didSave = await onSave(session.id, draft);
    setIsSaving(false);
    if (didSave) {
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar informacion de sesion</DialogTitle>
          <DialogDescription>
            Actualiza el nombre, descripcion y notas sin salir de la estructura.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Nombre
            <Input
              disabled={isReadOnly}
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Descripcion
            <Input
              disabled={isReadOnly}
              value={draft.description ?? ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Nota del coach
            <textarea
              className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
              disabled={isReadOnly}
              value={draft.coachNote ?? ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  coachNote: event.target.value,
                }))
              }
            />
          </label>
        </div>
        <DialogFooter>
          <Button
            disabled={isReadOnly || isSaving}
            type="button"
            onClick={() => void handleSave()}
          >
            {isSaving ? (
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : (
              <SaveIcon data-icon="inline-start" />
            )}
            Guardar sesion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
