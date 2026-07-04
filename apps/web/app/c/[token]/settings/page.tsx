import { ClientPortalSettingsScreen } from "@/components/client-portal/client-portal";

export default async function ClientPortalSettingsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <ClientPortalSettingsScreen token={token} />;
}
