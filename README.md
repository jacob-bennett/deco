# Deco
Deco is a zero dependency collection of composable asynchronous decorators.  

## Roadmap
- [x] Request coalescing
- [ ] Concurrency limiting
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
import { coalesce } from "@jacben/deco";

// Example async function
const getUserById = async (id) => {}

// Wrap original function
const coalescedGetUserById = coalesce(getUserById);

// Only one call to getUserById occurs, even though it is called twice.
await Promise.all([
    coalescedGetUserById(1),
    coalescedGetUserById(1),
]); 
```

#### Coalesce keys
If the values passed to the coalesced function are not *strings*, *integers* or *booleans*, you'll need to provide a `generateKey` callback.  

```javascript
// Example async function, which takes an object as its input
const getPackage = async (pkg) => {}

// Return a string which will be used to identify duplicate requests
const generateKey = (pkg) => `${pkg.name}@${pkg.version}`;

const coalescedGetPackage = coalesce(getPackage, generateKey); 
await coalescedGetPackage(pkg);
```

## Contact
If you'd like to suggest a feature, report an issue or ask a question, feel free to [raise an issue](https://github.com/jacob-bennett/deco/issues/new).
