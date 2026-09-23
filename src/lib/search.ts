/**
 * Pure search over the bundled demo dataset.
 *
 * `search()` never mutates its inputs, never touches the network or the clock,
 * and holds no state between calls — it composes the populated `DemoFilters`
 * keys into a set of AND-ed predicates and optionally sorts a copy of the
 * survivors. An absent filter key means "unconstrained", not "false".
 */

import type { DemoFilters, DemoListing, SortKey } from "./types";

const BER_BANDS = "ABCDEFG";

/**
 * Property-type synonyms map onto the dataset's own labels, so a filter written
 * as "Semi-Detached" or "flat" still matches the stored "Semi-D" / "Apartment".
 * `parse()` already emits canonical labels; this keeps hand-edited filters (the
 * chip rail in Phase 4) working too.
 */
const TYPE_ALIASES: Record<string, string> = {
  "semi-d": "Semi-D",
  semid: "Semi-D",
  semi: "Semi-D",
  "semi-detached": "Semi-D",
  "semi detached": "Semi-D",
  detached: "Detached",
  terrace: "Terrace",
  terraced: "Terrace",
  "end-of-terrace": "Terrace",
  "end of terrace": "Terrace",
  "mid-terrace": "Terrace",
  townhouse: "Terrace",
  bungalow: "Bungalow",
  cottage: "Cottage",
  apartment: "Apartment",
  apt: "Apartment",
  flat: "Apartment",
  duplex: "Apartment",
};

function canonicalType(value: string): string {
  const key = value.trim().toLowerCase();
  return TYPE_ALIASES[key] ?? value.trim();
}

function bandIndex(ber: string): number {
  return BER_BANDS.indexOf(ber.trim().charAt(0).toUpperCase());
}

function equalsIgnoreCase(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Build the AND-composed predicate list for the populated filter keys. */
function predicatesFor(
  filters: DemoFilters,
): ((listing: DemoListing) => boolean)[] {
  const tests: ((listing: DemoListing) => boolean)[] = [];

  if (filters.county !== undefined) {
    const county = filters.county;
    tests.push((l) => equalsIgnoreCase(l.county, county));
  }
  if (filters.town !== undefined) {
    const town = filters.town;
    tests.push((l) => equalsIgnoreCase(l.town, town));
  }
  if (filters.price_min !== undefined) {
    const min = filters.price_min;
    tests.push((l) => l.price_eur >= min);
  }
  if (filters.price_max !== undefined) {
    const max = filters.price_max;
    tests.push((l) => l.price_eur <= max);
  }
  if (filters.beds_min !== undefined) {
    const min = filters.beds_min;
    tests.push((l) => l.beds >= min);
  }
  if (filters.baths_min !== undefined) {
    const min = filters.baths_min;
    tests.push((l) => l.baths >= min);
  }
  if (filters.property_type !== undefined) {
    const type = canonicalType(filters.property_type);
    tests.push((l) => equalsIgnoreCase(l.property_type, type));
  }
  if (filters.ber_max !== undefined) {
    const cap = bandIndex(filters.ber_max);
    if (cap >= 0) {
      tests.push((l) => {
        const band = bandIndex(l.ber);
        return band >= 0 && band <= cap;
      });
    }
  }
  if (filters.area_min !== undefined) {
    const min = filters.area_min;
    tests.push((l) => l.floor_area_sqm >= min);
  }
  if (filters.outbuilding !== undefined) {
    const want = filters.outbuilding;
    tests.push((l) => l.outbuilding === want);
  }
  if (filters.pod_space !== undefined) {
    const want = filters.pod_space;
    tests.push((l) => l.pod_space === want);
  }
  if (filters.fibre !== undefined) {
    const want = filters.fibre;
    tests.push((l) => l.fibre === want);
  }
  if (filters.price_drop !== undefined) {
    const want = filters.price_drop;
    tests.push((l) => l.price_drop === want);
  }
  if (filters.q !== undefined && filters.q.trim() !== "") {
    const needle = filters.q.trim().toLowerCase();
    tests.push((l) =>
      [l.address, l.town, l.county, l.eircode, l.description].some((field) =>
        field.toLowerCase().includes(needle),
      ),
    );
  }

  return tests;
}

const COMPARATORS: Record<SortKey, (a: DemoListing, b: DemoListing) => number> =
  {
    price_asc: (a, b) => a.price_eur - b.price_eur || a.id.localeCompare(b.id),
    price_desc: (a, b) => b.price_eur - a.price_eur || a.id.localeCompare(b.id),
    newest: (a, b) =>
      b.publish_date.localeCompare(a.publish_date) || a.id.localeCompare(b.id),
    area_desc: (a, b) =>
      b.floor_area_sqm - a.floor_area_sqm || a.id.localeCompare(b.id),
  };

/**
 * Filter `listings` by every populated key in `filters` (AND), optionally
 * sorted. Returns a new array; the input array and its listings are untouched.
 */
export function search(
  listings: DemoListing[],
  filters: DemoFilters,
  sort?: SortKey,
): DemoListing[] {
  const tests = predicatesFor(filters);
  const matched = listings.filter((listing) =>
    tests.every((test) => test(listing)),
  );
  if (sort === undefined) return matched;
  const comparator = COMPARATORS[sort];
  return comparator === undefined ? matched : matched.slice().sort(comparator);
}
