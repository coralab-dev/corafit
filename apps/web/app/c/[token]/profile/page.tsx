import { PlaceholderScreen } from "@/components/client-portal/client-portal";

export default async function ClientPortalProfilePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <PlaceholderScreen token={token} active="profile" title="Perfil" />;
}
