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
  const existingIndex = items.findIndex((item) => item.id === next.id);
  const positionedItems =
    existingIndex === -1
      ? [next, ...items]
      : items.map((item, index) => (index === existingIndex ? next : item));

  return positionedItems
    .map((item, index) => ({ index, item }))
    .sort((left, right) => {
      const recordedAtDiff =
        new Date(right.item.recordedAt).getTime() -
        new Date(left.item.recordedAt).getTime();

      return recordedAtDiff || left.index - right.index;
    })
    .map(({ item }) => item);
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

export function getLocalWeightDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatWeightRecordedDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}
