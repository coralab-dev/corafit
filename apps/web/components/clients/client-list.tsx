"use client";

import {
  ChevronDownIcon,
  MoreVerticalIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { initials, statusLabels } from "@/lib/clients/api";
import type {
  Client,
  CurrentPlanAssignment,
  OperationalStatus,
} from "@/lib/clients/types";
import { EmptyState, LoadingList } from "./empty-loading";

const filterOptions: Array<{ label: string; value: OperationalStatus | "all" }> = [
  { label: "Todos", value: "all" },
  { label: "Activos", value: "active" },
  { label: "En pausa", value: "paused" },
  { label: "Inactivos", value: "inactive" },
];

export function ClientList({
  assignmentsByClient,
  clients,
  error,
  isLoading,
  onCreateClient,
  onEditClient,
  onEndPlan,
  onOpenClient,
  onQueryChange,
  onStatusFilterChange,
  query,
  selectedClientId,
  statusFilter,
}: {
  assignmentsByClient: Record<string, CurrentPlanAssignment | null>;
  clients: Client[];
  error: string;
  isLoading: boolean;
  onCreateClient: () => void;
  onEditClient: (client: Client) => void;
  onEndPlan: (client: Client) => void;
  onOpenClient: (clientId: string) => void;
  onQueryChange: (value: string) => void;
  onStatusFilterChange: (value: OperationalStatus | "all") => void;
  query: string;
  selectedClientId: string;
  statusFilter: OperationalStatus | "all";
}) {
  return (
    <section className="min-w-0 bg-card">
      <div className="border-b px-6 py-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_210px_112px]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 rounded-md border-border/90 bg-card pl-11 shadow-none"
              placeholder="Buscar clientes..."
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </div>
          <label className="relative">
            <span className="sr-only">Filtrar por estado</span>
            <select
              className="h-11 w-full appearance-none rounded-md border bg-card px-4 pr-10 text-sm font-medium shadow-none outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
              value={statusFilter}
              onChange={(event) =>
                onStatusFilterChange(event.target.value as OperationalStatus | "all")
              }
            >
              <option value="all">Todos los clientes</option>
              <option value="active">Activos</option>
              <option value="paused">En pausa</option>
              <option value="inactive">Inactivos</option>
              <option value="archived">Archivados</option>
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </label>
          <Button className="h-11 shadow-none" variant="outline">
            <SlidersHorizontalIcon className="size-4" />
            Filtros
          </Button>
        </div>

        <div className="mt-5 flex flex-wrap gap-1.5">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              className={cn(
                "h-8 rounded-md border px-3 text-sm font-medium transition-colors",
                statusFilter === option.value
                  ? "border-primary/45 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
              type="button"
              onClick={() => onStatusFilterChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-5">
        {error ? (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <LoadingList />
        ) : clients.length ? (
          <>
          <div className="space-y-3 md:hidden">
            {clients.map((client) => {
              const assignment = assignmentsByClient[client.id];
              const hasPlan = Boolean(assignment?.assignedPlan);
              const isSelected = selectedClientId === client.id;

              return (
                <article
                  key={client.id}
                  className={cn(
                    "rounded-md border bg-card p-4 shadow-sm transition-colors",
                    isSelected && "border-primary/35 bg-primary/[0.055]",
                  )}
                >
                  <button
                    className="flex w-full items-start gap-3 text-left"
                    type="button"
                    onClick={() => onOpenClient(client.id)}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                      {initials(client.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{client.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {client.phone || "Sin telefono"}
                          </p>
                        </div>
                        <StatusBadge
                          label={statusLabels[client.operationalStatus]}
                          variant={client.operationalStatus}
                        />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Plan</p>
                          <p className="mt-1 line-clamp-1 font-medium">
                            {assignment?.assignedPlan?.name ?? (hasPlan ? "Con plan" : "Sin plan")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Acceso</p>
                          <div className="mt-1">
                            <AccessPill status={client.access?.status ?? "none"} />
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                        {client.mainGoal || "Sin objetivo registrado"}
                      </p>
                    </div>
                  </button>
                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <Button
                      className="h-9 px-3 shadow-none"
                      size="sm"
                      variant="outline"
                      onClick={() => onEditClient(client)}
                    >
                      Editar
                    </Button>
                    <ClientActionsMenu
                      client={client}
                      hasPlan={hasPlan}
                      onEditClient={onEditClient}
                      onEndPlan={onEndPlan}
                    />
                  </div>
                </article>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="px-3 pb-3 font-medium">Cliente</th>
                  <th className="px-3 pb-3 font-medium">Objetivo</th>
                  <th className="px-3 pb-3 font-medium">Plan actual</th>
                  <th className="px-3 pb-3 font-medium">Acceso</th>
                  <th className="px-3 pb-3 font-medium">Estado</th>
                  <th className="w-10 pb-3" aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const assignment = assignmentsByClient[client.id];
                  const hasPlan = Boolean(assignment?.assignedPlan);
                  const isSelected = selectedClientId === client.id;

                  return (
                    <tr
                      key={client.id}
                      className={cn(
                        "group cursor-pointer border-b transition-colors hover:bg-muted/45",
                        isSelected && "bg-primary/[0.075] hover:bg-primary/[0.095]",
                      )}
                      onClick={() => onOpenClient(client.id)}
                    >
                      <td className="px-3 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                            {initials(client.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{client.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {client.phone || "Sin telefono"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-44 px-3 py-3.5 text-muted-foreground">
                        <span className="line-clamp-1">{client.mainGoal || "-"}</span>
                      </td>
                      <td className="max-w-44 px-3 py-3.5">
                        <span className="line-clamp-1 text-foreground">
                          {assignment?.assignedPlan?.name ?? (hasPlan ? "Con plan" : "Sin plan")}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <AccessPill status={client.access?.status ?? "none"} />
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusBadge
                          label={statusLabels[client.operationalStatus]}
                          variant={client.operationalStatus}
                        />
                      </td>
                      <td className="py-3.5">
                        <ClientActionsMenu
                          client={client}
                          hasPlan={hasPlan}
                          onEditClient={onEditClient}
                          onEndPlan={onEndPlan}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <EmptyState
            actionLabel="Nuevo cliente"
            description="Ajusta la busqueda o crea un nuevo cliente."
            title="No hay clientes con ese filtro"
            onAction={onCreateClient}
          />
        )}
      </div>
    </section>
  );
}

function AccessPill({ status }: { status: Client["access"]["status"] }) {
  if (status === "active") {
    return <StatusBadge label="Activo" variant="access-active" />;
  }

  if (status === "temporarily_locked") {
    return <StatusBadge label="Bloqueado" variant="access-pending" />;
  }

  if (status === "disabled") {
    return <StatusBadge label="Desactivado" variant="inactive" />;
  }

  return <StatusBadge label="Sin acceso" variant="no-plan" />;
}

function ClientActionsMenu({
  client,
  hasPlan,
  onEditClient,
  onEndPlan,
}: {
  client: Client;
  hasPlan: boolean;
  onEditClient: (client: Client) => void;
  onEndPlan: (client: Client) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Abrir acciones de ${client.name}`}
          className="size-8 text-muted-foreground shadow-none hover:text-foreground"
          size="icon"
          variant="ghost"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreVerticalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem asChild>
          <Link href={`/clients/${client.id}`}>Ver ficha</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {hasPlan ? (
          <>
            <DropdownMenuItem asChild>
              <Link href={`/clients/${client.id}/plan-assignment/edit`}>
                Ver plan actual
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/clients/${client.id}/plan-assignment/edit`}>
                Editar plan
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEndPlan(client)}>
              Finalizar plan actual
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem asChild>
            <Link href={`/clients/${client.id}/plan-assignment`}>
              Asignar plan
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onEditClient(client)}>
          Editar cliente
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/clients/${client.id}/access`}>
            {client.access?.status === "active"
              ? "Gestionar acceso"
              : "Generar acceso"}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
