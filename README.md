# House Hunter — demo

Natural-language property search: type a plain-English brief, watch it turn into structured filters, get results.

**[Live demo](https://d-mk.github.io/house-hunter-demo/)** · **[ARCHITECTURE.md](ARCHITECTURE.md)** — how the parsing layer works, and how it would work in production.

## What it demonstrates

- **Natural language → structured filters, made visible.** A prompt becomes county, price, beds, type, BER, area and attribute constraints. The UI links every chip back to the words that produced it, and each is editable or removable — the parse is a starting point the user can correct, not a black box. Any result opens a detail view showing which criteria it satisfied.
- **A typed data model.** One `DemoListing` / `DemoFilters` contract in TypeScript spans the dataset generator, the parser, the search layer and the UI, so a field can't drift between them.
- **Static-first, zero-backend architecture.** No server, no database, no accounts, no cookies, no analytics, no API keys. The dataset is generated at build time and bundled; search and sort run in memory in the browser. The only network request the page makes is for map tiles.

## Demo mode

Prompts are parsed by a deterministic local rule-based parser — the LLM structured-output step is **mocked, not called**. A static site has nowhere safe to keep an API key, so the demo simulates that step rather than inlining a secret into client JavaScript. The app says so on the page, permanently.

What that costs, and the server-side design the real version uses instead, is in [ARCHITECTURE.md](ARCHITECTURE.md).

## Data

300 synthetic listings across all 26 Irish counties, generated from a fixed seed by `scripts/generate-dataset.ts`. Nothing is scraped: no real property, address, description or listing URL appears anywhere. Town, county and Eircode-prefix names are real so the data reads plausibly.

## Run locally

```bash
npm install
npm run generate-data
npm run dev
```

`npm test` runs the parser, search, store, detail-view and about-overlay tests. `npm run build` typechecks and produces the static bundle in `dist/`.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · Zustand · Leaflet + OpenStreetMap · Vitest + Testing Library.
