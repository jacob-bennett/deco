import type { DecoratedFn, Fn } from "./types.ts";
import { createKey } from "./createKey.ts";

export const cache = <Args extends unknown[], Return>(
  fn: Fn<Args, Return>,
): DecoratedFn<Args, Return> => {
  const store = new Map<string, Return>();

  return async (...args: Args): Promise<Return> => {
    const key = createKey(...args);

    if (store.has(key)) {
      return store.get(key)!;
    }

    const res = await fn(...args);

    store.set(key, res);
    return res;
  };
};
