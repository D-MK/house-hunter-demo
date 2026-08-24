/**
 * Frame around the Leaflet map.
 *
 * The map itself is code-split: Leaflet plus its stylesheet is ~40% of the
 * app's JavaScript, and it isn't needed to render the prompt box, the parse
 * breakdown or the first screen of results. Loading it behind `lazy` keeps the
 * initial payload small and the demo's first paint quick.
 */

import { lazy, Suspense } from "react";
import type { DemoListing } from "@/lib/types";

const ResultsMap = lazy(() => import("@/components/ResultsMap"));

export function MapPanel({ listings }: { listings: DemoListing[] }) {
  const plotted = Math.min(listings.length, 200);

  return (
    <section
      aria-label="Map of matching listings"
      // `isolate` matters: Leaflet gives its panes and controls z-indexes up to
      // 1000, and without a stacking context of their own they compete with the
      // rest of the page — the tiles paint straight over the listing modal.
      className="isolate overflow-hidden rounded-2xl border border-paper-300 bg-white shadow-card"
    >
      <div className="flex items-baseline justify-between gap-2 border-b border-paper-200 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-ink-800">On the map</h2>
        <p className="text-[11px] text-ink-400">
          {listings.length === 0
            ? "no matches to plot"
            : `${plotted} of ${listings.length} plotted`}
        </p>
      </div>
      <div className="h-72 w-full lg:h-[26rem]">
        <Suspense
          fallback={
            <div className="grid h-full w-full place-items-center bg-paper-200 text-xs text-ink-500">
              Loading map…
            </div>
          }
        >
          <ResultsMap listings={listings} />
        </Suspense>
      </div>
      <p className="border-t border-paper-200 px-4 py-2 text-[11px] leading-relaxed text-ink-400">
        Coordinates are synthetic, scattered near the real town they name. Tiles
        © OpenStreetMap contributors.
      </p>
    </section>
  );
}
