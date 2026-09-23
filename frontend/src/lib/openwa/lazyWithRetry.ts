import type { ComponentType } from "react";

type Loader<T> = () => Promise<{ default: T }>;

export function lazyWithRetry<T extends ComponentType<unknown>>(loader: Loader<T>, retries = 2): Loader<T> {
  return async () => {
    let last: unknown;
    for (let i = 0; i <= retries; i++) {
      try {
        return await loader();
      } catch (err) {
        last = err;
        if (i < retries) await new Promise((r) => setTimeout(r, 400 * (i + 1)));
      }
    }
    throw last;
  };
}
