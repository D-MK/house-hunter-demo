/**
 * Derived data for the listing detail view.
 *
 * Three pure functions, no state, no clock, no network. Between them they
 * answer the three questions the detail modal exists to answer: what has this
 * price done, why is this house in my results, and what else looks like it.
 *
 *  - `syntheticPriceHistory` invents a plausible reduction trail for a listing
 *    flagged `price_drop`. The dataset only records *that* a price dropped, not
 *    what it dropped from, so the series is seeded from `listing.id` — the same
 *    house always shows the same history, and re-opening the modal never
 *    rewrites the past.
 *  - `matchedCriteria` is presentation only. Every listing in `results` already
 *    satisfies every active filter (`search()` AND-composes them), so this maps
 *    filters to the listing's own values rather than re-testing anything.
 *  - `similarListings` is the one place that ranks listings, and it ranks on
 *    price distance alone — no scoring, no private buying criteria.
 */

import { formatEuro } from "./field-meta";
import { hash, rng } from "./seeded";
import type { DemoFilters, DemoListing } from "./types";

/** One point on the price-history chart. */
export interface PricePoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  price_eur: number;
}

/** One line of the "why this matched" checklist. */
export interface MatchedCriterion {
  /** The filter this line answers, named as the chip rail names it. */
  label: string;
  /** The listing's own value, phrased against what was asked for. */
  value: string;
}

const DAY_MS = 86_400_000;

/** Prices land on tidy figures — asking prices aren't quoted to the euro. */
const PRICE_STEP = 500;

/** Gap between reductions, in days. */
const MIN_GAP = 21;
const GAP_SPREAD = 28;

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Every reduced listing's blurb ends "Recently reduced from €X". That figure is
 * on screen directly under the chart, so the chart has to start there — a
 * seeded guess would put the modal at odds with its own description.
 */
const STATED_ORIGINAL = /recently reduced from\s*€\s*([\d,]+)/i;

function statedOriginal(listing: DemoListing): number | null {
  const match = STATED_ORIGINAL.exec(listing.description);
  if (match === null) return null;
  const value = Number((match[1] as string).replace(/,/g, ""));
  return Number.isFinite(value) && value > listing.price_eur ? value : null;
}

/**
 * A deterministic 3–4 point reduction trail ending at the listing's current
 * asking price, starting on its publish date.
 *
 * Only meaningful for `price_drop` listings — the caller decides whether to
 * render it. The series is always strictly descending: a price history that
 * doesn't visibly fall would be a strange thing to draw under a "Reduced" badge.
 *
 * Only the *shape* is invented. Where the description names the original asking
 * price the series starts there; the dates and the intermediate reductions are
 * seeded from `listing.id`.
 */
export function syntheticPriceHistory(listing: DemoListing): PricePoint[] {
  const random = rng(hash(listing.id));
  const final = listing.price_eur;

  // 3 or 4 points, i.e. 2 or 3 reductions.
  const steps = random() < 0.5 ? 2 : 3;

  // 5–13% off the original, with a floor that guarantees each reduction has
  // room to be visible after rounding even on the cheapest listings. Drawn
  // whether or not it ends up being used, so that adding a stated original to a
  // listing can't shift the rest of the sequence.
  const drop = Math.max(final * (0.05 + random() * 0.08), 2_500 * steps);
  const original = statedOriginal(listing) ?? roundTo(final + drop, 1_000);

  // Uneven gaps between reductions read as a real seller losing patience;
  // evenly spaced ones read as a loop.
  const weights = Array.from({ length: steps }, () => 0.4 + random());
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  const parsed = Date.parse(`${listing.publish_date}T00:00:00Z`);
  const start = Number.isNaN(parsed) ? Date.UTC(2026, 0, 1) : parsed;

  const points: PricePoint[] = [{ date: isoDate(start), price_eur: original }];

  let elapsed = 0;
  let carried = 0;
  let previous = original;

  for (let step = 1; step <= steps; step += 1) {
    elapsed += MIN_GAP + Math.floor(random() * GAP_SPREAD);
    carried += weights[step - 1] as number;

    let price = final;
    if (step < steps) {
      const fraction = carried / totalWeight;
      price = roundTo(original - (original - final) * fraction, PRICE_STEP);
      // Keep the series strictly descending and leave room for the reductions
      // still to come, whatever the rounding did.
      price = Math.min(price, previous - PRICE_STEP);
      price = Math.max(price, final + PRICE_STEP * (steps - step));
    }

    points.push({ date: isoDate(start + elapsed * DAY_MS), price_eur: price });
    previous = price;
  }

  return points;
}

/**
 * The order criteria are listed in. Roughly "where, then how much, then how
 * big, then the nice-to-haves" — the order someone describes a house in.
 */
