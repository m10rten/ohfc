# `@ohfc/time-ago`

A minimal, dependency-free utility to format dates and timestamps as "time ago" or "in X" strings, supporting both Node.js and browser environments.

## Installation

```bash
npm install @ohfc/time-ago
```

## Features

- Converts dates, timestamps, or ISO strings to readable relative time (e.g., `"2 days ago"`, `"in 5 minutes"`)
- Supports both **Node.js** and **browser**
- Localizable using native `Intl.RelativeTimeFormat`
- No dependencies
- Tiny footprint

## Usage

```ts
import timeAgo from "@ohfc/time-ago";

// 1 minute ago, assuming Date.now()
console.log(timeAgo(Date.now() - 60 * 1000)); // "1 minute ago"

// In 2 hours
console.log(timeAgo(Date.now() + 2 * 60 * 60 * 1000)); // "in 2 hours"

// Pass a Date or ISO string
console.log(timeAgo(new Date(Date.now() - 86400000))); // "yesterday"
console.log(timeAgo("2025-09-06T12:00:00Z")); // relative to now

// Use a different locale
console.log(timeAgo(Date.now() - 3600 * 1000, "fr")); // "il y a 1 heure"
```

## API

### `timeAgo(input, locales?)`

| Parameter | Type                              | Description                                             |
| --------- | --------------------------------- | ------------------------------------------------------- |
| `input`   | `number \| string \| Date`        | The date value: timestamp, ISO string, or `Date` object |
| `locales` | `Intl.LocalesArgument` (optional) | Optional BCP-47 locale string (defaults to `"en"`)      |

**Returns:**  
A string with the relative time, such as `"5 minutes ago"` or `"tomorrow"`.

**Throws:**  
`TypeError` if input is not provided or invalid.

---

This README enables quick installation, highlights the main features, shows how to use all API options, and documents the accepted input types and method signature—all essential for an npm package introduction.[2][4]

[1](https://spin.atomicobject.com/valuable-readme/)
[2](https://blog.bitsrc.io/writing-the-perfect-reademe-for-your-node-library-2d5f24dc1c06)
[3](https://github.com/othneildrew/Best-README-Template)
[4](https://docs.npmjs.com/about-package-readme-files/)
[5](https://www.makeareadme.com)
[6](https://stackoverflow.com/questions/28595114/how-do-i-manage-my-packages-readme-on-npmjs-com)
[7](https://snyk.io/blog/best-practices-create-modern-npm-package/)
[8](https://gist.github.com/andreasonny83/7670f4b39fe237d52636df3dec49cf3a)
[9](https://docs.npmjs.com/files/package.json/)
[10](https://www.totaltypescript.com/how-to-create-an-npm-package)
