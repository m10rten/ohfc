# `@ohfc/deferred`

A lightweight TypeScript Deferred utility class for creating promises with externally accessible `resolve` and `reject` methods, along with helpful state introspection.

---

## Installation

```
npm install @ohfc/deferred
```

---

## Usage

```ts
import { Deferred } from "@ohfc/deferred";

async function main() {
  const deferred = new Deferred<number>();

  // Somewhere else, resolve or reject:
  setTimeout(() => deferred.resolve(42), 1000);

  // Await deferred promise
  const result = await deferred.promise;
  console.log(result); // 42

  console.log("Resolved?", deferred.isResolved); // true
  console.log("Rejected?", deferred.isRejected); // false
}

main();
```

---

## API

### `class Deferred<T = void>` (export & export default)

**Properties:**

- `promise: Promise<T>`
  The underlying promise to await.

- `resolve(value: T | PromiseLike<T>): void`
  Resolves the `promise` with given value.

- `reject(reason: unknown): void`
  Rejects the `promise` with given reason.

- `isResolved: boolean` _(readonly)_
  Whether the promise has been resolved.

- `isRejected: boolean` _(readonly)_
  Whether the promise has been rejected.

- `isPending: boolean` _(readonly)_
  Whether the promise is still pending (neither resolved nor rejected).

---

## Features

- Full TypeScript support and typings.
- Externally controlled promise resolution and rejection.
- Introspect promise state for debugging or conditional logic.
- Lightweight with zero dependencies.
- Ideal for async coordination, event promisification, and deferred control flow.

---

## License

MIT License
