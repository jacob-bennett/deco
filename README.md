# Deco
[![Coverage Status](https://coveralls.io/repos/github/jacob-bennett/deco/badge.svg?branch=main)](https://coveralls.io/github/jacob-bennett/deco?branch=main)
[![npm version](https://img.shields.io/npm/v/@jacben/deco.svg)](https://www.npmjs.com/package/@jacben/deco)

Zero dependency collection of composable asynchronous decorators.

## Roadmap
- [x] Request coalescing
- [x] Concurrency limiting
- [ ] In-memory caching
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
import {coalesce} from "@jacben/deco";

// Example async function
const getUserById = async (id) => {}

// Wrap the original function so requests with the same values are coalesced
const coalescedGetUserById = coalesce(getUserById);

// Only one call to getUserById occurs, even though it is called twice.
await Promise.all([
    coalescedGetUserById(1),
    coalescedGetUserById(1),
]); 
```

#### Generating coalesce keys
If the values passed to the coalesced function are not *strings*, *numbers* or *booleans*, you'll need to provide a `generateKey` callback.  

```javascript
// Example async function, which takes an object as its input
const getPackage = async (pkg) => {}

// Return a key which uniquely identifies this input
const generateKey = (pkg) => `${pkg.name}@${pkg.version}`;

// Provide generateKey as an argument
const coalescedGetPackage = coalesce(getPackage, generateKey); 

// You can now pass in the full pkg object
await coalescedGetPackage(pkg);
```
> ⚠️ **Beware of collisions** when dealing with user input.  
> For example, if your generateKey function is implemented as `(...args) => args.map(arg).join('|')`,  
> then `generateKey("a", "a")` would have the same output as `generateKey("a|a")`.

### Concurrency Limiting
Limit how many requests can run concurrently.

```javascript
import {limit} from "@jacben/deco";

// Example async function
const getUserById = async (id) => {}

// Allow a maximum of 2 concurrent requests to getUserById
const limitedGetUserById = limit(getUserById, 2);

// The third request will not start until the first or second finishes
await Promise.all([
    limitedGetUserById(1),
    limitedGetUserById(2),
    limitedGetUserById(3),
]);
```

## Combining decorators
If you want to limit concurrent requests but allow identical requests to bypass this limit, you can combine decorators:

```javascript
import {coalesce, limit} from '@jacben/deco'

let fn = async () => {}
fn = limit(fn, 5)
fn = coalesce(fn)
```

The resulting chain would be: `Request -> coalesce -> limit -> original function`.  
Any duplicate requests to coalesce do not hit to the next function in the chain. Therefore, the concurrency limit does not apply to identical requests.

In reverse, if you want to limit calls and then dedupe identical request, you would decorate in the reverse order:
```javascript
import {coalesce, limit} from '@jacben/deco'

let fn = async () => {}
fn = coalesce(fn)
fn = limit(fn, 5)
```

## Contact
If you'd like to suggest a feature, report an issue or ask a question, feel free to [raise an issue](https://github.com/jacob-bennett/deco/issues/new).
