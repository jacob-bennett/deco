import { createKey } from "./createKey.ts";
import type {
  Fn,
  ValidDefaultArgs,
  DecoratedFn,
  KeyGenerator,
} from "./types.ts";

export function coalesce<Args extends ValidDefaultArgs[], Return>(
  fn: Fn<Args, Return>,
): DecoratedFn<Args, Return>;
export function coalesce<Args extends unknown[], Return>(
  fn: Fn<Args, Return>,
  generateKey: KeyGenerator<Args>,
): DecoratedFn<Args, Return>;
export function coalesce<Args extends unknown[], Return>(
  fn: Fn<Args, Return>,
  generateKey?: KeyGenerator<Args>,
): DecoratedFn<Args, Return> {
  const inFlightRequests: Map<string, Promise<Return>> = new Map();

  return async (...args: Args): Promise<Return> => {
    const key = generateKey ? generateKey(...args) : createKey(...args);

    const matchingRequest = inFlightRequests.get(key);
    if (matchingRequest) {
      return matchingRequest;
    }

    const promise = Promise.resolve()
      .then(() => fn(...args))
      .finally(() => inFlightRequests.delete(key));

    inFlightRequests.set(key, promise);

    return promise;
  };
}
