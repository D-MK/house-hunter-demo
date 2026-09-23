# Spec — Phase 7: About page

## Overview
Add an in-app "About" overlay (same non-routed modal pattern as the Phase 6 listing detail — no new URL/route) covering: why this exists (the real-world gap — standard portal filters don't expose niche structural criteria like outbuildings, home-office space, or fibre), and a concise, visual, end-to-end explainer of how a prompt becomes results, built as a native infographic in the site's own visual language (not an embedded Mermaid block — this is in-app UI, not a markdown doc). Parent spec: `plans/house-hunter-demo-spec.md`.

## Data model
No new listing/filter types. New presentational content module: `src/content/about.ts` exporting the page's copy as structured data (a short motivation paragraph + an ordered array of process steps, each `{ label: string; detail: string }`), so copy can be reviewed/edited independently of the component.

## Security Requirements
- [ ] No `dangerouslySetInnerHTML` in the new component.
- [ ] No *automatic* external network requests (no external images, no external fonts, no analytics, nothing fetched on load) — the site's footer claims "no analytics" and "the only [automatic] network request is OpenStreetMap tiles"; this page must not break that claim. The infographic is built from inline SVG/CSS only. **Amended post-launch:** explicit, user-clickable `<a href>` links to this project's own public GitHub repo (added so recruiters can jump from a demo section straight to the source that implements it) are allowed — a link a visitor must deliberately click is not an automatic request, and it points at the project's own already-public source, not a third party. No other external domains, and still no auto-loaded resources of any kind.
- [ ] Modal is keyboard-dismissible (Escape) and reachable via visible nav (not hidden/undiscoverable).

## Acceptance criteria

### No unsafe HTML injection
```bash
cd house-hunter-demo && ! grep -r "dangerouslySetInnerHTML" src/components/About*.tsx src/content/about.ts 2>/dev/null
```

### No external requests beyond OpenStreetMap tiles and this project's own GitHub repo
```bash
cd house-hunter-demo && ! grep -rE "https?://" src/content/about.ts src/components/About*.tsx 2>/dev/null | grep -vE "openstreetmap|github.com/D-MK/house-hunter-demo"
```

### Copy stays concise (recruiter-readable, not an essay)
```bash
cd house-hunter-demo && WORDS=$(grep -oE '"[^"]*"|`[^`]*`' src/content/about.ts | grep -oE "[A-Za-z']+" | wc -l) && \
  echo "words: $WORDS" && [ "$WORDS" -lt 450 ]
```

### About modal opens, shows content, closes
```bash
cd house-hunter-demo && npm test -- --run src/components/About.test.tsx
```

### Full build succeeds, no regressions
```bash
cd house-hunter-demo && npm run build && test -d dist && npm test -- --run
```

## Out of scope
Any real photos, external icon libraries, or web fonts. A dedicated route/URL for this page (deliberately a modal, consistent with the rest of the site).

## Docs rule
Fix or refresh any docs the change touches in the same PR as the change.
