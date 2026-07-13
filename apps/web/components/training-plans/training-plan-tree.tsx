"use client";

import {
  CalendarDaysIcon,
  ChevronRightIcon,
  CopyIcon,
  Loader2Icon,
  LockIcon,
  MoreVerticalIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
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
  type TrainingPlanWeek,
  type TrainingSession,
} from "@/hooks/use-training-plans";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { dayLabels, dayOfWeekValues } from "./training-plan-days";

type MutationState = "saving" | "saved" | "error";
export type PlanTreeEditor = {
  copyDay(dayId: string, body: { dayOfWeek: string }): Promise<TrainingPlanDay>;
  createDay(
    weekId: string,
    body: { dayOfWeek: string; dayType?: string; dayOrder?: number },
  ): Promise<TrainingPlanDay>;
  createSession(
    dayId: string,
    body: { name: string; description?: string | null; coachNote?: string | null },
  ): Promise<TrainingSession>;
  createWeek(body: { weekNumber?: number; notes?: string }): Promise<TrainingPlanWeek>;
  deleteDay(dayId: string): Promise<{ deleted: boolean }>;
  deleteSession(sessionId: string): Promise<{ deleted: boolean }>;
  deleteWeek(weekId: string): Promise<{ deleted: boolean }>;
  duplicateWeek(weekId: string): Promise<TrainingPlanWeek>;
  updateDay(dayId: string, body: { dayOfWeek: string }): Promise<TrainingPlanDay>;
};

export function PlanTree({
  className,
  editor,
  isBusy,
  isReadOnly,
  onMutationStateChange,
  onSelectSession,
  plan,
  scopeDescription,
  selectedSessionId,
}: {
  className?: string;
  editor: PlanTreeEditor;
  isBusy: boolean;
  isReadOnly: boolean;
  onMutationStateChange: (state: MutationState) => void;
  onSelectSession: (sessionId: string) => void;
  plan: TrainingPlan;
  scopeDescription?: string;
  selectedSessionId?: string;
}) {
  const weeks = useMemo(() => plan.weeks ?? [], [plan.weeks]);
  const [expandedWeekIds, setExpandedWeekIds] = useState<Set<string>>(
    () => new Set(),
  );

  function setWeekOpen(weekId: string, open: boolean) {
    setExpandedWeekIds((current) => {
      const next = new Set(current);
      if (open) {
        next.add(weekId);
      } else {
        next.delete(weekId);
      }
      return next;
    });
  }

  function expandWeek(weekId: string) {
    setWeekOpen(weekId, true);
  }

  return (
    <WorkspacePanel
      className={cn(
        "flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col overflow-hidden",
        className,
      )}
    >
      <div className="border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Estructura</h2>
          <span className="text-xs text-muted-foreground">{weeks.length} semanas</span>
        </div>
        {scopeDescription ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/45 p-3 text-xs text-muted-foreground">
            <LockIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>{scopeDescription}</p>
          </div>
        ) : isReadOnly ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/45 p-3 text-xs text-muted-foreground">
            <LockIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              {plan.isSystemTemplate
                ? "Plantilla del sistema. Crea una copia para editar la estructura."
                : "Este plan está en modo de lectura."}
            </p>
          </div>
        ) : null}
      </div>

      <div className="plan-tree-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {weeks.map((week) => {
          const isOpen = expandedWeekIds.has(week.id);

          return (
            <details
              key={week.id}
              className="group rounded-xl bg-background"
              open={isOpen}
              onToggle={(event) => setWeekOpen(week.id, event.currentTarget.open)}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-3 text-sm hover:bg-muted/40">
                <span className="flex min-w-0 items-center gap-2">
                  <ChevronRightIcon
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold">Semana {week.weekNumber}</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      {getWeekSummary(week.days)}
                    </span>
                  </span>
                </span>
                {!isReadOnly ? (
                  <WeekActions
                    editor={editor}
                    isBusy={isBusy}
                    week={week}
                    onDuplicated={expandWeek}
                    onMutationStateChange={onMutationStateChange}
                  />
                ) : null}
              </summary>
              <div className="flex flex-col gap-1 px-2 pb-2">
                {week.days.map((day) => (
                  <DayNode
                    key={day.id}
                    day={day}
                    editor={editor}
                    isReadOnly={isReadOnly}
                    isBusy={isBusy}
                    isSelected={day.session?.id === selectedSessionId}
                    usedDays={week.days.map((item) => item.dayOfWeek)}
                    onMutationStateChange={onMutationStateChange}
                    onSelectSession={onSelectSession}
                  />
                ))}
                {!isReadOnly ? (
                  <AddDayDialog
                    editor={editor}
                    isBusy={isBusy}
                    onMutationStateChange={onMutationStateChange}
                    usedDays={week.days.map((day) => day.dayOfWeek)}
                    weekId={week.id}
                    onCreated={(sessionId) => {
                      expandWeek(week.id);
                      if (sessionId) {
                        onSelectSession(sessionId);
                      }
                    }}
                  />
                ) : null}
              </div>
            </details>
          );
        })}

        {weeks.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            Este plan todavía no tiene semanas.
          </div>
        ) : null}
      </div>

      {!isReadOnly ? (
        <div className="sticky bottom-0 shrink-0 border-t bg-card p-3">
          <Button
            className="w-full border-primary/35 text-primary hover:bg-primary/10"
            disabled={isBusy}
            type="button"
            variant="outline"
            onClick={() => {
              onMutationStateChange("saving");
              void editor
                .createWeek({})
                .then((week) => {
                  expandWeek(week.id);
                  onMutationStateChange("saved");
                  notify.success("Semana agregada");
                })
                .catch((error: unknown) => {
                  onMutationStateChange("error");
                  notify.error(getErrorMessage(error));
                });
            }}
          >
            <PlusIcon data-icon="inline-start" />
            Agregar semana
          </Button>
        </div>
      ) : null}
    </WorkspacePanel>
  );
}

