# Spec — Phase 6: Listing detail view

## Overview
Add a "click into a listing" experience so the demo feels complete, without introducing routing. Clicking a `ListingCard` opens an in-page modal/slide-over with: the full untruncated description, a "why this matched" checklist tying the listing back to the currently active filters, a price-history sparkline for `price_drop` listings, and a "similar listings" section. Parent spec: `plans/house-hunter-demo-spec.md`.

## Data model
No changes to `DemoListing`/`DemoFilters`/the dataset. New client-only derived data:
- `syntheticPriceHistory(listing: DemoListing): { date: string; price_eur: number }[]` — a small deterministic (seeded from `listing.id`, not `Math.random()`) 3-4 point series ending at the listing's current `price_eur`, only meaningful/rendered when `listing.price_drop === true`.
- `matchedCriteria(listing: DemoListing, filters: DemoFilters): { label: string; value: string }[]` — for each currently-active filter field, describe the listing's actual value satisfying it (e.g. `{ label: "Price", value: "€215,000 — under your €300k budget" }`). Every listing in `results` already satisfies every active filter by construction (search is an AND-composition), so this is a presentation-only mapping, not new matching logic.
- `similarListings(all: DemoListing[], listing: DemoListing, limit = 3): DemoListing[]` — same county, price within ±20% of `listing.price_eur`, excluding `listing` itself, closest-price-first.

## Security Requirements
- [ ] No `dangerouslySetInnerHTML` in the new modal component.
- [ ] Modal state (open/selected listing) lives in the existing Zustand store or local component state — no new persistence, no localStorage of anything sensitive (there's nothing sensitive in this app, but keep the pattern).
- [ ] Modal is keyboard-dismissible (Escape) and doesn't trap focus permanently — basic a11y hygiene, not a hard security item, but checked here since it's cheap.

## Acceptance criteria

### No unsafe HTML injection in new code
```bash
cd house-hunter-demo && ! grep -r "dangerouslySetInnerHTML" src/components/
```

### Clicking a card opens a modal with the full description
```bash
cd house-hunter-demo && npm test -- --run src/components/ListingDetail.test.tsx
```

### matchedCriteria and similarListings are pure and tested
```bash
cd house-hunter-demo && npm test -- --run src/lib/detail.test.ts
```

### Full build still succeeds
```bash
cd house-hunter-demo && npm run build && test -d dist
```

### No regressions in existing suite
```bash
cd house-hunter-demo && npm test -- --run
```

## Out of scope
Per-listing shareable URLs/routing (deliberately a modal, not a route — see Overview). Real photos. Contacting/enquiry forms.

## Docs rule
Fix or refresh any docs the change touches in the same PR as the change.
