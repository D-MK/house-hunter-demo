# Spec — Phase 5: README, ARCHITECTURE.md, deploy

## Overview
Write the recruiter-facing README, a separate `ARCHITECTURE.md` explaining the mock-vs-real LLM flow, and the GitHub Pages deploy workflow. Parent spec: `plans/house-hunter-demo-spec.md`.

**Writing constraint (non-negotiable for this phase): keep it short.** A recruiter skims, they don't read essays. README main body under ~350 words, plain direct sentences, bullets over paragraphs, the pitch and the live-demo link above the fold. No filler ("this project showcases my passion for..."), no restating the obvious, no marketing voice. Say what it is, what it demonstrates, and get out of the way.

`ARCHITECTURE.md` can run longer since it's the opt-in deep-dive, but still: no padding, let the two diagrams carry the explanation, use short paragraphs between them, not essays. Use exactly the two diagrams already reviewed with Dan in-session (client-side mock flow; server-side production flow) — don't regenerate or reframe them.

## Data model
N/A — documentation and CI config only.

## Security Requirements
- [ ] `deploy.yml` uses only the default `GITHUB_TOKEN` via `actions/upload-pages-artifact` + `actions/deploy-pages` — no PAT, no third-party deploy key, no `secrets.*` reference at all.
- [ ] README and ARCHITECTURE.md describe the production LLM-gateway pattern generically — no mention of Dan's actual domain, VPS, or infra details.

## Acceptance criteria

### README exists, links ARCHITECTURE.md, documents the trade-off, and is short
```bash
cd house-hunter-demo && test -f README.md && \
  grep -qi "demo mode" README.md && \
  grep -qiE "mocked|simulat" README.md && \
  grep -qi "ARCHITECTURE.md" README.md && \
  [ "$(wc -w < README.md)" -lt 600 ]
```

### ARCHITECTURE.md exists with both flows diagrammed as Mermaid
```bash
cd house-hunter-demo && test -f ARCHITECTURE.md && \
  grep -c '```mermaid' ARCHITECTURE.md | grep -qE '^[2-9]|^[1-9][0-9]+$'
```

### Deploy workflow present, no secrets required
```bash
cd house-hunter-demo && test -f .github/workflows/deploy.yml && \
  grep -q "actions/deploy-pages" .github/workflows/deploy.yml && \
  ! grep -qE "secrets\.[A-Z_]+" .github/workflows/deploy.yml
```

### Vite base path matches the Pages sub-path
```bash
cd house-hunter-demo && grep -q "base:.*house-hunter-demo" vite.config.ts
```

## Out of scope
Custom domain setup, analytics/tracking of any kind.

## Docs rule
Fix or refresh any docs the change touches in the same PR as the change.
