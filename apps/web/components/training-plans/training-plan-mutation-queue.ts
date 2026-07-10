export type MutationQueue = {
  readonly pendingCount: number;
  enqueue<T>(action: () => Promise<T>): Promise<T>;
  waitForIdle(): Promise<void>;
};

export type ExerciseMutationQueue = {
  readonly size: number;
  enqueue<T>(exerciseId: string, action: () => Promise<T>): Promise<T>;
  waitForAll(): Promise<void>;
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

export function createExerciseMutationQueue(
  enqueueMutation: <T>(action: () => Promise<T>) => Promise<T>,
): ExerciseMutationQueue {
  const queues = new Map<string, Promise<unknown>>();

  function cleanup(exerciseId: string, operation: Promise<unknown>) {
    if (queues.get(exerciseId) === operation) {
      queues.delete(exerciseId);
    }
  }

  return {
    get size() {
      return queues.size;
    },
    enqueue<T>(exerciseId: string, action: () => Promise<T>) {
      const previous = queues.get(exerciseId) ?? Promise.resolve();
      const current = previous.then(() => enqueueMutation(action));
      const tracked = current.catch(() => undefined);
      queues.set(exerciseId, tracked);
      return current.finally(() => cleanup(exerciseId, tracked));
    },
    async waitForAll() {
      while (queues.size > 0) {
        await Promise.all(queues.values());
      }
    },
  };
}
