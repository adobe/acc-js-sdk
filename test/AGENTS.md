---
last_compiled_date: 2026-04-04
version: 1.0
---

# test/AGENTS.md

## Scope

- Unit tests for all `src/` modules with 100% coverage enforcement (branches, lines, statements)
- Transport-level mocking via `mock.js` — no real HTTP calls

## Key Files

- `mock.js` (shared) — `Mock.makeClient()`, `Mock.withMockConsole()`, and pre-built SOAP response constants (`LOGON_RESPONSE`, `LOGOFF_RESPONSE`, `R_TEST`, etc.)
- `jest.config.js` (config) — Coverage thresholds, Babel transform, `transformIgnorePatterns` for ESM packages
- `client.test.js` (largest) — 5000+ lines covering NLWS proxy, SOAP dispatch, session management

## Patterns

### Adding a New Test File

1. Create `test/<module>.test.js` mirroring `src/<module>.js`
2. Import the module under test and `Mock` from `./mock.js`:
   ```js
   const sdk = require('../src/index.js');
   const Mock = require('./mock.js').Mock;
   ```
3. Create client: `const client = await Mock.makeClient();`
4. Mock transport responses: `client._transport.mockReturnValueOnce(Promise.resolve(xmlString));`
5. Run: `npm run unit-tests`
6. Coverage must remain at 100% — add tests for every branch

## Related

- `src/` — source modules under test
- `mock.js` — shared mock utilities and SOAP response fixtures
