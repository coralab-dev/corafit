import { ClientPortalAccessGate } from "@/components/client-portal/client-access-gate";

export default async function ClientPortalAccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <ClientPortalAccessGate token={token} />;
}
