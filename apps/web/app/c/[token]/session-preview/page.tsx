import { Suspense } from "react";
import { SessionPreviewScreen } from "@/components/client-portal/client-portal";

export default async function ClientPortalSessionPreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <Suspense fallback={null}>
      <SessionPreviewScreen token={token} />
    </Suspense>
  );
}
