"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import {
  ChevronRightIcon,
  CopyIcon,
  EditIcon,
  InfoIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { WorkspacePanel } from "@/components/layout/workspace-shell";
import { type CurrentAssignmentEditor } from "@/hooks/use-current-assignment-editor";
import { dayLabels } from "@/lib/clients/api";
import type { DayOfWeek, TrainingPlan, TrainingPlanDay, TrainingSession } from "@/lib/clients/types";
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
  onSaveSessionInfo,
  onSelectSession,
  plan,
  selectedSessionId,
}: {
  editor: CurrentAssignmentEditor;
  onMutate: (action: () => Promise<unknown>, success: string) => Promise<void>;
  onSaveSessionInfo: (
    sessionId: string,
    draft: Pick<TrainingSession, "name" | "description" | "coachNote">,
  ) => Promise<boolean>;
  onSelectSession: (sessionId: string) => void;
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
        <div className="mt-3 flex items-start gap-2 rounded-md border bg-muted/40 p-2.5 text-xs text-muted-foreground">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          <p>
            Estos cambios solo aplican a este cliente. El template original no se modifica.
          </p>
        </div>
      </div>
      <div className="plan-tree-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 pr-4">
        {plan.weeks?.map((week) => (
          <details key={week.id} className="group rounded-md border bg-card" open>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-2 py-2 text-sm font-semibold hover:bg-background">
              <span className="flex min-w-0 items-center gap-2">
                <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
                <span>Semana {week.weekNumber}</span>
                <span className="rounded border bg-background px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">
                  {getWeekSummary(week.days ?? [])}
                </span>
              </span>
              <WeekActions editor={editor} onMutate={onMutate} weekId={week.id} />
            </summary>
            <div className="flex flex-col border-t bg-background/50 p-2">
              {week.days?.map((day) => (
                <DayNode
                  key={day.id}
                  day={day}
                  editor={editor}
                  isSelected={day.session?.id === selectedSessionId}
                  onMutate={onMutate}
                  onSaveSessionInfo={onSaveSessionInfo}
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
      </div>
      <div className="shrink-0 border-t bg-card p-3">
        <Button
          className="w-full"
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void onMutate(() => editor.createWeek({}), "Semana agregada")}
        >
          <PlusIcon data-icon="inline-start" />
          Agregar semana
        </Button>
      </div>
    </WorkspacePanel>
  );
}

function WeekActions({
  editor,
  onMutate,
  weekId,
}: {
  editor: CurrentAssignmentEditor;
  onMutate: (action: () => Promise<unknown>, success: string) => Promise<void>;
  weekId: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Acciones de semana"
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
          <DropdownMenuItem onSelect={() => void onMutate(() => editor.duplicateWeek(weekId), "Semana duplicada")}>
            <CopyIcon data-icon="inline-start" />
            Duplicar semana
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              if (window.confirm("Eliminar esta semana y todo su contenido?")) {
                void onMutate(() => editor.deleteWeek(weekId), "Semana eliminada");
              }
            }}
          >
            <Trash2Icon data-icon="inline-start" />
            Eliminar semana
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DayNode({
  day,
  editor,
  isSelected,
  onMutate,
  onSaveSessionInfo,
  onSelectSession,
}: {
  day: TrainingPlanDay;
  editor: CurrentAssignmentEditor;
  isSelected: boolean;
  onMutate: (action: () => Promise<unknown>, success: string) => Promise<void>;
  onSaveSessionInfo: (
    sessionId: string,
    draft: Pick<TrainingSession, "name" | "description" | "coachNote">,
  ) => Promise<boolean>;
  onSelectSession: (sessionId: string) => void;
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
                {day.session.name} / {day.session.exercises?.length ?? 0} ejercicios
              </span>
            </span>
          </button>
          <DayActions
            day={day}
            editor={editor}
            onMutate={onMutate}
            onSaveSessionInfo={onSaveSessionInfo}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 py-0.5">
          <span className="flex-1 rounded-md border border-dashed bg-card px-2.5 py-2 text-sm text-muted-foreground">
            <span className="block font-medium text-foreground">
              {dayLabels[day.dayOfWeek] ?? day.dayOfWeek}
            </span>
            <span className="text-xs">Descanso</span>
          </span>
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
          <DayActions
            day={day}
            editor={editor}
            onMutate={onMutate}
            onSaveSessionInfo={onSaveSessionInfo}
          />
        </div>
      )}
    </div>
  );
}

function DayActions({
  day,
  editor,
  onMutate,
  onSaveSessionInfo,
}: {
  day: TrainingPlanDay;
  editor: CurrentAssignmentEditor;
  onMutate: (action: () => Promise<unknown>, success: string) => Promise<void>;
  onSaveSessionInfo: (
    sessionId: string,
    draft: Pick<TrainingSession, "name" | "description" | "coachNote">,
  ) => Promise<boolean>;
}) {
  const [isEditingSession, setIsEditingSession] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label="Acciones del dia" className="size-8" size="icon" type="button" variant="ghost">
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
            <DropdownMenuItem
              disabled={!day.session}
              onSelect={() => {
                if (day.session && window.confirm("Eliminar esta sesion y sus ejercicios?")) {
                  void onMutate(() => editor.deleteSession(day.session?.id ?? ""), "Sesion eliminada");
                }
              }}
            >
              <Trash2Icon data-icon="inline-start" />
              Eliminar sesion
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                if (window.confirm("Eliminar este dia y su contenido?")) {
                  void onMutate(() => editor.deleteDay(day.id), "Dia eliminado");
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
          session={day.session}
          onOpenChange={setIsEditingSession}
          onSave={onSaveSessionInfo}
        />
      ) : null}
    </>
  );
}

function SessionInfoDialog({
  isOpen,
  onOpenChange,
  onSave,
  session,
}: {
  isOpen: boolean;
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
    if (!isOpen) return;
    setDraft({
      coachNote: session.coachNote,
      description: session.description,
      name: session.name,
    });
  }, [isOpen, session]);

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    const didSave = await onSave(session.id, draft);
    setIsSaving(false);
    if (didSave) onOpenChange(false);
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
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Descripcion
            <Input
              value={draft.description ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Nota del coach
            <textarea
              className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
              value={draft.coachNote ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, coachNote: event.target.value }))}
            />
          </label>
        </div>
        <DialogFooter>
          <Button disabled={isSaving} type="button" onClick={() => void handleSave()}>
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
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(availableDays[0] ?? "monday");

  useEffect(() => {
    if (!availableDays.includes(selectedDay) && availableDays[0]) {
      setSelectedDay(availableDays[0]);
    }
  }, [availableDays, selectedDay]);

  if (availableDays.length === 0) {
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
            void onMutate(
              () => editor.createDay(weekId, { dayOfWeek: selectedDay }),
              "Dia agregado",
            ).then(() => setIsOpen(false))
          }
        >
          <PlusIcon data-icon="inline-start" />
          Agregar
        </Button>
        <Button className="w-full" size="sm" type="button" variant="ghost" onClick={() => setIsOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function getWeekSummary(days: TrainingPlanDay[]) {
  const sessionCount = days.filter((day) => day.session).length;
  const restCount = days.length - sessionCount;

  if (days.length === 0) return "sin dias";
  if (restCount === 0) return `${sessionCount} sesiones`;
  return `${sessionCount} sesiones / ${restCount} descanso`;
}
