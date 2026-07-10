import assert from "node:assert/strict";
import test from "node:test";
import { dayLabels, dayOfWeekValues } from "./training-plan-days.ts";

test("lists training plan days from Monday through Sunday", () => {
  assert.deepEqual(dayOfWeekValues, [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ]);
  assert.deepEqual(dayOfWeekValues.map((day) => dayLabels[day]), [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ]);
});
