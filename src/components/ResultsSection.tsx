/**
 * Result count, sort control, map and card grid.
 *
 * Cards are revealed a page at a time: a filter-free search matches all 300
 * listings, and each card draws its own SVG, so rendering the lot on first paint
 * is a lot of DOM for something nobody scrolls to. The map always sees the full
 * result set.
 *
 * This is also where the detail modal is mounted and where the card that opened
 * it is remembered, so closing the modal puts focus back where it started
 * rather than at the top of the document.
 */

import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ListingCard } from "@/components/ListingCard";
import { ListingDetail } from "@/components/ListingDetail";
import { MapPanel } from "@/components/MapPanel";
import type { DemoListing, SortKey } from "@/lib/types";
import { useAppStore } from "@/store/app";

const PAGE = 24;

const SORTS: { key: SortKey; label: string }[] = [
  { key: "price_asc", label: "Price ↑" },
  { key: "price_desc", label: "Price ↓" },
  { key: "newest", label: "Newest" },
  { key: "area_desc", label: "Largest" },
];

export function ResultsSection() {
  const results = useAppStore((s) => s.results);
  const filters = useAppStore((s) => s.filters);
  const sort = useAppStore((s) => s.sort);
  const setSort = useAppStore((s) => s.setSort);
  const selected = useAppStore((s) => s.selected);
  const openListing = useAppStore((s) => s.openListing);

  const [visible, setVisible] = useState(PAGE);
  const filtered = Object.keys(filters).length > 0;

  const triggerRef = useRef<HTMLElement | null>(null);

  // A new search should always start at the top of the list again.
  useEffect(() => {
    setVisible(PAGE);
  }, [results]);

  // Closing the modal hands focus back to the card that opened it. The card may
  // have been unmounted in the meantime (a new search, or "show more" replacing
  // the grid), so this is best-effort: `isConnected` keeps it from focusing a
  // detached node.
  useEffect(() => {
    if (selected !== null) return;
    const trigger = triggerRef.current;
    triggerRef.current = null;
    if (trigger !== null && trigger.isConnected) trigger.focus();
  }, [selected]);

  const handleOpen = (listing: DemoListing, trigger: HTMLElement) => {
    // Only the first card in a chain is remembered — opening a "similar"
    // listing from inside the modal shouldn't move the return target.
    if (triggerRef.current === null) triggerRef.current = trigger;
    openListing(listing);
  };

  return (
    <section aria-label="Results" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-ink-900">
          {results.length === 0
            ? "No matches"
            : `${results.length} ${results.length === 1 ? "home" : "homes"}`}
          <span className="ml-2 font-sans text-sm font-normal text-ink-400">
            {results.length === 0
              ? "for these filters"
              : filtered
                ? "match these filters"
                : "in the demo dataset"}
          </span>
        </h2>

        <div
          role="group"
          aria-label="Sort results"
          className="inline-flex rounded-full border border-paper-300 bg-white p-0.5"
        >
          {SORTS.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={sort === option.key}
              onClick={() => setSort(option.key)}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                sort === option.key
                  ? "bg-ink-900 text-paper-50"
                  : "text-ink-500 hover:text-ink-900",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="order-2 lg:order-1">
          {results.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                {results.slice(0, visible).map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onOpen={handleOpen}
                  />
                ))}
              </div>

              {visible < results.length ? (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisible((count) => count + PAGE)}
                    className="rounded-full border border-ink-900 px-5 py-2.5 text-sm font-semibold text-ink-900 transition hover:bg-ink-900 hover:text-paper-50"
                  >
                    Show {Math.min(PAGE, results.length - visible)} more
                    <span className="ml-2 font-normal text-ink-400">
                      {visible} / {results.length}
                    </span>
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="order-1 lg:order-2 lg:sticky lg:top-24">
          <MapPanel listings={results} />
        </div>
      </div>

      <ListingDetail />
    </section>
  );
}
