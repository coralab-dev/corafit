import { ClientsWorkspace } from "@/app/clients-workspace";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;

  return <ClientsWorkspace mode="detail" selectedClientId={clientId} />;
}
