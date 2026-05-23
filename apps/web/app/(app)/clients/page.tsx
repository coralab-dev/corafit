import { Suspense } from "react";
import { ClientsWorkspace } from "@/app/clients-workspace";

export default function ClientsPage() {
  return (
    <Suspense fallback={null}>
      <ClientsWorkspace />
    </Suspense>
  );
}
