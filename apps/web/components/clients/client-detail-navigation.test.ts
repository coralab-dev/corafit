import { assert, test } from "vitest";
import { clientDetailTabs } from "./client-detail-navigation.ts";

test("exposes the five client detail tabs in drawer order", () => {
  assert.deepEqual(
    clientDetailTabs.map((tab) => tab.label),
    ["Resumen", "Plan", "Progreso", "Acceso", "Notas"],
  );
});
