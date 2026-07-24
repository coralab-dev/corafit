"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: ButtonProps["variant"];
  cancelLabel?: string;
  error?: string;
  children?: ReactNode;
  confirmDisabled?: boolean;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  confirmVariant = "destructive",
  cancelLabel = "Cancelar",
  error,
  children,
  confirmDisabled = false,
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  function handleOpenChange(nextOpen: boolean) {
    if (!canCloseConfirmDialog(isLoading, nextOpen)) {
      return;
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          {error ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={async () => {
              try {
                await onConfirm();
                onOpenChange(false);
              } catch {
                // Keep the dialog open so the caller can show the failure inline.
              }
            }}
            disabled={isLoading || confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function canCloseConfirmDialog(isLoading: boolean, nextOpen: boolean) {
  return !isLoading || nextOpen;
}
