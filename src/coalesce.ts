type ValidDefaultArgs = string | number | boolean;

type Fn<Args extends any[], Return> = (...args: Args) => Promise<Return> | Return;
type KeyGenerator<Args extends any[]> = (...args: Args) => string;
type DecoratedFn<Args extends any[], Return> = (...args: Args) => Promise<Return>;

export function coalesce <Args extends ValidDefaultArgs[], Return>(fn: Fn<Args, Return>): DecoratedFn<Args, Return>;
export function coalesce <Args extends any[], Return>(fn: Fn<Args, Return>, generateKey: KeyGenerator<Args>): DecoratedFn<Args, Return>;
export function coalesce <Args extends any[], Return>(fn: Fn<Args, Return>, generateKey?: KeyGenerator<Args>): DecoratedFn<Args, Return> {

    const inFlightRequests: Map<string, Promise<Return>> = new Map();

    return async (...args: Args): Promise<Return> => {
        const key = generateKey? generateKey(...args) : createKey(...args);

        const matchingRequest = inFlightRequests.get(key);
        if (matchingRequest) {
            return matchingRequest
        }

        const promise = Promise.resolve()
            .then(() => fn(...args))
            .finally(() => inFlightRequests.delete(key))

        inFlightRequests.set(key, promise)

        return promise;
    }
}

const createKey = (...args: unknown[]): string => {
    if (args.length > 0) {
        validateArgs(args);

        const safeArgs: string[] = sanitiseArgs(args);
        const key = safeArgs.join('|')
        // Prevent collisions e.g. ("one", "two") vs ("one|two") by appending the number of arguments.
        return `${key}|${safeArgs.length}`
    }

    return 'DEFAULT'
};


const sanitiseArgs = (args: ValidDefaultArgs[]): string[] => args.map(key => wrap(prependType(key)));

const wrap = (arg: string): string => `{${arg}|${arg.length}}`

const prependType = (value: ValidDefaultArgs): string => {
    switch (typeof value) {
        case 'string':
            return `s${value}`;
        case 'number':
            return `n${value}`;
        case 'boolean':
            return `b${value}`;
    }
}

const validateArgs: (args: unknown[]) => asserts args is ValidDefaultArgs[] = (args) => {
    args.forEach((arg) => {
        if (typeof arg !== 'string' && typeof arg !== 'number' && typeof arg !== 'boolean') {
            throw new CoalesceKeyError(`Invalid parameter type: ${typeof arg}.\nCreate a generateKey callback to use complex data types.`);
        }

        // Ensure numeric parameters are safe integers to avoid precision issues.
        // Numbers larger than Number.MAX_SAFE_INTEGER may be rounded, which could
        // cause accidental key collisions when forming keys.
        if (typeof arg === 'number' && !Number.isSafeInteger(arg)) {
            throw new CoalesceKeyError(`Unable to generate key: Provided integer exceeds maximum safe integer size`)
        }
    })
};

class CoalesceKeyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CoalesceKeyError';
    }
}
