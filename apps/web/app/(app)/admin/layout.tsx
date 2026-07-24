import type { ReactNode } from "react";
import { AdminAreaGate } from "@/components/providers/admin-area-gate";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminAreaGate>{children}</AdminAreaGate>;
}
