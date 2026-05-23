"use client";

import { ChevronDownIcon, MoreHorizontalIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { statusLabels, typeLabels } from "@/lib/clients/api";
import type { Client, CurrentPlanAssignment, OperationalStatus } from "@/lib/clients/types";
import { EmptyState, LoadingList } from "./empty-loading";

export function ClientList({
  assignmentsByClient,
  clients,
  error,
  isLoading,
  onCreateClient,
  onEditClient,
  onEndPlan,
  onOpenAssignPlan,
  onOpenCurrentPlan,
  onQueryChange,
  onSelectClient,
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
  onOpenAssignPlan: (client: Client) => void;
  onOpenCurrentPlan: (client: Client) => void;
  onQueryChange: (value: string) => void;
  onSelectClient: (clientId: string) => void;
  onStatusFilterChange: (value: OperationalStatus | "all") => void;
  query: string;
  selectedClientId: string;
  statusFilter: OperationalStatus | "all";
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-4">
        <div>
          <CardTitle>Clientes</CardTitle>
          <CardDescription>Busca, filtra y selecciona un cliente para ver su ficha.</CardDescription>
        </div>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Buscar por nombre, telefono u objetivo..."
            />
          </div>
          <div className="relative">
            <select
              aria-label="Filtrar por estado"
              className="h-10 min-w-44 appearance-none rounded-md border bg-background px-3 pr-9 text-sm font-medium shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
              value={statusFilter}
              onChange={(event) =>
                onStatusFilterChange(event.target.value as OperationalStatus | "all")
              }
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="paused">Pausados</option>
              <option value="inactive">Inactivos</option>
              <option value="archived">Archivados</option>
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {error ? (
          <div className="rounded-lg border bg-background p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <LoadingList />
        ) : clients.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pl-4 pr-4 font-medium">Cliente</th>
                  <th className="pb-3 pr-4 font-medium">Tipo</th>
                  <th className="pb-3 pr-4 font-medium">Objetivo</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 pr-4 font-medium">Actividad</th>
                  <th className="pb-3 pr-4 font-medium">Plan</th>
                  <th className="pb-3 pr-4 font-medium">Ultima actividad</th>
                  <th className="pb-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const assignment = assignmentsByClient[client.id];
                  const hasPlan = Boolean(assignment?.assignedPlan);

                  return (
                    <tr
                      key={client.id}
                      className={`cursor-pointer border-b transition-colors hover:bg-muted/50 ${
                        selectedClientId === client.id ? "bg-muted" : ""
                      }`}
                      onClick={() => onSelectClient(client.id)}
                    >
                      <td className="py-3 pl-4 pr-4">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{client.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{client.phone || "Sin telefono"}</p>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs">
                          {typeLabels[client.clientType]}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{client.mainGoal || "-"}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge variant={client.operationalStatus} label={statusLabels[client.operationalStatus]} />
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">-</td>
                      <td className="py-3 pr-4">
                        <StatusBadge
                          variant={hasPlan ? "with-plan" : "no-plan"}
                          label={assignment?.assignedPlan?.name ?? (hasPlan ? "Con plan" : "Sin plan")}
                        />
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">-</td>
                      <td className="py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-label={`Abrir acciones de ${client.name}`}
                              className="size-8"
                              size="icon"
                              variant="ghost"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MoreHorizontalIcon className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-44">
                            <DropdownMenuItem asChild>
                              <Link href={`/clients/${client.id}`}>Ver ficha</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {hasPlan ? (
                              <>
                                <DropdownMenuItem onSelect={() => onOpenCurrentPlan(client)}>
                                  Ver plan actual
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
                              <DropdownMenuItem onSelect={() => onOpenAssignPlan(client)}>
                                Asignar plan
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => onEditClient(client)}>
                              Editar cliente
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/clients/${client.id}/access`}>
                                {client.access?.status === "active" ? "Gestionar acceso" : "Generar acceso"}
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No hay clientes con ese filtro"
            description="Ajusta la busqueda o crea un nuevo cliente."
            actionLabel="Nuevo cliente"
            onAction={onCreateClient}
          />
        )}
      </CardContent>
    </Card>
  );
}
