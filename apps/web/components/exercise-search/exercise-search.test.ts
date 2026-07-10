import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExerciseSearchParams,
  filterSelectableExercises,
  getExercisePageCount,
  shouldShowExcludedPageMessage,
} from "./exercise-search-utils.ts";

test("builds a remote exercise query with the requested page and limit", () => {
  const params = buildExerciseSearchParams({
    equipment: "barbell",
    limit: 8,
    page: 2,
    primaryMuscle: "legs",
    search: "sentadilla",
    type: "custom",
  });

  assert.equal(
    params.toString(),
    "page=2&limit=8&type=custom&search=sentadilla&primaryMuscle=legs&equipment=barbell",
  );
});

test("keeps server totals independent from excluded exercises", () => {
  const items = [{ id: "exercise-50" }, { id: "exercise-51" }];

  assert.deepEqual(filterSelectableExercises(items, ["exercise-50"]), [
    { id: "exercise-51" },
  ]);
  assert.equal(getExercisePageCount(63, 8), 8);
});

test("recognizes a fully excluded page without treating the library as empty", () => {
  assert.equal(shouldShowExcludedPageMessage(63, []), true);
  assert.equal(shouldShowExcludedPageMessage(0, []), false);
});

test("keeps an exercise on a later server page selectable", () => {
  const pageTwo = [{ id: "exercise-51" }, { id: "exercise-52" }];

  assert.deepEqual(filterSelectableExercises(pageTwo, []), pageTwo);
});
