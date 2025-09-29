// TODO custom key generator for more complex parameters
export const coalesce = (fn) => {
    const inFlightRequests = new Map()

    return async (...args) => {
        validateArgs(args);

        const key = args.join('|')

        if (inFlightRequests.has(key)) {
            return inFlightRequests.get(key)
        }

        const promise = new Promise(async (resolve) => {
            const result = await fn(...args);
            inFlightRequests.delete(key)
            resolve(result);
        });

        inFlightRequests.set(key, promise)

        return promise;
    }
};

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

class CoalesceKeyError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CoalesceKeyError';
    }
}
