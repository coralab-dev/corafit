import { assert, test } from "vitest";
import {
  clientDetailTabs,
  resolveClientDetailTabForClient,
} from "./client-detail-navigation.ts";

test("exposes the five client detail tabs in drawer order", () => {
  assert.deepEqual(
    clientDetailTabs.map((tab) => tab.label),
    ["Resumen", "Plan", "Progreso", "Acceso", "Notas"],
  );
});

test("keeps the current tab for the same client", () => {
  assert.equal(resolveClientDetailTabForClient("plan", "client-1", "client-1"), "plan");
});

test("resets to summary when the selected client changes", () => {
  assert.equal(resolveClientDetailTabForClient("notes", "client-1", "client-2"), "summary");
});
