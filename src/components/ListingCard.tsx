/**
 * One result card: seeded illustration, price, place, the beds/baths/area row,
 * a BER chip on the cert's own colour ramp, and badges for the attributes the
 * parser can search on.
 *
 * Presentation only — the card never filters, sorts or scores anything, and it
 * only ever reads the public `DemoListing` fields.
 *
 * The whole card opens the detail view. That's done with a real `<button>`
 * stretched over the card rather than a click handler on the `<article>`: it
 * gets keyboard focus, Enter and Space, and a screen-reader name for free,
 * and a button may not legally wrap the card's `<dl>` and `<ul>` content.
 */

import { HouseArt } from "@/components/HouseArt";
import { AttributeBadges, BerChip } from "@/components/ListingBadges";
import { formatEuro, formatListingDate } from "@/lib/field-meta";
import type { DemoListing } from "@/lib/types";

export interface ListingCardProps {
  listing: DemoListing;
  /** Opens the detail view. The triggering element is passed back so the caller
   *  can return focus to this card when the modal closes. */
  onOpen?: (listing: DemoListing, trigger: HTMLElement) => void;
}

export function ListingCard({ listing, onOpen }: ListingCardProps) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-paper-300 bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-within:ring-2 focus-within:ring-ink-700 focus-within:ring-offset-2">
      <div className="relative">
        <HouseArt
          seed={listing.id}
          propertyType={listing.property_type}
          outbuilding={listing.outbuilding}
          podSpace={listing.pod_space}
          className="block h-36 w-full bg-paper-200"
        />
        <span className="absolute top-2.5 left-2.5 rounded-full bg-ink-900/85 px-2.5 py-1 text-[11px] font-semibold text-paper-50 backdrop-blur-sm">
          {listing.property_type}
        </span>
        {listing.price_drop ? (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white">
            ↓ Reduced
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-2xl font-semibold tracking-tight text-ink-900 tabular-nums">
            {formatEuro(listing.price_eur)}
          </p>
          <BerChip ber={listing.ber} />
        </div>

        <div>
          <p className="text-sm font-medium text-ink-800">{listing.address}</p>
          <p className="text-sm text-ink-500">
            {listing.town}, Co. {listing.county}
            <span className="text-ink-400"> · {listing.eircode}</span>
          </p>
        </div>

        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-paper-200 py-2 text-sm text-ink-700">
          <Stat label="beds" value={listing.beds} />
          <Stat label="baths" value={listing.baths} />
          <Stat label="sqm" value={listing.floor_area_sqm} />
        </dl>

        <AttributeBadges listing={listing} />

        <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-500">
          {listing.description}
        </p>

        <div className="mt-auto flex items-baseline justify-between gap-3 pt-1">
          <p className="text-[11px] text-ink-400">
            Listed {formatListingDate(listing.publish_date)}
          </p>
          {onOpen ? (
            <span
              aria-hidden="true"
              className="text-[11px] font-semibold text-ink-400 transition group-hover:text-ink-900"
            >
              View details →
            </span>
          ) : null}
        </div>
      </div>

      {/* Stretched hit area. Sits above the card's own content but has no
          visible chrome of its own — the card is the button. */}
      {onOpen ? (
        <button
          type="button"
          onClick={(event) => onOpen(listing, event.currentTarget)}
          className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus:outline-none"
        >
          <span className="sr-only">
            View details for {listing.address}, {listing.town}, Co.{" "}
            {listing.county}
          </span>
        </button>
      ) : null}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1">
      <dt className="sr-only">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
      <span aria-hidden="true" className="text-xs text-ink-400">
        {label}
      </span>
    </div>
  );
}
