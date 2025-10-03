/**
 * Wraps an asynchronous function to coalesce identical in-flight calls.
 *
 * @template {any[]} Args - Argument types of the original async function
 * @template Return - Type returned by the promise of the original async function
 * @param {(...args: Args) => Promise<Return>} fn - The asynchronous function to wrap
 * @param {(...args: Args) => string} [generateKey] - Optional function to generate a unique key.
 *
 * @returns {(...args: Args) => Promise<Return>} Wrapped function
 */
export const coalesce = (fn, generateKey) => {
    const inFlightRequests = new Map()

    return async (...args) => {
        const key = createKey(args, generateKey);

        if (inFlightRequests.has(key)) {
            return inFlightRequests.get(key)
        }

        const promise = fn(...args)
            .finally(() => inFlightRequests.delete(key))

        inFlightRequests.set(key, promise)

        return promise;
    }
};

/**
 * Generates a unique coalesce key.
 *
 * @param {any[]} args
 * @param {Function|undefined} generateKey
 * @returns {string}
 */
const createKey = (args, generateKey) => {
    if (generateKey) {
        return generateKey(...args);
    }

    if (args.length > 0) {
        validateArgs(args);
        return args.map(prependType).join('|')
    }

    return 'DEFAULT'
};

/**
 * Validates arguments for automatic key generation.
 * Throws a CoalesceKeyError if any argument is invalid.
 *
 * @param {Array<string|number|boolean>} args
 * @throws {CoalesceKeyError}
 * @private
 */
const validateArgs = args => {
    args.forEach((arg) => {
        if (typeof arg !== 'string' && typeof arg !== 'number' && typeof arg !== 'boolean') {
            throw new CoalesceKeyError(`Invalid parameter type: ${typeof arg}.\nCreate a generateKey callback to use complex data types.`);
        }

        // Ensure numeric parameters are safe integers to avoid precision issues.
        // Numbers larger than Number.MAX_SAFE_INTEGER may be rounded, which could
        // cause accidental key collisions when forming keys.
        // TODO add to docs.
        if (typeof arg === 'number' && !Number.isSafeInteger(arg)) {
            throw new CoalesceKeyError(`Unable to generate key: Provided integer exceeds maximum safe integer size`)
        }
    })
};

/**
 * Distinguishes between different data types to prevent clashes.
 * @param {string|number|boolean} value
 * @returns {string}
 */
const prependType = (value) => {
    switch (typeof value) {
        case 'string':
            return `s${value}`;
        case 'number':
            return `n${value}`;
        case 'boolean':
            return `b${value}`;
    }
}

/**
 * Error thrown when a key cannot be generated for coalescing.
 * @extends {Error}
 */
class CoalesceKeyError extends Error {
    /**
     * @param {string} message
     */
    constructor(message) {
        super(message);
        this.name = 'CoalesceKeyError';
    }
}
