import { PinAccessScreen } from "@/components/client-portal/client-portal";

export default async function ClientPortalAccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <PinAccessScreen token={token} />;
}
