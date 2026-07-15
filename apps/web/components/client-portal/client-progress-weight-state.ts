import type { ClientPortalWeightLog } from "@/lib/client-portal/api";

export type ClientProgressWeightSummary = {
  latestRecordedAt: string | null;
  latestWeightKg: number | null;
  visibleCount: number;
};

export function buildWeightSummary(
  items: ClientPortalWeightLog[],
): ClientProgressWeightSummary {
  const latest = items[0] ?? null;

  return {
    latestRecordedAt: latest?.recordedAt ?? null,
    latestWeightKg: latest?.weightKg ?? null,
    visibleCount: items.length,
  };
}

export function upsertWeightLog(
  items: ClientPortalWeightLog[],
  next: ClientPortalWeightLog,
) {
  return [...items.filter((item) => item.id !== next.id), next].sort(
    (left, right) =>
      new Date(right.recordedAt).getTime() - new Date(left.recordedAt).getTime(),
  );
}

export function deleteWeightLogById(
  items: ClientPortalWeightLog[],
  id: string,
) {
  return items.filter((item) => item.id !== id);
}

export function canClientManageWeightLog(item: ClientPortalWeightLog) {
  return item.recordedByType === "client";
}
