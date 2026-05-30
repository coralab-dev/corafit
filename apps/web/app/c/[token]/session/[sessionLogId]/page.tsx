import { SessionScreen } from "@/components/client-portal/client-portal";

export default async function ClientPortalSessionPage({
  params,
}: {
  params: Promise<{ token: string; sessionLogId: string }>;
}) {
  const { token, sessionLogId } = await params;

  return <SessionScreen token={token} sessionLogId={sessionLogId} />;
}