function WeekActions({
  editor,
  isBusy,
  onDuplicated,
  onMutationStateChange,
  week,
}: {
  editor: PlanTreeEditor;
  isBusy: boolean;
  onDuplicated: (weekId: string) => void;
  onMutationStateChange: (state: MutationState) => void;
  week: TrainingPlanWeek;
}) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <>
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
            <MoreVerticalIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="rounded-xl border !border-transparent shadow-[var(--surface-shadow-soft)]"
        >
          <DropdownMenuGroup>
            <DropdownMenuItem
              disabled={isBusy}
              onSelect={() => {
                onMutationStateChange("saving");
                void editor
                  .duplicateWeek(week.id)
                  .then((duplicatedWeek) => {
                    onDuplicated(duplicatedWeek.id);
                    onMutationStateChange("saved");
                    notify.success("Semana duplicada");
                  })
                  .catch((error: unknown) => {
                    onMutationStateChange("error");
                    notify.error(getErrorMessage(error));
                  });
              }}
            >
              <CopyIcon data-icon="inline-start" />
              Duplicar semana
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={isBusy}
              onSelect={() => setIsConfirmingDelete(true)}
            >
              <Trash2Icon data-icon="inline-start" />
              Eliminar semana
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmActionDialog
        confirmLabel="Eliminar semana"
        consequence="También se eliminarán sus días, sesiones, ejercicios y alternativas. Esta acción no se puede deshacer."
        description={`Semana ${week.weekNumber}`}
        isLoading={isDeleting}
        open={isConfirmingDelete}
        title={`Eliminar Semana ${week.weekNumber}`}
        onOpenChange={setIsConfirmingDelete}
        onConfirm={async () => {
          setIsDeleting(true);
          onMutationStateChange("saving");
          try {
            await editor.deleteWeek(week.id);
            onMutationStateChange("saved");
            notify.success("Semana eliminada");
            return true;
          } catch (error) {
            onMutationStateChange("error");
            notify.error(getErrorMessage(error));
            return false;
          } finally {
            setIsDeleting(false);
          }
        }}
      />
    </>
  );
}

function DayNode({
  day,
  editor,
  isReadOnly,
  isBusy,
  isSelected,
  onMutationStateChange,
  onSelectSession,
  usedDays,
}: {
  day: TrainingPlanDay;
  editor: PlanTreeEditor;
  isReadOnly: boolean;
  isBusy: boolean;
  isSelected: boolean;
  onMutationStateChange: (state: MutationState) => void;
  onSelectSession: (sessionId: string) => void;
  usedDays: DayOfWeek[];
}) {
  return (
    <div className="flex items-center gap-1">
      {day.session ? (
        <button
          className={cn(
            "relative min-w-0 flex-1 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
            isSelected
              ? "bg-primary/10 pl-4 text-foreground before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-primary"
              : "hover:bg-muted/45",
          )}
          type="button"
          onClick={() => onSelectSession(day.session?.id ?? "")}
        >
          <span className="block truncate font-medium">{dayLabels[day.dayOfWeek]}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {day.session.name} · {day.session.exercises.length} ejercicios
          </span>
        </button>
      ) : (
        <div className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm">
          <span className="block font-medium">{dayLabels[day.dayOfWeek]}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {day.dayType === "rest" ? "Descanso" : "Sin sesión configurada"}
          </span>
          {!isReadOnly && day.dayType === "training" ? (
            <Button
              className="mt-2 h-7 px-2 text-xs"
              disabled={isBusy}
              type="button"
              variant="ghost"
              onClick={() => {
                onMutationStateChange("saving");
                void editor
                  .createSession(day.id, { name: `Sesión ${dayLabels[day.dayOfWeek]}` })
                  .then((session) => {
                    onSelectSession(session.id);
                    onMutationStateChange("saved");
                    notify.success("Sesión agregada");
                  })
                  .catch((error: unknown) => {
                    onMutationStateChange("error");
                    notify.error(getErrorMessage(error));
                  });
              }}
            >
              <PlusIcon data-icon="inline-start" />
              Crear sesión
            </Button>
          ) : null}
        </div>
      )}
      {!isReadOnly ? (
        <DayActions
          day={day}
          editor={editor}
          isBusy={isBusy}
          onMutationStateChange={onMutationStateChange}
          usedDays={usedDays}
          onSelectSession={onSelectSession}
        />
      ) : null}
    </div>
  );
}

