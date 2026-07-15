import type {
  ClientPortalBodyMeasurement,
  ClientPortalProgressNote,
  ClientPortalProgressPhoto,
} from "@/lib/client-portal/api";

export type ProgressTabState<T> = {
  data: T;
  error: string | null;
  loaded: boolean;
  loading: boolean;
  requestId: number;
};

export type ProgressSummary = {
  latestRecordedAt: string | null;
  visibleCount: number;
};

export type NoteSummary = {
  latestCreatedAt: string | null;
  visibleCount: number;
};

export type VisibleMeasurementField = {
  key: keyof Pick<
    ClientPortalBodyMeasurement,
    "armCm" | "chestCm" | "gluteCm" | "hipCm" | "legCm" | "waistCm"
  >;
  label: string;
  value: number;
};

const measurementFieldOrder: Array<Omit<VisibleMeasurementField, "value">> = [
  { key: "waistCm", label: "Cintura" },
  { key: "hipCm", label: "Cadera" },
  { key: "chestCm", label: "Pecho" },
  { key: "armCm", label: "Brazo" },
  { key: "legCm", label: "Pierna" },
  { key: "gluteCm", label: "Glúteo" },
];

export function buildMeasurementSummary(
  items: ClientPortalBodyMeasurement[],
): ProgressSummary {
  return {
    latestRecordedAt: items[0]?.recordedAt ?? null,
    visibleCount: items.length,
  };
}

export function getVisibleMeasurementFields(
  item: ClientPortalBodyMeasurement,
): VisibleMeasurementField[] {
  return measurementFieldOrder.flatMap((field) => {
    const value = item[field.key];

    return value === null ? [] : [{ ...field, value }];
  });
}

export function buildPhotoSummary(
  items: ClientPortalProgressPhoto[],
): ProgressSummary {
  return {
    latestRecordedAt: items[0]?.recordedAt ?? null,
    visibleCount: items.length,
  };
}

export function upsertProgressPhoto(
  items: ClientPortalProgressPhoto[],
  next: ClientPortalProgressPhoto,
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

export function deleteProgressPhotoById(
  items: ClientPortalProgressPhoto[],
  id: string,
) {
  return items.filter((item) => item.id !== id);
}

export function canClientDeleteProgressPhoto(item: ClientPortalProgressPhoto) {
  return item.uploadedByType === "client";
}

export function buildNoteSummary(
  items: ClientPortalProgressNote[],
): NoteSummary {
  return {
    latestCreatedAt: items[0]?.createdAt ?? null,
    visibleCount: items.length,
  };
}

export function applyProgressTabSuccess<T>(
  state: ProgressTabState<T>,
  data: T,
): ProgressTabState<T> {
  return {
    ...state,
    data,
    error: null,
    loaded: true,
    loading: false,
  };
}

export function applyProgressTabError<T>(
  state: ProgressTabState<T>,
  error: string,
): ProgressTabState<T> {
  return {
    ...state,
    error,
    loading: false,
  };
}

export function shouldAutoLoadProgressTab<T>(state: ProgressTabState<T>) {
  return !state.loaded && !state.loading && !state.error;
}
