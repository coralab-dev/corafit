import { ClientAccessWorkspace } from "@/components/clients/client-access-workspace";

export default async function ClientAccessPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;

  return <ClientAccessWorkspace clientId={clientId} />;
}
