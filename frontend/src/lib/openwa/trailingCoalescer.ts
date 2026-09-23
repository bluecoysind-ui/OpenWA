export interface TrailingCoalescer<K> {
  call(key: K): void;
  flush(): void;
  cancel(): void;
}

export function createTrailingCoalescer<K>(send: (key: K) => void, delayMs: number): TrailingCoalescer<K> {
  const timers = new Map<K, ReturnType<typeof setTimeout>>();
  return {
    call(key: K) {
      const existing = timers.get(key);
      if (existing !== undefined) clearTimeout(existing);
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          send(key);
        }, delayMs),
      );
    },
    flush() {
      const pending = [...timers.keys()];
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      for (const key of pending) send(key);
    },
    cancel() {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    },
  };
}
