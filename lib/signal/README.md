# `@ohfc/signal`

Reactive values you can read, update, and observe. Subscribe to changes and react when the value updates. Lightweight and easy to use.

## 📦 Install

```bash
pnpm add @ohfc/signal
# or
npm install @ohfc/signal
# or
yarn add @ohfc/signal
```

## 🚀 Usage

```ts
import { signal } from "@ohfc/signal";

const count = signal(0);

const unsubscribe = count.subscribe((value) => {
  console.log("Count is now:", value);
});

count.set(1); // Logs: Count is now: 1
count.set(2); // Logs: Count is now: 2

unsubscribe();
count.set(3); // No log
```

## 📖 API

### `signal(initialValue)`

- **initialValue**: `any`  
  The starting value for the signal.

- **returns**: `Signal`  
  An object with methods to interact with the reactive value.

### `Signal`

A signal instance exposes:

- `get(): T`  
  Returns the current value.

- `set(value: T): void`  
  Updates the value. Notifies all subscribers if the value changes.

- `subscribe(callback: (value: T) => void): () => void`  
  Subscribes to value changes. The callback is immediately called with the current value and again whenever the value changes. Returns an unsubscribe function.

  If a subscriber becomes unreachable (for example, if its reference goes out of scope and is garbage collected), it is automatically unsubscribed and will no longer be called on future updates.

## ✅ Features

- Reactive value container
- Subscribe to changes with unsubscribe support
- Immediate notification on subscription
- Automatic cleanup of unreachable subscribers
- No dependencies
- Typed with TypeScript

## 📝 License

MIT
