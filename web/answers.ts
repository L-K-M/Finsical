/** Requests waiting for an answer that comes back over the bus, keyed
 * by request id. Each answer settles its own request only, so one that
 * arrives after its request stopped waiting can't settle a newer one. */
export function answerBook<T>(): {
  /** Wait up to `ms` for request `id`'s answer: null when none came. */
  wait(id: string, ms: number): Promise<T | null>;
  settle(id: string, value: T): void;
} {
  const waiting = new Map<string, (value: T | null) => void>();
  return {
    wait(id, ms) {
      return new Promise((resolve) => {
        const done = (value: T | null) => {
          clearTimeout(timer);
          waiting.delete(id);
          resolve(value);
        };
        const timer = setTimeout(() => done(null), ms);
        waiting.set(id, done);
      });
    },
    settle(id, value) { waiting.get(id)?.(value); },
  };
}
