"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { CurrentPlanAssignment } from "@/lib/clients/types";
import { EmptyState } from "./empty-loading";
import { PlanPreview } from "./assign-plan-dialog";

export function CurrentPlanSheet({
  assignment,
  isOpen,
  onOpenChange,
}: {
  assignment: CurrentPlanAssignment | null | undefined;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{assignment?.assignedPlan?.name ?? "Plan actual"}</SheetTitle>
          <SheetDescription>
            Vista de la copia asignada al cliente. La edicion avanzada queda fuera de este flujo.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-4">
          {assignment?.assignedPlan ? (
            <PlanPreview
              plan={assignment.assignedPlan}
              startDate={assignment.assignment.startDate}
            />
          ) : (
            <EmptyState
              description="Este cliente no tiene una asignacion activa."
              title="Sin plan asignado"
            />
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
