/**
 * The small labels a listing wears: its BER chip and its attribute badges.
 *
 * Extracted from `ListingCard` in Phase 6 so the detail modal shows the exact
 * same chip in the exact same colours as the card you clicked to open it — a
 * card and its own detail view disagreeing about what a B2 looks like is the
 * sort of thing that makes a demo feel assembled rather than designed.
 *
 * Presentation only, and only ever reads public `DemoListing` fields.
 */

import { berTone } from "@/lib/field-meta";
import type { DemoListing } from "@/lib/types";

export function BerChip({
  ber,
  className = "",
}: {
  ber: string;
  className?: string;
}) {
  return (
    <span
      className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${berTone(ber).chip} ${className}`}
      title={`BER ${ber}`}
    >
      {ber}
    </span>
  );
}

interface Badge {
  key: string;
  label: string;
  className: string;
}

/** The searchable attributes this listing actually has. Order is fixed so two
 *  listings with the same attributes always wear them the same way round. */
export function attributeBadges(listing: DemoListing): Badge[] {
  return [
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
}

export function AttributeBadges({
  listing,
  className = "",
}: {
  listing: DemoListing;
  className?: string;
}) {
  const badges = attributeBadges(listing);
  if (badges.length === 0) return null;

  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`}>
      {badges.map((badge) => (
        <li
          key={badge.key}
          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
        >
          {badge.label}
        </li>
      ))}
    </ul>
  );
}
