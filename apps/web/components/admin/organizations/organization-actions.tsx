"use client";

import { useState } from "react";
import { BanIcon, ChevronRightIcon, RotateCcwIcon } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import type {
  AdminOrganization,
  AdminOrganizationStatusAction,
  AdminSubscriptionPlan,
  OrganizationMutation,
} from "@/hooks/use-admin-organizations";
import { cn } from "@/lib/utils";
import { formatPlanLabel, formatPlanPrice, formatSubscriptionStatus } from "./organization-formatters";
import { canSubmitPlan, isMutationFor } from "./organization-state";

type OrganizationActionsProps = {
  organization: AdminOrganization;
  subscriptionPlans: AdminSubscriptionPlan[];
  isPlansLoading: boolean;
  plansError?: string;
  mutation: OrganizationMutation | null;
  onRetryPlans?: () => void;
  onChangePlan: (organizationId: string, planCode: string) => Promise<AdminOrganization>;
  onChangeStatus: (
    organizationId: string,
    action: AdminOrganizationStatusAction,
  ) => Promise<AdminOrganization>;
};

export function OrganizationActions({
  organization,
  subscriptionPlans,
  isPlansLoading,
  plansError = "",
  mutation,
  onRetryPlans,
  onChangePlan,
  onChangeStatus,
}: OrganizationActionsProps) {
  return (
    <div className="border-t">
      <PlanAction
        organization={organization}
        subscriptionPlans={subscriptionPlans}
        isPlansLoading={isPlansLoading}
        plansError={plansError}
        mutation={mutation}
        onRetryPlans={onRetryPlans}
        onChangePlan={onChangePlan}
      />
      <StatusAction
        organization={organization}
        mutation={mutation}
        onChangeStatus={onChangeStatus}
      />
    </div>
  );
}

