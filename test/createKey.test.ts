import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createKey } from "../src/createKey.ts";

describe("Create key", () => {
  it("Distinguishes between different data types", async () => {
    assert.strictEqual(createKey(true) === createKey("true"), false);
    assert.strictEqual(createKey(1) === createKey("1"), false);
  });

  it("Prevents key collisions", async () => {
    assert.strictEqual(createKey("||", "|") === createKey("|", "||"), false);
    assert.strictEqual(createKey("|", "") === createKey("", "|"), false);
    assert.strictEqual(createKey("a|b", "c") === createKey("a", "b|c"), false);
    assert.strictEqual(createKey("s", "") === createKey("s}|{s"), false);
    assert.strictEqual(
      createKey("one", "two") === createKey("one|4}|{stwo|4"),
      false,
    );
    assert.strictEqual(
      createKey("x", "y}|{sz") === createKey("x}|{sy", "z"),
      false,
    );
    assert.strictEqual(createKey(1) === createKey("1"), false);
    assert.strictEqual(createKey(true) === createKey("true"), false);
    assert.strictEqual(
      createKey("1", true) === createKey("1|2}|{btrue|5}"),
      false,
    );
  });

  it("Creates keys with no parameters", async () => {
    assert.strictEqual(createKey(), "DEFAULT");
  });

  it("Throws error if an unsafe number is provided", async () => {
    const number = Number.MAX_SAFE_INTEGER + 1;
    assert.throws(() => createKey(number), {
      name: "KeyGenerationError",
      message:
        "Unable to generate key: Provided integer exceeds maximum safe integer size",
    });
  });

  it("Throws error if non-supported data types are provided", async () => {
    assert.throws(() => createKey({ key: "value" }), {
      name: "KeyGenerationError",
      message:
        "Unable to generate key from parameters. Invalid parameter type: object.",
    });

    assert.throws(() => createKey(null), {
      name: "KeyGenerationError",
      message:
        // TODO "Null" instead of object
        "Unable to generate key from parameters. Invalid parameter type: object.",
    });

    assert.throws(() => createKey(() => {}), {
      name: "KeyGenerationError",
      message:
        "Unable to generate key from parameters. Invalid parameter type: function.",
    });

    assert.throws(() => createKey([]), {
      name: "KeyGenerationError",
      message:
        // TODO "array" instead of object.
        "Unable to generate key from parameters. Invalid parameter type: object.",
    });

    assert.throws(() => createKey(Symbol()), {
      name: "KeyGenerationError",
      message:
        "Unable to generate key from parameters. Invalid parameter type: symbol.",
    });

    assert.throws(() => createKey(100n), {
      name: "KeyGenerationError",
      message:
        "Unable to generate key from parameters. Invalid parameter type: bigint.",
    });
  });
});
