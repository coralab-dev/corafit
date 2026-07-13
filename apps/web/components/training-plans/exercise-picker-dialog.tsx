"use client";

import { Loader2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { ExerciseSearch } from "@/components/exercise-search";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Exercise } from "@/hooks/use-exercises";
import { cn } from "@/lib/utils";

export function ExercisePickerDialog({
  excludedExerciseIds,
  mode = "exercise",
  onOpenChange,
  onSelect,
  open,
  sessionName,
}: {
  excludedExerciseIds?: string[];
  mode?: "exercise" | "alternative" | "replace";
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: Exercise) => Promise<boolean>;
  open: boolean;
  sessionName: string;
}) {
  const [selectedId, setSelectedId] = useState<string>();
  const [isSelecting, setIsSelecting] = useState(false);
  const isSelectingRef = useRef(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isSelecting) {
          return;
        }
        if (!nextOpen) {
          setSelectedId(undefined);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="flex h-[calc(100dvh-2rem)] max-h-[56rem] flex-col gap-0 overflow-hidden rounded-2xl border !border-transparent bg-background p-0 shadow-[var(--surface-shadow)] sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b px-5 py-5 pr-14">
          <div className="flex items-center gap-3">
            <DialogTitle>Biblioteca de ejercicios</DialogTitle>
            {isSelecting ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
                <Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
                {mode === "replace" ? "Reemplazando" : "Agregando"}
              </span>
            ) : null}
          </div>
          <DialogDescription>
            {mode === "alternative"
              ? `Agregar alternativa en ${sessionName}. Busca un ejercicio global o personalizado.`
              : mode === "replace"
                ? `Reemplazar ejercicio en ${sessionName}. Busca un ejercicio global o personalizado.`
                : `Agregar ejercicio a ${sessionName}. Busca un ejercicio global o personalizado.`}
          </DialogDescription>
        </DialogHeader>
        <div
          aria-busy={isSelecting}
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 transition-opacity sm:p-4",
            isSelecting && "pointer-events-none opacity-70",
          )}
        >
          <ExerciseSearch
            excludedExerciseIds={excludedExerciseIds}
            presentation="table"
            selectedId={selectedId}
            selectionMode="explicit"
            onSelect={(exercise) => {
              if (isSelectingRef.current) {
                return;
              }

              isSelectingRef.current = true;
              setSelectedId(exercise.id);
              setIsSelecting(true);
              void (async () => {
                try {
                  const didSelect = await onSelect(exercise);
                  if (didSelect) {
                    setSelectedId(undefined);
                    onOpenChange(false);
                  }
                } finally {
                  isSelectingRef.current = false;
                  setIsSelecting(false);
                }
              })();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
