"use client";

import { AlertTriangleIcon, Loader2Icon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ConfirmActionDialog({
  confirmLabel,
  consequence,
  description,
  errorMessage,
  isLoading,
  onConfirm,
  onOpenChange,
  open,
  title,
}: {
  confirmLabel: string;
  consequence: string;
  description: string;
  errorMessage?: string | null;
  isLoading: boolean;
  onConfirm: () => Promise<boolean>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isLoading && onOpenChange(nextOpen)}>
      <DialogContent className="rounded-2xl border !border-transparent shadow-[var(--surface-shadow)] sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-red-50 text-red-700 dark:bg-red-950/45 dark:text-red-300">
            <AlertTriangleIcon className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <p className="rounded-xl bg-destructive/5 p-3 text-sm text-destructive">
          {consequence}
        </p>
        {errorMessage ? (
          <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            disabled={isLoading}
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            disabled={isLoading}
            type="button"
            variant="destructive"
            onClick={() => {
              void onConfirm().then((didConfirm) => {
                if (didConfirm) {
                  onOpenChange(false);
                }
              });
            }}
          >
            {isLoading ? (
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
