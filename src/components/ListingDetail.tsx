/**
 * The listing detail view: a modal over the results, not a route.
 *
 * Deliberately not a URL. This is a single-screen demo whose whole subject is
 * the prompt → filters → results loop, and pushing a route for a house would
 * mean either losing the prompt on the way back or serialising the entire
 * search into the address bar to preserve it. A modal keeps the results, the
 * chip rail and the parse breakdown alive underneath, which is the point: the
 * "why this matched" checklist is read against the *live* filters, so dropping
 * a chip while the modal is open visibly removes a reason.
 *
 * Everything shown here is derived at render time by `src/lib/detail.ts` from
 * the same public `DemoListing` the card had. No fetching, no new state, no
 * markup built from strings — the description is rendered as a React text node
 * like any other, so there is nothing to inject into.
 */

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";
import { HouseArt } from "@/components/HouseArt";
import { AttributeBadges, BerChip } from "@/components/ListingBadges";
import {
  matchedCriteria,
  similarListings,
  syntheticPriceHistory,
} from "@/lib/detail";
import type { PricePoint } from "@/lib/detail";
import { formatEuro, formatListingDate } from "@/lib/field-meta";
import type { DemoListing } from "@/lib/types";
import { LISTINGS, useAppStore } from "@/store/app";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Renders the modal when a listing is selected, and nothing at all when it
 * isn't. Keyed on the listing id so opening a "similar" house from inside the
 * modal remounts it — scroll position, focus and the price chart all reset to
 * the top of the new listing rather than inheriting the old one's.
 */
export function ListingDetail() {
  const listing = useAppStore((s) => s.selected);
  if (listing === null) return null;
  return <ListingDetailDialog key={listing.id} listing={listing} />;
}

