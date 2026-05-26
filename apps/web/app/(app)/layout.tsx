import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedAppGate } from "@/components/providers/auth-gates";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedAppGate>
      <AppShell>{children}</AppShell>
    </ProtectedAppGate>
  );
}
