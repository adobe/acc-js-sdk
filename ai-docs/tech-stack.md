---
last_compiled_date: 2026-04-04
version: 1.0
---

# Technology Stack

## Core
- **Language**: JavaScript (ES6/ES2021, CommonJS modules)
- **Runtime**: Node.js >= 20 (server) + Browser (via custom bundler)
- **Framework**: None (standalone SDK library)
- **Database**: N/A — SDK is a client library for Adobe Campaign Classic

## Libraries & Tools

| Technology | Category | Role in this repo | Files |
|---|---|---|---|
| axios ^1.7.8 | Web | HTTP client for Node.js transport | `src/transport.js` |
| jsdom ^29.0.1 | Web | DOM/XML parsing in Node.js | `src/domUtil.js` |
| qs-stringify ^1.2.1 | Web | Query string encoding (isomorphic) | `src/client.js` |
| Jest ^29.3.1 | Testing | Unit test framework, 100% coverage | `test/` |
| jest-junit ^15.0.0 | Testing | JUnit XML reporter for CI | `test/jest.config.js` |
| Babel ^7.29.0 | Testing | Transpilation for Jest (preset-env) | `babel.config.js` |
| ESLint ^8.7.0 | Quality | Linter (eslint:recommended + custom) | `.eslintrc.js` |
| JSDoc ^4.0.0 | Docs | API documentation generation | `jsdoc.json` |
| docdash ^2.0.0 | Docs | JSDoc template | `jsdoc.json` |

**Inclusion criteria:**
- Must be imported in application code (not just in manifest)
- Cite >=1 file where it's used

**Dependency policy:** External dependencies are strictly limited. Never add a new dependency without explicit user confirmation. Only 3 runtime dependencies exist.

**Categories**: Web, Testing, Quality, Docs

---

## How to Update

1. Add new dependency to `package.json` (requires explicit approval)
2. Import and use in application code
3. If used in browser, register in `compile.js` resources array
4. Update `ai-docs/tech-stack.md` to reflect the new dependency
