---
last_compiled_date: 2026-04-04
version: 1.0
---

# Coding Rules — acc-js-sdk

## 1. Module Pattern (Critical)

Every source file in `src/` uses the IIFE + CommonJS pattern. Never use ES modules (`import`/`export`).

```js
(function() {
  "use strict";

  const Foo = require('./foo.js').Foo;

  class Bar { /* ... */ }

  exports.Bar = Bar;
  // or: module.exports = bar;
})();
```

**Why**: The SDK is isomorphic. The custom browser bundler (`compile.js`) expects this exact pattern — it wraps each file in a synthetic CommonJS module scope. ES modules would break the browser build.

## 2. Isomorphic Constraints (Critical)

The SDK runs in **Node.js** (server) and **browsers** (via `compile.js` → `dist/bundle.js`).

- Use `Util.isBrowser()` to branch platform-specific code (see `src/transport.js` for the canonical example)
- Never use Node-only APIs (e.g., `fs`, `path`, `Buffer`) without a browser guard
- Never use browser-only APIs (e.g., `fetch`, `Headers`, `Request`) without a Node guard
- `axios` is the Node HTTP client; `fetch` is the browser equivalent
- The `qs-stringify` package is bundled for browser use (`compile.js` resources list)

## 3. Browser Bundler Registration (Critical)

When adding a new source file, it **must** be registered in `compile.js` → `resources` array in the correct dependency order. Files are bundled sequentially — a file can only `require()` files listed above it.

## 4. ESLint & Formatting

- **Indent**: 2 spaces (enforced by ESLint)
- **Unused vars**: Error, except args prefixed with `_` (pattern: `argsIgnorePattern: "^_"`)
- **Environments**: `browser`, `commonjs`, `es2021`, `node`, `jest`
- **Extends**: `eslint:recommended`
- Run: `npm run lint`

## 5. Testing

- **Framework**: Jest with `babel-jest` transform
- **Coverage**: 100% branches, lines, and statements (enforced in `test/jest.config.js`)
- **Test naming**: `test/<module>.test.js` mirrors `src/<module>.js`
- **Transport mocking**: Use `Mock.makeClient()` from `test/mock.js`, which creates a client with `client._transport = jest.fn()`. Mock responses with `client._transport.mockReturnValueOnce(...)`.
- **Console mocking**: Use `Mock.withMockConsole(async () => { ... })` to capture `console.log` calls
- **Run**: `npm run unit-tests`

## 6. License Header

Every source file must start with the Adobe Apache 2.0 license header:

```
/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
...
*/
```

## 7. JSDoc

Use JSDoc annotations for all public APIs. The project uses the `@namespace Campaign` convention for SDK-level types and `@memberof Campaign` to associate types/methods.

Generate docs with: `npm run jsdoc`

## 8. Error Handling

- Use `CampaignException` / `makeCampaignException` from `src/campaign.js` for Campaign-specific errors
- Use `HttpError` from `src/transport.js` for HTTP-level errors
- Always include meaningful error messages; the SDK is used by third-party developers

## 9. XML / SOAP

- DOM utilities live in `src/domUtil.js` (`DomUtil` class) — use these, not raw DOM APIs
- SOAP calls go through `src/soap.js` (`SoapMethodCall` class)
- Type casting between JS and XTK types uses `src/xtkCaster.js` (`XtkCaster` class)
- The SDK converts XML ↔ JSON using configurable representations (SimpleJson, BadgerFish, xml)

## 10. Dependency Policy (Critical)

External dependencies must be strictly limited. The SDK has only 3 runtime dependencies (`axios`, `jsdom`, `qs-stringify`). Never add a new dependency without explicit user confirmation. Prefer implementing functionality inline or using built-in Node.js/browser APIs over pulling in a new package.

## 11. Sensitive Data

Use `Util.trim()` to sanitize objects before logging — it redacts session tokens, passwords, and security tokens from SOAP payloads and objects.
