# Spec — house-hunter-demo

## Overview

Build `house-hunter-demo`: a public, recruiter-facing, fully static portfolio project demonstrating a natural-language house-search UX — a free-text prompt gets dissected into structured filters (county, price, beds, BER, outbuilding, home-office pod, fibre, etc.) and searched against a synthetic dataset of ~300 Irish listings. It exists to be shared as a live demo + GitHub repo alongside a job application/portfolio, decoupled from Dan's private, live house-hunter.dimsk.ie pipeline. Source plan: `plans/house-hunter-demo-plan.md`.

## Data model

No database — the dataset is a static, generated JSON file bundled at build time. Equivalent type sketch:

```ts
// src/lib/types.ts
export interface DemoListing {
  id: string;
  source: "demo";
  address: string;
  town: string;
  county: string;
  eircode: string;
  price_eur: number;
  beds: number;
  baths: number;
  property_type: string;      // "Detached" | "Semi-D" | "Terrace" | "Bungalow" | "Apartment" | "Cottage"
  ber: string;                 // band + subgrade, e.g. "B2", "G"
  floor_area_sqm: number;
  lat: number;
  lng: number;
  description: string;
  publish_date: string;        // ISO date
  outbuilding: boolean;
  outbuilding_sqm: number | null;
  pod_space: boolean;
  fibre: boolean;
  price_drop: boolean;
}

export interface DemoFilters {
  county?: string;
  town?: string;
  price_min?: number;
  price_max?: number;
  beds_min?: number;
  baths_min?: number;          // added Phase 3: spec required baths coverage, type had no field for it
  property_type?: string;
  ber_max?: string;            // band letter cap, e.g. "B" = A or B
  outbuilding?: boolean;
  pod_space?: boolean;
  fibre?: boolean;
  price_drop?: boolean;
  area_min?: number;
  q?: string;
}

export interface MatchSpan {
  start: number;
  end: number;
  field: keyof DemoFilters;
}

export type SortKey = "price_asc" | "price_desc" | "newest" | "area_desc";

export interface ParseResult {
  filters: DemoFilters;
  spans: MatchSpan[];
}
```

