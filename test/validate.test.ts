import it, { describe } from "node:test";
import assert from "node:assert/strict";
import { validate } from "../src/validate.ts";

describe("Validator", () => {
  it("Throws on invalid function", () => {
    // @ts-expect-error
    assert.throws(() => validate.fn(), {
      name: "TypeError",
      message: "Parameter must be a function. Received undefined",
    });

    assert.throws(() => validate.fn("stub"), {
      name: "TypeError",
      message: "Parameter must be a function. Received string",
    });
  });

  it("Throws on invalid integer", () => {
    assert.throws(() => validate.positiveInteger(undefined, "num"), {
      name: "TypeError",
      message: "num is required",
    });

    assert.throws(() => validate.positiveInteger(null, "num"), {
      name: "TypeError",
      message: "num must be an integer",
    });

    assert.throws(() => validate.positiveInteger("100", "num"), {
      name: "TypeError",
      message: "num must be an integer",
    });

    assert.throws(() => validate.positiveInteger(0, "num"), {
      name: "TypeError",
      message: "num must be > 0",
    });

    assert.throws(() => validate.positiveInteger(0.1, "num"), {
      name: "TypeError",
      message: 'num must be an integer. Received "0.1"',
    });

    assert.throws(() => validate.positiveInteger(NaN, "num"), {
      name: "TypeError",
      message: 'num must be an integer. Received "NaN"',
    });

    assert.throws(() => validate.positiveInteger(Infinity, "num"), {
      name: "TypeError",
      message: 'num must be an integer. Received "Infinity"',
    });

    assert.throws(
      () => validate.positiveInteger(Number.MAX_SAFE_INTEGER + 1, "num"),
      {
        name: "TypeError",
        message: "num exceeds maximum safe integer size",
      },
    );

    // Floats too long to be represented precisely get rounded internally in the JS runtime.
    // eslint-disable-next-line no-loss-of-precision
    validate.positiveInteger(5.0000000000000001, "num");
  });
});
