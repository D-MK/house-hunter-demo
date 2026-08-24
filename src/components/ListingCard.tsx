/**
 * One result card: seeded illustration, price, place, the beds/baths/area row,
 * a BER chip on the cert's own colour ramp, and badges for the attributes the
 * parser can search on.
 *
 * Presentation only — the card never filters, sorts or scores anything, and it
 * only ever reads the public `DemoListing` fields.
 */

import { HouseArt } from "@/components/HouseArt";
import { berTone, formatEuro } from "@/lib/field-meta";
import type { DemoListing } from "@/lib/types";

const DATE = new Intl.DateTimeFormat("en-IE", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? iso : DATE.format(date);
}

export function ListingCard({ listing }: { listing: DemoListing }) {
  const ber = berTone(listing.ber);

  const badges = [
    listing.outbuilding
      ? {
          key: "outbuilding",
          label:
            listing.outbuilding_sqm === null
              ? "Outbuilding"
              : `Outbuilding ${listing.outbuilding_sqm} sqm`,
          className: "border-orange-200 bg-orange-50 text-orange-800",
        }
      : null,
    listing.pod_space
      ? {
          key: "pod_space",
          label: "Pod space",
          className: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
        }
      : null,
    listing.fibre
      ? {
          key: "fibre",
          label: "Fibre",
          className: "border-sky-200 bg-sky-50 text-sky-800",
        }
      : null,
    listing.price_drop
      ? {
          key: "price_drop",
          label: "Price drop",
          className: "border-rose-200 bg-rose-50 text-rose-800",
        }
      : null,
  ].filter((badge) => badge !== null);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-paper-300 bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lift">
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
          <span
            className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${ber.chip}`}
            title={`BER ${listing.ber}`}
          >
            {listing.ber}
          </span>
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

        {badges.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <li
                key={badge.key}
                className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
              >
                {badge.label}
              </li>
            ))}
          </ul>
        ) : null}

        <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-500">
          {listing.description}
        </p>

        <p className="mt-auto pt-1 text-[11px] text-ink-400">
          Listed {formatDate(listing.publish_date)}
        </p>
      </div>
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
