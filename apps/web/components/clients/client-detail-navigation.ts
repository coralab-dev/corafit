export type ClientDetailTab = "summary" | "plan" | "progress" | "access" | "notes";

export const clientDetailTabs: Array<{ key: ClientDetailTab; label: string }> = [
  { key: "summary", label: "Resumen" },
  { key: "plan", label: "Plan" },
  { key: "progress", label: "Progreso" },
  { key: "access", label: "Acceso" },
  { key: "notes", label: "Notas" },
];

export function resolveClientDetailTabForClient(
  currentTab: ClientDetailTab,
  previousClientId: string,
  nextClientId: string,
): ClientDetailTab {
  return previousClientId === nextClientId ? currentTab : "summary";
}
