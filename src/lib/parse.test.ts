import { describe, expect, it } from "vitest";
import { parse } from "./parse";
import type { DemoFilters } from "./types";

/** Convenience: just the filters. */
function f(prompt: string): DemoFilters {
  return parse(prompt).filters;
}

/** The prompt text behind a given filter field, or undefined if unmatched. */
function spanText(
  prompt: string,
  field: keyof DemoFilters,
): string | undefined {
  const span = parse(prompt).spans.find((s) => s.field === field);
  return span === undefined ? undefined : prompt.slice(span.start, span.end);
}

describe("places", () => {
  it("matches a county", () => {
    expect(f("3-bed in Wicklow")).toMatchObject({ county: "Wicklow" });
  });

  it("matches a county written as 'Co. X'", () => {
    expect(f("bungalow in Co. Mayo")).toMatchObject({ county: "Mayo" });
    expect(spanText("bungalow in Co. Mayo", "county")).toBe("Co. Mayo");
  });

  it("matches a town that is not also a county", () => {
    expect(f("apartment in Maynooth")).toMatchObject({ town: "Maynooth" });
    expect(f("apartment in Maynooth").county).toBeUndefined();
  });

  it("prefers the longest place name", () => {
    expect(f("house in Cork City")).toMatchObject({ town: "Cork City" });
    expect(f("house in Donegal Town")).toMatchObject({ town: "Donegal Town" });
  });

  it("reads an ambiguous name as the county by default", () => {
    expect(f("cottage in Wexford")).toMatchObject({ county: "Wexford" });
  });

  it("reads '<name> town' as the town", () => {
    expect(f("cottage near Wexford town")).toMatchObject({ town: "Wexford" });
  });

  it("keeps the first place when two are named", () => {
    expect(f("3-bed in Kerry or Cork")).toMatchObject({ county: "Kerry" });
  });

  it("is case-insensitive", () => {
    expect(f("SEMI IN GALWAY")).toMatchObject({ county: "Galway" });
  });

  it("ignores unknown places", () => {
    expect(f("3-bed in Narnia").county).toBeUndefined();
    expect(f("3-bed in Narnia").town).toBeUndefined();
  });
});

describe("price", () => {
  it("handles 'under'", () => {
    expect(f("under €400k")).toMatchObject({ price_max: 400000 });
  });

  it("handles 'below' and 'less than'", () => {
    expect(f("below 350k")).toMatchObject({ price_max: 350000 });
    expect(f("less than €500,000")).toMatchObject({ price_max: 500000 });
  });

  it("handles 'max'", () => {
    expect(f("3-bed semi, max €425k")).toMatchObject({ price_max: 425000 });
  });

  it("handles 'over' and 'above'", () => {
    expect(f("over €300k")).toMatchObject({ price_min: 300000 });
    expect(f("above 250k")).toMatchObject({ price_min: 250000 });
  });

  it("handles 'between X and Y'", () => {
    expect(f("between €250k and €400k")).toMatchObject({
      price_min: 250000,
      price_max: 400000,
    });
  });

  it("orders a reversed range", () => {
    expect(f("between 400k and 250k")).toMatchObject({
      price_min: 250000,
      price_max: 400000,
    });
  });

  it("turns 'around X' into a +/-10% band", () => {
    expect(f("around €300k")).toMatchObject({
      price_min: 270000,
      price_max: 330000,
    });
  });

  it("parses millions", () => {
    expect(f("under €1.2m")).toMatchObject({ price_max: 1200000 });
  });

  it("parses plain euro amounts", () => {
    expect(f("under 400000")).toMatchObject({ price_max: 400000 });
  });

  it("does not read bed counts as a budget", () => {
    expect(f("at least 3 bedrooms").price_min).toBeUndefined();
  });

  it("does not read a floor area as a budget", () => {
    const filters = f("over 150 sqm");
    expect(filters.area_min).toBe(150);
    expect(filters.price_min).toBeUndefined();
  });

  it("spans only the price phrase", () => {
    expect(spanText("3-bed semi under €400k with a garage", "price_max")).toBe(
      "under €400k",
    );
  });
});

