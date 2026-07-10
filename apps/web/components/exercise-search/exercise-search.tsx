"use client";

import {
  AlertCircleIcon,
  DumbbellIcon,
  ImageIcon,
  InfoIcon,
  MoreVerticalIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  SearchIcon,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { notify } from "@/lib/notify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  createDialogOpen?: boolean;
  excludedExerciseIds?: string[];
  onSelect?: (exercise: Exercise) => void;
  onCreateDialogOpenChange?: (open: boolean) => void;
  presentation?: "list" | "table";
  reloadToken?: number;
  selectionMode?: "card" | "explicit";
  selectedId?: string;
}

const muscleOptions = Object.entries(muscleLabels) as Array<[PrimaryMuscle, string]>;
const equipmentOptions = Object.entries(equipmentLabels) as Array<[Equipment, string]>;
const exercisePageSize = 8;

export function ExerciseSearch({
  createDialogOpen,
  excludedExerciseIds = [],
  onSelect,
  onCreateDialogOpenChange,
  presentation = "list",
  reloadToken,
  selectionMode = "card",
  selectedId,
}: ExerciseSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [primaryMuscle, setPrimaryMuscle] = useState<PrimaryMuscle | "all">("all");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");
  const [type, setType] = useState<ExerciseType>("all");
  const [internalIsCreateOpen, setInternalIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [page, setPage] = useState(1);
  const didHandleReloadToken = useRef(false);
  const isCreateOpen = createDialogOpen ?? internalIsCreateOpen;
  const setCreateOpen = onCreateDialogOpenChange ?? setInternalIsCreateOpen;

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
  const isRefreshingExercises = isLoading && items.length > 0;
  const selectableItems = useMemo(
    () => items.filter((exercise) => !excludedExerciseIds.includes(exercise.id)),
    [excludedExerciseIds, items],
  );
  const selectableTotal = excludedExerciseIds.length > 0 ? selectableItems.length : total;
  const pageCount = Math.max(1, Math.ceil(selectableItems.length / exercisePageSize));
  const safePage = Math.min(page, pageCount);
  const visibleItems = useMemo(
    () =>
      selectableItems.slice(
        (safePage - 1) * exercisePageSize,
        safePage * exercisePageSize,
      ),
    [safePage, selectableItems],
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

  useEffect(() => {
    if (!isRefreshingExercises) {
      notify.dismiss("exercises-refresh");
      return;
    }

    const timer = window.setTimeout(() => {
      notify.refresh("Actualizando ejercicios", { id: "exercises-refresh" });
    }, 500);

    return () => {
      window.clearTimeout(timer);
      notify.dismiss("exercises-refresh");
    };
  }, [isRefreshingExercises]);

  async function handleCreate(input: Parameters<typeof createExercise>[0]) {
    setIsCreating(true);
    try {
      const exercise = await createExercise(input);
      setCreateOpen(false);
      onSelect?.(exercise);
      notify.success("Ejercicio creado");
    } catch (caughtError) {
      notify.error(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo crear el ejercicio",
      );
      throw caughtError;
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden",
        presentation === "table" &&
          "rounded-2xl border !border-transparent bg-card shadow-[var(--surface-shadow)]",
      )}
    >
      <div
        className={cn(
          "gap-3 bg-card/80 p-3 sm:p-4",
          presentation === "table" ? "border-b border-border/50" : "border-b",
        )}
      >
        {presentation === "list" ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-base font-semibold">Biblioteca</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {total} ejercicios disponibles
              </p>
            </div>
            <Button className="w-full sm:w-auto" size="sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Nuevo ejercicio
            </Button>
          </div>
        ) : null}
        <div className="flex flex-col gap-3">
          <div
            className={cn(
              "grid gap-3 lg:items-center",
              presentation === "table"
                ? "lg:grid-cols-[minmax(260px,1fr)_190px_160px_150px]"
                : "md:grid-cols-[minmax(260px,1fr)_160px_150px]",
            )}
          >
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-11 bg-card pl-10"
                placeholder={presentation === "table" ? "Buscar ejercicios..." : "Buscar por nombre"}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            {presentation === "table" ? (
              <select
                aria-label="Filtrar por músculo principal"
                className="h-11 rounded-xl border bg-card px-3 text-sm shadow-none outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
                value={primaryMuscle}
                onChange={(event) => {
                  setPrimaryMuscle(event.target.value as PrimaryMuscle | "all");
                  setPage(1);
                }}
              >
                <option value="all">Músculo principal</option>
                {muscleOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              aria-label="Filtrar por equipamiento"
              className="h-11 rounded-xl border bg-card px-3 text-sm shadow-none outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
              value={equipment}
              onChange={(event) => {
                setEquipment(event.target.value as Equipment | "all");
                setPage(1);
              }}
            >
              <option value="all">Equipo</option>
              {equipmentOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por origen"
              className={cn(
                "h-11 rounded-xl border bg-card px-3 text-sm shadow-none outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25",
                presentation === "table" && "lg:w-36",
              )}
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
          {presentation === "list" ? (
            <div className="flex items-center gap-2">
              <SlidersHorizontalIcon className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
              <div className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Filtrar por músculo">
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
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-2 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {selectableItems.length
              ? `Mostrando ${(safePage - 1) * exercisePageSize + 1}-${Math.min(
                  safePage * exercisePageSize,
                  selectableItems.length,
                )} de ${selectableTotal} resultados`
              : `${selectableTotal} resultados`}
          </span>
        </div>

        {error ? <ErrorState message={error} /> : null}

        {!error && isLoading && items.length === 0 ? (
          <ExerciseSkeletonList presentation={presentation} />
        ) : !error && selectableItems.length ? (
          <div className="flex flex-col">
            {presentation === "table" ? (
              <ExerciseTable
                exercises={visibleItems}
                selectionMode={selectionMode}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ) : (
              visibleItems.map((exercise) => (
                <ExerciseSearchItem
                  key={exercise.id}
                  exercise={exercise}
                  isSelected={selectedId === exercise.id}
                  onSelect={onSelect}
                  selectionMode={selectionMode}
                />
              ))
            )}
            {pageCount > 1 ? (
              <ExercisePagination
                page={safePage}
                pageCount={pageCount}
                onPageChange={setPage}
              />
            ) : null}
          </div>
        ) : !error ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : null}
      </div>
      <ExerciseCreateDialog
        isLoading={isCreating}
        isOpen={isCreateOpen}
        onCreate={handleCreate}
        onOpenChange={setCreateOpen}
      />
    </section>
  );
}

function ExerciseTable({
  exercises,
  onSelect,
  selectionMode,
  selectedId,
}: {
  exercises: Exercise[];
  onSelect?: (exercise: Exercise) => void;
  selectionMode: "card" | "explicit";
  selectedId?: string;
}) {
  const isExplicit = selectionMode === "explicit";

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border !border-transparent bg-card shadow-[var(--surface-shadow-soft)] lg:block">
        <table className={cn("w-full border-collapse text-left text-sm", !isExplicit && "min-w-[900px]")}>
          <thead>
            <tr className="border-b border-border/55 text-[11px] font-semibold uppercase text-muted-foreground">
              <th className="px-4 py-3">Ejercicio</th>
              <th className="px-4 py-3">Músculo principal</th>
              <th className="px-4 py-3">Equipo</th>
              {!isExplicit ? <th className="px-4 py-3">Origen</th> : null}
              {!isExplicit ? <th className="px-4 py-3">Estado</th> : null}
              {!isExplicit ? <th className="px-4 py-3">Creado el</th> : null}
              <th className="px-4 py-3 text-right">{isExplicit ? "Acción" : "Acciones"}</th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((exercise) => (
              <ExerciseTableRow
                key={exercise.id}
                exercise={exercise}
                isSelected={selectedId === exercise.id}
                onSelect={onSelect}
                selectionMode={selectionMode}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 lg:hidden">
        {exercises.map((exercise) => (
          <ExerciseMobileCard
            key={exercise.id}
            exercise={exercise}
            isSelected={selectedId === exercise.id}
            onSelect={onSelect}
            selectionMode={selectionMode}
          />
        ))}
      </div>
    </>
  );
}

function ExerciseTableRow({
  exercise,
  isSelected,
  onSelect,
  selectionMode,
}: {
  exercise: Exercise;
  isSelected: boolean;
  onSelect?: (exercise: Exercise) => void;
  selectionMode: "card" | "explicit";
}) {
  const isCustom = Boolean(exercise.organizationId);
  const isExplicit = selectionMode === "explicit";

  return (
    <tr
      className={cn(
        "group border-b border-border/45 bg-card transition-colors last:border-b-0 hover:bg-muted/35",
        isSelected && "bg-accent/45 shadow-[inset_3px_0_0_var(--primary)]",
      )}
    >
      <td className="px-4 py-3">
        {isExplicit ? (
          <div className="flex min-w-0 items-center gap-3 text-left">
            <ExerciseThumb exercise={exercise} />
            <span className="min-w-0">
              <span className="block max-w-[190px] truncate font-semibold">
                {exercise.name}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {exercise.videoUrl ? "Video disponible" : "Biblioteca"}
              </span>
            </span>
          </div>
        ) : (
          <button
            className="flex min-w-0 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
            type="button"
            onClick={() => onSelect?.(exercise)}
          >
            <ExerciseThumb exercise={exercise} />
            <span className="min-w-0">
              <span className="block max-w-[190px] truncate font-semibold">
                {exercise.name}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {exercise.videoUrl ? "Video disponible" : "Biblioteca"}
              </span>
            </span>
          </button>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge variant="secondary">{muscleLabels[exercise.primaryMuscle]}</Badge>
      </td>
      <td className="px-4 py-3">
        <Badge variant="muted">{equipmentLabels[exercise.equipment]}</Badge>
      </td>
      {!isExplicit ? <td className="px-4 py-3">
        <Badge variant={isCustom ? "info" : "outline"}>
          {isCustom ? "Personalizado" : "Global"}
        </Badge>
      </td> : null}
      {!isExplicit ? <td className="px-4 py-3">
        <StatusPill status={exercise.status} />
      </td> : null}
      {!isExplicit ? <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
        {formatDate(exercise.createdAt)}
      </td> : null}
      <td className="px-4 py-3">
        {isExplicit ? (
          <div className="flex justify-end">
            <Button size="sm" type="button" onClick={() => onSelect?.(exercise)}>
              <PlusIcon data-icon="inline-start" />
              Agregar
            </Button>
          </div>
        ) : (
          <ExerciseActions exercise={exercise} onSelect={onSelect} />
        )}
      </td>
    </tr>
  );
}

function ExerciseMobileCard({
  exercise,
  isSelected,
  onSelect,
  selectionMode,
}: {
  exercise: Exercise;
  isSelected: boolean;
  onSelect?: (exercise: Exercise) => void;
  selectionMode: "card" | "explicit";
}) {
  const isCustom = Boolean(exercise.organizationId);
  const isExplicit = selectionMode === "explicit";

  return (
    <article
      className={cn(
        "rounded-2xl border !border-transparent bg-card p-3 shadow-[var(--surface-shadow-soft)]",
        isSelected && "bg-accent/45 shadow-[inset_3px_0_0_var(--primary),var(--surface-shadow-soft)]",
      )}
    >
      <div className="flex items-start gap-3">
        <ExerciseThumb exercise={exercise} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {isExplicit ? (
              <div className="min-w-0 text-left">
                <h3 className="truncate text-sm font-semibold">{exercise.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {muscleLabels[exercise.primaryMuscle]} / {equipmentLabels[exercise.equipment]}
                </p>
              </div>
            ) : (
              <button
                className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
                type="button"
                onClick={() => onSelect?.(exercise)}
              >
                <h3 className="truncate text-sm font-semibold">{exercise.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {muscleLabels[exercise.primaryMuscle]} / {equipmentLabels[exercise.equipment]}
                </p>
              </button>
            )}
            {!isExplicit ? (
              <Badge variant={isCustom ? "info" : "outline"}>
                {isCustom ? "Personalizado" : "Global"}
              </Badge>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant="secondary">{muscleLabels[exercise.primaryMuscle]}</Badge>
            <Badge variant="muted">{equipmentLabels[exercise.equipment]}</Badge>
            {!isExplicit ? <StatusPill status={exercise.status} /> : null}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            {isExplicit ? (
              <Button className="w-full" size="sm" type="button" onClick={() => onSelect?.(exercise)}>
                <PlusIcon data-icon="inline-start" />
                Agregar
              </Button>
            ) : (
              <>
                <span className="text-xs text-muted-foreground">
                  Creado {formatDate(exercise.createdAt)}
                </span>
                <ExerciseActions exercise={exercise} onSelect={onSelect} compact />
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function ExerciseThumb({ exercise }: { exercise: Exercise }) {
  return (
    <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground shadow-[var(--surface-shadow-soft)]">
      {exercise.mediaUrl && exercise.mediaType === "image" ? (
        <Image
          alt=""
          className="size-full object-cover"
          height={72}
          loading="lazy"
          src={exercise.mediaUrl}
          unoptimized
          width={72}
        />
      ) : (
        <ImageIcon className="size-5" aria-hidden="true" />
      )}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const isActive = status === "active";

  return (
    <Badge variant={isActive ? "success" : "muted"}>
      <span
        className={cn(
          "mr-1 size-1.5 rounded-full",
          isActive ? "bg-emerald-500" : "bg-muted-foreground",
        )}
      />
      {isActive ? "Activo" : "Inactivo"}
    </Badge>
  );
}

function ExerciseActions({
  compact,
  exercise,
  onSelect,
}: {
  compact?: boolean;
  exercise: Exercise;
  onSelect?: (exercise: Exercise) => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button
        className={cn(
          "size-9 rounded-xl bg-muted/45 p-0 text-foreground shadow-none hover:bg-accent hover:text-primary",
          compact && "size-9",
        )}
        aria-label="Ver detalle"
        size="sm"
        type="button"
        variant="ghost"
        onClick={() => onSelect?.(exercise)}
      >
        <InfoIcon data-icon="inline-start" />
        <span className="sr-only">Ver detalle</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Más acciones"
            className="size-9 rounded-xl bg-muted/35 shadow-none hover:bg-accent hover:text-primary"
            size="icon"
            type="button"
            variant="ghost"
          >
            <MoreVerticalIcon className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-xl border !border-transparent shadow-[var(--surface-shadow-soft)]">
          <DropdownMenuItem onClick={() => onSelect?.(exercise)}>
            <InfoIcon className="size-4" />
            Abrir detalle
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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
          Ajusta la búsqueda o crea un ejercicio personalizado.
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onCreate}>
        <PlusIcon data-icon="inline-start" />
        Nuevo ejercicio
      </Button>
    </div>
  );
}

function ExerciseSkeletonList({ presentation = "list" }: { presentation?: "list" | "table" }) {
  if (presentation === "table") {
    return (
      <div
        className="overflow-hidden rounded-2xl border !border-transparent bg-card shadow-[var(--surface-shadow-soft)]"
        role="status"
        aria-label="Cargando ejercicios"
      >
        <div className="hidden border-b border-border/55 px-4 py-3 lg:grid lg:grid-cols-[1.8fr_1fr_0.85fr_0.8fr_0.8fr_0.9fr_0.5fr] lg:gap-4">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="h-3 rounded-full" />
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="flex items-center gap-3 border-b border-border/45 p-4 last:border-b-0">
            <Skeleton className="size-14 shrink-0 rounded-xl" />
            <div className="grid min-w-0 flex-1 gap-3 lg:grid-cols-[1.8fr_1fr_0.85fr_0.8fr_0.8fr_0.9fr_0.5fr] lg:items-center">
              <div>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="hidden h-7 rounded-full lg:block" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-md border bg-card"
      role="status"
      aria-label="Cargando ejercicios"
    >
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="flex items-center gap-3 border-b bg-background p-3 last:border-b-0">
          <Skeleton className="size-11 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-2/3" />
            <div className="mt-2 flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
          <Skeleton className="hidden h-8 w-20 sm:block" />
        </div>
      ))}
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
