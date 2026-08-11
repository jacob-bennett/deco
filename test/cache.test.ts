import { describe, it } from "node:test";
import { cache } from "../src/deco.ts";
import assert from "node:assert/strict";

describe("Cache", () => {
  it("Caches single parameter function", async () => {
    let called = 0;
    const stub = async (param: string) => {
      called++;
      return param;
    };

    const decorated: typeof stub = cache(stub);

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

    const decorated: Multiply = cache(multiply);

    const res1: Awaited<ReturnType<Multiply>> = await decorated("5", 5);
    const res2: Awaited<ReturnType<Multiply>> = await decorated("5", 5);
    const res3: Awaited<ReturnType<Multiply>> = await decorated("5", 10);

    assert.strictEqual(called, 2);
    assert.strictEqual(res1, 25);
    assert.strictEqual(res2, 25);
    assert.strictEqual(res3, 50);
  });

  it("Promisifies synchronous functions", async () => {
    let called = 0;
    const fn = (param: string) => {
      called++;
      return param;
    };

    const decorated = cache(fn);

    const promise: Promise<ReturnType<typeof fn>> = decorated("hello");
    assert.strictEqual(promise instanceof Promise, true);

    const res1: Awaited<ReturnType<typeof fn>> = await promise;
    await decorated("hello");
    const res3: string = await decorated("world");

    assert.strictEqual(called, 2);
    assert.strictEqual(res1, "hello");
    assert.strictEqual(res3, "world");
  });

  it("Caches falsy results", async () => {
    let called = 0;
    const stub = async (_: string) => {
      called++;
      return 0;
    };

    const decorated: typeof stub = cache(stub);

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

    const decorated: typeof stub = cache(stub);

    assert.strictEqual(await decorated("hello"), undefined);
    assert.strictEqual(await decorated("hello"), undefined);
    assert.strictEqual(called, 1);
  });

  it("Doesn't cache rejected calls", async () => {
    let throwError = true;
    const fn = async (_: string) => {
      if (throwError) {
        throw new Error("TestError");
      }

      return "success";
    };

    const decorated: typeof fn = cache(fn);

    await assert.rejects(() => decorated("param"), {
      name: "Error",
      message: "TestError",
    });

    throwError = false;
    assert.strictEqual(await decorated("param"), "success");
  });

  it("Caches calls with no parameters", async () => {
    let called = 0;
    const fn = async () => {
      called++;
      return "result";
    };

    const decorated: typeof fn = cache(fn);

    assert.strictEqual(await decorated(), "result");
    assert.strictEqual(await decorated(), "result");
    assert.strictEqual(called, 1);
  });

  it("Doesn't deduplicate concurrent calls", async () => {
    let called = 0;
    const fn = async (_: string) => {
      called++;
      return "result";
    };

    const decorated = cache(fn);

    const results = await Promise.all([decorated("hello"), decorated("hello")]);

    assert.strictEqual(called, 2);
    assert.deepStrictEqual(results, ["result", "result"]);
  });

  it("Returns the same reference on cache hit", async () => {
    const fn = async (_: string) => ({ value: "result" });

    const decorated = cache(fn);

    const res1 = await decorated("hello");
    const res2 = await decorated("hello");

    assert.strictEqual(res1, res2);
  });

  it("Throws errors for invalid parameter types", async () => {
    const multiply = async (first: string, second: number) =>
      Number.parseInt(first) * second;

    const decorated = cache(multiply);

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

  it("Fails typechecking with incorrect usage", async () => {
    const multiply = async (first: string, second: number) =>
      Number.parseInt(first) * second;

    const decorated = cache(multiply);

    // @ts-expect-error missing parameter
    await decorated("one");

    // @ts-expect-error wrong parameter type
    await decorated(1, 1);

    // @ts-expect-error wrong parameter type
    await decorated("one", "one");
  });
});