describe("beds and baths", () => {
  it("parses '3-bed'", () => {
    expect(f("3-bed semi")).toMatchObject({ beds_min: 3 });
  });

  it("parses '4 bedroom'", () => {
    expect(f("4 bedroom detached")).toMatchObject({ beds_min: 4 });
  });

  it("parses written-out numbers", () => {
    expect(f("three bed cottage")).toMatchObject({ beds_min: 3 });
  });

  it("parses 'at least N' as a minimum", () => {
    expect(f("at least 4 bedrooms")).toMatchObject({ beds_min: 4 });
    expect(spanText("at least 4 bedrooms", "beds_min")).toBe(
      "at least 4 bedrooms",
    );
  });

  it("parses 'N+ beds'", () => {
    expect(f("3+ beds")).toMatchObject({ beds_min: 3 });
  });

  it("parses bathrooms separately from bedrooms", () => {
    expect(f("4 beds and 2 bathrooms")).toMatchObject({
      beds_min: 4,
      baths_min: 2,
    });
  });
});

describe("property type", () => {
  it.each([
    ["semi-d in Naas", "Semi-D"],
    ["semi in Naas", "Semi-D"],
    ["semi-detached in Naas", "Semi-D"],
    ["semi detached house", "Semi-D"],
    ["detached house", "Detached"],
    ["terraced house", "Terrace"],
    ["end-of-terrace house", "Terrace"],
    ["mid-terrace", "Terrace"],
    ["townhouse", "Terrace"],
    ["bungalow", "Bungalow"],
    ["cottage", "Cottage"],
    ["apartment", "Apartment"],
    ["flat", "Apartment"],
    ["duplex", "Apartment"],
  ])("maps %s -> %s", (prompt, expected) => {
    expect(f(prompt)).toMatchObject({ property_type: expected });
  });

  it("does not read 'semi-detached' as detached", () => {
    expect(f("semi-detached house")).toMatchObject({ property_type: "Semi-D" });
  });

  it("does not read 'detached garage' as a property type", () => {
    const filters = f("bungalow with a detached garage");
    expect(filters.property_type).toBe("Bungalow");
    expect(filters.outbuilding).toBe(true);
  });
});

describe("BER", () => {
  it("parses 'BER B or better' as a cap of B", () => {
    expect(f("BER B or better")).toMatchObject({ ber_max: "B" });
  });

  it("parses a subgrade down to its band", () => {
    expect(f("BER B2 or above")).toMatchObject({ ber_max: "B" });
  });

  it("parses 'A-rated'", () => {
    expect(f("A-rated new build")).toMatchObject({ ber_max: "A" });
  });

  it("parses 'energy efficient' as A-B", () => {
    expect(f("energy efficient home")).toMatchObject({ ber_max: "B" });
    expect(f("energy-efficient home")).toMatchObject({ ber_max: "B" });
  });

  it("applies no BER filter when the prompt says it does not matter", () => {
    expect(f("cottage under 250k, BER doesn't matter").ber_max).toBeUndefined();
    expect(f("any BER").ber_max).toBeUndefined();
  });
});

describe("floor area", () => {
  it("parses 'over N sqm'", () => {
    expect(f("over 150 sqm")).toMatchObject({ area_min: 150 });
  });

  it("parses 'N sqm+'", () => {
    expect(f("150 sqm+")).toMatchObject({ area_min: 150 });
  });

  it("parses 'at least N square metres'", () => {
    expect(f("at least 120 square metres")).toMatchObject({ area_min: 120 });
  });

  it("parses 'spacious' as a soft minimum", () => {
    expect(f("spacious family home")).toMatchObject({ area_min: 120 });
  });
});

