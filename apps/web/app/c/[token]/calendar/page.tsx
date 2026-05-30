import { Suspense } from "react";
import { WeeklyCalendarScreen } from "@/components/client-portal/client-portal";

export default async function ClientPortalCalendarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <Suspense fallback={null}>
      <WeeklyCalendarScreen token={token} />
    </Suspense>
  );
}
