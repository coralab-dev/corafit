"use client";

import { CalendarDaysIcon, DumbbellIcon, Loader2Icon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  type TrainingPlanStatus,
  useTrainingPlans,
} from "@/hooks/use-training-plans";

const statusLabels: Record<TrainingPlanStatus, string> = {
  active: "Activo",
  archived: "Archivado",
  draft: "Draft",
};

const levelLabels: Record<string, string> = {
  advanced: "Avanzado",
  beginner: "Principiante",
  intermediate: "Intermedio",
};

export function TrainingPlansWorkspace() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState<TrainingPlanStatus | "all">("all");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const filters = useMemo(
    () => ({ search: debouncedQuery, status }),
    [debouncedQuery, status],
  );
  const { error, isLoading, items, total } = useTrainingPlans(filters);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1240px] flex-col gap-4 p-4 lg:p-6">
        <header className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-primary">
              <CalendarDaysIcon />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Biblioteca</p>
              <h1 className="text-3xl font-semibold leading-tight">Planes</h1>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Planes de entrenamiento</CardTitle>
                <CardDescription>
                  Edita templates de la organizacion y prepara rutinas para asignacion.
                </CardDescription>
              </div>
              {isLoading ? (
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2Icon className="size-4 animate-spin" />
                  Cargando
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">{total} planes</span>
              )}
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Buscar plan"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <select
                aria-label="Filtrar por estado"
                className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 md:w-44"
                value={status}
                onChange={(event) => setStatus(event.target.value as TrainingPlanStatus | "all")}
              >
                <option value="all">Todos</option>
                <option value="draft">Draft</option>
                <option value="active">Activos</option>
                <option value="archived">Archivados</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {!error && items.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map((plan) => (
                  <Link
                    key={plan.id}
                    className="group rounded-lg border bg-background p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
                    href={`/training-plans/${plan.id}/edit`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{plan.name}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {plan.goal || plan.generalNotes || "Sin objetivo registrado."}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {plan.isSystemTemplate ? (
                          <Badge variant="secondary">Base del sistema</Badge>
                        ) : null}
                        <Badge variant={plan.status === "draft" ? "secondary" : "outline"}>
                          {statusLabels[plan.status]}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                      <span>{plan.durationWeeks} semanas</span>
                      <span>{plan.level ? levelLabels[plan.level] ?? plan.level : "Sin nivel"}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : !error && !isLoading ? (
              <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border bg-background p-6 text-center">
                <DumbbellIcon className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No hay planes para los filtros actuales.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
