import test, {describe, it} from "node:test"
import assert from "node:assert/strict";
import {coalesce} from "../src/coalesce.js";

describe("Coalescer", () => {
    test("Coalesce with primitive keys", () => {
        it("Coalesces duplicate requests into a single call", async (t) => {
            let timesCalled = 0
            const fn = async () => timesCalled++;

            const decoratedFn = coalesce(fn);

            await Promise.all([
                decoratedFn('stubValue'),
                decoratedFn('stubValue')
            ]);

            assert.strictEqual(timesCalled, 1)
        })

        it("Doesn't coalesce when first request has already complete", async (t) => {
            let timesCalled = 0
            const fn = async () => timesCalled++;

            const decoratedFn = coalesce(fn);

            await decoratedFn('stubValue')
            await decoratedFn('stubValue')

            assert.strictEqual(2, timesCalled)
        })

        it("Doesn't coalesce requests with different keys", async (t) => {
            let timesCalled = 0
            const fn = async () => timesCalled++;

            const decoratedFn = coalesce(fn);

            await Promise.all([
                decoratedFn('stubValue1'),
                decoratedFn('stubValue2')
            ]);

            assert.strictEqual(timesCalled, 2)
        })

        it("Coalesces requests with multiple parameters - strings and numbers", async (t) => {
            let timesCalled = 0
            const fn = async () => timesCalled++;

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
            const fn = async () => timesCalled++;

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
            const fn = async () => timesCalled++;

            const decoratedFn = coalesce(fn);

            await Promise.all([
                decoratedFn(true),
                decoratedFn('true'),
            ]);

            assert.strictEqual(timesCalled, 2)
        })

        it("Distinguishes between different data types - strings and integers", async () => {
            let timesCalled = 0
            const fn = async () => timesCalled++;

            const decoratedFn = coalesce(fn);

            await Promise.all([
                decoratedFn(1),
                decoratedFn('1'),
            ]);

            assert.strictEqual(timesCalled, 2)
        })

        it("Prevents key collisions", async () => {
            let timesCalled = 0
            const fn = async () => timesCalled++;

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
            const decoratedFn = coalesce(() => {
            });

            // Exceeds Number.MAX_SAFE_INTEGER
            const number = 9007199254740992;

            await assert.rejects(() => decoratedFn(number), {
                name: "CoalesceKeyError",
                message: "Unable to generate key: Provided integer exceeds maximum safe integer size"
            })
        })

        it("Throws error if non-supported data types are provided", async (t) => {
            const decoratedFn = coalesce(() => {
            });

            await assert.rejects(() => decoratedFn(null), {
                name: "CoalesceKeyError",
                message: "Invalid parameter type: object.\nCreate a generateKey callback to use complex data types."
            })

            await assert.rejects(() => decoratedFn(() => {
            }), {
                name: "CoalesceKeyError",
                message: "Invalid parameter type: function.\nCreate a generateKey callback to use complex data types."
            })

            await assert.rejects(() => decoratedFn([]), {
                name: "CoalesceKeyError",
                message: "Invalid parameter type: object.\nCreate a generateKey callback to use complex data types."
            })

            await assert.rejects(() => decoratedFn({key: 'value'}), {
                name: "CoalesceKeyError",
                message: "Invalid parameter type: object.\nCreate a generateKey callback to use complex data types."
            })

            await assert.rejects(() => decoratedFn(Symbol()), {
                name: "CoalesceKeyError",
                message: "Invalid parameter type: symbol.\nCreate a generateKey callback to use complex data types."
            })

            await assert.rejects(() => decoratedFn(100n), {
                name: "CoalesceKeyError",
                message: "Invalid parameter type: bigint.\nCreate a generateKey callback to use complex data types."
            })
        })

        it("Throws error and removes coalesce key when the decorated function call fails", async () => {
            let throwError = true
            const decoratedFn = coalesce(async () => {
                if (throwError) {
                    throw new Error('TestError')
                }

                return 'success'
            });


            await assert.rejects(() => decoratedFn('param'), {
                name: "Error",
                message: "TestError"
            })

            throwError = false;
            const result = await decoratedFn('param')
            assert.strictEqual(result, "success")
        })

    })

    test("Coalesce with custom key generator", () => {
        it("Executes with primitive values", async () => {
            let timesCalled = 0
            const fn = async () => timesCalled++;

            const generateKey = (param1, param2) => {
                return `${param1}-${param2}`
            }

            const decoratedFn = coalesce(fn, generateKey);

            await Promise.all([
                decoratedFn('key', 'one', 'hello'),
                decoratedFn('key', 'one', 'world'),
                decoratedFn('key', 'two', 'goodbye'),
            ]);

            assert.strictEqual(timesCalled, 2)
        })

        it("Executes with object", async () => {
            let timesCalled = 0
            const fn = async () => timesCalled++;

            const generateKey = (user) => {
                return `${user.firstName}-${user.lastName}`
            }

            const decoratedFn = coalesce(fn, generateKey);

            await Promise.all([
                decoratedFn({firstName: "jacob", lastName: "bennett", requestId: '1' }),
                decoratedFn({firstName: "jacob", lastName: "bennett", requestId: '2' }),
                decoratedFn({firstName: "jacob", lastName: "peter", requestId: '4' }),
            ]);

            assert.strictEqual(timesCalled, 2)
        })
    })
});
