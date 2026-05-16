"use client";

import {
  AlertCircleIcon,
  DumbbellIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  selectionMode?: "card" | "explicit";
  selectedId?: string;
}

const muscleOptions = Object.entries(muscleLabels) as Array<[PrimaryMuscle, string]>;
const equipmentOptions = Object.entries(equipmentLabels) as Array<[Equipment, string]>;

export function ExerciseSearch({ onSelect, selectionMode = "card", selectedId }: ExerciseSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [primaryMuscle, setPrimaryMuscle] = useState<PrimaryMuscle | "all">("all");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");
  const [type, setType] = useState<ExerciseType>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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

  const { createExercise, error, isLoading, items, total } = useExercises(filters);

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
    <Card className="min-w-0">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Ejercicios</CardTitle>
            <CardDescription>
              Busca ejercicios globales o personalizados para reutilizarlos.
            </CardDescription>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Nuevo ejercicio
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <select
              aria-label="Filtrar por equipamiento"
              className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 md:w-48"
              value={equipment}
              onChange={(event) => setEquipment(event.target.value as Equipment | "all")}
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
              className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 md:w-44"
              value={type}
              onChange={(event) => setType(event.target.value as ExerciseType)}
            >
              <option value="all">Todos</option>
              <option value="global">Global</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Filtrar por musculo">
            <FilterChip
              active={primaryMuscle === "all"}
              label="Todos"
              onClick={() => setPrimaryMuscle("all")}
            />
            {muscleOptions.map(([value, label]) => (
              <FilterChip
                key={value}
                active={primaryMuscle === value}
                label={label}
                onClick={() => setPrimaryMuscle(value)}
              />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>{total} resultados</span>
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
          <div className="flex flex-col gap-2">
            {items.map((exercise) => (
              <ExerciseSearchItem
                key={exercise.id}
                exercise={exercise}
                isSelected={selectedId === exercise.id}
                onSelect={onSelect}
                selectionMode={selectionMode}
              />
            ))}
          </div>
        ) : !error ? (
          <EmptyState onCreate={() => setIsCreateOpen(true)} />
        ) : null}
      </CardContent>
      <ExerciseCreateDialog
        isLoading={isCreating}
        isOpen={isCreateOpen}
        onCreate={handleCreate}
        onOpenChange={setIsCreateOpen}
      />
    </Card>
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
        "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25",
        active ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
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
    <div className="flex items-start gap-3 rounded-lg border bg-background p-4 text-sm text-destructive">
      <AlertCircleIcon aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-lg border bg-background p-6 text-center">
      <DumbbellIcon className="text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="font-semibold">No hay ejercicios con esos filtros</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajusta la busqueda o crea un ejercicio personalizado.
        </p>
      </div>
      <Button variant="outline" onClick={onCreate}>
        <PlusIcon data-icon="inline-start" />
        Nuevo ejercicio
      </Button>
    </div>
  );
}

function ExerciseSkeletonList() {
  return (
    <div className="flex flex-col gap-2" aria-label="Cargando ejercicios">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex items-center gap-3 rounded-lg border bg-background p-3">
          <div className="size-16 rounded-md bg-muted" />
          <div className="flex flex-1 flex-col gap-3">
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
