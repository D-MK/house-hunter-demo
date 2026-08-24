/**
 * Single view, top to bottom: disclosure → brand → hero → prompt → parse
 * breakdown → results. No router, no auth, no data fetching — every piece of
 * state lives in the Zustand store and every listing is bundled at build time.
 */

import { DemoBanner } from "@/components/DemoBanner";
import { ParseBreakdown } from "@/components/ParseBreakdown";
import { PromptBox } from "@/components/PromptBox";
import { ResultsSection } from "@/components/ResultsSection";
import { SiteHeader } from "@/components/SiteHeader";

export function App() {
  return (
    <div className="min-h-screen">
      <DemoBanner />
      <SiteHeader />

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-5 pt-10 pb-20 sm:px-8 sm:pt-14">
        <section className="max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-paper-300 bg-white/70 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
            Prompt → filters → results
          </p>
          <h1 className="font-display text-4xl leading-[1.08] font-semibold tracking-tight text-ink-900 text-balance sm:text-5xl">
            Describe the house. Watch it turn into filters.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-500">
            Type a plain-English brief — county, budget, beds, BER, an
            outbuilding, room for a garden office — and see exactly which words
            became which constraint before the search runs.
          </p>
        </section>

        <PromptBox />
        <ParseBreakdown />
        <ResultsSection />
      </main>

      <footer className="border-t border-paper-300 bg-white/60">
        <div className="mx-auto grid max-w-6xl gap-2 px-5 py-8 text-xs leading-relaxed text-ink-400 sm:px-8">
          <p>
            Every listing, address, description and coordinate in this demo is
            synthetic. Nothing here is scraped, and no real property is
            represented — town, county and Eircode-prefix names are real so the
            data reads plausibly.
          </p>
          <p>
            Static site · no backend · no accounts · no cookies · no analytics.
            The only network request the page makes is for OpenStreetMap map
            tiles.
          </p>
        </div>
      </footer>
    </div>
  );
}
