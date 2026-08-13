const positiveInteger: (
  value: unknown,
  field: string,
) => asserts value is number = (value, field) => {
  if (value === undefined) {
    throw new TypeError(`${field} is required`);
  }

  if (typeof value !== "number") {
    throw new TypeError(`${field} must be an integer`);
  }

  if (!Number.isInteger(value)) {
    throw new TypeError(`${field} must be an integer. Received "${value}"`);
  }

  if (value < 1) {
    throw new TypeError(`${field} must be > 0`);
  }

  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${field} exceeds maximum safe integer size`);
  }
};

const fn: (
  value: unknown,
) => asserts value is (...args: unknown[]) => unknown = (value) => {
  if (typeof value !== "function") {
    throw new TypeError(
      `Parameter must be a function. Received ${typeof value}`,
    );
  }
};

export const validate: {
  positiveInteger: typeof positiveInteger;
  fn: typeof fn;
} = {
  positiveInteger,
  fn,
};
