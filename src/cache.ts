import type { DecoratedFn, Fn, ValidDefaultArgs } from "./types.ts";
import { createKey } from "./createKey.ts";
import { validate } from "./validate.ts";

type Options = {
  ttl: number;
  size: number;
};

export const cache = <Args extends ValidDefaultArgs[], Return>(
  fn: Fn<Args, Return>,
  options: Options,
): DecoratedFn<Args, Return> => {
  validate.fn(fn);
  validate.positiveInteger(options?.ttl, "options.ttl");
  validate.positiveInteger(options?.size, "options.size");

  const store = new Map<string, { value: Return; expiresAt: number }>();
  const { ttl, size } = options;

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

    if (store.size > size) {
      const leastRecentlyUsed = store.keys().next().value!;
      store.delete(leastRecentlyUsed);
    }

    return value;
  };
};
