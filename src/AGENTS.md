---
last_compiled_date: 2026-04-04
version: 1.0
---

# src/AGENTS.md

## Scope

- Core SDK source: SOAP/XML communication with Adobe Campaign Classic servers
- Isomorphic JavaScript — every file must work in Node.js AND browser
- Campaign API client with JS Proxy-based `NLWS` interface
- Schema/metadata object model, type casting, caching layers

## Architecture

```
index.js (SDK entrypoint — public API surface)
  └─ client.js (Client class — NLWS Proxy, session, API dispatch)
       ├─ soap.js (SoapMethodCall — SOAP envelope build/parse)
       │    ├─ domUtil.js (DOM/XML utilities, JSDOM in Node)
       │    └─ xtkCaster.js (XTK ↔ JS type conversions)
       ├─ transport.js (axios in Node, fetch in browser)
       ├─ application.js (XtkSchema object model)
       ├─ campaign.js (CampaignException — SDK-0000xx error codes)
       ├─ cache.js → methodCache.js, optionCache.js, xtkEntityCache.js
       ├─ cacheRefresher.js (background cache refresh)
       ├─ entityAccessor.js (representation-agnostic entity traversal)
       ├─ xtkJob.js (async job interface)
       └─ crypto.js (encryption — Node crypto / browser stub)
```

### Key Files

- `client.js` (core) — 2400+ lines. Heart of the SDK: `Client` class, NLWS Proxy handlers (`clientHandler`, `xtkObjectHandler`), session management, all API method dispatch via `_callMethod()`
- `index.js` (entrypoint) — `SDK` class. Public API surface: `init()`, `escapeXtk()`, `getSDKVersion()`. Wires exports
- `transport.js` (isomorphic) — Canonical isomorphic pattern: `Util.isBrowser()` guard with axios (Node) vs fetch (browser)
- `campaign.js` (errors) — `CampaignException` with static factory methods using `SDK-0000xx` error codes

## Patterns

### Adding a New Source File

1. Create file using the IIFE + CommonJS pattern:
   ```js
   (function() { "use strict"; /* ... */ exports.MyClass = MyClass; })();
   ```
2. Add the Adobe license header at the top
3. Register in `compile.js` → `resources` array in correct dependency order
4. Import via `require('./myFile.js')` from consuming modules
5. Verify: `npm run lint && npm run unit-tests && node compile.js`

### Adding a New SOAP API Method

API methods are dispatched through the NLWS Proxy in `client.js`. The Proxy dynamically resolves `client.NLWS.<namespace>.<method>()` calls — no registration needed for standard SOAP methods. The flow:

1. `clientHandler` resolves namespace → schema ID via `Util.schemaIdFromNamespace()`
2. Method name is capitalized and routed to `client._callMethod()`
3. `_callMethod()` looks up the SOAP method definition, marshals parameters via `SoapMethodCall`
4. Special-cased methods (logon, logoff, getOption) are intercepted in `clientHandler`

To add a **new special-cased method**, add an intercept in `clientHandler.get()` in `client.js`.

## Testing

- Test files: `test/<module>.test.js` (convention; some tests are cross-cutting by feature)
- Run: `npm run unit-tests`
- Coverage: **100% branches, lines, statements** (enforced)
- See `test/AGENTS.md` for mock patterns and test utilities

## Boundaries

### Common Mistakes

- Adding a file without registering in `compile.js` — browser build silently excludes it
- Using Node-only APIs (`fs`, `path`, `Buffer`, `crypto`) without `Util.isBrowser()` guard
- Using `import`/`export` instead of IIFE + CommonJS — breaks browser bundler
- Adding a dependency without user approval — only 3 runtime deps allowed

### Exceptions

| Exception | Code | When raised |
|---|---|---|
| `CampaignException` | SDK-000000–000018 | All Campaign-level errors (auth, SOAP, upload, etc.) |
| `HttpError` | HTTP status codes | Transport-level HTTP failures |
| `DomException` | N/A | XML parsing/DOM errors |

## Related

- `test/` — test suite with transport mocking; see `test/AGENTS.md`
- `compile.js` (root) — browser bundler that reads the `resources` list
- `src/web/bundler.js` — lightweight `require`/`define` shim for browser runtime

## Conventions

- Every file uses `(function() { "use strict"; ... })();` IIFE wrapper — no exceptions
- Error codes follow `SDK-0000xx` format with static factory methods on `CampaignException`
- Isomorphic branching uses `Util.isBrowser()` with Node code first, browser code in `else` block
