import type { ReactNode } from "react";
import { AdminAreaGate } from "@/components/providers/admin-area-gate";
import { AdminOrganizationsProvider } from "@/components/providers/admin-organizations-provider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAreaGate>
      <AdminOrganizationsProvider>{children}</AdminOrganizationsProvider>
    </AdminAreaGate>
  );
}
