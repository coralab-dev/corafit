"use client";

import {
  AlertTriangleIcon,
  Building2Icon,
  CreditCardIcon,
  LaptopIcon,
  LoaderIcon,
  LogOutIcon,
  MoonIcon,
  PaletteIcon,
  ShieldCheckIcon,
  SunIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useSyncExternalStore, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAppTheme } from "@/components/providers/theme-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { authenticatedRequest } from "@/lib/api/authenticated-request";
import { getErrorMessage } from "@/lib/clients/api";
import {
  WorkspaceFrame,
  WorkspaceHeader,
  WorkspacePanel,
} from "@/components/layout/workspace-shell";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { AuthProfile } from "@/lib/auth/types";

type ThemeOption = {
  description: string;
  icon: LucideIcon;
  label: string;
  value: "light" | "dark" | "system";
};

const themeOptions: ThemeOption[] = [
  {
    description: "Interfaz clara para espacios con mucha luz.",
    icon: SunIcon,
    label: "Claro",
    value: "light",
  },
  {
    description: "Interfaz oscura para sesiones largas de trabajo.",
    icon: MoonIcon,
    label: "Oscuro",
    value: "dark",
  },
  {
    description: "Usa automaticamente el tema del dispositivo.",
    icon: LaptopIcon,
    label: "Sistema",
    value: "system",
  },
];

const profileSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(100, "El nombre debe tener menos de 100 caracteres"),
  phone: z.string().trim().optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const orgSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(100, "El nombre debe tener menos de 100 caracteres"),
});

type OrgFormValues = z.infer<typeof orgSchema>;

type BillingData = {
  id: string;
  organizationId: string;
  status: string;
  startedAt: string;
  renewsAt: string | null;
  cancelledAt: string | null;
  usedClients: number;
  clientUsage?: {
    used: number;
    limit: number;
    remaining: number;
    isAtLimit: boolean;
    isOverLimit: boolean;
    warningLevel: "ok" | "near_limit" | "at_limit" | "over_limit";
  };
  plan: {
    id: string;
    code: string;
    name: string;
    clientLimit: number;
    memberLimit: number;
    priceMonthly: number;
    currency: string;
  };
};

function InfoItem({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "muted" | "success";
}) {
  return (
    <div className="min-w-0 border-t px-4 py-3 first:border-t-0 md:border-l md:border-t-0 md:first:border-l-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div
        className={cn(
          "mt-1 truncate text-sm font-medium",
          tone === "muted" && "text-muted-foreground",
          tone === "success" && "text-emerald-600 dark:text-emerald-400",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ProfileSection({ profile }: { profile: AuthProfile }) {
  const { refreshProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile.user.name,
      phone: profile.user.phone ?? "",
    },
    mode: "onSubmit",
    reValidateMode: "onBlur",
  });

  async function onSubmit(values: ProfileFormValues) {
    setIsSubmitting(true);
    try {
      const phoneValue = values.phone?.trim() || undefined;
      await authenticatedRequest<AuthProfile>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name: values.name, phone: phoneValue }),
      });
      await refreshProfile();
      toast.success("Perfil actualizado");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <WorkspacePanel
      title="Perfil del coach"
      description="Datos visibles para operar la cuenta."
      icon={<UserRoundIcon className="size-4" />}
    >
      <Form {...form}>
        <form className="space-y-4 p-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSubmitting} className="h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="h-11"
                      disabled={isSubmitting}
                      placeholder="Opcional"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="overflow-hidden rounded-md border bg-background/60 md:grid md:grid-cols-2">
            <InfoItem label="Email" value={profile.user.email} tone="muted" />
            <InfoItem
              label="Estado"
              value={profile.user.status === "active" ? "Activo" : profile.user.status}
              tone={profile.user.status === "active" ? "success" : "default"}
            />
          </div>
          <div className="flex justify-end">
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting && <LoaderIcon className="mr-2 size-4 animate-spin" />}
              Guardar perfil
            </Button>
          </div>
        </form>
      </Form>
    </WorkspacePanel>
  );
}

