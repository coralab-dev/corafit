import { AssignPlanWorkspace } from "@/components/clients/assign-plan-workspace";

export default async function ClientPlanAssignmentPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;

  return <AssignPlanWorkspace clientId={clientId} />;
}
