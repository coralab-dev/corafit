import assert from "node:assert/strict";
import test from "node:test";
import { archiveTrainingPlan } from "./training-plan-editor-actions.ts";
import { createMutationQueue } from "./training-plan-mutation-queue.ts";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function createArchiveOptions(
  overrides: Partial<Parameters<typeof archiveTrainingPlan>[0]> = {},
) {
  const calls: string[] = [];
  const globalActionInFlightRef = { current: false };
  const options: Parameters<typeof archiveTrainingPlan>[0] = {
    blurActiveEditorField: () => calls.push("blur"),
    globalActionInFlightRef,
    isBusy: false,
    notifyError: () => calls.push("error"),
    notifySuccess: () => calls.push("success"),
    plan: { isSystemTemplate: false, status: "draft" },
    redirect: () => calls.push("redirect"),
    saveAllDrafts: async () => {
      calls.push("save");
      return true;
    },
    setIsArchiving: (value) => calls.push(value ? "archiving:on" : "archiving:off"),
    setPublishState: (state) => calls.push(`state:${state}`),
    updatePlanStatus: async () => {
      calls.push("archive");
    },
    waitForMutations: async () => {
      calls.push("wait");
    },
    ...overrides,
  };
  return { calls, globalActionInFlightRef, options };
}

test("runs structural mutations in order and preserves each action result", async () => {
  const calls: string[] = [];
  const pendingCounts: number[] = [];
  const queue = createMutationQueue((count) => pendingCounts.push(count));
  const first = deferred<void>();

  const firstResult = queue.enqueue(async () => {
    calls.push("A");
    await first.promise;
    return "result-A";
  });
  const secondResult = queue.enqueue(async () => {
    calls.push("B");
    return "result-B";
  });

  await Promise.resolve();
  assert.deepEqual(calls, ["A"]);

  first.resolve();
  assert.equal(await firstResult, "result-A");
  assert.equal(await secondResult, "result-B");
  assert.deepEqual(calls, ["A", "B"]);
  assert.equal(queue.pendingCount, 0);
  assert.equal(pendingCounts.at(-1), 0);
});

test("continues with the next mutation when the previous one fails", async () => {
  const calls: string[] = [];
  const queue = createMutationQueue();
  const failure = new Error("A failed");
  const firstResult = queue.enqueue(async () => {
    calls.push("A");
    throw failure;
  });
  const secondResult = queue.enqueue(async () => {
    calls.push("B");
    return "result-B";
  });

  await assert.rejects(firstResult, failure);
  assert.equal(await secondResult, "result-B");
  assert.deepEqual(calls, ["A", "B"]);
  assert.equal(queue.pendingCount, 0);
});

test("saves drafts, waits for pending mutations, and redirects after archiving", async () => {
  const { calls, options } = createArchiveOptions();

  assert.equal(await archiveTrainingPlan(options), true);
  assert.deepEqual(calls, [
    "archiving:on",
    "state:saving",
    "blur",
    "save",
    "wait",
    "archive",
    "state:saved",
    "success",
    "redirect",
    "archiving:off",
  ]);
});

test("does not update the plan status until pending mutations finish", async () => {
  const mutationGate = deferred<void>();
  const { calls, options } = createArchiveOptions({
    waitForMutations: async () => {
      calls.push("wait:start");
      await mutationGate.promise;
      calls.push("wait:end");
    },
  });

  const archive = archiveTrainingPlan(options);
  await Promise.resolve();
  assert.equal(calls.includes("archive"), false);

  mutationGate.resolve();
  assert.equal(await archive, true);
  assert.deepEqual(calls.slice(0, 7), [
    "archiving:on",
    "state:saving",
    "blur",
    "save",
    "wait:start",
    "wait:end",
    "archive",
  ]);
});

test("does not archive or redirect when saving drafts fails", async () => {
  const { calls, options } = createArchiveOptions({
    saveAllDrafts: async () => {
      calls.push("save");
      return false;
    },
  });

  assert.equal(await archiveTrainingPlan(options), false);
  assert.deepEqual(calls, [
    "archiving:on",
    "state:saving",
    "blur",
    "save",
    "state:error",
    "archiving:off",
  ]);
  assert.equal(calls.includes("archive"), false);
  assert.equal(calls.includes("redirect"), false);
});

test("allows only one concurrent archive request", async () => {
  const saveGate = deferred<boolean>();
  const { calls, globalActionInFlightRef, options } = createArchiveOptions({
    saveAllDrafts: async () => {
      calls.push("save");
      return saveGate.promise;
    },
  });

  const firstArchive = archiveTrainingPlan(options);
  const secondArchive = archiveTrainingPlan(options);
  assert.equal(await secondArchive, false);

  saveGate.resolve(true);
  assert.equal(await firstArchive, true);
  assert.equal(calls.filter((call) => call === "archive").length, 1);
  assert.equal(globalActionInFlightRef.current, false);
});
