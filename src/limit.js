/**
 * Wraps an asynchronous function to limit the number of concurrent executions.
 *
 * @template {any[]} Args - Argument types of the original function
 * @template Return - Return type of the original function
 * @param {(...args: Args) => Promise<Return> | Return} fn - The function to wrap
 * @param {number} limit - Maximum number of concurrent executions allowed
 *
 * @returns {(...args: Args) => Promise<Return>} Wrapped function that respects the concurrency limit
 */
export const limit = (fn, limit) => {
    validateArgs(fn, limit);

    /**
     * @type {Array<{ args: Args; resolve: (value: Return) => void }>}
     */
    const queue = [];
    let processing = 0;

    const next = () => {
        // @ts-ignore This will never be undefined.
        const {args, resolve} = queue.shift();
        run(args).then((result) => resolve(result))
    }

    /**
     * @param {Args} args
     * @returns {Promise<Return>}
     */
    const run = async args => {
        processing++
        const result = await Promise.resolve()
            .then(() => fn(...args))
            .finally(() => processing--);

        if (queue.length > 0) {
            next()
        }

        return result;
    };

    return async (...args) => {
        if (processing < limit) {
            return run(args)
        }

        return new Promise(resolve => queue.push({args, resolve}));
    }
}

/**
 * @param {Function} fn
 * @param {number} limit
 *
 * @throws {TypeError}
 */
const validateArgs = (fn, limit) => {
    if (typeof fn !== 'function') {
        throw new TypeError('parameter must be a function');
    }

    if (typeof limit !== 'number') {
        throw new TypeError('limit must be a number');
    }

    if ( limit < 1) {
        throw new TypeError('limit must be >= 1');
    }
}
