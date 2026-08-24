/**
 * Mock prompt parser — the demo's "NL understanding" layer.
 *
 * This is a deterministic, offline, rule-based simulation of what an LLM call
 * would do in the real product: turn a free-text prompt into `DemoFilters`.
 * There is deliberately **no network call, no API key and no model** here — a
 * fully static site cannot hold an LLM credential safely, so the demo simulates
 * the step instead of faking security. Same prompt in, same filters out, every
 * time.
 *
 * The parser also returns `spans`: the character ranges of the *original*
 * prompt that produced each filter, so the UI can highlight the words behind
 * each chip. Spans are plain integer offsets into the untouched input string —
 * this layer never builds markup, never concatenates HTML, and never mutates
 * the prompt text.
 *
 * Matching strategy: patterns are applied in a fixed priority order and each
 * match "claims" its character range, so a later, looser pattern can never
 * re-read text an earlier, more specific one already consumed (e.g. the
 * outbuilding matcher takes "detached garage" before the property-type matcher
 * can read "detached").
 */

import { COUNTY_NAMES, TOWN_NAMES } from "./gazetteer";
import type { DemoFilters, MatchSpan, ParseResult } from "./types";

// ---------------------------------------------------------------------------
// Match bookkeeping
// ---------------------------------------------------------------------------

interface Claim {
  start: number;
  end: number;
}

interface Context {
  prompt: string;
  filters: DemoFilters;
  spans: MatchSpan[];
  claims: Claim[];
}

/** True when `[start, end)` does not overlap anything an earlier pattern took. */
function isFree(ctx: Context, start: number, end: number): boolean {
  return !ctx.claims.some((c) => start < c.end && end > c.start);
}

/** Reserve a range without producing a filter (used for negations like
 *  "BER doesn't matter", which must stop later patterns reading "BER"). */
function claim(ctx: Context, start: number, end: number): void {
  ctx.claims.push({ start, end });
}

/**
 * Record `field = value` plus the prompt range that produced it. First match
 * wins: a second county in the same prompt is ignored rather than silently
 * overwriting the first.
 */
function apply<K extends keyof DemoFilters>(
  ctx: Context,
  field: K,
  value: NonNullable<DemoFilters[K]>,
  start: number,
  end: number,
): boolean {
  if (ctx.filters[field] !== undefined) return false;
  if (!isFree(ctx, start, end)) return false;
  ctx.filters[field] = value;
  ctx.spans.push({ start, end, field });
  claim(ctx, start, end);
  return true;
}

/** Iterate every match of `pattern`, skipping ranges already claimed. */
function scan(
  ctx: Context,
  pattern: RegExp,
  handle: (match: RegExpMatchArray, start: number, end: number) => void,
): void {
  for (const match of ctx.prompt.matchAll(pattern)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (!isFree(ctx, start, end)) continue;
    handle(match, start, end);
  }
}

// ---------------------------------------------------------------------------
// Shared vocabulary
// ---------------------------------------------------------------------------

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const NUMBER_WORD_ALT = Object.keys(NUMBER_WORDS).join("|");

function toCount(token: string): number | null {
  const word = NUMBER_WORDS[token.toLowerCase()];
  if (word !== undefined) return word;
  const n = Number.parseInt(token, 10);
  return Number.isFinite(n) && n > 0 && n <= 20 ? n : null;
}

/** Amount sub-pattern: "€400,000", "400k", "1.2m", "250 grand", "300000". */
const AMOUNT = String.raw`(?:€\s*)?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(?:\s*(k|m|grand|thousand|million))?(?:\s*(?:€|euros?|eur))?`;

/**
 * Turn a matched amount into euro. A bare number under 10,000 is only read as a
 * price when the prompt gave a currency cue ("under €400" -> €400k); otherwise
 * it is rejected so that phrases like "at least 3" never become a budget.
 */
