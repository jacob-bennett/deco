import type { DecoratedFn, Fn } from "./types.ts";
import { createKey } from "./createKey.ts";

export const cache = <Args extends unknown[], Return>(
  fn: Fn<Args, Return>,
  options: {
    ttl: number;
  },
): DecoratedFn<Args, Return> => {
  const store = new Map<string, { value: Return; expiresAt: number }>();

  // TODO validate options

  const { ttl } = options;

  return async (...args: Args): Promise<Return> => {
    const key = createKey(...args);

    if (store.has(key)) {
      const { value, expiresAt } = store.get(key)!;
      if (expiresAt > Date.now()) {
        return value;
      }

      store.delete(key);
    }

    const value = await fn(...args);
    const expiresAt = Date.now() + ttl;
    store.set(key, { value, expiresAt });

    return value;
  };
};
