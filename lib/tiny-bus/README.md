# @ohfc/tiny-bus

A tiny, typed event bus for in-process publish/subscribe event handling. Works in both browser and Node.js (within the same runtime). No cross-environment communication. Fully typed, zero dependencies.

## 📦 Install

```bash
pnpm add @ohfc/tiny-bus
# or
npm install @ohfc/tiny-bus
# or
yarn add @ohfc/tiny-bus
```

## 🚀 Usage

```ts
import { TinyBus } from "@ohfc/tiny-bus";

type AppEvents = {
  "user:login": { userId: string };
  "message:received": { from: string; content: string };
};

const bus = new TinyBus<AppEvents>();

const onLogin = (payload: { userId: string }) => {
  console.log(`User logged in: ${payload.userId}`);
};

bus.on("user:login", onLogin);

bus.emit("user:login", { userId: "abc123" });

bus.off("user:login", onLogin);

bus.clear();
```

## 📖 API

### `new TinyBus<EventMap>()`

Creates a new event bus instance.

- `EventMap`: `Record<string, unknown>`  
  An object type defining valid event names and their payload shapes.

---

### `.on(eventName, handler)`

Registers a handler for a specific event.

- `eventName`: `keyof EventMap`
- `handler`: `(payload: EventMap[eventName]) => void | Promise<void>`

The `handler` accepts a Promise, but this is not awaited for simplicity, use with caution as any error will likely cause unhandled rejections.

---

### `.off(eventName, handler)`

Removes a previously registered handler.

- `eventName`: `keyof EventMap`
- `handler`: `(payload: EventMap[eventName]) => void`

---

### `.emit(eventName, payload)`

Calls all handlers registered for the event with the provided payload.

- `eventName`: `keyof EventMap`
- `payload`: `EventMap[eventName]`

---

### `.clear(eventName?)`

Removes all handlers for a specific event, or for all events if no name is given.

- `eventName?`: `keyof EventMap`

## ✅ Features

- Zero dependencies
- Fully typed (TypeScript)
- In-process only (browser or Node.js)
- Small, fast, and simple

## 📝 License

MIT