Fields deliberately excluded (present in the real private schema but would leak Dan's personal search criteria/scoring): `score, tier, drive_min, dan_verdict, over_budget_flag, reno_band, reno_cost_*, all_in_*, tags`.

## Security Requirements

This project's threat model is narrower than a typical auth/DB-backed app — it is a fully static site with **no backend, no auth, no session, no database, no live API calls, and no secrets of any kind by design**. Most of the project-standard checklist items therefore don't apply; each is either satisfied trivially or explicitly justified as out of scope below, per the "drop only with written justification" rule.

- [ ] **No secrets of any kind in the repo or bundle.** Not just `VITE_*` — this app has zero API keys, zero tokens, zero `.env` files. The mocked prompt parser is the deliberate design response to "a static site can't safely hold an LLM key." Verified by grep across source + build output.
- [x] **Secret-store / server-env routing — N/A, justified skip.** There is no server and nothing to route. No `.env`, no `env_file`, no platform secret manager needed.
- [x] **`BETTER_AUTH_SECRET` / auth — N/A, justified skip.** No login, no user accounts, no session state of any kind — the site is fully public and read-only.
- [x] **Session cookies — N/A, justified skip.** No sessions exist.
- [x] **Non-root container user — N/A, justified skip.** No Docker container; deployed as static files via GitHub Pages.
- [x] **Caddy lockdown — N/A, justified skip.** Not proxied through Dan's own infra; served directly by GitHub Pages, deliberately decoupled from dimsk.ie.
- [ ] **No private-schema leakage.** The generated dataset and UI must never surface the private-only fields listed in the Data Model section (score, tier, dan_verdict, drive_min, reno_*, all_in_*, tags) — these encode Dan's personal buying criteria and have no place in a public demo.
- [ ] **No real scraped content.** All listings, addresses, and descriptions in the dataset are synthetically generated (real town/county/Eircode-prefix names are fine; no real property addresses, no scraped Daft/REA/MyHome text, no real listing photos/URLs).
- [ ] **Safe rendering of user-typed input.** The prompt box echoes the user's own free-text input back into the DOM (for the highlighted parse-breakdown view) — this must go through React's default text escaping only; no `dangerouslySetInnerHTML` anywhere in the codebase.
- [ ] **GitHub Actions deploy workflow requires no repo secrets.** Uses the default `GITHUB_TOKEN` via `actions/upload-pages-artifact` + `actions/deploy-pages` only — no PAT, no third-party deploy key.

See `.claude/docs/build-app-defaults.md` for the project-wide personal-data threat model this scopes down from.

## Acceptance criteria

### Project builds clean, no router/auth/DB deps pulled in
```bash
cd house-hunter-demo && npm run build && test -d dist && \
  ! grep -qE '"(react-router|better-auth|drizzle-orm)"' package.json
```

### Zero secrets in repo or build output
```bash
cd house-hunter-demo && \
  test ! -f .env && \
  ! grep -rE "(sk-|api[_-]?key\s*[:=]\s*['\"][A-Za-z0-9]{10,})" src/ dist/ 2>/dev/null
```

### Dataset generator produces a valid, private-field-free dataset
```bash
cd house-hunter-demo && npm run generate-data && \
  node -e "const d=require('./src/data/listings.json'); if(!Array.isArray(d)||d.length<250) process.exit(1)" && \
  ! grep -E '"(score|tier|dan_verdict|drive_min|reno_band|reno_cost|all_in|over_budget_flag)"' src/data/listings.json
```

### All 26 counties represented in the dataset
```bash
cd house-hunter-demo && node -e "
const d=require('./src/data/listings.json');
const counties=new Set(d.map(l=>l.county));
if(counties.size<26) process.exit(1);
"
```

### Curated example prompts all return results (generator's own validation gate)
```bash
cd house-hunter-demo && npm run generate-data 2>&1 | grep -q "all examples validated"
```

### Parser unit tests pass, including richer-attribute patterns
```bash
cd house-hunter-demo && npm test -- --run src/lib/parse.test.ts
```

### No unsafe HTML injection anywhere in the codebase
```bash
cd house-hunter-demo && ! grep -r "dangerouslySetInnerHTML" src/
```

### Deploy workflow present and uses only the default GITHUB_TOKEN
```bash
cd house-hunter-demo && \
  test -f .github/workflows/deploy.yml && \
  grep -q "actions/deploy-pages" .github/workflows/deploy.yml && \
  ! grep -qE "secrets\.[A-Z_]+" .github/workflows/deploy.yml
```

### README documents the mocked-parsing trade-off honestly, and links the architecture doc
```bash
cd house-hunter-demo && grep -qi "demo mode" README.md && \
  grep -qiE "mocked|simulat" README.md && \
  grep -qi "ARCHITECTURE.md" README.md
```

### ARCHITECTURE.md exists with both flows diagrammed as Mermaid
```bash
cd house-hunter-demo && test -f ARCHITECTURE.md && \
  grep -c '```mermaid' ARCHITECTURE.md | grep -qE '^[2-9]|^[1-9][0-9]+$'
```
NOTE: draft `ARCHITECTURE.md`'s diagram content as a proposal for Dan to review before treating this criterion as satisfied — the diagrams' technical framing is not a subagent's call to freelance (see plan Phase 5).

### Vite base path correct for the GitHub Pages sub-path deploy
```bash
cd house-hunter-demo && grep -q "base:.*house-hunter-demo" vite.config.ts
```

## Out of scope

- Any live LLM API call from this repo (mocked by design — see Security Requirements)
- Any code path shared with, or dependency on, the private house-hunter repo/pipeline/VPS
- User accounts, saved searches, or any persisted state across visits
- Garden/parking filters (not present in the real parsed data model; a documented future extension, not built here)
- Map tile hosting beyond a standard public OSM tile provider (Leaflet default)
- Mobile app packaging, SSR, or any non-static deployment target

## Docs rule

Fix or refresh any docs the change touches in the same PR as the change.
