"use client";

import {
  AlertTriangleIcon,
  Building2Icon,
  CheckIcon,
  CreditCardIcon,
  LaptopIcon,
  LoaderIcon,
  LogOutIcon,
  MoonIcon,
  PaletteIcon,
  RefreshCwIcon,
  SunIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  WorkspaceFrame,
  WorkspaceHeader,
  WorkspacePanel,
} from "@/components/layout/workspace-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { useAppTheme } from "@/components/providers/theme-provider";
import { PanelSkeleton } from "@/components/shared/skeletons";
import { authenticatedRequest } from "@/lib/api/authenticated-request";
import type { AuthProfile } from "@/lib/auth/types";
import { getErrorMessage } from "@/lib/clients/api";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  getSettingsPlanSummary,
  type SettingsBillingData,
  type SettingsPlanTone,
} from "./settings-state";

type ThemeOption = {
  description: string;
  icon: LucideIcon;
  label: string;
  value: "light" | "dark" | "system";
};

type SettingsTab = "profile" | "organization" | "appearance";

const themeOptions: ThemeOption[] = [
  {
    description: "Fondo claro para espacios con mucha luz.",
    icon: SunIcon,
    label: "Claro",
    value: "light",
  },
  {
    description: "Menos brillo para sesiones largas.",
    icon: MoonIcon,
    label: "Oscuro",
    value: "dark",
  },
  {
    description: "Respeta el tema del dispositivo.",
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

type BillingData = SettingsBillingData & {
  id: string;
  organizationId: string;
  startedAt: string;
  cancelledAt: string | null;
  clientUsage?: SettingsBillingData["clientUsage"] & {
    remaining: number;
    isAtLimit: boolean;
    isOverLimit: boolean;
  };
  plan: SettingsBillingData["plan"] & {
    id: string;
    code: string;
    memberLimit: number;
    priceMonthly: number;
    currency: string;
  };
};

const memberRoleLabels: Record<string, string> = {
  coach: "Coach",
  owner: "Owner",
};

const organizationTypeLabels: Record<string, string> = {
  individual: "Individual",
  studio: "Studio",
};

const organizationStatusLabels: Record<string, string> = {
  active: "Activa",
  cancelled: "Cancelada",
  deleted: "Eliminada",
  suspended: "Suspendida",
};

const subscriptionStatusLabels: Record<string, string> = {
  active: "Activa",
  cancelled: "Cancelada",
  expired: "Expirada",
  past_due: "Vencida",
  suspended: "Suspendida",
  trial: "Prueba",
};

const statusToneByStatus: Record<string, "success" | "muted" | "warning" | "danger"> = {
  active: "success",
  cancelled: "muted",
  deleted: "danger",
  suspended: "warning",
};

const planToneClasses: Record<SettingsPlanTone, { bar: string; text: string }> = {
  critical: {
    bar: "bg-red-500",
    text: "text-red-700 dark:text-red-300",
  },
  notice: {
    bar: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
  },
  ok: {
    bar: "bg-primary",
    text: "text-muted-foreground",
  },
  stale: {
    bar: "bg-muted-foreground/35",
    text: "text-amber-700 dark:text-amber-300",
  },
  warning: {
    bar: "bg-yellow-500",
    text: "text-yellow-700 dark:text-yellow-300",
  },
};

function SummaryCard({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-2xl border !border-transparent bg-card p-4 shadow-[var(--surface-shadow)]">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          {icon}
        </span>
        {title}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
      {initials || "CF"}
    </div>
  );
}

function CompactFact({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  );
}

function getStatusTone(status: string) {
  return statusToneByStatus[status] ?? "muted";
}

function StatusBadge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "success" | "muted" | "warning" | "danger";
}) {
  return (
    <Badge variant={tone} className="text-[10px]">
      {children}
    </Badge>
  );
}

function AccountSummaryCard({ profile }: { profile: AuthProfile }) {
  return (
    <SummaryCard title="Cuenta" icon={<UserRoundIcon className="size-4" />}>
      <div className="flex min-w-0 items-center gap-3">
        <InitialsAvatar name={profile.user.name} />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-base font-semibold">{profile.user.name}</p>
            <StatusBadge tone={getStatusTone(profile.user.status)}>
              {profile.user.status === "active" ? "Activa" : profile.user.status}
            </StatusBadge>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">{profile.user.email}</p>
        </div>
      </div>
    </SummaryCard>
  );
}