function DayActions({
  day,
  editor,
  isBusy,
  onMutationStateChange,
  onSelectSession,
  usedDays,
}: {
  day: TrainingPlanDay;
  editor: PlanTreeEditor;
  isBusy: boolean;
  onMutationStateChange: (state: MutationState) => void;
  onSelectSession: (sessionId: string) => void;
  usedDays: DayOfWeek[];
}) {
  const [dialogMode, setDialogMode] = useState<"copy" | "move" | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label={`Acciones de ${dayLabels[day.dayOfWeek]}`} className="size-8" size="icon" type="button" variant="ghost">
            <MoreVerticalIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-xl border !border-transparent shadow-[var(--surface-shadow-soft)]">
          <DropdownMenuGroup>
            <DropdownMenuItem disabled={isBusy} onSelect={() => setDialogMode("move")}>
              <CalendarDaysIcon data-icon="inline-start" />
              Cambiar día
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isBusy} onSelect={() => setDialogMode("copy")}>
              <CopyIcon data-icon="inline-start" />
              Duplicar día
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" disabled={isBusy} onSelect={() => setIsConfirmingDelete(true)}>
              <Trash2Icon data-icon="inline-start" />
              Eliminar día
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DayTargetDialog
        key={`${day.id}-${dialogMode ?? "closed"}`}
        currentDay={day.dayOfWeek}
        mode={dialogMode ?? "move"}
        open={dialogMode !== null}
        usedDays={usedDays}
        onOpenChange={(open) => !open && setDialogMode(null)}
        onSubmit={async (targetDay) => {
          onMutationStateChange("saving");
          try {
            if (dialogMode === "copy") {
              const copiedDay = await editor.copyDay(day.id, { dayOfWeek: targetDay });
              if (copiedDay.session) {
                onSelectSession(copiedDay.session.id);
              }
              notify.success("Día duplicado");
            } else {
              await editor.updateDay(day.id, { dayOfWeek: targetDay });
              notify.success("Día actualizado");
            }
            onMutationStateChange("saved");
            setDialogMode(null);
          } catch (error) {
            onMutationStateChange("error");
            notify.error(getErrorMessage(error));
          }
        }}
      />
      <ConfirmActionDialog
        confirmLabel="Eliminar día"
        consequence="También se eliminarán su sesión, ejercicios y alternativas. Esta acción no se puede deshacer."
        description={dayLabels[day.dayOfWeek]}
        isLoading={isDeleting}
        open={isConfirmingDelete}
        title={`Eliminar ${dayLabels[day.dayOfWeek]}`}
        onOpenChange={setIsConfirmingDelete}
        onConfirm={async () => {
          setIsDeleting(true);
          onMutationStateChange("saving");
          try {
            await editor.deleteDay(day.id);
            onMutationStateChange("saved");
            notify.success("Día eliminado");
            return true;
          } catch (error) {
            onMutationStateChange("error");
            notify.error(getErrorMessage(error));
            return false;
          } finally {
            setIsDeleting(false);
          }
        }}
      />
    </>
  );
}

