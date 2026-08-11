import type { DecoratedFn, Fn } from "./types.ts";
import { createKey } from "./createKey.ts";

export const cache = <Args extends unknown[], Return>(
  fn: Fn<Args, Return>,
  options: {
    ttl: number;
    maxSize: number;
  },
): DecoratedFn<Args, Return> => {
  const store = new Map<string, { value: Return; expiresAt: number }>();
  // TODO validate options
  // TODO validate maxSize > 0
  const { ttl, maxSize } = options;

  return async (...args: Args): Promise<Return> => {
    const key = createKey(...args);

    if (store.has(key)) {
      const { value, expiresAt } = store.get(key)!;
      if (expiresAt > Date.now()) {
        // Re-insert value to move it to the end of map, as map preserves insertion order.
        store.delete(key);
        store.set(key, { value, expiresAt });

        return value;
      }

      store.delete(key);
    }

    const value = await fn(...args);
    const expiresAt = Date.now() + ttl;
    store.set(key, { value, expiresAt });

    if (store.size > maxSize) {
      const leastRecentlyUsed = store.keys().next().value!;
      store.delete(leastRecentlyUsed);
    }

    return value;
  };
};
