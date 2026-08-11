import { describe, it } from "node:test";
import { cache } from "../src/deco.ts";
import assert from "node:assert/strict";

const defaultOpts = {
  ttl: 1000,
  maxSize: 10,
};

describe("Cache", () => {
  describe("Function signatures", () => {
    it("Caches single parameter function", async () => {
      let called = 0;
      const stub = async (param: string) => {
        called++;
        return param;
      };

      const decorated: typeof stub = cache(stub, defaultOpts);

      const res1: Awaited<ReturnType<typeof stub>> = await decorated("hello");
      const res2 = await decorated("hello");
      const res3 = await decorated("world");

      assert.strictEqual(called, 2);
      assert.strictEqual(res1, "hello");
      assert.strictEqual(res2, "hello");
      assert.strictEqual(res3, "world");
    });

    it("Caches multiple param function", async () => {
      type Multiply = (first: string, second: number) => Promise<number>;
      let called = 0;
      const multiply: Multiply = async (first, second) => {
        called++;
        return Number.parseInt(first) * second;
      };

      const decorated: Multiply = cache(multiply, defaultOpts);

      const res1: Awaited<ReturnType<Multiply>> = await decorated("5", 5);
      const res2: Awaited<ReturnType<Multiply>> = await decorated("5", 5);
      const res3: Awaited<ReturnType<Multiply>> = await decorated("5", 10);

      assert.strictEqual(called, 2);
      assert.strictEqual(res1, 25);
      assert.strictEqual(res2, 25);
      assert.strictEqual(res3, 50);
    });

    it("Caches zero param function", async () => {
      let called = 0;
      const fn = async () => {
        called++;
        return "result";
      };

      const decorated: typeof fn = cache(fn, defaultOpts);

      assert.strictEqual(await decorated(), "result");
      assert.strictEqual(await decorated(), "result");
      assert.strictEqual(called, 1);
    });

    it("Promisifies synchronous functions", async () => {
      let called = 0;
      const fn = (param: string) => {
        called++;
        return param;
      };

      const decorated = cache(fn, defaultOpts);

      const promise: Promise<ReturnType<typeof fn>> = decorated("hello");
      assert.strictEqual(promise instanceof Promise, true);

      const res1: Awaited<ReturnType<typeof fn>> = await promise;
      await decorated("hello");
      const res3: string = await decorated("world");

      assert.strictEqual(called, 2);
      assert.strictEqual(res1, "hello");
      assert.strictEqual(res3, "world");
    });
  });

  describe("Return values", () => {
    it("Caches falsy results", async () => {
      let called = 0;
      const stub = async (_: string) => {
        called++;
        return 0;
      };

      const decorated: typeof stub = cache(stub, defaultOpts);

      assert.strictEqual(await decorated("hello"), 0);
      assert.strictEqual(await decorated("hello"), 0);
      assert.strictEqual(called, 1);
    });

    it("Caches undefined results", async () => {
      let called = 0;
      const stub = async (_: string) => {
        called++;
        return undefined;
      };

      const decorated: typeof stub = cache(stub, defaultOpts);

      assert.strictEqual(await decorated("hello"), undefined);
      assert.strictEqual(await decorated("hello"), undefined);
      assert.strictEqual(called, 1);
    });

    it("Returns the same reference on cache hit", async () => {
      const fn = async (_: string) => ({ value: "result" });

      const decorated = cache(fn, defaultOpts);

      const res1 = await decorated("hello");
      const res2 = await decorated("hello");

      assert.strictEqual(res1, res2);
    });
  });

  describe("TTL", () => {
    it("Expires cached items after TTL is exceeded", async (context) => {
      let called = 0;
      const stub = async (param: string) => {
        called++;
        return `${param}-${called}`;
      };

      context.mock.timers.enable({ apis: ["Date"] });
      const decorated: typeof stub = cache(stub, { ttl: 1000, maxSize: 10 });

      assert.strictEqual(await decorated("test"), `test-${1}`);
      assert.strictEqual(called, 1);

      context.mock.timers.tick(999);
      assert.strictEqual(await decorated("test"), `test-${1}`);
      assert.strictEqual(called, 1);

      context.mock.timers.tick(1);
      assert.strictEqual(await decorated("test"), `test-${2}`);
      assert.strictEqual(called, 2);

      assert.strictEqual(await decorated("test"), `test-${2}`);
      assert.strictEqual(called, 2);
    });
  });

  describe("Eviction", () => {
    it("Evicts by insertion order", async () => {
      let called = 0;
      const stub = async (param: string) => {
        called++;
        return param;
      };

      const decorated: typeof stub = cache(stub, { ttl: 1000, maxSize: 2 });

      await decorated("one");
      await decorated("two");
      await decorated("three");
      assert.strictEqual(called, 3);

      await decorated("two");
      await decorated("three");
      assert.strictEqual(called, 3);

      await decorated("one");
      assert.strictEqual(called, 4);

      await decorated("two");
      assert.strictEqual(called, 5);
      assert.strictEqual(await decorated("two"), "two");
    });

    it("Evicts by least recently used", async () => {
      let called = 0;
      const stub = async (_: string) => called++;

      const decorated: typeof stub = cache(stub, { ttl: 1000, maxSize: 3 });

      await decorated("one");
      await decorated("two");
      await decorated("three");
      assert.strictEqual(called, 3);

      await decorated("one");
      assert.strictEqual(called, 3);

      await decorated("four");
      await decorated("five");
      assert.strictEqual(called, 5);

      await decorated("one");
      assert.strictEqual(called, 5);

      await decorated("two");
      await decorated("three");
      assert.strictEqual(called, 7);

      await decorated("four");
      await decorated("five");
      assert.strictEqual(called, 9);
    });

    it("Removes least recently used cached items that have expired", async (context) => {
      let called = 0;
      const stub = async (param: string) => {
        called++;
        return param;
      };

      context.mock.timers.enable({ apis: ["Date"] });
      const decorated: typeof stub = cache(stub, { ttl: 1000, maxSize: 2 });

      await decorated("one");
      await decorated("two");

      context.mock.timers.tick(1000);
      assert.strictEqual(await decorated("one"), "one");
      assert.strictEqual(await decorated("two"), "two");
      assert.strictEqual(called, 4);

      assert.strictEqual(await decorated("three"), "three");
      assert.strictEqual(called, 5);

      assert.strictEqual(await decorated("two"), "two");
      assert.strictEqual(called, 5);

      assert.strictEqual(await decorated("one"), "one");
      assert.strictEqual(called, 6);

      assert.strictEqual(await decorated("two"), "two");
      assert.strictEqual(called, 6);

      assert.strictEqual(await decorated("three"), "three");
      assert.strictEqual(called, 7);
    });
  });

  describe("Concurrency", () => {
    it("Doesn't exceed maxSize when calls are concurrent", async () => {
      let called = 0;
      const stub = async (_: string) => called++;

      const decorated: typeof stub = cache(stub, { ttl: 1000, maxSize: 2 });

      await Promise.all([
        decorated("one"),
        decorated("two"),
        decorated("three"),
      ]);
      assert.strictEqual(called, 3);

      await Promise.all([
        decorated("one"),
        decorated("two"),
        decorated("three"),
      ]);
      assert.strictEqual(called, 4);
    });

    it("Doesn't deduplicate concurrent calls", async () => {
      let called = 0;
      const fn = async (_: string) => {
        called++;
        return "result";
      };

      const decorated = cache(fn, defaultOpts);

      const results = await Promise.all([
        decorated("hello"),
        decorated("hello"),
      ]);

      assert.strictEqual(called, 2);
      assert.deepStrictEqual(results, ["result", "result"]);
    });
  });

  describe("Errors", () => {
    it("Doesn't evict when the decorated function errors", async () => {
      let called = 0;
      const stub = async (param: string) => {
        called++;
        if (param === "fail") {
          throw new Error("TestError");
        }

        return param;
      };

      const decorated: typeof stub = cache(stub, { ttl: 1000, maxSize: 1 });

      assert.strictEqual(await decorated("one"), "one");
      assert.strictEqual(called, 1);

      await assert.rejects(() => decorated("fail"), {
        name: "Error",
        message: "TestError",
      });
      assert.strictEqual(called, 2);

      assert.strictEqual(await decorated("one"), "one");
      assert.strictEqual(called, 2);
    });

    it("Doesn't cache rejected calls", async () => {
      let throwError = true;
      const fn = async (_: string) => {
        if (throwError) {
          throw new Error("TestError");
        }

        return "success";
      };

      const decorated: typeof fn = cache(fn, defaultOpts);
      await assert.rejects(() => decorated("param"), {
        name: "Error",
        message: "TestError",
      });

      throwError = false;
      assert.strictEqual(await decorated("param"), "success");
    });

    it("Throws errors for invalid parameter types", async () => {
      const multiply = async (first: string, second: number) =>
        Number.parseInt(first) * second;

      const decorated = cache(multiply, defaultOpts);

      // @ts-expect-error invalid parameter type
      await assert.rejects(() => decorated({ value: "one" }, 1), {
        name: "KeyGenerationError",
        message:
          "Unable to generate key from parameters. Invalid parameter type: object.",
      });

      // @ts-expect-error invalid parameter type
      await assert.rejects(() => decorated("one", { value: 1 }), {
        name: "KeyGenerationError",
        message:
          "Unable to generate key from parameters. Invalid parameter type: object.",
      });
    });
  });

  describe("Types", () => {
    it("Fails typechecking with incorrect usage", async () => {
      const multiply = async (first: string, second: number) =>
        Number.parseInt(first) * second;

      const decorated = cache(multiply, defaultOpts);

      // @ts-expect-error missing parameter
      await decorated("one");

      // @ts-expect-error wrong parameter type
      await decorated(1, 1);

      // @ts-expect-error wrong parameter type
      await decorated("one", "one");
    });
  });
});