function AddDayDialog({
  editor,
  isBusy,
  onMutationStateChange,
  onCreated,
  usedDays,
  weekId,
}: {
  editor: PlanTreeEditor;
  isBusy: boolean;
  onMutationStateChange: (state: MutationState) => void;
  onCreated: (sessionId?: string) => void;
  usedDays: DayOfWeek[];
  weekId: string;
}) {
  const availableDays = dayOfWeekValues.filter((day) => !usedDays.includes(day));
  const [dayType, setDayType] = useState<"training" | "rest">("training");
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(availableDays[0] ?? "monday");
  const [sessionName, setSessionName] = useState("");

  return (
    <>
      <Button
        className="mt-1 w-full justify-start text-muted-foreground"
        disabled={availableDays.length === 0 || isBusy}
        size="sm"
        type="button"
        variant="ghost"
        onClick={() => {
          setSelectedDay(availableDays[0] ?? "monday");
          setSessionName("");
          setDayType("training");
          setIsOpen(true);
        }}
      >
        <PlusIcon data-icon="inline-start" />
        Agregar día
      </Button>
      <Dialog open={isOpen} onOpenChange={(open) => !isSaving && setIsOpen(open)}>
        <DialogContent className="rounded-2xl border !border-transparent shadow-[var(--surface-shadow)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Agregar día</DialogTitle>
            <DialogDescription>Define el tipo de día y su sesión inicial.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Día
              <select
                className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
                value={selectedDay}
                onChange={(event) => setSelectedDay(event.target.value as DayOfWeek)}
              >
                {availableDays.map((day) => <option key={day} value={day}>{dayLabels[day]}</option>)}
              </select>
            </label>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">Tipo</legend>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/35 p-1">
                {(["training", "rest"] as const).map((type) => (
                  <button
                    key={type}
                    aria-pressed={dayType === type}
                    className={cn(
                      "h-9 rounded-lg text-xs font-semibold transition-colors",
                      dayType === type ? "bg-card text-primary shadow-[var(--surface-shadow-soft)]" : "text-muted-foreground",
                    )}
                    type="button"
                    onClick={() => setDayType(type)}
                  >
                    {type === "training" ? "Entrenamiento" : "Descanso"}
                  </button>
                ))}
              </div>
            </fieldset>
            {dayType === "training" ? (
              <label className="grid gap-2 text-sm font-medium">
                Sesión
                <Input
                  placeholder="Ej. Pull superior"
                  value={sessionName}
                  onChange={(event) => setSessionName(event.target.value)}
                />
              </label>
            ) : null}
          </div>
          <DialogFooter>
            <Button disabled={isSaving} type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button
              disabled={isSaving || availableDays.length === 0 || (dayType === "training" && !sessionName.trim())}
              type="button"
              onClick={() => {
                setIsSaving(true);
                onMutationStateChange("saving");
                void (async () => {
                  try {
                    const day = await editor.createDay(weekId, {
                      dayOfWeek: selectedDay,
                      dayType,
                    });
                    if (dayType === "training") {
                      try {
                        const session = await editor.createSession(day.id, {
                          name: sessionName.trim(),
                        });
                        onCreated(session.id);
                        onMutationStateChange("saved");
                      } catch (error) {
                        onMutationStateChange("error");
                        try {
                          await editor.deleteDay(day.id);
                        } catch {
                          notify.error(
                            "La sesión no pudo crearse y el día quedó agregado. Elimínalo o configura una sesión manualmente.",
                          );
                          throw error;
                        }

                        throw error;
                      }
                    } else {
                      onCreated();
                      onMutationStateChange("saved");
                    }
                    notify.success("Día agregado");
                    setIsOpen(false);
                  } catch (error) {
                    onMutationStateChange("error");
                    notify.error(getErrorMessage(error));
                  } finally {
                    setIsSaving(false);
                  }
                })();
              }}
            >
              {isSaving ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
              Agregar día
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DayTargetDialog({
  currentDay,
  mode,
  onOpenChange,
  onSubmit,
  open,
  usedDays,
}: {
  currentDay: DayOfWeek;
  mode: "copy" | "move";
  onOpenChange: (open: boolean) => void;
  onSubmit: (targetDay: DayOfWeek) => Promise<void>;
  open: boolean;
  usedDays: DayOfWeek[];
}) {
  const options = dayOfWeekValues.filter((day) =>
    mode === "copy"
      ? day !== currentDay && !usedDays.includes(day)
      : day === currentDay || !usedDays.includes(day),
  );
  const [targetDay, setTargetDay] = useState<DayOfWeek>(options[0] ?? currentDay);
  const [isSaving, setIsSaving] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
      <DialogContent className="rounded-2xl border !border-transparent shadow-[var(--surface-shadow)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "copy" ? "Duplicar día" : "Cambiar día"}</DialogTitle>
          <DialogDescription>Elige un día disponible dentro de la misma semana.</DialogDescription>
        </DialogHeader>
        <label className="grid gap-2 text-sm font-medium">
          Día
          <select
            className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
            value={targetDay}
            onChange={(event) => setTargetDay(event.target.value as DayOfWeek)}
          >
            {options.map((day) => <option key={day} value={day}>{dayLabels[day]}</option>)}
          </select>
        </label>
        <DialogFooter>
          <Button disabled={isSaving} type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={isSaving || options.length === 0}
            type="button"
            onClick={() => {
              setIsSaving(true);
              void onSubmit(targetDay).finally(() => setIsSaving(false));
            }}
          >
            {isSaving ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : null}
            {mode === "copy" ? "Duplicar" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getWeekSummary(days: TrainingPlanDay[]) {
  const sessionCount = days.filter((day) => day.session).length;
  const restCount = days.filter((day) => day.dayType === "rest").length;
  return `${sessionCount} sesiones · ${restCount} descansos`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo completar la operación";
}