function OrganizationSection({ profile }: { profile: AuthProfile }) {
  const { refreshProfile } = useAuth();
  const isOwner = profile.member.role === "owner";
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: profile.organization.name,
    },
    mode: "onSubmit",
    reValidateMode: "onBlur",
  });

  async function onSubmit(values: OrgFormValues) {
    setIsSubmitting(true);
    try {
      await authenticatedRequest("/organizations/current", {
        method: "PATCH",
        body: JSON.stringify({ name: values.name }),
      }, { organizationId: profile.organization.id });
      await refreshProfile();
      toast.success("Organizacion actualizada");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const typeLabels: Record<string, string> = {
    individual: "Individual",
    studio: "Studio",
  };

  const statusLabels: Record<string, string> = {
    active: "Activa",
    suspended: "Suspendida",
    cancelled: "Cancelada",
  };

  return (
    <WorkspacePanel
      title="Organizacion"
      description="Identidad y contexto operativo."
      icon={<Building2Icon className="size-4" />}
    >
      {isOwner ? (
        <Form {...form}>
          <form className="space-y-4 p-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la organizacion</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSubmitting} className="h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="overflow-hidden rounded-md border bg-background/60 md:grid md:grid-cols-3">
              <InfoItem
                label="Tipo"
                value={typeLabels[profile.organization.type] ?? profile.organization.type}
              />
              <InfoItem label="Zona horaria" value={profile.organization.timezone} />
              <InfoItem
                label="Estado"
                value={statusLabels[profile.organization.status] ?? profile.organization.status}
                tone={profile.organization.status === "active" ? "success" : "default"}
              />
            </div>
            <div className="flex justify-end">
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting && <LoaderIcon className="mr-2 size-4 animate-spin" />}
                Guardar organizacion
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <div className="p-4">
          <div className="overflow-hidden rounded-md border bg-background/60 md:grid md:grid-cols-2">
            <InfoItem label="Nombre" value={profile.organization.name} />
            <InfoItem
              label="Tipo"
              value={typeLabels[profile.organization.type] ?? profile.organization.type}
            />
            <InfoItem label="Zona horaria" value={profile.organization.timezone} />
            <InfoItem
              label="Estado"
              value={statusLabels[profile.organization.status] ?? profile.organization.status}
              tone={profile.organization.status === "active" ? "success" : "default"}
            />
          </div>
        </div>
      )}
    </WorkspacePanel>
  );
}

