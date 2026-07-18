import { it, describe } from "node:test";
import assert from "node:assert/strict";
import { Queue } from "../src/Queue.ts";

describe("Queue", () => {
  it("Enqueues and dequeues single value", () => {
    const queue = new Queue<string>();
    queue.enqueue("one");
    assert.strictEqual(queue.dequeue(), "one");
  });

  it("Enqueues and dequeues twice (ensures tail is erased)", () => {
    const queue = new Queue<string>();

    queue.enqueue("one");
    queue.dequeue();

    queue.enqueue("two");
    assert.strictEqual(queue.dequeue(), "two");
  });

  it("Enqueues and dequeues multiple values", () => {
    const queue = new Queue<string>();
    queue.enqueue("one");
    queue.enqueue("two");
    queue.enqueue("three");
    assert.strictEqual(queue.dequeue(), "one");
    assert.strictEqual(queue.dequeue(), "two");
    assert.strictEqual(queue.dequeue(), "three");
  });

  it("Records length", () => {
    const queue = new Queue<string>();
    assert.strictEqual(queue.length, 0);

    queue.enqueue("one");
    assert.strictEqual(queue.length, 1);

    queue.enqueue("two");
    assert.strictEqual(queue.length, 2);

    queue.enqueue("three");
    assert.strictEqual(queue.length, 3);

    queue.dequeue();
    assert.strictEqual(queue.length, 2);

    queue.dequeue();
    assert.strictEqual(queue.length, 1);

    queue.dequeue();
    assert.strictEqual(queue.length, 0);

    queue.enqueue("one");
    assert.strictEqual(queue.length, 1);

    queue.dequeue();
    assert.strictEqual(queue.length, 0);

    assert.throws(() => queue.dequeue(), {
      name: "Error",
      message: "Cannot pull value from an empty queue",
    });
    assert.strictEqual(queue.length, 0);
  });

  it("Throws error on dequeue if queue is empty", () => {
    const queue = new Queue<number>();
    assert.throws(() => queue.dequeue(), {
      name: "Error",
      message: "Cannot pull value from an empty queue",
    });

    queue.enqueue(1);
    queue.dequeue();
    assert.throws(() => queue.dequeue(), {
      name: "Error",
      message: "Cannot pull value from an empty queue",
    });
  });
});
