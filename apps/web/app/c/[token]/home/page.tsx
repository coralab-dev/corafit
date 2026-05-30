import { ClientHomeScreen } from "@/components/client-portal/client-portal";

export default async function ClientPortalHomePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <ClientHomeScreen token={token} />;
}
