"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ActivityIcon,
  ArchiveIcon,
  CheckCircle2Icon,
  ClipboardIcon,
  DumbbellIcon,
  EditIcon,
  KeyRoundIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldOffIcon,
  SmartphoneIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { type Control, type UseFormReturn, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ClientType = "online" | "presential" | "hybrid";
type OperationalStatus = "active" | "paused" | "inactive" | "archived";
type AccessStatus = "none" | "active" | "disabled" | "temporarily_locked";

type ClientAccess = {
  id?: string;
  lastAccessAt?: string | null;
  lockedUntil?: string | null;
  status: AccessStatus;
  link?: string;
  pin?: string;
  updatedAt?: string;
};

type Client = {
  id: string;
  name: string;
  phone: string;
  age: number;
  sex: string;
  clientType: ClientType;
  mainGoal: string;
  heightCm: number;
  initialWeightKg: number;
  trainingLevel: string;
  injuriesNotes: string;
  generalNotes: string;
  canRegisterWeight: boolean;
  operationalStatus: OperationalStatus;
  access: ClientAccess;
};

type ClientsResponse = {
  items: Array<Omit<Client, "access">>;
  limit: number;
  page: number;
  total: number;
};

type ApiConfig = {
  apiUrl: string;
  bearerToken: string;
  organizationId: string;
};

const clientSchema = z.object({
  name: z.string().trim().min(2, "Nombre requerido"),
  phone: z.string().trim().optional(),
  age: z.number().int().positive("Edad invalida").max(100).optional(),
  sex: z.string().trim().optional(),
  clientType: z.enum(["online", "presential", "hybrid"]),
  mainGoal: z.string().trim().min(3, "Objetivo requerido"),
  heightCm: z.number().positive("Altura requerida"),
  initialWeightKg: z.number().positive("Peso requerido"),
  trainingLevel: z.string().trim().optional(),
  injuriesNotes: z.string().trim().optional(),
  generalNotes: z.string().trim().optional(),
  canRegisterWeight: z.boolean(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

const apiConfigStorageKey = "corafit_api_config";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function hasStoredApiConfig() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.localStorage.getItem(apiConfigStorageKey));
}

function getInitialApiConfig(): ApiConfig {
  const fallback = {
    apiUrl: apiBaseUrl,
    bearerToken: "",
    organizationId: "",
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  const storedConfig = window.localStorage.getItem(apiConfigStorageKey);
  if (!storedConfig) {
    return fallback;
  }

  try {
    return { ...fallback, ...JSON.parse(storedConfig) };
  } catch {
    return fallback;
  }
}

const statusLabels: Record<OperationalStatus, string> = {
  active: "Activo",
  paused: "Pausado",
  inactive: "Inactivo",
  archived: "Archivado",
};

const typeLabels: Record<ClientType, string> = {
  online: "Online",
  presential: "Presencial",
  hybrid: "Hibrido",
};

const emptyDefaults: ClientFormValues = {
  name: "",
  phone: "",
  age: 18,
  sex: "",
  clientType: "online",
  mainGoal: "",
  heightCm: 170,
  initialWeightKg: 70,
  trainingLevel: "",
  injuriesNotes: "",
  generalNotes: "",
  canRegisterWeight: true,
};

export function ClientsWorkspace() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OperationalStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiConfig, setApiConfig] = useState<ApiConfig>(getInitialApiConfig);
  const [isConfigOpen, setIsConfigOpen] = useState(() => !hasStoredApiConfig());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const selectedClient = clients.find((client) => client.id === selectedId);
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: emptyDefaults,
  });

  const isApiReady = Boolean(apiConfig.bearerToken.trim() && apiConfig.organizationId.trim());

  const loadAccessForClient = useCallback(
    async (clientId: string) => {
      if (!isApiReady) {
        return;
      }

      const access = await apiRequest<ClientAccess | null>(
        `/clients/${clientId}/access`,
        { method: "GET" },
        apiConfig,
      );

      setClients((current) =>
        current.map((client) =>
          client.id === clientId
            ? {
                ...client,
                access: access
                  ? {
                      id: access.id,
                      lastAccessAt: access.lastAccessAt,
                      lockedUntil: access.lockedUntil,
                      status: access.status,
                      updatedAt: formatDate(access.lastAccessAt ?? access.lockedUntil),
                    }
                  : { status: "none" },
              }
            : client,
        ),
      );
    },
    [apiConfig, isApiReady],
  );

  const loadClients = useCallback(async () => {
    if (!isApiReady) {
      setClients([]);
      setError("Configura el JWT del coach y la organizacion para leer clientes reales.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const searchParams = new URLSearchParams({
        page: "1",
        limit: "50",
      });

      if (query.trim()) {
        searchParams.set("search", query.trim());
      }

      if (statusFilter !== "all") {
        searchParams.set("status", statusFilter);
      }

      const response = await apiRequest<ClientsResponse>(
        `/clients?${searchParams.toString()}`,
        { method: "GET" },
        apiConfig,
      );
      const nextClients = response.items.map((client) => ({
        ...client,
        access: { status: "none" as const },
      }));

      setClients(nextClients);
      setSelectedId((current) => {
        if (nextClients.some((client) => client.id === current)) {
          return current;
        }

        return nextClients[0]?.id ?? "";
      });
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }, [apiConfig, isApiReady, query, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadClients();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadClients]);

  useEffect(() => {
    if (selectedId) {
      const timer = window.setTimeout(() => {
        void loadAccessForClient(selectedId);
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [loadAccessForClient, selectedId]);

  const filteredClients = clients;

  const activeCount = clients.filter(
    (client) => client.operationalStatus === "active",
  ).length;
  const accessCount = clients.filter((client) => client.access.status === "active").length;

  function openCreateForm() {
    setEditingClient(null);
    form.reset(emptyDefaults);
    setIsFormOpen(true);
  }

  function openEditForm(client: Client) {
    setEditingClient(client);
    form.reset({
      name: client.name,
      phone: client.phone,
      age: client.age,
      sex: client.sex,
      clientType: client.clientType,
      mainGoal: client.mainGoal,
      heightCm: client.heightCm,
      initialWeightKg: client.initialWeightKg,
      trainingLevel: client.trainingLevel,
      injuriesNotes: client.injuriesNotes,
      generalNotes: client.generalNotes,
      canRegisterWeight: client.canRegisterWeight,
    });
    setIsFormOpen(true);
  }

  async function submitClient(values: ClientFormValues) {
    setIsLoading(true);
    setError("");

    try {
      const payload = normalizeFormValues(values);

      if (editingClient) {
        const updatedClient = await apiRequest<Omit<Client, "access">>(
          `/clients/${editingClient.id}`,
          { method: "PATCH", body: JSON.stringify(payload) },
          apiConfig,
        );
        setClients((current) =>
          current.map((client) =>
            client.id === editingClient.id
              ? { ...updatedClient, access: client.access }
              : client,
          ),
        );
        toast.success("Cliente actualizado");
      } else {
        const createdClient = await apiRequest<Omit<Client, "access">>(
          "/clients",
          { method: "POST", body: JSON.stringify(payload) },
          apiConfig,
        );
        setClients((current) => [
          { ...createdClient, access: { status: "none" } },
          ...current,
        ]);
        setSelectedId(createdClient.id);
        toast.success("Cliente creado");
      }

      setIsFormOpen(false);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }

  async function generateAccess(clientId: string) {
    setError("");
    try {
      const currentClient = clients.find((client) => client.id === clientId);
      const endpoint =
        currentClient?.access.status === "none" ||
        currentClient?.access.status === "disabled"
          ? `/clients/${clientId}/access`
          : `/clients/${clientId}/access/regenerate-pin`;
      const response = await apiRequest<{
        access: { id: string; status: AccessStatus };
        link: string;
        pin: string;
      }>(endpoint, { method: "POST" }, apiConfig);

      setClients((current) =>
        current.map((client) =>
          client.id === clientId
            ? {
                ...client,
                access: {
                  id: response.access.id,
                  link: response.link,
                  pin: response.pin,
                  status: response.access.status,
                  updatedAt: "Ahora",
                },
              }
            : client,
        ),
      );
      toast.success("Acceso generado");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  }

  async function disableAccess(clientId: string) {
    setError("");
    try {
      await apiRequest<ClientAccess>(
        `/clients/${clientId}/access/disable`,
        { method: "PATCH" },
        apiConfig,
      );
      setClients((current) =>
        current.map((client) =>
          client.id === clientId
            ? { ...client, access: { status: "disabled", updatedAt: "Ahora" } }
            : client,
        ),
      );
      toast.success("Acceso desactivado");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  }

  async function updateStatus(clientId: string, status: OperationalStatus) {
    setError("");
    try {
      const updatedClient = await apiRequest<Omit<Client, "access">>(
        `/clients/${clientId}/status`,
        { method: "PATCH", body: JSON.stringify({ status }) },
        apiConfig,
      );
      setClients((current) =>
        current.map((client) =>
          client.id === clientId
            ? { ...updatedClient, access: client.access }
            : client,
        ),
      );
      toast.success(`Cliente ${statusLabels[status].toLowerCase()}`);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  }

  function saveApiConfig(nextConfig: ApiConfig) {
    const normalizedConfig = {
      apiUrl: nextConfig.apiUrl.replace(/\/$/, ""),
      bearerToken: nextConfig.bearerToken.trim(),
      organizationId: nextConfig.organizationId.trim(),
    };
    setApiConfig(normalizedConfig);
    window.localStorage.setItem(apiConfigStorageKey, JSON.stringify(normalizedConfig));
    setIsConfigOpen(false);
    toast.success("Conexion configurada");
  }

  function clearApiConfig() {
    window.localStorage.removeItem(apiConfigStorageKey);
    setApiConfig({ apiUrl: apiBaseUrl, bearerToken: "", organizationId: "" });
    setClients([]);
    setSelectedId("");
    setIsConfigOpen(true);
  }

  async function copyAccess(link: string | undefined) {
    if (!link) {
      setError("El backend solo devuelve el link al generar o regenerar acceso.");
      return;
    }

    await navigator.clipboard.writeText(link);
    toast.success("Link copiado");
  }

  function refreshClients() {
    void loadClients();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-4 p-4 lg:flex-row lg:p-6">
        <aside className="hidden w-64 shrink-0 rounded-xl border bg-card p-4 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-primary">
              <DumbbellIcon />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-normal">CoraFit</p>
              <p className="text-xs text-muted-foreground">Coach OS</p>
            </div>
          </div>
          <nav className="mt-8 flex flex-col gap-2">
            <NavItem href="/" icon={ActivityIcon} label="Dashboard" />
            <NavItem href="/clients" icon={UsersIcon} label="Clientes" active />
            <NavItem href="/training-plans" icon={DumbbellIcon} label="Planes" />
            <NavItem icon={SmartphoneIcon} label="Portal" />
          </nav>
          <div className="mt-auto rounded-lg border bg-background p-3">
            <p className="text-sm font-semibold">Alex Ruiz</p>
            <p className="text-xs text-muted-foreground">Owner / Coach</p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Clientes</p>
              <h1 className="text-3xl font-semibold leading-tight">
                Gestion de clientes
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" onClick={() => setIsConfigOpen(true)}>
                <KeyRoundIcon data-icon="inline-start" />
                Conexion
              </Button>
              <Button variant="outline" onClick={refreshClients}>
                <RefreshCwIcon data-icon="inline-start" />
                Actualizar
              </Button>
              <Button onClick={openCreateForm}>
                <PlusIcon data-icon="inline-start" />
                Nuevo cliente
              </Button>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Clientes totales" value={String(clients.length)} />
            <MetricCard label="Activos" value={String(activeCount)} />
            <MetricCard label="Accesos activos" value={String(accessCount)} />
          </div>

          <div className="grid min-h-[640px] gap-4 xl:grid-cols-[410px_1fr]">
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
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Buscar por nombre u objetivo"
                    />
                  </div>
                  <select
                    aria-label="Filtrar por estado"
                    className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as OperationalStatus | "all")
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
                ) : filteredClients.length ? (
                  <div className="flex flex-col gap-2">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        className={`rounded-lg border p-3 text-left transition-colors hover:bg-muted ${
                          selectedClient?.id === client.id ? "bg-muted" : "bg-background"
                        }`}
                        onClick={() => setSelectedId(client.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{client.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {client.mainGoal} / {typeLabels[client.clientType]}
                            </p>
                          </div>
                          <StatusPill status={client.operationalStatus} />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No hay clientes con ese filtro"
                    description="Ajusta la busqueda o crea un nuevo cliente."
                    actionLabel="Nuevo cliente"
                    onAction={openCreateForm}
                  />
                )}
              </CardContent>
            </Card>

            {selectedClient ? (
              <ClientDetail
                client={selectedClient}
                onCopyAccess={copyAccess}
                onDisableAccess={disableAccess}
                onEdit={openEditForm}
                onGenerateAccess={generateAccess}
                onStatusChange={updateStatus}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <EmptyState
                    title="Selecciona un cliente"
                    description="La ficha operativa aparecera aqui."
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </div>

      <ClientFormDialog
        form={form}
        isLoading={isLoading}
        isOpen={isFormOpen}
        mode={editingClient ? "edit" : "create"}
        onOpenChange={setIsFormOpen}
        onSubmit={submitClient}
      />
      <ApiConfigDialog
        key={`${apiConfig.apiUrl}-${apiConfig.organizationId}-${apiConfig.bearerToken.length}`}
        config={apiConfig}
        isOpen={isConfigOpen}
        onClear={clearApiConfig}
        onOpenChange={setIsConfigOpen}
        onSave={saveApiConfig}
      />
    </main>
  );
}

function ClientDetail({
  client,
  onCopyAccess,
  onDisableAccess,
  onEdit,
  onGenerateAccess,
  onStatusChange,
}: {
  client: Client;
  onCopyAccess: (link: string | undefined) => void;
  onDisableAccess: (clientId: string) => void;
  onEdit: (client: Client) => void;
  onGenerateAccess: (clientId: string) => void;
  onStatusChange: (clientId: string, status: OperationalStatus) => void;
}) {
  const [isAccessOpen, setIsAccessOpen] = useState(false);

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

function AccessPanel({
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

function ClientFormDialog({
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

function ApiConfigDialog({
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

function TextField({
  control,
  label,
  name,
  type = "text",
}: {
  control: Control<ClientFormValues>;
  label: string;
  name: keyof ClientFormValues;
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

function SelectField({
  control,
  label,
  name,
  options,
}: {
  control: Control<ClientFormValues>;
  label: string;
  name: keyof ClientFormValues;
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

function NavItem({
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-sm text-muted-foreground">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: OperationalStatus }) {
  return (
    <span className="rounded-full border bg-background px-3 py-1 text-xs">
      {statusLabels[status]}
    </span>
  );
}

function EmptyState({
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

function LoadingList() {
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

function normalizeFormValues(values: ClientFormValues) {
  return {
    name: values.name.trim(),
    phone: values.phone?.trim() ?? "",
    age: values.age ?? 18,
    sex: values.sex?.trim() ?? "",
    clientType: values.clientType,
    mainGoal: values.mainGoal.trim(),
    heightCm: values.heightCm,
    initialWeightKg: values.initialWeightKg,
    trainingLevel: values.trainingLevel?.trim() ?? "",
    injuriesNotes: values.injuriesNotes?.trim() ?? "",
    generalNotes: values.generalNotes?.trim() ?? "",
    canRegisterWeight: values.canRegisterWeight,
  };
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

async function apiRequest<T>(
  path: string,
  init: RequestInit,
  config: ApiConfig,
): Promise<T> {
  const response = await fetch(`${config.apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.bearerToken}`,
      "X-Organization-Id": config.organizationId,
      ...init.headers,
    },
  });

  if (!response.ok) {
    let message = `API ${response.status}`;
    try {
      const payload = (await response.json()) as { message?: string };
      message = payload.message ?? message;
    } catch {
      // Keep the generic HTTP message when the API does not return JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrio un error inesperado";
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
