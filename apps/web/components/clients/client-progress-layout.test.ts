import { assert, test } from "vitest";
import { resolveClientProgressLayout } from "./client-progress-layout.ts";

test("keeps drawer layout unchanged", () => {
  assert.deepEqual(
    resolveClientProgressLayout({
      isFormOpen: false,
      recordCount: 3,
      tab: "weight",
      variant: "drawer",
    }),
    { kind: "drawer" },
  );
});

test("uses full history when the page form is closed and records exist", () => {
  assert.deepEqual(
    resolveClientProgressLayout({
      isFormOpen: false,
      recordCount: 2,
      tab: "photos",
      variant: "page",
    }),
    { kind: "full-history" },
  );
});

test("uses an empty state with integrated CTA when closed and empty", () => {
  assert.deepEqual(
    resolveClientProgressLayout({
      isFormOpen: false,
      recordCount: 0,
      tab: "notes",
      variant: "page",
    }),
    { kind: "empty-with-cta" },
  );
});

test("uses full form for the first page record", () => {
  assert.deepEqual(
    resolveClientProgressLayout({
      isFormOpen: true,
      recordCount: 0,
      tab: "weight",
      variant: "page",
    }),
    { kind: "full-form", formWidth: "narrow" },
  );
});

test("keeps measurements form wide instead of using a sidebar", () => {
  assert.deepEqual(
    resolveClientProgressLayout({
      isFormOpen: true,
      recordCount: 4,
      tab: "measurements",
      variant: "page",
    }),
    { kind: "measurements-form" },
  );
});

test("uses split only for page records outside measurements", () => {
  assert.deepEqual(
    resolveClientProgressLayout({
      isFormOpen: true,
      recordCount: 4,
      tab: "photos",
      variant: "page",
    }),
    { kind: "split" },
  );
});
