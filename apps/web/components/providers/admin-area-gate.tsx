"use client";

import type { ReactNode } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { useAuth } from "./auth-provider";
import { WorkspaceFrame, WorkspaceHeader } from "@/components/layout/workspace-shell";

export function AdminAreaGate({ children }: { children: ReactNode }) {
  const { profile, status } = useAuth();

  if (status === "loading") {
    return (
      <AdminAccessFrame description="Validando permisos.">
        <div className="flex flex-1 items-center justify-center bg-background p-6">
          <p className="text-sm text-muted-foreground">Validando permisos...</p>
        </div>
      </AdminAccessFrame>
    );
  }

  if (status !== "authenticated" || profile?.user.platformRole !== "admin_saas") {
    return (
      <AdminAccessFrame description="Herramientas internas para administracion SaaS.">
        <div className="flex flex-1 items-center justify-center bg-background p-6">
          <ErrorState
            title="Acceso denegado"
            message="Tu usuario no tiene permisos de administrador SaaS."
          />
        </div>
      </AdminAccessFrame>
    );
  }

  return children;
}

function AdminAccessFrame({ children, description }: { children: ReactNode; description: string }) {
  return (
    <WorkspaceFrame header={<WorkspaceHeader title="Admin" description={description} />}>
      {children}
    </WorkspaceFrame>
  );
}