function OrganizationSummaryCard({ profile }: { profile: AuthProfile }) {
  return (
    <SummaryCard title="Organización" icon={<Building2Icon className="size-4" />}>
      <div className="space-y-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{profile.organization.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {organizationTypeLabels[profile.organization.type] ?? profile.organization.type}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {memberRoleLabels[profile.member.role] ?? profile.member.role}
          </Badge>
          <StatusBadge tone={getStatusTone(profile.organization.status)}>
            {organizationStatusLabels[profile.organization.status] ?? profile.organization.status}
          </StatusBadge>
        </div>
      </div>
    </SummaryCard>
  );
}

function PlanSummaryCard({
  billing,
  billingError,
  billingLoading,
  onRetry,
  profile,
}: {
  billing: BillingData | null;
  billingError: string | null;
  billingLoading: boolean;
  onRetry: () => void;
  profile: AuthProfile;
}) {
  const summary = getSettingsPlanSummary({
    billing,
    billingError,
    billingLoading,
    profileSubscription: profile.subscription,
  });
  const toneClasses = planToneClasses[summary.tone];

  return (
    <SummaryCard title="Plan" icon={<CreditCardIcon className="size-4" />}>
      <div className="space-y-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{summary.planName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {subscriptionStatusLabels[summary.subscriptionStatus] ?? summary.subscriptionStatus}
            </p>
          </div>
          {billingLoading ? <LoaderIcon className="mt-0.5 size-4 animate-spin text-muted-foreground" /> : null}
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className={cn(summary.tone !== "ok" && toneClasses.text)}>
              {summary.usageLabel}
            </span>
            {summary.canRetry ? (
              <Button className="h-7 px-2 text-xs shadow-none" size="sm" type="button" variant="outline" onClick={onRetry}>
                <RefreshCwIcon className="size-3.5" />
                Reintentar
              </Button>
            ) : null}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-[width]",
                toneClasses.bar,
              )}
              style={{ width: `${Math.min(summary.usagePercent, 100)}%` }}
            />
          </div>
        </div>
        {summary.limitMessage && !summary.isUsageStale ? (
          <div className={cn("flex items-start gap-2 text-xs", toneClasses.text)}>
            <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
            <span>{summary.limitMessage}</span>
          </div>
        ) : null}
        {summary.renewsAt ? (
          <p className="text-xs text-muted-foreground">
            Renueva el {formatDate(summary.renewsAt)}
          </p>
        ) : null}
        {summary.isUsageStale ? (
          <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
            <span>No se pudo actualizar el uso del plan.</span>
          </div>
        ) : null}
      </div>
    </SummaryCard>
  );
}

function ProfileSection({
  onProfileSaved,
  profile,
}: {
  onProfileSaved: (profile: AuthProfile) => void;
  profile: AuthProfile;
}) {
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

  useEffect(() => {
    form.reset({
      name: profile.user.name,
      phone: profile.user.phone ?? "",
    });
  }, [form, profile.user.name, profile.user.phone]);

  async function onSubmit(values: ProfileFormValues) {
    setIsSubmitting(true);
    try {
      const phoneValue = values.phone?.trim() || undefined;
      const updatedProfile = await authenticatedRequest<AuthProfile>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name: values.name, phone: phoneValue }),
      });

      form.reset({
        name: updatedProfile.user.name,
        phone: updatedProfile.user.phone ?? "",
      });
      onProfileSaved(updatedProfile);
      notify.success("Perfil actualizado");

      try {
        await refreshProfile();
      } catch {
        notify.warning("Los cambios se guardaron, pero no se pudo actualizar toda la vista.");
      }
    } catch (error) {
      notify.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 lg:grid-cols-2">
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
                <FormLabel>Teléfono</FormLabel>
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
        <div className="grid gap-4 md:grid-cols-2">
          <CompactFact label="Email" value={profile.user.email} />
          <CompactFact
            label="Estado"
            value={
              <StatusBadge tone={getStatusTone(profile.user.status)}>
                {profile.user.status === "active" ? "Activa" : profile.user.status}
              </StatusBadge>
            }
          />
        </div>
        <div className="flex justify-end">
          <Button disabled={isSubmitting || !form.formState.isDirty} type="submit">
            {isSubmitting ? <LoaderIcon className="size-4 animate-spin" /> : null}
            Guardar cambios
          </Button>
        </div>
      </form>
    </Form>
  );
}

