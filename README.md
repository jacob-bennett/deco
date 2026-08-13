# Deco

[![dependencies](https://depx.co/api/badge/@jacben/deco)](https://depx.co/pkg/@jacben/deco)
[![Coverage Status](https://coveralls.io/repos/github/jacob-bennett/deco/badge.svg?branch=main)](https://coveralls.io/github/jacob-bennett/deco?branch=main)
[![npm version](https://img.shields.io/npm/v/@jacben/deco.svg)](https://www.npmjs.com/package/@jacben/deco)

Zero dependency collection of composable asynchronous decorators.

## Roadmap

- [x] Request coalescing
- [x] Concurrency limiting
- [x] In-memory caching
- [ ] Caching - custom key generator
- [ ] Jitter
- [ ] Rate limiting / Throttling
- [ ] Retry mechanism

💡 Have a feature idea? [Raise an issue](https://github.com/jacob-bennett/deco/issues/new?title=Feature%20request:%20).

## Install

```bash
npm install @jacben/deco
```

## Decorators

### Request Coalescing

Deduplicate identical in-flight requests by combining them into one call.

```javascript
import { coalesce } from "@jacben/deco";

// Example async function
const getUser = async (id) => {};

// Wrap the original function so requests with the same values are coalesced
const coalescedGetUser = coalesce(getUser);

// Only one call to getUser occurs, even though it is called twice.
await Promise.all([coalescedGetUser(1), coalescedGetUser(1)]);
```

#### Generating coalesce keys

If the values passed to the coalesced function are not _strings_, _integers_ or _booleans_, you'll need to provide a `generateKey` callback.

```javascript
// Example async function, which takes an object as its input
const getPackage = async (pkg) => {};

// Return a key which uniquely identifies this input
const generateKey = (pkg) => `${pkg.name}@${pkg.version}`;

// Provide generateKey as an argument
const coalescedGetPackage = coalesce(getPackage, generateKey);

// You can now pass in the full pkg object
await coalescedGetPackage(pkg);
```

> ⚠️ **Beware of collisions** when dealing with user input.  
> For example, if your generateKey function is implemented as `(...args) => args.join('|')`,  
> then `generateKey("a", "a")` would have the same output as `generateKey("a|a")`.

### Concurrency Limiting

Limit how many requests can run concurrently.

```javascript
import { limit } from "@jacben/deco";

// Example async function
const getUser = async (id) => {};

// Allow a maximum of 2 concurrent requests to getUser
const limitedGetUser = limit(getUser, 2);

// The third request will not start until the first or second finishes
await Promise.all([limitedGetUser(1), limitedGetUser(2), limitedGetUser(3)]);
```

### Caching

Store results in memory, serve on subsequent requests.

```javascript
import { cache } from "@jacben/deco";

// Example async function
const getUser = async (id) => {};

// Cache results for 1 minute, with a maximum cache size of 100
const cachedGetUser = cache(getUser, { size: 100, ttl: 60000 });

// Fire request, load user
await cachedGetUser(1);
// Load result from memory, no request fires.
await cachedGetUser(1);
```

> ⚠️ Currently, only _strings_, _integers_, and _booleans_ are supported as cache keys.  
> Support for a custom `generateKey` callback, as seen in [coalesce](#generating-coalesce-keys), is in the [roadmap](#roadmap).

## Combining decorators

If you want to limit concurrent requests but allow identical requests to bypass this limit, you can combine decorators:

```javascript
import { coalesce, limit } from "@jacben/deco";

let fn = async () => {};
fn = limit(fn, 5);
fn = coalesce(fn);
```

The resulting chain would be: `Request -> coalesce -> limit -> original function`.  
Any duplicate requests to coalesce do not hit to the next function in the chain. Therefore, the concurrency limit does not apply to identical requests.

In reverse, if you want to limit calls and then dedupe identical request, you would decorate in the reverse order:

```javascript
import { coalesce, limit } from "@jacben/deco";

let fn = async () => {};
fn = coalesce(fn);
fn = limit(fn, 5);
```

## Contributing

### Local setup

Because `ignore-scripts` is enabled in the project's `.npmrc`, you'll need to run `npm run prepare` manually to enable Husky pre-commit hooks.

## Contact

If you'd like to suggest a feature, report an issue or ask a question, feel free to [raise an issue](https://github.com/jacob-bennett/deco/issues/new).
