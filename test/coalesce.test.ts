import {describe, it} from "node:test"
import assert from "node:assert/strict";
import {coalesce} from "../src/deco.ts";

describe("Coalescer", () => {
    describe("Coalesce with primitive keys", () => {
        it("Coalesces duplicate requests into a single call", async (t) => {
            let timesCalled = 0
            const fn = async (_: string) => {
                timesCalled++;
                return 'done';
            };

            const decoratedFn: typeof fn = coalesce(fn);

            const results: Awaited<ReturnType<typeof fn>>[] = await Promise.all([
                decoratedFn('stubValue'),
                decoratedFn('stubValue')
            ]);

            assert.strictEqual(timesCalled, 1)
            assert.deepStrictEqual(results, ['done', 'done'])
        })

        it("Doesn't coalesce when first request has already complete", async (t) => {
            let timesCalled = 0
            const fn = async (_: string) => timesCalled++;

            const decoratedFn = coalesce(fn);

            await decoratedFn('stubValue')
            await decoratedFn('stubValue')

            assert.strictEqual(timesCalled, 2)
        })

        it("Doesn't coalesce requests with different keys", async (t) => {
            let timesCalled = 0
            const fn = async (_: string) => timesCalled++;

            const decoratedFn = coalesce(fn);

            await Promise.all([
                decoratedFn('stubValue1'),
                decoratedFn('stubValue2')
            ]);

            assert.strictEqual(timesCalled, 2)
        })

        it("Coalesces requests with multiple parameters - strings and numbers", async (t) => {
            let timesCalled = 0
            const fn = async (_s: string, _n: number) => timesCalled++;

            const decoratedFn = coalesce(fn);

            await Promise.all([
                decoratedFn('stubValue', 1),
                decoratedFn('stubValue', 1),
                decoratedFn('stubValue', 2)
            ]);

            assert.strictEqual(timesCalled, 2)
        })

        it("Coalesces requests with multiple parameters - strings and booleans", async (t) => {
            let timesCalled = 0
            const fn = async (_s: string, _b: boolean) => timesCalled++;

            const decoratedFn = coalesce(fn);

            await Promise.all([
                decoratedFn('stubValue', true),
                decoratedFn('stubValue', true),
                decoratedFn('stubValue', false)
            ]);

            assert.strictEqual(timesCalled, 2)
        })

        it("Distinguishes between different data types - strings and booleans", async () => {
            let timesCalled = 0
            const fn = async (_: string | boolean) => timesCalled++;

            const decoratedFn = coalesce(fn);

            await Promise.all([
                decoratedFn(true),
                decoratedFn('true'),
            ]);

            assert.strictEqual(timesCalled, 2)
        })

        it("Distinguishes between different data types - strings and integers", async () => {
            let timesCalled = 0
            const fn = async (_: string | number) => timesCalled++;

            const decoratedFn = coalesce(fn);

            await Promise.all([
                decoratedFn(1),
                decoratedFn('1'),
            ]);

            assert.strictEqual(timesCalled, 2)
        })

        it("Prevents key collisions", async () => {
            let timesCalled = 0
            const fn = async (..._1: string[]) => timesCalled++;

            const decoratedFn = coalesce(fn);

            await Promise.all([
                decoratedFn('||', '|'),
                decoratedFn('|', '||'),

                decoratedFn('|||', '||'),
                decoratedFn('||', '||'),

                decoratedFn('|', ''),
                decoratedFn('', '|'),

                decoratedFn('a|b', 'c'),
                decoratedFn('a', 'b|c'),

                decoratedFn('', 'a'),
                decoratedFn('s', 'a'),

                decoratedFn('s', ''),
                decoratedFn('s}|{s'),

                decoratedFn('', 'one'),
                decoratedFn('one', ''),

                decoratedFn('one','two'),
                decoratedFn('one}|{stwo'),
            ]);

            assert.strictEqual(timesCalled, 16)
        })

        it("Coalesces calls with no parameters", async (t) => {
            let timesCalled = 0
            const fn = async () => timesCalled++;

            const decoratedFn = coalesce(fn);

            await Promise.all([
                decoratedFn(),
                decoratedFn()
            ]);

            await  decoratedFn();

            assert.strictEqual(timesCalled, 2)
        })

        it("Throws error if an unsafe number is provided", async (t) => {
            const decoratedFn = coalesce((_: number) => {});

            // Exceeds Number.MAX_SAFE_INTEGER
            const number = 9007199254740992;

            await assert.rejects(() => decoratedFn(number), {
                name: "CoalesceKeyError",
                message: "Unable to generate key: Provided integer exceeds maximum safe integer size"
            })
        })

        // While it wouldn't make sense to coalesce synchronous functions, it is
        // possible that the decorated function returns promises conditionally.
        it("Supports sync functions", async () => {
            let timesCalled = 0
            const fn = () => timesCalled++

            const decoratedFn: () => Promise<ReturnType<typeof fn>> = coalesce(fn);

            const promise: Promise<ReturnType<typeof fn>> = decoratedFn();
            assert.strictEqual(promise instanceof Promise, true);

            await promise;
            assert.strictEqual(timesCalled, 1)
        })

        it("Throws error if non-supported data types are provided", async (t) => {
            // @ts-expect-error invalid args (object) and generateKey is not provided
            const decoratedFn = coalesce((_: {key: string}) => {});

            // @ts-expect-error
            await assert.rejects(() => decoratedFn({key: 'value'}), {
                name: "CoalesceKeyError",
                message: "Invalid parameter type: object.\nCreate a generateKey callback to use complex data types."
            })

            // @ts-expect-error
            await assert.rejects(() => decoratedFn(null), {
                name: "CoalesceKeyError",
                message: "Invalid parameter type: object.\nCreate a generateKey callback to use complex data types."
            })

            // @ts-expect-error
            await assert.rejects(() => decoratedFn(() => {
            }), {
                name: "CoalesceKeyError",
                message: "Invalid parameter type: function.\nCreate a generateKey callback to use complex data types."
            })

            // @ts-expect-error
            await assert.rejects(() => decoratedFn([]), {
                name: "CoalesceKeyError",
                message: "Invalid parameter type: object.\nCreate a generateKey callback to use complex data types."
            })

            // @ts-expect-error
            await assert.rejects(() => decoratedFn(Symbol()), {
                name: "CoalesceKeyError",
                message: "Invalid parameter type: symbol.\nCreate a generateKey callback to use complex data types."
            })

            // @ts-expect-error
            await assert.rejects(() => decoratedFn(100n), {
                name: "CoalesceKeyError",
                message: "Invalid parameter type: bigint.\nCreate a generateKey callback to use complex data types."
            })
        })

        it("Throws error and removes coalesce key when the decorated function call fails", async () => {
            let throwError = true
            const fn = async (_: string) => {
                if (throwError) {
                    throw new Error('TestError')
                }

                return 'success'
            }

            const decoratedFn: typeof fn = coalesce(fn);

            await assert.rejects(() => decoratedFn('param'), {
                name: "Error",
                message: "TestError"
            })

            throwError = false;
            const result = await decoratedFn('param')
            assert.strictEqual(result, "success")
        })

    })

    describe("Coalesce with custom key generator", () => {
        it("Coalesces with primitive values", async () => {
            let timesCalled = 0
            const fn = async (_1: string, _2: string) => timesCalled++;

            const generateKey = (param1: string, param2: string): string => {
                return `${param1}-${param2}`
            }

            const decoratedFn: typeof fn = coalesce(fn, generateKey);

            await Promise.all([
                // @ts-expect-error unexpected 3rd parameter (ignored).
                decoratedFn('key', 'one', 'hello'),
                // @ts-expect-error unexpected 3rd parameter (ignored).
                decoratedFn('key', 'one', 'world'),
                // @ts-expect-error unexpected 3rd parameter (ignored).
                decoratedFn('key', 'two', 'goodbye'),
            ]);

            assert.strictEqual(timesCalled, 2)
        })

        it("Coalesces with objects", async () => {
            let timesCalled = 0
            type User = {firstName: string, lastName: string, requestId: string}

            const fn = async (_u: User) => {
                timesCalled++
                return 'complete'
            };

            const generateKey = (user: User) => {
                return `${user.firstName}-${user.lastName}`
            }

            const decoratedFn: typeof fn = coalesce(fn, generateKey);

            const results: Awaited<ReturnType<typeof fn>>[] = await Promise.all([
                decoratedFn({firstName: "jacob", lastName: "bennett", requestId: '1' }),
                decoratedFn({firstName: "jacob", lastName: "bennett", requestId: '2' }),
                decoratedFn({firstName: "jacob", lastName: "peter", requestId: '4' }),
            ]);

            assert.strictEqual(timesCalled, 2)
            assert.deepStrictEqual(results, ['complete', 'complete', 'complete'])
        })

        it("Type error if fn & genKey signatures do not match", async () => {
            // @ts-expect-error
            coalesce((_1: string) => 'res', (_1: string, _2: string): string => '');

            // @ts-expect-error
            coalesce((_1: string) => 'res', (_1: number): string => '');

            // @ts-expect-error
            coalesce((_1: string) => 1, (_1: number): string => '');
        })
    })
});
