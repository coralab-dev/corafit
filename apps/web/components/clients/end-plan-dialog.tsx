"use client";

import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/clients/api";
import type { CurrentPlanAssignment } from "@/lib/clients/types";

export function EndPlanDialog({
  assignment,
  isEnding,
  isOpen,
  onConfirm,
  onOpenChange,
}: {
  assignment: CurrentPlanAssignment | null | undefined;
  isEnding: boolean;
  isOpen: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finalizar plan actual</DialogTitle>
          <DialogDescription>
            Esta accion cerrara la asignacion activa y permitira asignar otro plan al cliente.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-background p-3">
          <p className="text-sm font-semibold">
            {assignment?.assignedPlan?.name ?? "Plan actual"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Inicio: {formatDate(assignment?.assignment.startDate) ?? "Sin fecha"}
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!assignment || isEnding}
            type="button"
            variant="destructive"
            onClick={onConfirm}
          >
            {isEnding ? <Loader2Icon data-icon="inline-start" /> : null}
            Finalizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
