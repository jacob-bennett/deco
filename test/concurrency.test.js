import {it, describe} from "node:test"
import assert from "node:assert/strict";
import {concurrency} from "../src/concurrency.js";

const immediate = () => new Promise(resolve => setImmediate(resolve));
const nextTick = () => new Promise(resolve => process.nextTick(resolve));

describe("Concurrency", () => {
    it("Runs tasks and returns results", async () => {
        const fn = async (text) => {
            await nextTick();
            return text;
        }

        const decoratedFn = concurrency(fn, 4);

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

    it("Runs tasks and returns results with limited concurrency", async () => {
        const fn = async (text) => {
            await nextTick();
            return text;
        }

        const decoratedFn = concurrency(fn, 1);


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

    it("Runs tasks concurrently", async () => {
        const resolvers = []

        const fn = (text) => new Promise((resolve) => resolvers.push(resolve))
            .then(() => text)

        const decoratedFn = concurrency(fn, 2);

        const promise1 = decoratedFn('One');
        const promise2 = decoratedFn('Two');

        // Resolvers is populated when tasks run, so here we check the first 2 tasks have started
        assert.strictEqual(resolvers.length, 2);

        // Cleanup
        resolvers.forEach(resolver => resolver());
        await Promise.all([promise1, promise2])
    })

    it("Obeys concurrency limit", async () => {
        const resolvers = []

        const fn = () => new Promise((resolve) => resolvers.push(resolve))
            .then(() => 'complete')

        const decoratedFn = concurrency(fn, 1);

        const promise1 = decoratedFn();
        const promise2 = decoratedFn();

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


    // Ensure that limit it being maintained correctly.
    // TODO test that limit it maintained correctly when errors are thrown.
    it("Maintains limit and processing count correctly", async () => {
        const resolvers = [];
        let autoResolve = true
        const fn = (name) => new Promise(resolve => {
            if (autoResolve) {
                return resolve(name)
            }

            resolvers.push(resolve)
        });

        const decoratedFn = concurrency(fn, 2);
        await Promise.all([
            decoratedFn('One'),
            decoratedFn('Two'),
            decoratedFn('Three')
        ])

        autoResolve = false;

        decoratedFn('One')
        decoratedFn('Two')
        decoratedFn('Three')

        assert.strictEqual(resolvers.length, 2);

        resolvers[0]();

        await immediate();
        assert.strictEqual(resolvers.length, 3);

        // Clean up
        resolvers.forEach(resolve => resolve())
    });

    // Impossible with current implementation due to using
    // async/await. Here just in case the implementation changes.
    it("Doesn't hit call stack limit", async () => {
        const decoratedFn = concurrency(immediate, 2);

        const promises = [];
        for (let i = 0; i < 10_000; i++) {
            promises.push(decoratedFn());
        }

        await Promise.all(promises)
    })
});
