import { Queue } from "./Queue.ts";
import type { Fn, DecoratedFn } from "./types.ts";

export const limit = <Args extends unknown[], Return>(
  fn: Fn<Args, Return>,
  limit: number,
): DecoratedFn<Args, Return> => {
  validateArgs(fn, limit);

  let processing = 0;

  const queue = new Queue<{
    args: Args;
    resolve: (result: Return) => void;
    reject: (error: unknown) => void;
  }>();

  const next = () => {
    const { args, resolve, reject } = queue.dequeue();
    run(args).then(resolve, reject);
  };

  const run = async (args: Args) => {
    processing++;

    try {
      return await fn(...args);
    } finally {
      processing--;
      if (queue.length > 0) {
        next();
      }
    }
  };

  return async (...args) => {
    if (processing < limit) {
      return run(args);
    }

    return new Promise((resolve, reject) =>
      queue.enqueue({ args, resolve, reject }),
    );
  };
};

const validateArgs = (fn: unknown, limit: number) => {
  if (typeof fn !== "function") {
    throw new TypeError("parameter must be a function");
  }

  if (typeof limit !== "number") {
    throw new TypeError("limit must be a number");
  }

  if (limit < 1) {
    throw new TypeError("limit must be >= 1");
  }
};
