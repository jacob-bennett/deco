export type Fn<Args extends unknown[], Return> = (
  ...args: Args
) => Promise<Return> | Return;

export type DecoratedFn<Args extends unknown[], Return> = (
  ...args: Args
) => Promise<Return>;

export type ValidDefaultArgs = string | number | boolean;

export type KeyGenerator<Args extends unknown[]> = (...args: Args) => string;