function PlanSection({ profile }: { profile: AuthProfile }) {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authenticatedRequest<BillingData>("/billing/current", {
      method: "GET",
    }, { organizationId: profile.organization.id })
      .then((data) => {
        if (!cancelled) {
          setBilling(data);
          setBillingLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBilling(null);
          setBillingLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profile.organization.id]);

  const planName = billing?.plan.name ?? profile.subscription.subscriptionPlan.name;
  const clientLimit = billing?.plan.clientLimit ?? profile.subscription.subscriptionPlan.clientLimit;
  const usedClients = billing?.clientUsage?.used ?? billing?.usedClients;
  const clientUsage = billing?.clientUsage ?? (
    usedClients !== undefined && usedClients !== null
      ? {
          used: usedClients,
          limit: clientLimit,
          remaining: Math.max(clientLimit - usedClients, 0),
          isAtLimit: usedClients === clientLimit,
          isOverLimit: usedClients > clientLimit,
          warningLevel: usedClients > clientLimit
            ? "over_limit"
            : usedClients === clientLimit
              ? "at_limit"
              : usedClients >= clientLimit * 0.8
                ? "near_limit"
                : "ok",
        }
      : null
  );
  const usageWarning =
    clientUsage?.warningLevel === "over_limit"
      ? "Tu organizacion supera el limite recomendado del plan beta. No se bloqueara la operacion durante beta, pero queda pendiente revision manual."
      : clientUsage?.warningLevel === "at_limit"
        ? "Llegaste al limite recomendado de tu plan beta. Puedes seguir operando durante la beta; revisaremos el plan manualmente si hace falta."
        : null;

  const statusLabels: Record<string, string> = {
    trial: "Prueba",
    active: "Activa",
    past_due: "Vencida",
    expired: "Expirada",
    cancelled: "Cancelada",
    suspended: "Suspendida",
  };

  const subscriptionStatus = billing?.status ?? profile.subscription.status;

  return (
    <WorkspacePanel
      title="Plan actual"
      description="Uso disponible en esta organizacion."
      icon={<CreditCardIcon className="size-4" />}
    >
      <div className="space-y-4 p-4">
        <div className="rounded-md border bg-background/60 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Plan
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{planName}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {statusLabels[subscriptionStatus] ?? subscriptionStatus}
          </p>
        </div>
        <div className="overflow-hidden rounded-md border bg-background/60 md:grid md:grid-cols-2 xl:block">
          <InfoItem label="Limite de clientes" value={clientLimit} />
          <InfoItem
            label="Clientes usados"
            value={
              billingLoading ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : clientUsage ? (
                `${clientUsage.used} / ${clientUsage.limit}`
              ) : (
                "No disponible"
              )
            }
          />
        </div>
        {usageWarning ? (
          <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
            <p>{usageWarning}</p>
          </div>
        ) : null}
      </div>
    </WorkspacePanel>
  );
}

function AppearanceSection() {
  const { setTheme, theme } = useAppTheme();
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const selectedTheme = isMounted ? theme : "system";

  return (
    <WorkspacePanel
      description="Elige entre tema claro, oscuro o seguir el sistema."
      title="Apariencia"
      icon={<PaletteIcon className="size-4" />}
    >
      <div className="grid gap-3 p-4 lg:grid-cols-3">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedTheme === option.value;

          return (
            <button
              key={option.value}
              className={cn(
                "flex min-h-28 items-start gap-3 rounded-md border bg-card p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25",
                isSelected
                  ? "border-primary/45 bg-primary/5 text-foreground"
                  : "hover:border-primary/35 hover:bg-background hover:shadow-sm",
              )}
              type="button"
              onClick={() => setTheme(option.value)}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground",
                  isSelected && "border-primary/30 text-primary",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-semibold">
                  {option.label}
                  {isSelected ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      Activo
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </WorkspacePanel>
  );
}

function SessionSection() {
  const router = useRouter();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
    } catch {
      setIsLoggingOut(false);
    }
  }

  return (
    <WorkspacePanel
      description="Cierra tu sesion en CoraFit."
      title="Sesion"
      icon={<ShieldCheckIcon className="size-4" />}
    >
      <div className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          Esta accion cierra la sesion local en este navegador.
        </p>
        <Button
          className="w-full"
          disabled={isLoggingOut}
          onClick={handleLogout}
          type="button"
          variant="destructive"
        >
          {isLoggingOut ? (
            <LoaderIcon className="mr-2 size-4 animate-spin" />
          ) : (
            <LogOutIcon className="mr-2 size-4" />
          )}
          Cerrar sesion
        </Button>
      </div>
    </WorkspacePanel>
  );
}

export function SettingsWorkspace() {
  const { profile } = useAuth();

  if (!profile || !profile.organization || !profile.member || !profile.subscription) {
    return null;
  }

  return (
    <WorkspaceFrame
      header={
        <WorkspaceHeader
          title="Configuracion"
          description="Ajusta tu perfil, organizacion, plan y preferencias."
        />
      }
    >
      <div className="flex flex-1 flex-col gap-4 bg-background px-4 py-4 md:px-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <ProfileSection profile={profile} />
            <OrganizationSection profile={profile} />
          </div>
          <div className="min-w-0 space-y-4">
            <PlanSection profile={profile} />
            <SessionSection />
          </div>
        </div>
        <AppearanceSection />
      </div>
    </WorkspaceFrame>
  );
}