function ListingDetailDialog({ listing }: { listing: DemoListing }) {
  const filters = useAppStore((s) => s.filters);
  const openListing = useAppStore((s) => s.openListing);
  const closeListing = useAppStore((s) => s.closeListing);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const criteria = matchedCriteria(listing, filters);
  const similar = similarListings(LISTINGS, listing, 3);
  const titleId = `listing-detail-${listing.id}`;

  const close = useCallback(() => closeListing(), [closeListing]);

  // Opening the modal moves focus into it, so the next Tab lands on the panel's
  // own controls rather than back in the results grid behind it.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Escape always closes, and Tab cycles within the panel while it's open. The
  // cycle is released the moment the modal unmounts — nothing is trapped for
  // longer than the dialog exists.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (panel === null) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (focusable.length === 0) return;

      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close]);

  // Stop the results list scrolling away behind the modal.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      {/* Backdrop. Click-to-close is a convenience on top of the close button
          and Escape, so it carries no keyboard role of its own. */}
      <div
        aria-hidden="true"
        onClick={close}
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-t-3xl border border-paper-300 bg-paper-50 shadow-lift sm:max-h-[88vh] sm:rounded-3xl"
      >
        <div className="relative">
          <HouseArt
            seed={listing.id}
            propertyType={listing.property_type}
            outbuilding={listing.outbuilding}
            podSpace={listing.pod_space}
            className="block h-44 w-full bg-paper-200 sm:h-56"
          />
          <span className="absolute top-3 left-3 rounded-full bg-ink-900/85 px-2.5 py-1 text-[11px] font-semibold text-paper-50 backdrop-blur-sm">
            {listing.property_type}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close listing details"
            className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-paper-50/90 text-ink-700 shadow-card backdrop-blur-sm transition hover:bg-white hover:text-ink-900"
          >
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-7 p-5 sm:p-7">
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
              <p className="font-display text-3xl font-semibold tracking-tight text-ink-900 tabular-nums sm:text-4xl">
                {formatEuro(listing.price_eur)}
              </p>
              <div className="flex items-center gap-2">
                {listing.price_drop ? (
                  <span className="rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                    ↓ Reduced
                  </span>
                ) : null}
                <BerChip ber={listing.ber} />
              </div>
            </div>

            <div>
              <h2
                id={titleId}
                className="font-display text-xl font-semibold text-ink-900 sm:text-2xl"
              >
                {listing.address}
              </h2>
              <p className="text-sm text-ink-500">
                {listing.town}, Co. {listing.county}
                <span className="text-ink-400"> · {listing.eircode}</span>
              </p>
            </div>

            <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 border-y border-paper-300 py-2.5 text-sm text-ink-700">
              <Stat label="beds" value={String(listing.beds)} />
              <Stat label="baths" value={String(listing.baths)} />
              <Stat label="sqm" value={String(listing.floor_area_sqm)} />
              <Stat
                label="listed"
                value={formatListingDate(listing.publish_date)}
              />
            </dl>

            <AttributeBadges listing={listing} />
          </header>

          {listing.price_drop ? <PriceHistory listing={listing} /> : null}

          <section aria-label="Why this listing matched">
            <Eyebrow>Why this matched</Eyebrow>
            {criteria.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-paper-300 bg-paper-100/70 px-4 py-3 text-sm text-ink-500">
                No filters are active, so this one isn't matching anything in
                particular — it's just part of the dataset. Describe what you're
                after in the prompt box and the reasons will show up here.
              </p>
            ) : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {criteria.map((criterion) => (
                  <li
                    key={criterion.label}
                    className="flex items-start gap-2.5 rounded-2xl border border-paper-300 bg-white px-3.5 py-2.5"
                  >
                    <Tick />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold tracking-[0.12em] text-ink-400 uppercase">
                        {criterion.label}
                      </p>
                      <p className="text-sm leading-snug text-ink-800">
                        {criterion.value}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Description">
            <Eyebrow>The blurb</Eyebrow>
            <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line text-ink-700">
              {listing.description}
            </p>
          </section>

          {similar.length > 0 ? (
            <section aria-label="Similar listings">
              <Eyebrow>
                Similar listings
                <span className="ml-2 font-normal normal-case tracking-normal text-ink-400">
                  nearby, within 20% of this price
                </span>
              </Eyebrow>
              <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                {similar.map((other) => (
                  <li key={other.id}>
                    <SimilarCard
                      listing={other}
                      onOpen={() => openListing(other)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="border-t border-paper-300 pt-4 text-[11px] leading-relaxed text-ink-400">
            Synthetic listing. Any price history above is reconstructed from
            this listing's own blurb and id — not a record of anything that
            happened.
          </p>
        </div>
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
      {children}
    </h3>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="sr-only">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
      <span aria-hidden="true" className="text-xs text-ink-400">
        {label}
      </span>
    </div>
  );
}

function Tick() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-gorse-400 text-ink-900"
    >
      <svg
        viewBox="0 0 12 12"
        className="h-2.5 w-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.5 6.4L4.8 8.7L9.5 3.6" />
      </svg>
    </span>
  );
}

/**
 * The reduction trail, as a sparkline plus the numbers it's drawn from.
 *
 * Four points don't justify a charting library, and the list underneath is the
 * accessible version of the same information — so the SVG is decorative and
 * hidden from assistive tech rather than being given a fake table role.
 */
function PriceHistory({ listing }: { listing: DemoListing }) {
  const points = syntheticPriceHistory(listing);
  const first = points[0] as PricePoint;
  const last = points[points.length - 1] as PricePoint;
  const drop = first.price_eur - last.price_eur;
  const pct = Math.round((drop / first.price_eur) * 100);

  return (
    <section aria-label="Price history">
      <Eyebrow>Price history</Eyebrow>
      <div className="mt-3 overflow-hidden rounded-2xl border border-paper-300 bg-white">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-paper-200 px-4 py-2.5">
          <p className="text-sm text-ink-700">
            Down{" "}
            <span className="font-semibold tabular-nums text-rose-700">
              {formatEuro(drop)}
            </span>{" "}
            since it was listed
          </p>
          <p className="text-xs font-semibold tabular-nums text-rose-700">
            −{pct}%
          </p>
        </div>

        <Sparkline points={points} />

        <ol className="divide-y divide-paper-200 border-t border-paper-200 text-sm">
          {points.map((point, index) => {
            const previous = points[index - 1];
            const delta =
              previous === undefined ? 0 : point.price_eur - previous.price_eur;
            return (
              <li
                key={point.date}
                className="flex items-baseline justify-between gap-3 px-4 py-2"
              >
                <span className="text-ink-500">
                  {formatListingDate(point.date)}
                  {index === 0 ? (
                    <span className="text-ink-400"> · listed</span>
                  ) : null}
                </span>
                <span className="flex items-baseline gap-3">
                  {delta < 0 ? (
                    <span className="text-xs tabular-nums text-rose-700">
                      −{formatEuro(Math.abs(delta))}
                    </span>
                  ) : null}
                  <span
                    className={
                      index === points.length - 1
                        ? "font-semibold tabular-nums text-ink-900"
                        : "tabular-nums text-ink-600"
                    }
                  >
                    {formatEuro(point.price_eur)}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/** Wide and short. The SVG scales to the panel width with its aspect ratio
 *  intact, so this ratio *is* the rendered height — a squarer box turns three
 *  data points into a billboard. */
const CHART = { width: 560, height: 96, padX: 18, padTop: 16, padBottom: 16 };

function Sparkline({ points }: { points: PricePoint[] }) {
  const prices = points.map((point) => point.price_eur);
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const span = high - low || 1;
  const plotHeight = CHART.height - CHART.padTop - CHART.padBottom;
  const step =
    points.length > 1
      ? (CHART.width - CHART.padX * 2) / (points.length - 1)
      : 0;

  const x = (index: number) => CHART.padX + index * step;
  const y = (price: number) =>
    CHART.padTop + (1 - (price - low) / span) * plotHeight;

  const line = points
    .map(
      (point, index) =>
        `${x(index).toFixed(1)} ${y(point.price_eur).toFixed(1)}`,
    )
    .join(" L ");

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      className="block w-full bg-paper-100/60"
    >
      <path
        d={`M ${line} L ${x(points.length - 1).toFixed(1)} ${CHART.height} L ${CHART.padX} ${CHART.height} Z`}
        fill="#f43f5e"
        opacity="0.10"
      />
      <path
        d={`M ${line}`}
        fill="none"
        stroke="#e11d48"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {points.map((point, index) => (
        <circle
          key={point.date}
          cx={x(index)}
          cy={y(point.price_eur)}
          r={index === points.length - 1 ? 4 : 3}
          fill={index === points.length - 1 ? "#e11d48" : "#fdfbf6"}
          stroke="#e11d48"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

function SimilarCard({
  listing,
  onOpen,
}: {
  listing: DemoListing;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-paper-300 bg-white text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <HouseArt
        seed={listing.id}
        propertyType={listing.property_type}
        outbuilding={listing.outbuilding}
        podSpace={listing.pod_space}
        className="block h-20 w-full bg-paper-200"
      />
      <span className="flex flex-col gap-0.5 px-3 py-2.5">
        <span className="font-display text-lg font-semibold tracking-tight text-ink-900 tabular-nums">
          {formatEuro(listing.price_eur)}
        </span>
        <span className="truncate text-xs text-ink-600">{listing.address}</span>
        <span className="text-xs text-ink-400">
          {listing.beds} bed {listing.property_type.toLowerCase()} ·{" "}
          {listing.town}
        </span>
      </span>
    </button>
  );
}
