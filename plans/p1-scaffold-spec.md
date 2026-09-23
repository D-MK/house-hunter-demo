# Spec — Phase 1: Repo scaffold

## Overview
Stand up the `house-hunter-demo` project skeleton: Vite + React + TypeScript + Tailwind v4 + Zustand, single-view (no router), zero auth/env/secrets. Establishes the shared type definitions every later phase builds on. Parent spec: `plans/house-hunter-demo-spec.md`.

## Data model
Create `src/lib/types.ts` with the type definitions from the parent spec (`DemoListing`, `DemoFilters`, `ParseResult`) — types only, no implementation yet.

## Security Requirements
- [ ] No `.env` file, no env vars referenced anywhere in the scaffold.
- [ ] `package.json` does not depend on `react-router*`, `better-auth`, or `drizzle-orm` — this app has no routing and no backend.
- [ ] No secrets, tokens, or keys committed anywhere in the initial scaffold.

## Acceptance criteria

### Project installs and builds
```bash
cd house-hunter-demo && npm install && npm run build && test -d dist
```

### No forbidden dependencies
```bash
cd house-hunter-demo && ! grep -qE '"(react-router|better-auth|drizzle-orm)"' package.json
```

### No secrets present
```bash
cd house-hunter-demo && test ! -f .env
```

### Shared types defined
```bash
cd house-hunter-demo && test -f src/lib/types.ts && \
  grep -q "DemoListing" src/lib/types.ts && \
  grep -q "DemoFilters" src/lib/types.ts
```

### Tailwind v4 wired up
```bash
cd house-hunter-demo && grep -Eq "@import ['\"]tailwindcss" src/index.css && grep -q "@tailwindcss/vite" vite.config.ts
```

## Out of scope
Dataset generation, parser, search, UI components, README/deploy — later phases.

## Docs rule
Fix or refresh any docs the change touches in the same PR as the change.
