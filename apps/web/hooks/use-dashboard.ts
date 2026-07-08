"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { authenticatedRequest } from "@/lib/api/authenticated-request";

type DashboardAttentionStatus =
  | "without_plan"
  | "future_plan"
  | "plan_finished"
  | "without_activity"
  | "at_risk";

export type DashboardAttentionItem = {
  clientId: string;
  name: string;
  status: DashboardAttentionStatus;
  reason: string;
  lastCompletedSessionAt: string | null;
  nextExpectedSessionDate: string | null;
  currentPlan: {
    assignmentId: string;
    assignedPlanId: string;
    name: string;
    startDate: string;
  } | null;
};

export type DashboardSummary = {
  activeClients: number;
  clientsWithoutPlan: number;
  clientsUpToDate: number;
  clientsAtRisk: number;
  clientsWithoutActivity: number;
  pausedClients: number;
  inactiveClients: number;
  sessionsCompletedThisWeek: number;
};

type OnboardingChecklist = {
  hasCreatedClient: boolean;
  hasCreatedOrSelectedPlan: boolean;
  hasAssignedPlan: boolean;
  hasGeneratedAccess: boolean;
  hasPreviewedPortal: boolean;
};

export type CoachDashboardResponse = {
  timezone: string;
  generatedAt: string;
  summary: DashboardSummary;
  attention: DashboardAttentionItem[];
  onboarding: {
    totalClients: number;
    totalPlans: number;
    clientsWithPlan: number;
    clientsWithoutPlan: number;
    clientsWithAccess: number;
    checklist: OnboardingChecklist;
  };
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No pudimos cargar el dashboard.";
}

export function useDashboard() {
  const { profile, session, status: authStatus } = useAuth();
  const [stats, setStats] = useState<CoachDashboardResponse | null>(null);
  const [isRequestLoading, setIsRequestLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadedOrganizationId, setLoadedOrganizationId] = useState<string | null>(null);

  const organizationId = profile?.organization?.id ?? null;
  const isApiReady =
    authStatus === "authenticated" &&
    Boolean(session && organizationId);
  const visibleStats = loadedOrganizationId === organizationId ? stats : null;
  const isInitialLoading =
    (authStatus === "loading" && !visibleStats) || (isRequestLoading && !visibleStats);
  const isRefreshing = isRequestLoading && Boolean(visibleStats);

  const loadStats = useCallback(async () => {
    if (!isApiReady) {
      if (authStatus !== "loading") {
        setStats(null);
        setLoadedOrganizationId(null);
      }
      setError(authStatus === "loading" ? "" : "Inicia sesión para ver tu dashboard.");
      return;
    }

    setIsRequestLoading(true);
    setError("");

    try {
      const response = await authenticatedRequest<CoachDashboardResponse>(
        "/dashboard/coach",
        { method: "GET" },
        { organizationId, session },
      );
      setStats(response);
      setLoadedOrganizationId(organizationId);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsRequestLoading(false);
    }
  }, [authStatus, isApiReady, organizationId, session]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStats();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadStats]);

  return {
    error,
    isApiReady,
    isInitialLoading,
    isRefreshing,
    refresh: loadStats,
    stats: visibleStats,
  };
}