describe("richer attributes", () => {
  it.each([
    "with a garage",
    "needs a shed",
    "with a workshop",
    "with an outbuilding",
    "with a barn",
    "detached garage wanted",
  ])("maps %s -> outbuilding", (prompt) => {
    expect(f(prompt)).toMatchObject({ outbuilding: true });
  });

  it.each([
    "with a home office",
    "with a garden office",
    "with an office pod",
    "room to work from home",
    "space for a home office",
    "home office space",
  ])("maps %s -> pod_space", (prompt) => {
    expect(f(prompt)).toMatchObject({ pod_space: true });
  });

  it.each([
    "with fibre",
    "fibre broadband",
    "good broadband",
    "fast internet",
    "high-speed broadband",
    "gigabit broadband",
    "suitable for remote working",
  ])("maps %s -> fibre", (prompt) => {
    expect(f(prompt)).toMatchObject({ fibre: true });
  });

  it.each([
    "recently reduced",
    "price drop",
    "price reduced",
    "dropped in price",
  ])("maps %s -> price_drop", (prompt) => {
    expect(f(prompt)).toMatchObject({ price_drop: true });
  });

  it("leaves unmentioned attributes unconstrained", () => {
    const filters = f("3-bed semi in Wicklow");
    expect(filters.outbuilding).toBeUndefined();
    expect(filters.pod_space).toBeUndefined();
    expect(filters.fibre).toBeUndefined();
    expect(filters.price_drop).toBeUndefined();
  });
});

describe("spans", () => {
  it("points at the exact prompt text behind each filter", () => {
    const prompt = "3-bed semi in Wicklow under €400k with a garage";
    const { spans } = parse(prompt);
    const byField = Object.fromEntries(
      spans.map((s) => [s.field, prompt.slice(s.start, s.end)]),
    );
    expect(byField).toEqual({
      beds_min: "3-bed",
      property_type: "semi",
      county: "Wicklow",
      price_max: "under €400k",
      outbuilding: "garage",
    });
  });

  it("returns spans sorted by start offset", () => {
    const { spans } = parse(
      "4-bed detached in Kildare, 150 sqm+, recently reduced",
    );
    const starts = spans.map((s) => s.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("never partially overlaps two spans", () => {
    // A range phrase legitimately produces two spans over the same characters
    // ("between X and Y" -> price_min + price_max); anything else must be
    // disjoint, so no character is claimed by two unrelated filters.
    const { spans } = parse(
      "energy-efficient 3-bed semi-detached in Co. Meath between €300k and €450k with a garage and a garden office",
    );
    for (let i = 1; i < spans.length; i++) {
      const previous = spans[i - 1];
      const current = spans[i];
      const identical =
        current.start === previous.start && current.end === previous.end;
      expect(identical || current.start >= previous.end).toBe(true);
    }
  });

  it("emits one span per produced filter field", () => {
    const { filters, spans } = parse("bungalow in Kerry under €300k");
    const fields = new Set(spans.map((s) => s.field));
    for (const key of Object.keys(filters)) {
      expect(fields.has(key as keyof DemoFilters)).toBe(true);
    }
  });
});

describe("purity", () => {
  it("is deterministic", () => {
    const prompt = "energy-efficient 4-bed detached in Cork under €600k";
    expect(parse(prompt)).toEqual(parse(prompt));
  });

  it("does not mutate or reformat the prompt", () => {
    const prompt = "  3-BED semi in WICKLOW  ";
    const { spans } = parse(prompt);
    for (const span of spans) {
      expect(prompt.slice(span.start, span.end).length).toBe(
        span.end - span.start,
      );
    }
    expect(prompt).toBe("  3-BED semi in WICKLOW  ");
  });

  it("returns empty filters for an empty prompt", () => {
    expect(parse("")).toEqual({ filters: {}, spans: [] });
  });

  it("returns empty filters for prompt text it cannot read", () => {
    expect(parse("hello there").filters).toEqual({});
  });

  it("handles a long combined prompt", () => {
    expect(
      f(
        "energy-efficient 4-bed semi-detached in Co. Kildare between €350k and €500k, over 140 sqm, with a garage, a garden office and fibre broadband, recently reduced",
      ),
    ).toEqual({
      ber_max: "B",
      beds_min: 4,
      property_type: "Semi-D",
      county: "Kildare",
      price_min: 350000,
      price_max: 500000,
      area_min: 140,
      outbuilding: true,
      pod_space: true,
      fibre: true,
      price_drop: true,
    });
  });
});
