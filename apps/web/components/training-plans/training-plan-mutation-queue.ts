export type MutationQueue = {
  readonly pendingCount: number;
  enqueue<T>(action: () => Promise<T>): Promise<T>;
  waitForIdle(): Promise<void>;
};

export function createMutationQueue(
  onPendingCountChange?: (count: number) => void,
): MutationQueue {
  let tail: Promise<unknown> = Promise.resolve();
  let pendingCount = 0;

  function updatePendingCount(nextCount: number) {
    pendingCount = Math.max(0, nextCount);
    onPendingCountChange?.(pendingCount);
  }

  return {
    get pendingCount() {
      return pendingCount;
    },
    enqueue<T>(action: () => Promise<T>) {
      updatePendingCount(pendingCount + 1);
      const operation = tail.then(action);
      const trackedOperation = operation.finally(() => {
        updatePendingCount(pendingCount - 1);
      });

      tail = trackedOperation.catch(() => undefined);
      return trackedOperation;
    },
    waitForIdle() {
      return tail.then(() => undefined);
    },
  };
}
