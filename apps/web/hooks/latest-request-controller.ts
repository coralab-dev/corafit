export type LatestRequest = {
  id: number;
  signal: AbortSignal;
};

export type LatestRequestController = {
  start(): LatestRequest;
  invalidate(): void;
  isCurrent(id: number): boolean;
  finish(id: number): void;
};

export function createLatestRequestController(): LatestRequestController {
  let activeController: AbortController | null = null;
  let activeId: number | null = null;
  let nextId = 0;

  return {
    start() {
      activeController?.abort();
      const controller = new AbortController();
      const id = ++nextId;
      activeController = controller;
      activeId = id;
      return { id, signal: controller.signal };
    },
    invalidate() {
      activeController?.abort();
      activeController = null;
      activeId = null;
      nextId += 1;
    },
    isCurrent(id: number) {
      return activeId === id;
    },
    finish(id: number) {
      if (activeId !== id) {
        return;
      }
      activeController = null;
      activeId = null;
    },
  };
}
