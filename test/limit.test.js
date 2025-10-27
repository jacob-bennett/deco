import {it, describe} from "node:test"
import assert from "node:assert/strict";
import {limit} from "../src/limit.js";

const nextTick = () => new Promise(resolve => process.nextTick(resolve));

describe("Concurrency", () => {
    it("Runs tasks and returns results", async () => {
        const fn = async (text) => {
            await nextTick();
            return text;
        }

        const decoratedFn = limit(fn, 3);

        const results = await Promise.all([
            decoratedFn('One'),
            decoratedFn('Two'),
        ]);

        assert.deepStrictEqual(results, [
            'One',
            'Two',
        ]);
    })

    it("Runs tasks and returns results with limited concurrency", async () => {
        const fn = async (text) => {
            await nextTick();
            return text;
        }

        const decoratedFn = limit(fn, 1);

        const results = await Promise.all([
            decoratedFn('One'),
            decoratedFn('Two'),
            decoratedFn('Three')
        ]);

        assert.deepStrictEqual(results, [
            'One',
            'Two',
            'Three'
        ]);
    })

    it("Reaches concurrency limit", async () => {
        const resolvers = []
        const fn = (text) => new Promise((resolve) => resolvers.push(resolve))
            .then(() => text)

        const decoratedFn = limit(fn, 2);

        const promise1 = decoratedFn('One');
        const promise2 = decoratedFn('Two');

        await nextTick();

        // Resolvers is populated when tasks run, so here we check the first 2 tasks have started
        assert.strictEqual(resolvers.length, 2);

        // Cleanup
        resolvers.forEach(resolver => resolver());
        await Promise.all([promise1, promise2])
    })

    it("Does not exceed concurrency limit", async () => {
        const resolvers = []
        const fn = () => new Promise((resolve) => resolvers.push(resolve))
            .then(() => 'complete')

        const decoratedFn = limit(fn, 1);

        const promise1 = decoratedFn();
        const promise2 = decoratedFn();

        await nextTick()

        // Check that only 1 task has started
        assert.strictEqual(resolvers.length, 1);

        // Finish first task
        resolvers[0]();
        await promise1;

        // Now ensure that second has started
        assert.strictEqual(resolvers.length, 2);

        // Clean up
        resolvers[1]();
        await promise2;
    })

    it("Maintains processing count", {timeout: 1000}, async () => {
        const fn = async () => {}
        const decoratedFn = limit(fn, 1);

        await decoratedFn();

        // If the processing count did not decrement, then the second promise would hang indefinitely.
        await decoratedFn();
    })

    it("Maintains processing count on error", {timeout: 1000}, async () => {
        const fn = async (throwErr) => {
            if (throwErr) {
                throw new Error('Expected error');
            }
        }

        const decoratedFn = limit(fn, 1);

        await assert.rejects(() => decoratedFn(true), {
            message: 'Expected error',
        });

        // If the processing count did not decrement on error, then this would hang indefinitely.
        await decoratedFn(false);
    })

    it("Handles sync tasks", async () => {
        const fn = (text) => text

        const decoratedFn = limit(fn, 1);

        const results = await Promise.all([
            decoratedFn('One'),
            decoratedFn('Two'),
        ]);

        assert.deepStrictEqual(results, ['One', 'Two']);
    })

    it("Validates parameters", async () => {
        assert.throws(() => limit('str', 1), {
            name: "TypeError",
            message: 'parameter must be a function',
        });

        assert.throws(() => limit(() => {}, 'str'), {
            name: "TypeError",
            message: 'limit must be a number',
        });


        assert.throws(() => limit(() => {}, -1), {
            name: "TypeError",
            message: 'limit must be >= 1',
        });
    })


    // Impossible with current implementation due to using
    // async/await. Here just in case the implementation changes.
    it("Doesn't hit call stack limit", async () => {
        const decoratedFn = limit(nextTick, 2);

        const promises = [];
        for (let i = 0; i < 10_000; i++) {
            promises.push(decoratedFn());
        }

        await Promise.all(promises)
    })
});
