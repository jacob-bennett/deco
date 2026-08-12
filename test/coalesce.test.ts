import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { coalesce } from "../src/deco.ts";

describe("Coalescer", () => {
  describe("Coalesce with primitive keys", () => {
    it("Coalesces duplicate requests into a single call", async () => {
      let timesCalled = 0;
      const fn = async (_: string) => {
        timesCalled++;
        return "done";
      };

      const decoratedFn: typeof fn = coalesce(fn);

      const results: Awaited<ReturnType<typeof fn>>[] = await Promise.all([
        decoratedFn("stubValue"),
        decoratedFn("stubValue"),
      ]);

      assert.strictEqual(timesCalled, 1);
      assert.deepStrictEqual(results, ["done", "done"]);
    });

    it("Doesn't coalesce second request when first has already completed", async () => {
      let timesCalled = 0;
      const fn = async (_: string) => timesCalled++;

      const decoratedFn = coalesce(fn);

      await decoratedFn("stubValue");
      await decoratedFn("stubValue");

      assert.strictEqual(timesCalled, 2);
    });

    it("Doesn't coalesce requests with different keys", async () => {
      let timesCalled = 0;
      const fn = async (_: string) => timesCalled++;

      const decoratedFn = coalesce(fn);

      await Promise.all([decoratedFn("stubValue1"), decoratedFn("stubValue2")]);

      assert.strictEqual(timesCalled, 2);
    });

    it("Coalesces requests with multiple parameters - strings and numbers", async () => {
      let timesCalled = 0;
      const fn = async (_s: string, _n: number) => timesCalled++;

      const decoratedFn = coalesce(fn);

      await Promise.all([
        decoratedFn("stubValue", 1),
        decoratedFn("stubValue", 1),
        decoratedFn("stubValue", 2),
        decoratedFn("stubValue", 2),
      ]);

      assert.strictEqual(timesCalled, 2);
    });

    it("Coalesces requests with multiple parameters - strings and booleans", async () => {
      let timesCalled = 0;
      const fn = async (_s: string, _b: boolean) => timesCalled++;

      const decoratedFn = coalesce(fn);

      await Promise.all([
        decoratedFn("stubValue", true),
        decoratedFn("stubValue", true),
        decoratedFn("stubValue", false),
        decoratedFn("stubValue", false),
      ]);

      assert.strictEqual(timesCalled, 2);
    });

    // While it wouldn't make sense to coalesce synchronous functions, it is
    // possible that the decorated function returns promises conditionally.
    it("Supports synchronous functions", async () => {
      let timesCalled = 0;
      const fn = () => timesCalled++;

      const decoratedFn: () => Promise<ReturnType<typeof fn>> = coalesce(fn);

      const promise: Promise<ReturnType<typeof fn>> = decoratedFn();
      assert.strictEqual(promise instanceof Promise, true);

      await promise;
      assert.strictEqual(timesCalled, 1);
    });

    it("Throws error and removes request from 'in flight' when request throws", async () => {
      let throwError = true;
      const fn = async (_: string) => {
        if (throwError) {
          throw new Error("TestError");
        }

        return "success";
      };

      const decoratedFn: typeof fn = coalesce(fn);

      await assert.rejects(() => decoratedFn("param"), {
        name: "Error",
        message: "TestError",
      });

      throwError = false;
      const result = await decoratedFn("param");
      assert.strictEqual(result, "success");
    });
  });

  describe("Coalesce with custom key generator", () => {
    it("Coalesces with primitive values", async () => {
      let timesCalled = 0;
      const fn = async (_1: string, _2: string) => timesCalled++;

      const generateKey = (param1: string, param2: string): string => {
        return `${param1}-${param2}`;
      };

      const decoratedFn: typeof fn = coalesce(fn, generateKey);

      await Promise.all([
        // @ts-expect-error unexpected 3rd parameter (ignored).
        decoratedFn("key", "one", "hello"),
        // @ts-expect-error unexpected 3rd parameter (ignored).
        decoratedFn("key", "one", "world"),
        // @ts-expect-error unexpected 3rd parameter (ignored).
        decoratedFn("key", "two", "goodbye"),
      ]);

      assert.strictEqual(timesCalled, 2);
    });

    it("Coalesces with objects", async () => {
      let timesCalled = 0;
      type User = { firstName: string; lastName: string; requestId: string };

      const fn = async (_u: User) => {
        timesCalled++;
        return "complete";
      };

      const generateKey = (user: User) => {
        return `${user.firstName}-${user.lastName}`;
      };

      const decoratedFn: typeof fn = coalesce(fn, generateKey);

      const results: Awaited<ReturnType<typeof fn>>[] = await Promise.all([
        decoratedFn({
          firstName: "jacob",
          lastName: "bennett",
          requestId: "1",
        }),
        decoratedFn({
          firstName: "jacob",
          lastName: "bennett",
          requestId: "2",
        }),
        decoratedFn({ firstName: "jacob", lastName: "peter", requestId: "4" }),
      ]);

      assert.strictEqual(timesCalled, 2);
      assert.deepStrictEqual(results, ["complete", "complete", "complete"]);
    });

    it("Type error if fn & genKey signatures do not match", async () => {
      coalesce(
        (_1: string) => "res",
        // @ts-expect-error
        (_1: string, _2: string): string => "",
      );

      coalesce(
        (_1: string) => "res",
        // @ts-expect-error
        (_1: number): string => "",
      );

      coalesce(
        (_1: string) => 1,
        // @ts-expect-error
        (_1: number): string => "",
      );
    });
  });
});
