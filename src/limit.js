export const limit = (fn, limit) => {
    validateArgs(fn, limit);

    const queue = [];
    let processing = 0;

    const next = () => {
        const {args, resolve} = queue.shift();
        run(args).then((result) => resolve(result))
    }

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