const FIELD_ORDER: (keyof DemoFilters)[] = [
  "county",
  "town",
  "price_max",
  "price_min",
  "beds_min",
  "baths_min",
  "property_type",
  "area_min",
  "ber_max",
  "outbuilding",
  "pod_space",
  "fibre",
  "price_drop",
  "q",
];

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** Which public field the free-text term was found in, for the checklist copy. */
function textMatchIn(listing: DemoListing, needle: string): string | null {
  const term = needle.trim().toLowerCase();
  if (term === "") return null;
  const fields: [string, string][] = [
    ["the address", listing.address],
    ["the town", listing.town],
    ["the county", listing.county],
    ["the Eircode", listing.eircode],
    ["the description", listing.description],
  ];
  const found = fields.find(([, value]) => value.toLowerCase().includes(term));
  return found === undefined ? null : found[0];
}

function describe(
  field: keyof DemoFilters,
  listing: DemoListing,
  filters: DemoFilters,
): string | null {
  switch (field) {
    case "county":
      return `${listing.town}, Co. ${listing.county}`;
    case "town":
      return `${listing.address}, ${listing.town}`;
    case "price_min":
      return `${formatEuro(listing.price_eur)} — above your ${formatEuro(filters.price_min as number)} floor`;
    case "price_max":
      return `${formatEuro(listing.price_eur)} — under your ${formatEuro(filters.price_max as number)} budget`;
    case "beds_min":
      return `${plural(listing.beds, "bed")} — you asked for ${filters.beds_min}+`;
    case "baths_min":
      return `${plural(listing.baths, "bath")} — you asked for ${filters.baths_min}+`;
    case "property_type":
      return listing.property_type;
    case "ber_max":
      return `BER ${listing.ber} — ${String(filters.ber_max).toUpperCase()} or better`;
    case "area_min":
      return `${listing.floor_area_sqm} sqm — over your ${filters.area_min} sqm minimum`;
    case "outbuilding":
      if (filters.outbuilding === false) return "No outbuilding";
      return listing.outbuilding_sqm === null
        ? "Has an outbuilding"
        : `Outbuilding of c. ${listing.outbuilding_sqm} sqm`;
    case "pod_space":
      return filters.pod_space === false
        ? "No garden space for a pod"
        : "Room in the garden for an office pod";
    case "fibre":
      return filters.fibre === false
        ? "Not passed for fibre"
        : "Fibre broadband at the door";
    case "price_drop":
      return filters.price_drop === false
        ? "Still at its original asking price"
        : "Asking price has been reduced";
    case "q": {
      const where = textMatchIn(listing, String(filters.q));
      return where === null
        ? null
        : `“${String(filters.q)}” appears in ${where}`;
    }
    default:
      return null;
  }
}

/**
 * One line per active filter, describing the listing's own value that satisfies
 * it. Returns `[]` when nothing is filtered — there is then nothing to explain.
 */
export function matchedCriteria(
  listing: DemoListing,
  filters: DemoFilters,
): MatchedCriterion[] {
  const criteria: MatchedCriterion[] = [];

  for (const field of FIELD_ORDER) {
    if (filters[field] === undefined) continue;
    const value = describe(field, listing, filters);
    if (value === null) continue;
    criteria.push({ label: LABELS[field], value });
  }

  return criteria;
}

/** Checklist headings. Deliberately the chip rail's own names, so the modal and
 *  the parse breakdown call the same constraint the same thing. */
const LABELS: Record<keyof DemoFilters, string> = {
  county: "County",
  town: "Town",
  price_min: "Price floor",
  price_max: "Budget",
  beds_min: "Beds",
  baths_min: "Baths",
  property_type: "Type",
  ber_max: "BER",
  area_min: "Floor area",
  outbuilding: "Outbuilding",
  pod_space: "Pod space",
  fibre: "Broadband",
  price_drop: "Price change",
  q: "Text",
};

/** How far either side of the asking price still counts as comparable. */
const PRICE_BAND = 0.2;

/**
 * Up to `limit` other listings in the same county priced within ±20% of
 * `listing`, closest price first. Ties break on id so the set is stable.
 */
export function similarListings(
  all: DemoListing[],
  listing: DemoListing,
  limit = 3,
): DemoListing[] {
  if (limit <= 0) return [];

  const low = listing.price_eur * (1 - PRICE_BAND);
  const high = listing.price_eur * (1 + PRICE_BAND);

  return all
    .filter(
      (candidate) =>
        candidate.id !== listing.id &&
        candidate.county === listing.county &&
        candidate.price_eur >= low &&
        candidate.price_eur <= high,
    )
    .sort(
      (a, b) =>
        Math.abs(a.price_eur - listing.price_eur) -
          Math.abs(b.price_eur - listing.price_eur) || a.id.localeCompare(b.id),
    )
    .slice(0, limit);
}
