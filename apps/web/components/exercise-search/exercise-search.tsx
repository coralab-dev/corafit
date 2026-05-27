"use client";

import {
  AlertCircleIcon,
  DumbbellIcon,
  Loader2Icon,
  PlusIcon,
  SlidersHorizontalIcon,
  SearchIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  type Equipment,
  type Exercise,
  type ExerciseType,
  type PrimaryMuscle,
  useExercises,
} from "@/hooks/use-exercises";
import { ExerciseCreateDialog } from "./exercise-create-dialog";
import { ExerciseSearchItem, equipmentLabels, muscleLabels } from "./exercise-search-item";

export interface ExerciseSearchProps {
  onSelect?: (exercise: Exercise) => void;
  reloadToken?: number;
  selectionMode?: "card" | "explicit";
  selectedId?: string;
}

const muscleOptions = Object.entries(muscleLabels) as Array<[PrimaryMuscle, string]>;
const equipmentOptions = Object.entries(equipmentLabels) as Array<[Equipment, string]>;
const exercisePageSize = 8;

export function ExerciseSearch({
  onSelect,
  reloadToken,
  selectionMode = "card",
  selectedId,
}: ExerciseSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [primaryMuscle, setPrimaryMuscle] = useState<PrimaryMuscle | "all">("all");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");
  const [type, setType] = useState<ExerciseType>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [page, setPage] = useState(1);
  const didHandleReloadToken = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  const filters = useMemo(
    () => ({
      equipment,
      primaryMuscle,
      search: debouncedQuery,
      type,
    }),
    [debouncedQuery, equipment, primaryMuscle, type],
  );

  const { createExercise, error, isLoading, items, refresh, total } = useExercises(filters);
  const pageCount = Math.max(1, Math.ceil(items.length / exercisePageSize));
  const safePage = Math.min(page, pageCount);
  const visibleItems = useMemo(
    () =>
      items.slice(
        (safePage - 1) * exercisePageSize,
        safePage * exercisePageSize,
      ),
    [items, safePage],
  );

  useEffect(() => {
    if (reloadToken === undefined) {
      return;
    }

    if (!didHandleReloadToken.current) {
      didHandleReloadToken.current = true;
      return;
    }

    void refresh();
  }, [refresh, reloadToken]);

  async function handleCreate(input: Parameters<typeof createExercise>[0]) {
    setIsCreating(true);
    try {
      const exercise = await createExercise(input);
      setIsCreateOpen(false);
      onSelect?.(exercise);
      toast.success("Ejercicio creado");
    } catch (caughtError) {
      toast.error(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo crear el ejercicio",
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section className="min-w-0 overflow-hidden">
      <div className="gap-3 border-b bg-card/80 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-base font-semibold">Biblioteca</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {total} ejercicios disponibles
            </p>
          </div>
          <Button className="w-full sm:w-auto" size="sm" onClick={() => setIsCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Nuevo ejercicio
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 bg-background pl-10"
                placeholder="Buscar por nombre"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:w-[19rem]">
              <select
                aria-label="Filtrar por equipamiento"
                className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
                value={equipment}
                onChange={(event) => {
                  setEquipment(event.target.value as Equipment | "all");
                  setPage(1);
                }}
              >
                <option value="all">Todo equipo</option>
                {equipmentOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filtrar por tipo"
                className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
                value={type}
                onChange={(event) => {
                  setType(event.target.value as ExerciseType);
                  setPage(1);
                }}
              >
                <option value="all">Todos</option>
                <option value="global">Global</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontalIcon className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
            <div className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Filtrar por musculo">
              <FilterChip
                active={primaryMuscle === "all"}
                label="Todos"
                onClick={() => {
                  setPrimaryMuscle("all");
                  setPage(1);
                }}
              />
              {muscleOptions.map(([value, label]) => (
                <FilterChip
                  key={value}
                  active={primaryMuscle === value}
                  label={label}
                  onClick={() => {
                    setPrimaryMuscle(value);
                    setPage(1);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {items.length
              ? `Mostrando ${(safePage - 1) * exercisePageSize + 1}-${Math.min(
                  safePage * exercisePageSize,
                  items.length,
                )} de ${total} resultados`
              : `${total} resultados`}
          </span>
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2Icon aria-hidden="true" />
              Cargando
            </span>
          ) : null}
        </div>

        {error ? <ErrorState message={error} /> : null}

        {!error && isLoading && items.length === 0 ? (
          <ExerciseSkeletonList />
        ) : !error && items.length ? (
          <div className="flex flex-col">
            {visibleItems.map((exercise) => (
              <ExerciseSearchItem
                key={exercise.id}
                exercise={exercise}
                isSelected={selectedId === exercise.id}
                onSelect={onSelect}
                selectionMode={selectionMode}
              />
            ))}
            {pageCount > 1 ? (
              <ExercisePagination
                page={safePage}
                pageCount={pageCount}
                onPageChange={setPage}
              />
            ) : null}
          </div>
        ) : !error ? (
          <EmptyState onCreate={() => setIsCreateOpen(true)} />
        ) : null}
      </div>
      <ExerciseCreateDialog
        isLoading={isCreating}
        isOpen={isCreateOpen}
        onCreate={handleCreate}
        onOpenChange={setIsCreateOpen}
      />
    </section>
  );
}

function ExercisePagination({
  onPageChange,
  page,
  pageCount,
}: {
  onPageChange: (page: number) => void;
  page: number;
  pageCount: number;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
      <Button
        disabled={page === 1}
        size="sm"
        type="button"
        variant="outline"
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        Anterior
      </Button>
      <div className="flex flex-wrap items-center gap-1">
        {Array.from({ length: pageCount }, (_, index) => index + 1).map(
          (pageNumber) => (
            <Button
              key={pageNumber}
              aria-current={pageNumber === page ? "page" : undefined}
              className="size-8"
              size="icon"
              type="button"
              variant={pageNumber === page ? "default" : "outline"}
              onClick={() => onPageChange(pageNumber)}
            >
              {pageNumber}
            </Button>
          ),
        )}
      </div>
      <Button
        disabled={page === pageCount}
        size="sm"
        type="button"
        variant="outline"
        onClick={() => onPageChange(Math.min(pageCount, page + 1))}
      >
        Siguiente
      </Button>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "shrink-0 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      role="listitem"
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-background p-6 text-center">
      <DumbbellIcon className="size-8 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="font-semibold">No hay ejercicios con esos filtros</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajusta la busqueda o crea un ejercicio personalizado.
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onCreate}>
        <PlusIcon data-icon="inline-start" />
        Nuevo ejercicio
      </Button>
    </div>
  );
}

function ExerciseSkeletonList() {
  return (
    <div className="flex flex-col" aria-label="Cargando ejercicios">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex items-center gap-3 border-b bg-background p-2.5 last:border-b-0">
          <div className="size-11 rounded-md bg-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="flex gap-2">
              <Badge variant="muted"> </Badge>
              <Badge variant="outline"> </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
