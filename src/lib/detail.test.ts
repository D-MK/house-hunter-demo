/**
 * Detail-view derivation tests.
 *
 * The point of these is that the detail modal invents nothing at render time:
 * the price history is a pure function of the listing id (so it can't change
 * between two openings of the same house), the checklist only ever restates
 * values the listing actually has, and the "similar" set obeys its own stated
 * rule — same county, ±20%, closest first — rather than whatever the dataset
 * order happens to be.
 */

import { describe, expect, it } from "vitest";
import listingsJson from "@/data/listings.json";
import {
  matchedCriteria,
  similarListings,
  syntheticPriceHistory,
} from "@/lib/detail";
import type { DemoFilters, DemoListing } from "@/lib/types";

const LISTINGS = listingsJson as unknown as DemoListing[];

const REDUCED = LISTINGS.filter((listing) => listing.price_drop);

function byId(id: string): DemoListing {
  const listing = LISTINGS.find((candidate) => candidate.id === id);
  if (listing === undefined) throw new Error(`no listing ${id}`);
  return listing;
}

describe("syntheticPriceHistory", () => {
  it("has reduced listings to work with", () => {
    expect(REDUCED.length).toBeGreaterThan(10);
  });

  it("returns 3 or 4 points", () => {
    for (const listing of REDUCED) {
      const history = syntheticPriceHistory(listing);
      expect(history.length).toBeGreaterThanOrEqual(3);
      expect(history.length).toBeLessThanOrEqual(4);
    }
  });

  it("ends at the listing's current asking price", () => {
    for (const listing of REDUCED) {
      const history = syntheticPriceHistory(listing);
      expect(history[history.length - 1]?.price_eur).toBe(listing.price_eur);
    }
  });

  it("starts above the current price, on the publish date", () => {
    for (const listing of REDUCED) {
      const [first] = syntheticPriceHistory(listing);
      expect(first?.date).toBe(listing.publish_date);
      expect(first?.price_eur).toBeGreaterThan(listing.price_eur);
    }
  });

  it("descends strictly and advances in time", () => {
    for (const listing of REDUCED) {
      const history = syntheticPriceHistory(listing);
      for (let i = 1; i < history.length; i += 1) {
        const previous = history[i - 1] as { date: string; price_eur: number };
        const current = history[i] as { date: string; price_eur: number };
        expect(current.price_eur).toBeLessThan(previous.price_eur);
        expect(current.date > previous.date).toBe(true);
      }
    }
  });

  it("starts at the original price the description names", () => {
    for (const listing of REDUCED) {
      const stated = /recently reduced from €([\d,]+)/i.exec(
        listing.description,
      );
      // The generator writes that sentence into every reduced listing; if that
      // ever stops being true, this test should be the thing that says so.
      expect(stated).not.toBeNull();
      const original = Number((stated?.[1] as string).replace(/,/g, ""));
      expect(syntheticPriceHistory(listing)[0]?.price_eur).toBe(original);
    }
  });

  it("falls back to a seeded original when the blurb names none", () => {
    const quiet: DemoListing = {
      ...byId("demo-0001"),
      price_drop: true,
      description: "A house. No history quoted.",
    };
    const history = syntheticPriceHistory(quiet);
    expect(history[0]?.price_eur).toBeGreaterThan(quiet.price_eur);
    expect(history[history.length - 1]?.price_eur).toBe(quiet.price_eur);
  });

  it("emits ISO dates", () => {
    for (const point of syntheticPriceHistory(byId("demo-0001"))) {
      expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("prices land on tidy figures, not stray euros", () => {
    for (const listing of REDUCED) {
      for (const point of syntheticPriceHistory(listing)) {
        expect(point.price_eur % 500).toBe(0);
      }
    }
  });

  it("is deterministic — same listing, same series every call", () => {
    for (const listing of REDUCED.slice(0, 20)) {
      expect(syntheticPriceHistory(listing)).toEqual(
        syntheticPriceHistory(listing),
      );
    }
  });

  it("is seeded by the id, so different listings differ", () => {
    const shapes = new Set(
      REDUCED.map((listing) =>
        syntheticPriceHistory(listing)
          .map((point) => point.price_eur - listing.price_eur)
          .join(","),
      ),
    );
    expect(shapes.size).toBeGreaterThan(1);
  });

  it("survives an unparseable publish date", () => {
    const broken: DemoListing = { ...byId("demo-0001"), publish_date: "soon" };
    const history = syntheticPriceHistory(broken);
    expect(history.length).toBeGreaterThanOrEqual(3);
    for (const point of history) {
      expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("matchedCriteria", () => {
  const listing = byId("demo-0001");

  it("returns nothing when no filter is active", () => {
    expect(matchedCriteria(listing, {})).toEqual([]);
  });

  it("returns one line per active filter", () => {
    const filters: DemoFilters = {
      county: "Donegal",
      price_max: 300_000,
      beds_min: 2,
    };
    expect(matchedCriteria(listing, filters)).toHaveLength(3);
  });

  it("names the filter and quotes the listing's own value", () => {
    const criteria = matchedCriteria(listing, { price_max: 300_000 });
    expect(criteria).toEqual([
      { label: "Budget", value: "€95,000 — under your €300,000 budget" },
    ]);
  });

  it("describes beds, baths and area against what was asked for", () => {
    const criteria = matchedCriteria(listing, {
      beds_min: 2,
      baths_min: 1,
      area_min: 60,
    });
    expect(criteria.map((c) => c.label)).toEqual([
      "Beds",
      "Baths",
      "Floor area",
    ]);
    expect(criteria[0]?.value).toBe("2 beds — you asked for 2+");
    expect(criteria[1]?.value).toBe("1 bath — you asked for 1+");
    expect(criteria[2]?.value).toBe("79 sqm — over your 60 sqm minimum");
  });

  it("reads booleans in whichever direction they were asked", () => {
    expect(matchedCriteria(listing, { outbuilding: true })[0]?.value).toBe(
      "Outbuilding of c. 25 sqm",
    );
    expect(matchedCriteria(listing, { fibre: false })[0]?.value).toBe(
      "Not passed for fibre",
    );
    expect(matchedCriteria(listing, { price_drop: false })[0]?.value).toBe(
      "Still at its original asking price",
    );
  });

  it("says where a free-text term was found", () => {
    const criteria = matchedCriteria(listing, { q: "office pod" });
    expect(criteria[0]?.label).toBe("Text");
    expect(criteria[0]?.value).toBe("“office pod” appears in the description");
  });

  it("drops a free-text line it cannot locate", () => {
    expect(matchedCriteria(listing, { q: "helicopter pad" })).toEqual([]);
  });

  it("orders criteria the same way regardless of key insertion order", () => {
    const a: DemoFilters = { beds_min: 2, county: "Donegal", fibre: false };
    const b: DemoFilters = { fibre: false, beds_min: 2, county: "Donegal" };
    expect(matchedCriteria(listing, a)).toEqual(matchedCriteria(listing, b));
    expect(matchedCriteria(listing, a).map((c) => c.label)).toEqual([
      "County",
      "Beds",
      "Broadband",
    ]);
  });

  it("never returns an empty label or value", () => {
    const filters: DemoFilters = {
      county: listing.county,
      town: listing.town,
      price_min: 50_000,
      price_max: 300_000,
      beds_min: 1,
      baths_min: 1,
      property_type: listing.property_type,
      ber_max: "C",
      area_min: 50,
      outbuilding: true,
      pod_space: true,
      fibre: false,
      price_drop: false,
      q: "cottage",
    };
    const criteria = matchedCriteria(listing, filters);
    expect(criteria).toHaveLength(14);
    for (const item of criteria) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.value.length).toBeGreaterThan(0);
    }
  });

  it("does not mutate its inputs", () => {
    const filters: DemoFilters = { county: "Donegal", beds_min: 2 };
    const snapshot = structuredClone(filters);
    const listingSnapshot = structuredClone(listing);
    matchedCriteria(listing, filters);
    expect(filters).toEqual(snapshot);
    expect(listing).toEqual(listingSnapshot);
  });
});

describe("similarListings", () => {
  // A Dublin listing with plenty of comparables, so the ordering and limit
  // assertions below have something to actually bite on.
  const listing = byId("demo-0008");

  it("never includes the listing itself", () => {
    for (const subject of LISTINGS.slice(0, 40)) {
      const similar = similarListings(LISTINGS, subject);
      expect(similar.some((item) => item.id === subject.id)).toBe(false);
    }
  });

  it("stays in the same county and within ±20% of the price", () => {
    for (const subject of LISTINGS.slice(0, 40)) {
      for (const item of similarListings(LISTINGS, subject)) {
        expect(item.county).toBe(subject.county);
        expect(item.price_eur).toBeGreaterThanOrEqual(
          subject.price_eur * 0.8 - 1e-6,
        );
        expect(item.price_eur).toBeLessThanOrEqual(
          subject.price_eur * 1.2 + 1e-6,
        );
      }
    }
  });

  it("returns the closest prices first", () => {
    const similar = similarListings(LISTINGS, listing, 3);
    const distances = similar.map((item) =>
      Math.abs(item.price_eur - listing.price_eur),
    );
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it("picks the closest matches in the county, not just the first three", () => {
    const all = similarListings(LISTINGS, listing, LISTINGS.length);
    const top = similarListings(LISTINGS, listing, 2);
    expect(top).toEqual(all.slice(0, 2));
  });

  it("honours the limit and defaults to three", () => {
    expect(similarListings(LISTINGS, listing, LISTINGS.length).length).toBe(11);
    expect(similarListings(LISTINGS, listing)).toHaveLength(3);
    expect(similarListings(LISTINGS, listing, 1)).toHaveLength(1);
    expect(similarListings(LISTINGS, listing, 0)).toEqual([]);
  });

  it("is deterministic", () => {
    expect(similarListings(LISTINGS, listing)).toEqual(
      similarListings(LISTINGS, listing),
    );
  });

  it("returns an empty list when nothing is comparable", () => {
    const lonely: DemoListing = {
      ...listing,
      id: "demo-lonely",
      county: "Nowhere",
    };
    expect(similarListings(LISTINGS, lonely)).toEqual([]);
  });

  it("does not mutate or re-order the input array", () => {
    const input = LISTINGS.slice(0, 50);
    const order = input.map((item) => item.id);
    similarListings(input, listing);
    expect(input.map((item) => item.id)).toEqual(order);
  });
});
