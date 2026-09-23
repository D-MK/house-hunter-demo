# Spec — Phase 4: Search + results UI

## Overview
Build the visible product: prompt box, curated example chips, parse-breakdown view (highlighted prompt ↔ filter chips), editable filter chip rail, sortable results grid with a Leaflet/OSM mini-map, and the persistent demo-mode banner. Consumes Phase 2's dataset and Phase 3's `parse`/`search` — this phase is pure UI, no new business logic. Parent spec: `plans/house-hunter-demo-spec.md`.

## Data model
No new data types — consumes `DemoListing`, `DemoFilters`, `ParseResult` from `src/lib/types.ts`. State lives in a Zustand store (`src/store/app.ts`): `{ prompt, filters, results, sort }`.

## Security Requirements
- [ ] No `dangerouslySetInnerHTML` anywhere — the prompt-highlighting view (span → filter chip) is built from React elements/text nodes only, never raw HTML string injection.
- [ ] No external network requests besides the Leaflet/OSM tile provider (a standard public tile server, no API key required) — everything else is in-memory.
- [ ] The demo-mode banner is not dismissible-into-oblivion (no "never show again" that removes it from the DOM permanently) — it must stay visible on every visit since it's the honesty disclosure, not a nag.

## Acceptance criteria

### No unsafe HTML injection
```bash
cd house-hunter-demo && ! grep -r "dangerouslySetInnerHTML" src/
```

### Demo-mode banner present and always rendered
```bash
cd house-hunter-demo && grep -rqi "demo mode" src/components/
```

### Filter chips are editable/removable (state round-trips through the store)
```bash
cd house-hunter-demo && npm test -- --run src/store/app.test.ts
```

### Map component renders without requiring an API key
```bash
cd house-hunter-demo && ! grep -rE "VITE_.*(MAP|TILE)" src/ && grep -rq "leaflet" package.json
```

### Full build succeeds with the complete app assembled
```bash
cd house-hunter-demo && npm run build && test -d dist
```

## Out of scope
README, ARCHITECTURE.md, deploy workflow (Phase 5).

## Docs rule
Fix or refresh any docs the change touches in the same PR as the change.
