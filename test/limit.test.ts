import { it, describe } from "node:test";
import assert from "node:assert/strict";
import { limit } from "../src/deco.ts";

const nextTick = () => new Promise((resolve) => process.nextTick(resolve));

type Resolver = (value?: unknown) => void;

describe("Concurrency", () => {
  it("Runs tasks and returns results", async () => {
    type Fn = (text: string) => Promise<string>;

    const fn: Fn = async (text: string) => {
      await nextTick();
      return text;
    };

    const decoratedFn: Fn = limit(fn, 3);

    const results = await Promise.all([decoratedFn("One"), decoratedFn("Two")]);

    assert.deepStrictEqual(results, ["One", "Two"]);
  });

  it("Runs tasks and returns results with limited concurrency", async () => {
    const fn = async (text: string) => {
      await nextTick();
      return text;
    };

    const decoratedFn = limit(fn, 1);

    const results = await Promise.all([
      decoratedFn("One"),
      decoratedFn("Two"),
      decoratedFn("Three"),
    ]);

    assert.deepStrictEqual(results, ["One", "Two", "Three"]);
  });

  it("Reaches concurrency limit", async () => {
    const resolvers: Resolver[] = [];

    const fn = (text: string) =>
      new Promise((resolve) => resolvers.push(resolve)).then(() => text);

    const decoratedFn = limit(fn, 2);

    const promise1 = decoratedFn("One");
    const promise2 = decoratedFn("Two");

    await nextTick();

    // Resolvers is populated when tasks run, so here we check the first 2 tasks have started
    assert.strictEqual(resolvers.length, 2);

    // Cleanup
    resolvers.forEach((resolver) => resolver());
    await Promise.all([promise1, promise2]);
  });

  it("Does not exceed concurrency limit", async () => {
    const resolvers: Resolver[] = [];
    const fn = () =>
      new Promise((resolve) => resolvers.push(resolve)).then(() => "complete");

    const decoratedFn = limit(fn, 1);

    const promise1 = decoratedFn();
    const promise2 = decoratedFn();

    await nextTick();

    // Check that only 1 task has started
    assert.strictEqual(resolvers.length, 1);

    // Finish first task
    resolvers[0]();
    await nextTick();

    // Now ensure that second has started
    assert.strictEqual(resolvers.length, 2);

    // Clean up
    resolvers[1]();
    await promise1;
    await promise2;
  });

  it("Maintains processing count", { timeout: 1000 }, async () => {
    const fn = async () => {};
    const decoratedFn = limit(fn, 1);

    await decoratedFn();

    // If the processing count did not decrement, then the second promise would hang indefinitely.
    await decoratedFn();
  });

  it("Runs task after error on an empty queue", { timeout: 1000 }, async () => {
    const fn = async (throwErr: boolean) => {
      if (throwErr) {
        throw new Error("Expected error");
      }
    };

    const decoratedFn = limit(fn, 1);

    await assert.rejects(() => decoratedFn(true), {
      message: "Expected error",
    });

    // If the processing count did not decrement on error, then this would hang indefinitely.
    await decoratedFn(false);
  });

  it(
    "Runs task after an error at the front of the queue",
    { timeout: 1000 },
    async () => {
      const fn = async (throwErr: boolean) => {
        await nextTick();
        if (throwErr) {
          throw new Error("Expected error");
        }
      };

      const decoratedFn = limit(fn, 1);

      const fail = decoratedFn(true);
      const success = decoratedFn(false);

      await assert.rejects(fail, {
        message: "Expected error",
      });

      // If the processing count did not decrement on error, then this would hang indefinitely.
      await success;
    },
  );

  it(
    "Rejects failed tasks that have been queued",
    { timeout: 1000 },
    async () => {
      const fn = async (throwErr: boolean) => {
        await nextTick();
        if (throwErr) {
          throw new Error("Expected error");
        }

        return true;
      };

      const decoratedFn = limit(fn, 1);

      const success = decoratedFn(false);
      const fail = decoratedFn(true);

      assert.strictEqual(await success, true);

      await assert.rejects(fail, {
        message: "Expected error",
      });
    },
  );

  // While it wouldn't make sense to limit synchronous functions, it is
  // possible that the decorated function returns promises conditionally.
  it("Handles sync tasks", async () => {
    const fn: (text: string) => string = (text: string) => text;

    const decoratedFn: (text: string) => Promise<string> = limit(fn, 1);

    const results = await Promise.all([decoratedFn("One"), decoratedFn("Two")]);

    assert.deepStrictEqual(results, ["One", "Two"]);
  });

  it("Sync tasks return promises", async () => {
    const fn = (text: string) => text;

    const decoratedFn = limit(fn, 1);
    const res: Promise<string> = decoratedFn("");

    assert.strictEqual(res instanceof Object, true);
    await res;
  });

  it("Validates parameters", async () => {
    // @ts-expect-error
    assert.throws(() => limit("str", 1), {
      name: "TypeError",
      message: "parameter must be a function",
    });

    // @ts-expect-error
    assert.throws(() => limit(() => {}, "str"), {
      name: "TypeError",
      message: "limit must be a number",
    });

    assert.throws(() => limit(() => {}, -1), {
      name: "TypeError",
      message: "limit must be >= 1",
    });
  });

  // Impossible with current implementation due to using
  // async/await. Here just in case the implementation changes.
  it("Doesn't hit call stack limit", async () => {
    const decoratedFn = limit(nextTick, 2);

    const promises = [];
    for (let i = 0; i < 10_000; i++) {
      promises.push(decoratedFn());
    }

    await Promise.all(promises);
  });
});
