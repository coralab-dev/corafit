"use client";

import {
  AlertTriangleIcon,
  ArchiveIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClipboardIcon,
  DumbbellIcon,
  EditIcon,
  EyeIcon,
  KeyRoundIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldOffIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Control, UseFormReturn } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { countSessions, countWeekSessions, dayLabels, formatDate, initials, levelLabels, statusLabels, typeLabels } from "@/lib/clients/api";
import type { ClientFormValues } from "@/lib/clients/api";
import type { ApiConfig, Client, CurrentPlanAssignment, OperationalStatus, TrainingPlan } from "@/lib/clients/types";

export function ClientList({
  assignmentsByClient,
  clients,
  error,
  isLoading,
  onCreateClient,
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
  onQueryChange: (value: string) => void;
  onSelectClient: (clientId: string) => void;
  onStatusFilterChange: (value: OperationalStatus | "all") => void;
  query: string;
  selectedClientId: string;
  statusFilter: OperationalStatus | "all";
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Lista</CardTitle>
        <CardDescription>Busqueda, filtro y estados operativos.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row xl:flex-col 2xl:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Buscar por nombre u objetivo"
            />
          </div>
          <select
            aria-label="Filtrar por estado"
            className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
            value={statusFilter}
            onChange={(event) =>
              onStatusFilterChange(event.target.value as OperationalStatus | "all")
            }
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="paused">Pausados</option>
            <option value="inactive">Inactivos</option>
            <option value="archived">Archivados</option>
          </select>
        </div>

        {error ? (
          <div className="rounded-lg border bg-background p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <LoadingList />
        ) : clients.length ? (
          <div className="flex flex-col gap-2">
            {clients.map((client) => (
              <button
                key={client.id}
                className={`rounded-lg border p-3 text-left transition-colors hover:bg-muted ${
                  selectedClientId === client.id ? "bg-muted" : "bg-background"
                }`}
                onClick={() => onSelectClient(client.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{client.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {client.mainGoal} / {typeLabels[client.clientType]}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusPill status={client.operationalStatus} />
                    <PlanStatusIndicator
                      assignment={assignmentsByClient[client.id]}
                      isKnown={client.id in assignmentsByClient}
                    />
                  </div>
                </div>
              </button>
            ))}
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

export function ClientDetail({
  assignment,
  client,
  isPlanLoading,
  onCopyAccess,
  onDisableAccess,
  onEndPlan,
  onEdit,
  onGenerateAccess,
  onOpenAssignPlan,
  onOpenCurrentPlan,
  onStatusChange,
}: {
  assignment: CurrentPlanAssignment | null | undefined;
  client: Client;
  isPlanLoading: boolean;
  onCopyAccess: (link: string | undefined) => void;
  onDisableAccess: (clientId: string) => void;
  onEndPlan: () => void;
  onEdit: (client: Client) => void;
  onGenerateAccess: (clientId: string) => void;
  onOpenAssignPlan: () => void;
  onOpenCurrentPlan: () => void;
  onStatusChange: (clientId: string, status: OperationalStatus) => void;
}) {
  const [isAccessOpen, setIsAccessOpen] = useState(false);
  const hasActivePlan = Boolean(assignment?.assignedPlan);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold text-primary">
              {initials(client.name)}
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-2xl">{client.name}</CardTitle>
              <CardDescription>
                {client.mainGoal} / {typeLabels[client.clientType]}
              </CardDescription>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusPill status={client.operationalStatus} />
                <Badge variant={hasActivePlan ? "default" : "secondary"}>
                  {hasActivePlan ? "Plan activo" : "Sin plan asignado"}
                </Badge>
                <span className="rounded-full border px-3 py-1 text-xs">
                  {client.canRegisterWeight ? "Peso habilitado" : "Peso por coach"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => onEdit(client)}>
              <EditIcon data-icon="inline-start" />
              Editar
            </Button>
            {hasActivePlan ? (
              <Button variant="outline" onClick={onOpenCurrentPlan}>
                <EyeIcon data-icon="inline-start" />
                Ver plan actual
              </Button>
            ) : (
              <Button onClick={onOpenAssignPlan}>
                <DumbbellIcon data-icon="inline-start" />
                Asignar plan
              </Button>
            )}
            <Sheet open={isAccessOpen} onOpenChange={setIsAccessOpen}>
              <Button onClick={() => setIsAccessOpen(true)}>
                <KeyRoundIcon data-icon="inline-start" />
                Acceso
              </Button>
              <SheetContent className="flex flex-col">
                <SheetHeader>
                  <SheetTitle>Acceso del cliente</SheetTitle>
                  <SheetDescription>
                    Link privado, PIN temporal y acciones de seguridad.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-4">
                  <AccessPanel
                    client={client}
                    onCopyAccess={onCopyAccess}
                    onDisableAccess={onDisableAccess}
                    onGenerateAccess={onGenerateAccess}
                  />
                </div>
                <SheetFooter>
                  <Button variant="outline" onClick={() => setIsAccessOpen(false)}>
                    Cerrar
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard label="Edad" value={`${client.age} anos`} />
        <InfoCard label="Altura" value={`${client.heightCm} cm`} />
        <InfoCard label="Peso inicial" value={`${client.initialWeightKg} kg`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ficha operativa</CardTitle>
          <CardDescription>Datos base, notas y acciones de estado.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="datos">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="datos">Datos</TabsTrigger>
              <TabsTrigger value="plan">Plan actual</TabsTrigger>
              <TabsTrigger value="notas">Notas</TabsTrigger>
              <TabsTrigger value="estado">Estado</TabsTrigger>
            </TabsList>
            <TabsContent value="datos" className="mt-4">
              <div className="grid gap-3 md:grid-cols-2">
                <DetailRow label="Telefono" value={client.phone || "Sin telefono"} />
                <DetailRow label="Sexo" value={client.sex || "No especificado"} />
                <DetailRow label="Nivel" value={client.trainingLevel || "Sin nivel"} />
                <DetailRow label="Tipo" value={typeLabels[client.clientType]} />
              </div>
            </TabsContent>
            <TabsContent value="plan" className="mt-4">
              <CurrentPlanPanel
                assignment={assignment}
                isLoading={isPlanLoading}
                onEndPlan={onEndPlan}
                onOpenAssignPlan={onOpenAssignPlan}
                onOpenCurrentPlan={onOpenCurrentPlan}
              />
            </TabsContent>
            <TabsContent value="notas" className="mt-4">
              <div className="grid gap-3">
                <DetailBlock label="Lesiones" value={client.injuriesNotes || "Sin lesiones registradas"} />
                <DetailBlock label="Notas generales" value={client.generalNotes || "Sin notas generales"} />
              </div>
            </TabsContent>
            <TabsContent value="estado" className="mt-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => onStatusChange(client.id, "active")}>
                  <CheckCircle2Icon data-icon="inline-start" />
                  Activar
                </Button>
                <Button variant="outline" onClick={() => onStatusChange(client.id, "paused")}>
                  <Loader2Icon data-icon="inline-start" />
                  Pausar
                </Button>
                <Button variant="outline" onClick={() => onStatusChange(client.id, "archived")}>
                  <ArchiveIcon data-icon="inline-start" />
                  Archivar
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export function CurrentPlanPanel({
  assignment,
  isLoading,
  onEndPlan,
  onOpenAssignPlan,
  onOpenCurrentPlan,
}: {
  assignment: CurrentPlanAssignment | null | undefined;
  isLoading: boolean;
  onEndPlan: () => void;
  onOpenAssignPlan: () => void;
  onOpenCurrentPlan: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-44 items-center justify-center rounded-lg border bg-background p-6 text-sm text-muted-foreground">
        <Loader2Icon className="mr-2 size-4 animate-spin" />
        Cargando plan actual
      </div>
    );
  }

  if (!assignment?.assignedPlan) {
    return (
      <EmptyState
        actionLabel="Asignar plan"
        description="Selecciona un template y crea una copia editable para este cliente."
        title="Sin plan asignado"
        onAction={onOpenAssignPlan}
      />
    );
  }

  const totalSessions = countSessions(assignment.assignedPlan);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="rounded-lg border bg-background p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Plan actual</p>
            <p className="mt-1 truncate text-lg font-semibold">
              {assignment.assignedPlan.name}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Inicio: {formatDate(assignment.assignment.startDate) ?? "Sin fecha"}
            </p>
          </div>
          <Badge>Activo</Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <DetailRow
            label="Duracion"
            value={`${assignment.assignedPlan.durationWeeks} semanas`}
          />
          <DetailRow label="Sesiones" value={`${totalSessions} programadas`} />
          <DetailRow label="Progreso" value={`0 / ${totalSessions}`} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Button className="w-full" variant="outline" onClick={onOpenCurrentPlan}>
          <EyeIcon data-icon="inline-start" />
          Ver plan actual
        </Button>
        <Button className="w-full" variant="outline" onClick={onEndPlan}>
          <ArchiveIcon data-icon="inline-start" />
          Finalizar plan actual
        </Button>
      </div>
    </div>
  );
}

export function AccessPanel({
  client,
  onCopyAccess,
  onDisableAccess,
  onGenerateAccess,
}: {
  client: Client;
  onCopyAccess: (link: string | undefined) => void;
  onDisableAccess: (clientId: string) => void;
  onGenerateAccess: (clientId: string) => void;
}) {
  const isActive = client.access.status === "active";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isActive ? <KeyRoundIcon /> : <ShieldOffIcon />}
          {isActive ? "Acceso activo" : "Sin acceso activo"}
        </CardTitle>
        <CardDescription>
          {client.access.updatedAt ? `Ultimo cambio: ${client.access.updatedAt}` : "Aun no generado"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isActive ? (
          <>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">Link privado</p>
              <p className="mt-1 break-all text-sm font-medium">{client.access.link}</p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">PIN visible solo al generar</p>
              <p className="mt-1 text-2xl font-semibold tracking-normal">{client.access.pin}</p>
            </div>
          </>
        ) : (
          <EmptyState
            title={client.access.status === "disabled" ? "Acceso desactivado" : "Acceso pendiente"}
            description="Genera un link + PIN para que el cliente entre al portal."
          />
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2 sm:flex-row">
        <Button className="w-full" onClick={() => onGenerateAccess(client.id)}>
          <RefreshCwIcon data-icon="inline-start" />
          {isActive ? "Regenerar" : "Generar"}
        </Button>
        <Button
          className="w-full"
          variant="outline"
          disabled={!isActive}
          onClick={() => onCopyAccess(client.access.link)}
        >
          <ClipboardIcon data-icon="inline-start" />
          Copiar
        </Button>
        <Button
          className="w-full"
          variant="outline"
          disabled={!isActive}
          onClick={() => onDisableAccess(client.id)}
        >
          <ShieldOffIcon data-icon="inline-start" />
          Desactivar
        </Button>
      </CardFooter>
    </Card>
  );
}

export function AssignPlanDialog({
  error,
  isAssigning,
  isLoadingPlans,
  isLoadingPreview,
  isOpen,
  plans,
  previewError,
  previewPlan,
  selectedPlanId,
  startDate,
  onAssign,
  onOpenChange,
  onPlanChange,
  onStartDateChange,
}: {
  error: string;
  isAssigning: boolean;
  isLoadingPlans: boolean;
  isLoadingPreview: boolean;
  isOpen: boolean;
  plans: TrainingPlan[];
  previewError: string;
  previewPlan: TrainingPlan | null;
  selectedPlanId: string;
  startDate: string;
  onAssign: () => void;
  onOpenChange: (open: boolean) => void;
  onPlanChange: (planId: string) => void;
  onStartDateChange: (value: string) => void;
}) {
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Asignar plan</DialogTitle>
          <DialogDescription>
            Selecciona un template, revisa la semana y confirma la copia editable.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="plan-selector">
                Template
              </label>
              <select
                id="plan-selector"
                className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
                disabled={isLoadingPlans || !plans.length}
                value={selectedPlanId}
                onChange={(event) => onPlanChange(event.target.value)}
              >
                {plans.length ? (
                  plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))
                ) : (
                  <option value="">Sin templates activos</option>
                )}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="assignment-start-date">
                Fecha de inicio
              </label>
              <Input
                id="assignment-start-date"
                type="date"
                value={startDate}
                onChange={(event) => onStartDateChange(event.target.value)}
              />
            </div>

            {selectedPlan ? (
              <div className="rounded-lg border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{selectedPlan.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedPlan.durationWeeks} semanas /{" "}
                      {selectedPlan.level
                        ? levelLabels[selectedPlan.level] ?? selectedPlan.level
                        : "Sin nivel"}
                    </p>
                  </div>
                  {selectedPlan.isSystemTemplate ? (
                    <Badge variant="secondary">Base</Badge>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="min-w-0 rounded-lg border bg-background p-4">
            {isLoadingPreview ? (
              <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground">
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Cargando vista previa
              </div>
            ) : previewError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {previewError}
              </div>
            ) : previewPlan ? (
              <PlanPreview plan={previewPlan} startDate={startDate} />
            ) : (
              <EmptyState
                description="Necesitas al menos un template activo para asignarlo."
                title="Sin vista previa"
              />
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          Al confirmar se creara una copia editable para este cliente. El template
          original no se modificara.
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!selectedPlanId || isAssigning || isLoadingPreview}
            type="button"
            onClick={onAssign}
          >
            {isAssigning ? <Loader2Icon data-icon="inline-start" /> : null}
            Asignar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CurrentPlanSheet({
  assignment,
  isOpen,
  onOpenChange,
}: {
  assignment: CurrentPlanAssignment | null | undefined;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{assignment?.assignedPlan?.name ?? "Plan actual"}</SheetTitle>
          <SheetDescription>
            Vista de la copia asignada al cliente. La edicion avanzada queda fuera de este flujo.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-4">
          {assignment?.assignedPlan ? (
            <PlanPreview
              plan={assignment.assignedPlan}
              startDate={assignment.assignment.startDate}
            />
          ) : (
            <EmptyState
              description="Este cliente no tiene una asignacion activa."
              title="Sin plan asignado"
            />
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

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

export function ClientFormDialog({
  form,
  isLoading,
  isOpen,
  mode,
  onOpenChange,
  onSubmit,
}: {
  form: UseFormReturn<ClientFormValues>;
  isLoading: boolean;
  isOpen: boolean;
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ClientFormValues) => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nuevo cliente" : "Editar cliente"}</DialogTitle>
          <DialogDescription>
            Captura los datos minimos para operar el seguimiento del cliente.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField control={form.control} name="name" label="Nombre" />
              <TextField control={form.control} name="phone" label="Telefono" />
              <TextField control={form.control} name="age" label="Edad" type="number" />
              <TextField control={form.control} name="sex" label="Sexo" />
              <SelectField
                control={form.control}
                label="Tipo"
                name="clientType"
                options={[
                  ["online", "Online"],
                  ["presential", "Presencial"],
                  ["hybrid", "Hibrido"],
                ]}
              />
              <TextField control={form.control} name="trainingLevel" label="Nivel" />
              <TextField control={form.control} name="heightCm" label="Altura cm" type="number" />
              <TextField
                control={form.control}
                name="initialWeightKg"
                label="Peso inicial kg"
                type="number"
              />
            </div>
            <TextField control={form.control} name="mainGoal" label="Objetivo principal" />
            <TextField control={form.control} name="injuriesNotes" label="Lesiones" />
            <TextField control={form.control} name="generalNotes" label="Notas generales" />
            <FormField
              control={form.control}
              name="canRegisterWeight"
              render={({ field }) => (
                <FormItem className="rounded-lg border bg-background p-3">
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <input
                        checked={field.value}
                        className="size-4"
                        type="checkbox"
                        onChange={(event) => field.onChange(event.target.checked)}
                      />
                    </FormControl>
                    <FormLabel>Permitir que el cliente registre peso</FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2Icon data-icon="inline-start" /> : null}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function ApiConfigDialog({
  config,
  isOpen,
  onClear,
  onOpenChange,
  onSave,
}: {
  config: ApiConfig;
  isOpen: boolean;
  onClear: () => void;
  onOpenChange: (open: boolean) => void;
  onSave: (config: ApiConfig) => void;
}) {
  const [draft, setDraft] = useState(config);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conexion al API</DialogTitle>
          <DialogDescription>
            Usa un JWT real de Supabase y el ID de organizacion para llamar endpoints protegidos.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="api-url">
              API URL
            </label>
            <Input
              id="api-url"
              value={draft.apiUrl}
              onChange={(event) => setDraft({ ...draft, apiUrl: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="organization-id">
              Organization ID
            </label>
            <Input
              id="organization-id"
              value={draft.organizationId}
              onChange={(event) =>
                setDraft({ ...draft, organizationId: event.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="bearer-token">
              Supabase JWT
            </label>
            <Input
              id="bearer-token"
              value={draft.bearerToken}
              onChange={(event) =>
                setDraft({ ...draft, bearerToken: event.target.value })
              }
              placeholder="eyJ..."
              type="password"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClear}>
            Limpiar
          </Button>
          <Button type="button" onClick={() => onSave(draft)}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TextField({
  control,
  label,
  name,
  type = "text",
}: {
  control: Control<ClientFormValues>;
  label: string;
  name: keyof ClientFormValues & string;
  type?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              type={type}
              value={String(field.value ?? "")}
              onChange={(event) =>
                field.onChange(
                  type === "number" ? event.target.valueAsNumber : event.target.value,
                )
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function SelectField({
  control,
  label,
  name,
  options,
}: {
  control: Control<ClientFormValues>;
  label: string;
  name: keyof ClientFormValues & string;
  options: Array<[string, string]>;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
              value={String(field.value)}
              onChange={field.onChange}
            >
              {options.map(([value, optionLabel]) => (
                <option key={value} value={value}>
                  {optionLabel}
                </option>
              ))}
            </select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function PlanPreview({ plan, startDate }: { plan: TrainingPlan; startDate: string }) {
  const weeks = [...(plan.weeks ?? [])].sort(
    (first, second) => first.weekNumber - second.weekNumber,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{plan.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {plan.goal || plan.generalNotes || "Sin objetivo registrado."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline">{plan.durationWeeks} semanas</Badge>
            <Badge variant="outline">{countSessions(plan)} sesiones</Badge>
            {startDate ? (
              <Badge variant="secondary">
                <CalendarDaysIcon className="mr-1 size-3" />
                {formatDate(startDate)}
              </Badge>
            ) : null}
          </div>
        </div>
        {plan.isSystemTemplate ? <Badge variant="secondary">Base del sistema</Badge> : null}
      </div>

      {weeks.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {weeks.map((week) => (
            <div key={week.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Semana {week.weekNumber}</p>
                <span className="text-xs text-muted-foreground">
                  {countWeekSessions(week)} sesiones
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {[...(week.days ?? [])]
                  .sort((first, second) => (first.dayOrder ?? 0) - (second.dayOrder ?? 0))
                  .map((day) => (
                    <div
                      key={day.id}
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{dayLabels[day.dayOfWeek]}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {day.session?.name ?? "Descanso"}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          description="Este plan no tiene semanas cargadas todavia."
          title="Plan sin estructura"
        />
      )}
    </div>
  );
}

export function NavItem({
  active,
  href,
  icon: Icon,
  label,
}: {
  active?: boolean;
  href?: string;
  icon: typeof UsersIcon;
  label: string;
}) {
  const className = `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
    active ? "bg-muted font-semibold text-primary" : "text-muted-foreground"
  }`;

  if (href) {
    return (
      <Link className={className} href={href}>
        <Icon />
        {label}
      </Link>
    );
  }

  return (
    <div className={className}>
      <Icon />
      {label}
    </div>
  );
}

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

export function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-sm text-muted-foreground">{value}</p>
    </div>
  );
}

export function StatusPill({ status }: { status: OperationalStatus }) {
  return (
    <span className="rounded-full border bg-background px-3 py-1 text-xs">
      {statusLabels[status]}
    </span>
  );
}

export function PlanStatusIndicator({
  assignment,
  isKnown,
}: {
  assignment: CurrentPlanAssignment | null | undefined;
  isKnown: boolean;
}) {
  if (!isKnown) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-xs text-muted-foreground">
        <Loader2Icon className="size-3 animate-spin" />
        Plan
      </span>
    );
  }

  if (assignment?.assignedPlan) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-xs text-primary">
        <CheckCircle2Icon className="size-3" />
        Con plan
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-xs text-muted-foreground">
      <AlertTriangleIcon className="size-3" />
      Sin plan
    </span>
  );
}

export function EmptyState({
  actionLabel,
  description,
  onAction,
  title,
}: {
  actionLabel?: string;
  description: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border bg-background p-6 text-center">
      <UserRoundIcon className="text-muted-foreground" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <Button variant="outline" onClick={onAction}>
          <PlusIcon data-icon="inline-start" />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingList() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-lg border bg-background p-3">
          <div className="h-4 w-2/3 rounded bg-muted" />
          <div className="mt-3 h-3 w-1/2 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
