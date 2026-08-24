# Spec — Phase 2: Dataset generator

## Overview
Build `scripts/generate-dataset.ts`: a seeded, reproducible generator producing ~300 synthetic Irish property listings across all 26 counties, matching `DemoListing` from Phase 1's `src/lib/types.ts`. Output lands at `src/data/listings.json`, committed to the repo. Parent spec: `plans/house-hunter-demo-spec.md`.

## Data model
Populates `DemoListing[]` (see `src/lib/types.ts`). No new types — this phase only produces data conforming to the existing shape. Explicitly must NOT include any of: `score, tier, dan_verdict, drive_min, reno_band, reno_cost_*, all_in_*, tags, url` (real listing URLs) — these are private-app-only fields or would imply real scraped source data.

## Security Requirements
- [ ] No real scraped listing content, addresses, photos, or URLs — every listing is synthetically generated. Real Irish town/county/Eircode-prefix names are fine to use.
- [ ] No private-schema fields (see Data model exclusion list above) leak into the output JSON.
- [ ] Generator is deterministic (seeded PRNG) — no `Math.random()`/`Date.now()` without an explicit seed, so output is reproducible and reviewable in diffs.

## Acceptance criteria

### Generator runs and produces a valid dataset
```bash
cd house-hunter-demo && npm run generate-data && \
  node -e "const d=require('./src/data/listings.json'); if(!Array.isArray(d)||d.length<250) process.exit(1)"
```

### All 26 counties represented
```bash
cd house-hunter-demo && node -e "
const d=require('./src/data/listings.json');
const counties=new Set(d.map(l=>l.county));
if(counties.size<26) process.exit(1);
"
```

### No private-only fields present
```bash
cd house-hunter-demo && ! grep -E '"(score|tier|dan_verdict|drive_min|reno_band|reno_cost|all_in|over_budget_flag|url)"' src/data/listings.json
```

### Reproducible — regenerating produces identical output
```bash
cd house-hunter-demo && cp src/data/listings.json /tmp/listings-check.json && \
  npm run generate-data && diff -q src/data/listings.json /tmp/listings-check.json
```

## Out of scope
Prompt parsing, search logic, UI, curated-example validation (that check is deferred to Phase 3, once the parser + search function it depends on exist).

## Docs rule
Fix or refresh any docs the change touches in the same PR as the change.