function toAmount(
  digits: string,
  suffix: string | undefined,
  raw: string,
): number | null {
  const n = Number.parseFloat(digits.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = (suffix ?? "").toLowerCase();
  if (unit === "k" || unit === "grand" || unit === "thousand") {
    return Math.round(n * 1_000);
  }
  if (unit === "m" || unit === "million") return Math.round(n * 1_000_000);
  if (n >= 10_000) return Math.round(n);
  if (/€|eur/i.test(raw)) return Math.round(n * 1_000);
  return null;
}

// ---------------------------------------------------------------------------
// BER
// ---------------------------------------------------------------------------

/** "BER doesn't matter" — consumed so the band matcher never sees the "BER". */
const BER_NEGATION =
  /\bber\s+(?:doesn'?t|does not|don'?t|do not|won'?t)\s+matter\b|\bber\s+(?:is\s+)?not\s+(?:important|a\s+concern|an\s+issue)\b|\bany\s+ber\b|\bregardless\s+of\s+(?:the\s+)?ber\b|\bno\s+ber\s+requirement\b/gi;

/** "BER B", "BER of B2", "BER B or better", "BER B+". */
const BER_BAND =
  /\bber\s*(?:rating\s*)?(?:of\s*|band\s*)?([a-g])[123]?\b(?:\s*(?:or\s+(?:better|above|higher)|\+))?/gi;

/** "A-rated", "B2 rated". */
const BER_RATED = /\b([a-g])[123]?[-\s]rated\b/gi;

/** Soft phrasing with no explicit band — treated as "A or B". */
const BER_SOFT =
  /\b(?:energy[-\s]efficien(?:t|cy)|well[-\s]insulated|high(?:ly)?[-\s]rated\s+ber|good\s+ber|strong\s+ber|low[-\s]energy|a[-\s]rated\s+or\s+better)\b/gi;

function parseBer(ctx: Context): void {
  scan(ctx, BER_NEGATION, (_m, start, end) => claim(ctx, start, end));
  scan(ctx, BER_BAND, (m, start, end) => {
    apply(ctx, "ber_max", m[1].toUpperCase(), start, end);
  });
  scan(ctx, BER_RATED, (m, start, end) => {
    apply(ctx, "ber_max", m[1].toUpperCase(), start, end);
  });
  scan(ctx, BER_SOFT, (_m, start, end) => {
    apply(ctx, "ber_max", "B", start, end);
  });
}

// ---------------------------------------------------------------------------
// Richer attributes
// ---------------------------------------------------------------------------

/** A leading "detached"/"double" is swallowed so it can't leak into property_type. */
const OUTBUILDING =
  /\b(?:(?:detached|double|single|separate|large|stone|converted)\s+)?(?:garages?|sheds?|workshops?|out[-\s]?buildings?|barns?|stables?|coach\s+house|store\s+room|outhouses?)\b/gi;

const POD_SPACE =
  /\b(?:room|space|potential)\s+(?:to|for)\s+(?:a\s+|an\s+)?(?:work\s+from\s+home|home\s+office|office\s+pod|garden\s+office)\b|\b(?:home|garden)[-\s](?:office|room|studio)(?:\s+pod)?\b|\boffice\s+pod\b|\bpod\s+space\b|\boffice\s+space\b|\b(?:somewhere|space|room)\s+to\s+work\s+from\s+home\b|\bwork\s+from\s+home\s+space\b/gi;

const FIBRE =
  /\b(?:fibre|fiber)(?:[-\s]optic)?(?:\s+(?:broadband|internet|connection))?\b|\bgigabit(?:\s+broadband)?\b|\b(?:good|fast|decent|reliable|strong|proper|high[-\s]speed)\s+(?:broadband|internet|wi[-\s]?fi|connection)\b|\bbroadband\b|\bfast\s+internet\b|\bremote[-\s]work(?:ing)?\b|\bworking\s+remotely\b|\bwfh\b/gi;

const PRICE_DROP =
  /\b(?:recently\s+)?reduced(?:\s+recently)?\b|\bprice\s+(?:drops?|cuts?|reductions?|reduced)\b|\breduction\s+in\s+price\b|\bdropped\s+in\s+price\b|\bknocked\s+down\b|\bprice[-\s]drop\b/gi;

const FLAG_PATTERNS: { field: keyof DemoFilters; pattern: RegExp }[] = [
  { field: "outbuilding", pattern: OUTBUILDING },
  { field: "pod_space", pattern: POD_SPACE },
  { field: "fibre", pattern: FIBRE },
  { field: "price_drop", pattern: PRICE_DROP },
];

function parseFlags(ctx: Context): void {
  for (const { field, pattern } of FLAG_PATTERNS) {
    scan(ctx, pattern, (_m, start, end) => {
      apply(ctx, field, true, start, end);
    });
  }
}

// ---------------------------------------------------------------------------
// Floor area
// ---------------------------------------------------------------------------

const AREA =
  /\b(?:(?:over|above|more\s+than|at\s+least|min(?:imum)?(?:\s+of)?|upwards\s+of|from|bigger\s+than|larger\s+than)\s+)?(\d{2,4})\s*(?:\+\s*)?(?:sq\.?\s?m\b|sqm\b|m2\b|m²|square\s+met(?:re|er)s?\b)(?:\s*\+|\s+or\s+(?:more|bigger|larger))?/gi;

/** No number given — a soft default so "spacious" still moves the search. */
const AREA_SOFT =
  /\b(?:spacious|roomy|generously\s+proportioned|plenty\s+of\s+space|lots\s+of\s+space)\b/gi;

const SPACIOUS_SQM = 120;

function parseArea(ctx: Context): void {
  scan(ctx, AREA, (m, start, end) => {
    const sqm = Number.parseInt(m[1], 10);
    if (!Number.isFinite(sqm) || sqm <= 0) return;
    apply(ctx, "area_min", sqm, start, end);
  });
  scan(ctx, AREA_SOFT, (_m, start, end) => {
    apply(ctx, "area_min", SPACIOUS_SQM, start, end);
  });
}

// ---------------------------------------------------------------------------
// Price
// ---------------------------------------------------------------------------

const PRICE_BETWEEN = new RegExp(
  String.raw`\b(?:between|from)\s+${AMOUNT}\s*(?:and|to|-|–|—)\s*${AMOUNT}`,
  "gi",
);

const PRICE_AROUND = new RegExp(
  String.raw`\b(?:around|about|circa|approx(?:\.|imately)?|roughly|near(?:ly)?|c\.)\s*${AMOUNT}`,
  "gi",
);

const PRICE_MAX = new RegExp(
  String.raw`\b(?:under|below|less\s+than|no\s+more\s+than|not\s+more\s+than|up\s+to|max(?:imum)?(?:\s+of)?|at\s+most|within|budget\s+of|sub)\s*${AMOUNT}`,
  "gi",
);

const PRICE_MAX_TRAILING = new RegExp(
  String.raw`${AMOUNT}\s+(?:or\s+less|or\s+under|max(?:imum)?|budget|tops)\b`,
  "gi",
);

const PRICE_MIN = new RegExp(
  String.raw`\b(?:over|above|more\s+than|at\s+least|starting\s+(?:at|from)|min(?:imum)?(?:\s+of)?|north\s+of|from)\s+${AMOUNT}`,
  "gi",
);

/** "around 400k" widens to a ±10% band rather than an exact-price search. */
const AROUND_BAND = 0.1;

function parsePrice(ctx: Context): void {
  scan(ctx, PRICE_BETWEEN, (m, start, end) => {
    const a = toAmount(m[1], m[2], m[0]);
    const b = toAmount(m[3], m[4], m[0]);
    if (a === null || b === null) return;
    const low = Math.min(a, b);
    const high = Math.max(a, b);
    if (ctx.filters.price_min !== undefined) return;
    if (ctx.filters.price_max !== undefined) return;
    apply(ctx, "price_min", low, start, end);
    ctx.filters.price_max = high;
    ctx.spans.push({ start, end, field: "price_max" });
  });

  scan(ctx, PRICE_AROUND, (m, start, end) => {
    const value = toAmount(m[1], m[2], m[0]);
    if (value === null) return;
    if (ctx.filters.price_min !== undefined) return;
    if (ctx.filters.price_max !== undefined) return;
    apply(ctx, "price_min", Math.round(value * (1 - AROUND_BAND)), start, end);
    ctx.filters.price_max = Math.round(value * (1 + AROUND_BAND));
    ctx.spans.push({ start, end, field: "price_max" });
  });

  scan(ctx, PRICE_MAX, (m, start, end) => {
    const value = toAmount(m[1], m[2], m[0]);
    if (value === null) return;
    apply(ctx, "price_max", value, start, end);
  });

  scan(ctx, PRICE_MAX_TRAILING, (m, start, end) => {
    const value = toAmount(m[1], m[2], m[0]);
    if (value === null) return;
    apply(ctx, "price_max", value, start, end);
  });

  scan(ctx, PRICE_MIN, (m, start, end) => {
    const value = toAmount(m[1], m[2], m[0]);
    if (value === null) return;
    apply(ctx, "price_min", value, start, end);
  });
}

// ---------------------------------------------------------------------------
// Beds and baths
// ---------------------------------------------------------------------------

const BEDS = new RegExp(
  String.raw`\b(?:(?:at\s+least|min(?:imum)?(?:\s+of)?|from)\s+)?(\d{1,2}|${NUMBER_WORD_ALT})\s*(?:\+|\s+or\s+more)?\s*[-\s]?\s*bed(?:room)?s?\b(?:ed)?`,
  "gi",
);

const BATHS = new RegExp(
  String.raw`\b(?:(?:at\s+least|min(?:imum)?(?:\s+of)?|from)\s+)?(\d{1,2}|${NUMBER_WORD_ALT})\s*(?:\+|\s+or\s+more)?\s*[-\s]?\s*bath(?:room)?s?\b`,
  "gi",
);

function parseRooms(ctx: Context): void {
  scan(ctx, BEDS, (m, start, end) => {
    const count = toCount(m[1]);
    if (count === null) return;
    apply(ctx, "beds_min", count, start, end);
  });
  scan(ctx, BATHS, (m, start, end) => {
    const count = toCount(m[1]);
    if (count === null) return;
    apply(ctx, "baths_min", count, start, end);
  });
}

// ---------------------------------------------------------------------------
// Property type
// ---------------------------------------------------------------------------

/** Longest alternatives first so "semi-detached" is never read as "detached". */
const PROPERTY_TYPE =
  /\b(?:semi[-\s]?detached(?:\s+house)?|semi[-\s]?ds?\b|semis?\b|end[-\s]of[-\s]terraced?(?:\s+house)?|mid[-\s]terraced?(?:\s+house)?|terraced?(?:\s+house)?|town\s?houses?|detached(?:\s+house)?|bungalows?|cottages?|apartments?|apts?\b|flats?|duplex(?:es)?)\b/gi;

function typeFor(raw: string): string | null {
  const text = raw.toLowerCase();
  if (text.startsWith("semi")) return "Semi-D";
  if (text.includes("terrace") || text.includes("townhouse")) return "Terrace";
  if (text.includes("town house")) return "Terrace";
  if (text.includes("bungalow")) return "Bungalow";
  if (text.includes("cottage")) return "Cottage";
  if (
    text.includes("apartment") ||
    text.startsWith("apt") ||
    text.includes("flat") ||
    text.includes("duplex")
  ) {
    return "Apartment";
  }
  if (text.includes("detached")) return "Detached";
  return null;
}

function parsePropertyType(ctx: Context): void {
  scan(ctx, PROPERTY_TYPE, (m, start, end) => {
    const type = typeFor(m[0]);
    if (type === null) return;
    apply(ctx, "property_type", type, start, end);
  });
}

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const TOWN_BY_LOWER = new Map(
  TOWN_NAMES.map((town) => [town.name.toLowerCase(), town]),
);
const COUNTY_BY_LOWER = new Map(
  COUNTY_NAMES.map((county) => [county.toLowerCase(), county]),
);

/** One alternation over every county and town, longest name first so
 *  "Cork City" beats "Cork" and "Donegal Town" beats "Donegal". */
const PLACE_PATTERN = (() => {
  const names = [...COUNTY_NAMES, ...TOWN_NAMES.map((t) => t.name)]
    .slice()
    .sort((a, b) => b.length - a.length || a.localeCompare(b))
    .map(escapeRegex);
  return new RegExp(
    String.raw`(?:\b(co\.?|county)\s+)?\b(${names.join("|")})\b(\s+town\b)?`,
    "gi",
  );
})();

function parsePlaces(ctx: Context): void {
  scan(ctx, PLACE_PATTERN, (m, start, end) => {
    const prefix = m[1];
    const name = m[2].toLowerCase();
    const townSuffix = m[3];
    const county = COUNTY_BY_LOWER.get(name);
    const town = TOWN_BY_LOWER.get(name);

    // "Co. Wicklow" is always the county; "Wexford town" is always the town;
    // a bare name that is both (Wicklow, Wexford, Sligo, ...) reads as the
    // county, which is the broader and more useful default.
    if (
      county !== undefined &&
      (prefix !== undefined || townSuffix === undefined)
    ) {
      apply(ctx, "county", county, start, end);
      return;
    }
    if (town !== undefined) {
      apply(ctx, "town", town.name, start, end);
    }
  });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Parse a free-text prompt into structured filters.
 *
 * Pure and offline: no network, no clock, no randomness. The same prompt always
 * produces the same filters and the same spans.
 */
export function parse(prompt: string): ParseResult {
  const ctx: Context = { prompt, filters: {}, spans: [], claims: [] };

  // Order matters — most specific first. BER negation before BER bands;
  // attributes before property type ("detached garage"); floor area before
  // price ("over 150 sqm" is not a budget); price before beds ("at least 3").
  parseBer(ctx);
  parseFlags(ctx);
  parseArea(ctx);
  parsePrice(ctx);
  parseRooms(ctx);
  parsePropertyType(ctx);
  parsePlaces(ctx);

  ctx.spans.sort((a, b) => a.start - b.start || a.field.localeCompare(b.field));
  return { filters: ctx.filters, spans: ctx.spans };
}