function PlanAction({
  organization,
  subscriptionPlans,
  isPlansLoading,
  plansError,
  mutation,
  onRetryPlans,
  onChangePlan,
}: {
  organization: AdminOrganization;
  subscriptionPlans: AdminSubscriptionPlan[];
  isPlansLoading: boolean;
  plansError: string;
  mutation: OrganizationMutation | null;
  onRetryPlans?: () => void;
  onChangePlan: (organizationId: string, planCode: string) => Promise<AdminOrganization>;
}) {
  const [selectedPlanCode, setSelectedPlanCode] = useState(organization.plan?.code ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const selectedPlan = subscriptionPlans.find((plan) => plan.code === selectedPlanCode);
  const isChanging = isMutationFor(mutation, organization.id, "plan");
  const isBlocked = mutation?.organizationId === organization.id && mutation.kind === "status";
  const canSubmit = canSubmitPlan(organization.plan?.code, selectedPlan);

  async function confirmPlanChange() {
    if (!selectedPlan || !canSubmit) {
      return;
    }

    setError("");
    try {
      await onChangePlan(organization.id, selectedPlan.code);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      throw caughtError;
    }
  }

  return (
    <section className="space-y-4 p-5" aria-label="Suscripción">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Plan actual
          </p>
          <p className="mt-2 truncate text-base font-semibold">
            {formatPlanLabel(organization)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatSubscriptionStatus(organization.subscription?.status)}
          </p>
        </div>
        <ChevronRightIcon aria-hidden="true" className="mt-1 size-4 text-muted-foreground" />
      </div>
      {plansError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          <p>{plansError}</p>
          {onRetryPlans ? (
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onRetryPlans}>
              Reintentar planes
            </Button>
          ) : null}
        </div>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between shadow-none"
        disabled={isPlansLoading || isChanging || isBlocked || Boolean(plansError)}
        onClick={() => {
          setError("");
          setSelectedPlanCode(organization.plan?.code ?? "");
          setConfirmOpen(true);
        }}
      >
        {isChanging ? "Guardando…" : "Cambiar plan"}
        <ChevronRightIcon aria-hidden="true" className="size-4" />
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Cambiar plan"
        description={`Plan actual: ${formatPlanLabel(organization)}. Selecciona el nuevo plan; la suscripción quedará activa.`}
        confirmLabel="Guardar cambio"
        confirmVariant="default"
        confirmDisabled={!canSubmit}
        error={error}
        isLoading={isChanging}
        onConfirm={confirmPlanChange}
      >
        <div className="space-y-3">
          <label className="space-y-1.5 text-sm font-medium">
            <span>Nuevo plan</span>
            <select
              aria-label="Seleccionar plan"
              className="flex h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPlansLoading || isChanging || isBlocked || Boolean(plansError)}
              value={selectedPlanCode}
              onChange={(event) => {
                setSelectedPlanCode(event.target.value);
                setError("");
              }}
            >
              <option value="">Selecciona un plan</option>
              {subscriptionPlans.map((plan) => (
                <option key={plan.id} value={plan.code} disabled={plan.status !== "active"}>
                  {plan.name} ({plan.code}) · {plan.status === "active" ? "Activo" : "Inactivo"}
                  {plan.isPublic ? "" : " · Privado"}
                </option>
              ))}
            </select>
          </label>
          {selectedPlan ? <PlanPreview plan={selectedPlan} /> : null}
        </div>
      </ConfirmDialog>
    </section>
  );
}

function PlanPreview({ plan }: { plan: AdminSubscriptionPlan }) {
  return (
    <div className="rounded-xl bg-muted/45 p-3 text-sm" aria-label="Vista previa del plan">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{plan.name}</p>
          <p className="text-xs text-muted-foreground">
            {plan.code}{plan.isPublic ? "" : " · Privado"}
          </p>
        </div>
        <p className="shrink-0 font-semibold">{formatPlanPrice(plan)} beta</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <span>Clientes: {plan.clientLimit}</span>
        <span>Miembros: {plan.memberLimit}</span>
      </div>
    </div>
  );
}

function StatusAction({
  organization,
  mutation,
  onChangeStatus,
}: {
  organization: AdminOrganization;
  mutation: OrganizationMutation | null;
  onChangeStatus: (
    organizationId: string,
    action: AdminOrganizationStatusAction,
  ) => Promise<AdminOrganization>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const isChanging = isMutationFor(mutation, organization.id, "status");
  const isBlocked = mutation?.organizationId === organization.id && mutation.kind === "plan";

  if (organization.status === "cancelled") {
    return (
      <section className="border-t px-5 py-5" aria-label="Administración">
        <p className="text-xs text-muted-foreground">
          Una organización cancelada no puede cambiar de estado mediante estas acciones.
        </p>
      </section>
    );
  }

  const isSuspending = organization.status === "active";
  const action: AdminOrganizationStatusAction = isSuspending ? "suspend" : "reactivate";

  async function confirmStatusChange() {
    setError("");
    try {
      await onChangeStatus(organization.id, action);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      throw caughtError;
    }
  }

  return (
    <section className="border-t px-5 py-5" aria-label="Administración">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Administración
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {isSuspending
          ? "Suspender temporalmente esta cuenta y bloquear su operación."
          : "Reactivar esta cuenta para que vuelva a operar."}
      </p>
      <Button
        type="button"
        variant={isSuspending ? "destructive" : "outline"}
        className={cn("mt-4 w-full shadow-none", !isSuspending && "text-primary")}
        disabled={isChanging || isBlocked}
        onClick={() => {
          setError("");
          setConfirmOpen(true);
        }}
      >
        {isSuspending ? <BanIcon aria-hidden="true" className="size-4" /> : <RotateCcwIcon aria-hidden="true" className="size-4" />}
        {isChanging ? "Actualizando…" : isSuspending ? "Suspender organización" : "Reactivar organización"}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={isSuspending ? "Suspender organización" : "Reactivar organización"}
        description={
          isSuspending
            ? "La organización quedará bloqueada hasta que un admin la reactive."
            : "La organización volverá a operar con sus permisos actuales."
        }
        confirmLabel={isSuspending ? "Suspender" : "Reactivar"}
        confirmVariant={isSuspending ? "destructive" : "default"}
        error={error}
        isLoading={isChanging}
        onConfirm={confirmStatusChange}
      />
    </section>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado";
}
