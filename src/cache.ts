import type { DecoratedFn, Fn, ValidDefaultArgs } from "./types.ts";
import { createKey } from "./createKey.ts";

type Options = {
  ttl: number;
  maxSize: number;
};

export const cache = <Args extends ValidDefaultArgs[], Return>(
  fn: Fn<Args, Return>,
  options: Options,
): DecoratedFn<Args, Return> => {
  validateArgs(fn, options);

  const store = new Map<string, { value: Return; expiresAt: number }>();
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

const validateArgs = (fn: unknown, options: Options) => {
  if (typeof fn !== "function") {
    throw new TypeError("parameter must be a function");
  }

  if (!options) {
    throw new TypeError("options are required");
  }

  validatePositiveNumber(options.ttl, "options.ttl");
  validatePositiveNumber(options.maxSize, "options.maxSize");
};

const validatePositiveNumber: (
  val: number,
  name: string,
) => asserts val is number = (val, field) => {
  if (val === undefined) {
    throw new TypeError(`${field} is required`);
  }

  if (typeof val !== "number") {
    throw new TypeError(`${field} must be a number`);
  }

  if (val < 1) {
    throw new TypeError(`${field} must be > 0`);
  }
};
