"use client";

import { CalendarDaysIcon, Loader2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { countSessions, countWeekSessions, dayLabels, formatDate, levelLabels } from "@/lib/clients/api";
import type { TrainingPlan } from "@/lib/clients/types";
import { EmptyState } from "./empty-loading";

export function AssignPlanDialog({
  error,
  isAssigning,
  isLoadingPlans,
  isLoadingPreview,
  isOpen,
  plans,
  previewError,
  previewPlan,
  selectedPlanId,
  startDate,
  onAssign,
  onOpenChange,
  onPlanChange,
  onStartDateChange,
}: {
  error: string;
  isAssigning: boolean;
  isLoadingPlans: boolean;
  isLoadingPreview: boolean;
  isOpen: boolean;
  plans: TrainingPlan[];
  previewError: string;
  previewPlan: TrainingPlan | null;
  selectedPlanId: string;
  startDate: string;
  onAssign: () => void;
  onOpenChange: (open: boolean) => void;
  onPlanChange: (planId: string) => void;
  onStartDateChange: (value: string) => void;
}) {
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Asignar plan</DialogTitle>
          <DialogDescription>
            Selecciona un template, revisa la semana y confirma la copia editable.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="plan-selector">
                Template
              </label>
              <select
                id="plan-selector"
                className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
                disabled={isLoadingPlans || !plans.length}
                value={selectedPlanId}
                onChange={(event) => onPlanChange(event.target.value)}
              >
                {plans.length ? (
                  plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))
                ) : (
                  <option value="">Sin templates activos</option>
                )}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="assignment-start-date">
                Fecha de inicio
              </label>
              <Input
                id="assignment-start-date"
                type="date"
                value={startDate}
                onChange={(event) => onStartDateChange(event.target.value)}
              />
            </div>

            {selectedPlan ? (
              <div className="rounded-lg border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{selectedPlan.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedPlan.durationWeeks} semanas /{" "}
                      {selectedPlan.level
                        ? levelLabels[selectedPlan.level] ?? selectedPlan.level
                        : "Sin nivel"}
                    </p>
                  </div>
                  {selectedPlan.isSystemTemplate ? (
                    <Badge variant="secondary">Base</Badge>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="min-w-0 rounded-lg border bg-background p-4">
            {isLoadingPreview ? (
              <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground">
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Cargando vista previa
              </div>
            ) : previewError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {previewError}
              </div>
            ) : previewPlan ? (
              <PlanPreview plan={previewPlan} startDate={startDate} />
            ) : (
              <EmptyState
                description="Necesitas al menos un template activo para asignarlo."
                title="Sin vista previa"
              />
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          Al confirmar se creara una copia editable para este cliente. El template
          original no se modificara.
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!selectedPlanId || isAssigning || isLoadingPreview}
            type="button"
            onClick={onAssign}
          >
            {isAssigning ? <Loader2Icon data-icon="inline-start" /> : null}
            Asignar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PlanPreview({ plan, startDate }: { plan: TrainingPlan; startDate: string }) {
  const weeks = [...(plan.weeks ?? [])].sort(
    (first, second) => first.weekNumber - second.weekNumber,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{plan.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {plan.goal || plan.generalNotes || "Sin objetivo registrado."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline">{plan.durationWeeks} semanas</Badge>
            <Badge variant="outline">{countSessions(plan)} sesiones</Badge>
            {startDate ? (
              <Badge variant="secondary">
                <CalendarDaysIcon className="mr-1 size-3" />
                {formatDate(startDate)}
              </Badge>
            ) : null}
          </div>
        </div>
        {plan.isSystemTemplate ? <Badge variant="secondary">Base del sistema</Badge> : null}
      </div>

      {weeks.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {weeks.map((week) => (
            <div key={week.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Semana {week.weekNumber}</p>
                <span className="text-xs text-muted-foreground">
                  {countWeekSessions(week)} sesiones
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {[...(week.days ?? [])]
                  .sort((first, second) => (first.dayOrder ?? 0) - (second.dayOrder ?? 0))
                  .map((day) => (
                    <div
                      key={day.id}
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{dayLabels[day.dayOfWeek]}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {day.session?.name ?? "Descanso"}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          description="Este plan no tiene semanas cargadas todavia."
          title="Plan sin estructura"
        />
      )}
    </div>
  );
}
