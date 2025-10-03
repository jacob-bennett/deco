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
        let key;
        if (generateKey) {
            key = generateKey(...args);
        } else {
            validateArgs(args);
            key = args.join('|')
        }

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
 * Validates arguments for automatic key generation.
 * Throws a CoalesceKeyError if any argument is invalid.
 *
 * @param {Array<string|number|boolean>} args
 * @throws {CoalesceKeyError}
 * @private
 */
const validateArgs = args => {
    if (args.length < 1) {
        throw new CoalesceKeyError('Unable to generate key: No parameters provided')
    }

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
