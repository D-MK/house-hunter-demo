# Spec — Phase 3: Mock parser + search core

## Overview
Build `src/lib/parse.ts` (deterministic prompt→filters simulation) and `src/lib/search.ts` (pure filter/sort over the Phase 2 dataset). Together these are the demo's core logic — everything else is UI around them. Also adds `src/data/examples.ts`, the curated example prompts, and wires the Phase 2 generator's self-validation so it can never ship an example that returns zero results. Parent spec: `plans/house-hunter-demo-spec.md`.

## Data model
`parse(prompt: string): ParseResult` where `ParseResult = { filters: DemoFilters, spans: MatchSpan[] }` (types from Phase 1). `search(listings: DemoListing[], filters: DemoFilters, sort?: SortKey): DemoListing[]` — pure, no side effects.

Pattern coverage required in `parse.ts`: county/town (gazetteer), price (under/over/between/around), beds/baths, property type + synonyms (semi-d, flat, terraced, etc.), BER band, and the richer attributes — garage/shed/workshop → `outbuilding`, home office/garden office → `pod_space`, fibre/broadband/remote-working → `fibre`, recently reduced/price drop → `price_drop`.

## Security Requirements
- [ ] `parse.ts` is pure and offline — no network calls, no API keys, nothing that could be mistaken for a real LLM call.
- [ ] Prompt text that gets echoed back into the UI (span highlighting) is plain string data only — no HTML construction happens in this layer (rendering safety is enforced in Phase 4, but this layer must not introduce any string concatenation that looks like HTML).

## Acceptance criteria

### Parser unit tests pass, covering all pattern categories including richer attributes
```bash
cd house-hunter-demo && npm test -- --run src/lib/parse.test.ts
```

### Search is pure and correctly filters
```bash
cd house-hunter-demo && npm test -- --run src/lib/search.test.ts
```

### Curated examples all return real results against the Phase 2 dataset
```bash
cd house-hunter-demo && npm run validate-examples
```
(`validate-examples` script: for each entry in `src/data/examples.ts`, run `search(listings, parse(prompt).filters)` and assert `.length >= 5`; exits non-zero and prints the failing prompt if not.)

### No live network/LLM call anywhere in this layer
```bash
cd house-hunter-demo && ! grep -rE "fetch\(|axios|XMLHttpRequest" src/lib/parse.ts src/lib/search.ts
```

## Out of scope
UI components, rendering, the demo-mode banner copy (Phase 4).

## Docs rule
Fix or refresh any docs the change touches in the same PR as the change.
