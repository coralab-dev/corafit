export type ClientProgressLayoutTab = "weight" | "measurements" | "photos" | "notes";
export type ClientProgressLayoutVariant = "drawer" | "page";

export type ClientProgressLayoutDecision =
  | { kind: "drawer" }
  | { kind: "full-history" }
  | { kind: "empty-with-cta" }
  | { kind: "full-form"; formWidth: "narrow" | "wide" }
  | { kind: "measurements-form" }
  | { kind: "split" };

export function resolveClientProgressLayout({
  isFormOpen,
  recordCount,
  tab,
  variant,
}: {
  isFormOpen: boolean;
  recordCount: number;
  tab: ClientProgressLayoutTab;
  variant: ClientProgressLayoutVariant;
}): ClientProgressLayoutDecision {
  if (variant === "drawer") {
    return { kind: "drawer" };
  }

  if (!isFormOpen) {
    return recordCount > 0
      ? { kind: "full-history" }
      : { kind: "empty-with-cta" };
  }

  if (tab === "measurements") {
    return recordCount > 0
      ? { kind: "measurements-form" }
      : { kind: "full-form", formWidth: "wide" };
  }

  if (recordCount === 0) {
    return { kind: "full-form", formWidth: "narrow" };
  }

  return { kind: "split" };
}
