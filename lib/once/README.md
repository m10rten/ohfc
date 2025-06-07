# @ohfc/once

A tiny utility to ensure a function is called only once. Subsequent calls return the first result. Fully typed, zero dependencies.

## 📦 Install

```bash
pnpm add @ohfc/once
# or
npm install @ohfc/once
# or
yarn add @ohfc/once
```

## 🚀 Usage

```ts
import { once } from "@ohfc/once";

const init = once(() => {
  console.log("Initialized!");
  return 42;
});

init(); // Logs 'Initialized!' and returns 42
init(); // Returns 42, does nothing
```

## 📖 API

`once(callback)`

- callback: `Function` <br>
  The function to wrap — it will only run once.
- returns: `Function` <br>
  A wrapped function that calls the original callback only once and caches its result.

## ✅ Features

- Zero dependencies
- Fully typed (TypeScript)
- Small and fast

## 📝 License

MIT
