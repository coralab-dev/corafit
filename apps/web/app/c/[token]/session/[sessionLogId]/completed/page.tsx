import { CompletionCardScreen } from "@/components/client-portal/client-portal";

export default async function ClientPortalSessionCompletedPage({
  params,
}: {
  params: Promise<{ token: string; sessionLogId: string }>;
}) {
  const { token, sessionLogId } = await params;

  return <CompletionCardScreen token={token} sessionLogId={sessionLogId} />;
}
