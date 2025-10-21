export const concurrency = (fn, limit) => {
    validateArgs(fn, limit);

    const queue = [];
    let processing = 0;

    const next = async () => {
        const {args, resolve} = queue.shift();
        run(args).then((result) => resolve(result))
    }

    const run = async args => {
        // TODO error handling
        processing++
        const result = await fn(...args);
        processing--

        if (processing < limit && queue.length > 0) {
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

const validateArgs = (fn, limit) => {
    // TODO test
    if (typeof fn !== 'function') {
        throw new TypeError('parameter must be a function');
    }
    if (typeof limit !== 'number' || limit < 1) {
        throw new TypeError('limit must be >= 1');
    }
}