function OrganizationSection({
  onOrganizationSaved,
  profile,
}: {
  onOrganizationSaved: (organization: AuthProfile["organization"]) => void;
  profile: AuthProfile;
}) {
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

  useEffect(() => {
    form.reset({ name: profile.organization.name });
  }, [form, profile.organization.name]);

  async function onSubmit(values: OrgFormValues) {
    setIsSubmitting(true);
    try {
      const updatedOrganization = await authenticatedRequest<AuthProfile["organization"]>(
        "/organizations/current",
        {
          method: "PATCH",
          body: JSON.stringify({ name: values.name }),
        },
        { organizationId: profile.organization.id },
      );

      form.reset({ name: updatedOrganization.name });
      onOrganizationSaved(updatedOrganization);
      notify.success("Organización actualizada");

      try {
        await refreshProfile();
      } catch {
        notify.warning("Los cambios se guardaron, pero no se pudo actualizar toda la vista.");
      }
    } catch (error) {
      notify.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOwner) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <CompactFact label="Nombre" value={profile.organization.name} />
        <CompactFact
          label="Tipo"
          value={organizationTypeLabels[profile.organization.type] ?? profile.organization.type}
        />
        <CompactFact label="Zona horaria" value={profile.organization.timezone} />
        <CompactFact
          label="Estado"
          value={
            <StatusBadge tone={getStatusTone(profile.organization.status)}>
              {organizationStatusLabels[profile.organization.status] ?? profile.organization.status}
            </StatusBadge>
          }
        />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la organización</FormLabel>
              <FormControl>
                <Input {...field} disabled={isSubmitting} className="h-11" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 md:grid-cols-3">
          <CompactFact
            label="Tipo"
            value={organizationTypeLabels[profile.organization.type] ?? profile.organization.type}
          />
          <CompactFact label="Zona horaria" value={profile.organization.timezone} />
          <CompactFact
            label="Estado"
            value={
              <StatusBadge tone={getStatusTone(profile.organization.status)}>
                {organizationStatusLabels[profile.organization.status] ?? profile.organization.status}
              </StatusBadge>
            }
          />
        </div>
        <div className="flex justify-end">
          <Button disabled={isSubmitting || !form.formState.isDirty} type="submit">
            {isSubmitting ? <LoaderIcon className="size-4 animate-spin" /> : null}
            Guardar cambios
          </Button>
        </div>
      </form>
    </Form>
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
    <div className="grid gap-3">
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const isSelected = selectedTheme === option.value;

        return (
          <button
            key={option.value}
            className={cn(
              "flex min-h-16 items-center gap-3 rounded-xl border bg-background px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25",
              isSelected
                ? "border-primary/45 bg-primary/5 text-foreground"
                : "hover:border-primary/35 hover:bg-accent/40",
            )}
            type="button"
            onClick={() => setTheme(option.value)}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground",
                isSelected && "border-primary/30 text-primary",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{option.label}</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {option.description}
              </span>
            </span>
            {isSelected ? <CheckIcon className="size-4 shrink-0 text-primary" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function SettingsOperations({
  onOrganizationSaved,
  onProfileSaved,
  profile,
}: {
  onOrganizationSaved: (organization: AuthProfile["organization"]) => void;
  onProfileSaved: (profile: AuthProfile) => void;
  profile: AuthProfile;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  return (
    <WorkspacePanel
      title="Configuración"
      description="Ajusta una sección a la vez."
      icon={<PaletteIcon className="size-4" />}
    >
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsTab)}>
        <div className="overflow-x-auto border-b px-4 py-3">
          <TabsList className="w-max min-w-full justify-start bg-muted/70 sm:min-w-0">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="organization">Organización</TabsTrigger>
            <TabsTrigger value="appearance">Apariencia</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="profile" className="m-0 p-4">
          <ProfileSection onProfileSaved={onProfileSaved} profile={profile} />
        </TabsContent>
        <TabsContent value="organization" className="m-0 p-4">
          <OrganizationSection onOrganizationSaved={onOrganizationSaved} profile={profile} />
        </TabsContent>
        <TabsContent value="appearance" className="m-0 p-4">
          <AppearanceSection />
        </TabsContent>
      </Tabs>
    </WorkspacePanel>
  );
}

function SessionRow() {
  const router = useRouter();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
    } catch (error) {
      setIsLoggingOut(false);
      notify.error(getErrorMessage(error));
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t px-1 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold">Cerrar sesión</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Finaliza la sesión en este navegador.
        </p>
      </div>
      <Button
        className="border-destructive/35 text-destructive shadow-none hover:bg-destructive/10 hover:text-destructive"
        disabled={isLoggingOut}
        onClick={handleLogout}
        type="button"
        variant="outline"
      >
        {isLoggingOut ? <LoaderIcon className="size-4 animate-spin" /> : <LogOutIcon className="size-4" />}
        Cerrar sesión
      </Button>
    </div>
  );
}

export function SettingsWorkspace() {
  const { profile } = useAuth();
  const [presentationProfile, setPresentationProfile] = useState<AuthProfile | null>(null);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const profileOrganizationId = profile?.organization?.id;

  async function loadBilling(organizationId: string, options: { silent?: boolean } = {}) {
    if (!options.silent) {
      setBillingLoading(true);
    }
    setBillingError(null);
    try {
      const data = await authenticatedRequest<BillingData>(
        "/billing/current",
        { method: "GET" },
        { organizationId },
      );
      setBilling(data);
    } catch (error) {
      setBilling(null);
      setBillingError(getErrorMessage(error));
    } finally {
      setBillingLoading(false);
    }
  }

  useEffect(() => {
    if (!profileOrganizationId) {
      return;
    }

    let cancelled = false;

    async function load() {
      setBillingLoading(true);
      setBillingError(null);
      try {
        const data = await authenticatedRequest<BillingData>(
          "/billing/current",
          { method: "GET" },
          { organizationId: profileOrganizationId },
        );
        if (!cancelled) {
          setBilling(data);
        }
      } catch (error) {
        if (!cancelled) {
          setBilling(null);
          setBillingError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setBillingLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [profileOrganizationId]);

  const visibleProfile =
    presentationProfile?.organization.id === profileOrganizationId ? presentationProfile : profile;

  if (
    !visibleProfile ||
    !visibleProfile.organization ||
    !visibleProfile.member ||
    !visibleProfile.subscription
  ) {
    return <SettingsSkeleton />;
  }

  function handleProfileSaved(updatedProfile: AuthProfile) {
    setPresentationProfile(updatedProfile);
  }

  function handleOrganizationSaved(organization: AuthProfile["organization"]) {
    setPresentationProfile((current) =>
      current
        ? {
            ...current,
            organization,
          }
        : null,
    );
  }

  return (
    <WorkspaceFrame
      header={
        <WorkspaceHeader
          title="Configuración"
          description="Administra tu cuenta, organización y preferencias."
        />
      }
    >
      <div className="flex flex-1 flex-col gap-4 bg-background px-4 py-4 md:px-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <AccountSummaryCard profile={visibleProfile} />
          <OrganizationSummaryCard profile={visibleProfile} />
          <PlanSummaryCard
            billing={billing}
            billingError={billingError}
            billingLoading={billingLoading}
            onRetry={() => void loadBilling(visibleProfile.organization.id)}
            profile={visibleProfile}
          />
        </div>
        <SettingsOperations
          onOrganizationSaved={handleOrganizationSaved}
          onProfileSaved={handleProfileSaved}
          profile={visibleProfile}
        />
        <SessionRow />
      </div>
    </WorkspaceFrame>
  );
}

function SettingsSkeleton() {
  return (
    <WorkspaceFrame
      header={
        <WorkspaceHeader
          title="Configuración"
          description="Administra tu cuenta, organización y preferencias."
        />
      }
    >
      <div className="flex flex-1 flex-col gap-4 bg-background px-4 py-4 md:px-6">
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-2xl border !border-transparent bg-card p-4 shadow-[var(--surface-shadow)]">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="mt-4 h-5 w-36" />
              <Skeleton className="mt-2 h-4 w-48 max-w-full" />
              <Skeleton className="mt-4 h-2 w-full" />
            </div>
          ))}
        </div>
        <WorkspacePanel>
          <div className="border-b px-4 py-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-3 w-56 max-w-full" />
          </div>
          <div className="border-b px-4 py-3">
            <Skeleton className="h-10 w-80 max-w-full" />
          </div>
          <div className="p-4">
            <PanelSkeleton rows={3} titleWidth="w-36" />
          </div>
        </WorkspacePanel>
      </div>
    </WorkspaceFrame>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
