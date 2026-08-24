import { describe, expect, it } from "vitest";
import { parse } from "./parse";
import { search } from "./search";
import type { DemoListing } from "./types";

function listing(overrides: Partial<DemoListing> = {}): DemoListing {
  return {
    id: "demo-0001",
    source: "demo",
    address: "1 Ashfield Grove",
    town: "Bray",
    county: "Wicklow",
    eircode: "A98 X1Y2",
    price_eur: 400000,
    beds: 3,
    baths: 2,
    property_type: "Semi-D",
    ber: "C2",
    floor_area_sqm: 110,
    lat: 53.2,
    lng: -6.1,
    description: "A 3-bed semi-detached house in Bray, Co. Wicklow.",
    publish_date: "2026-05-01",
    outbuilding: false,
    outbuilding_sqm: null,
    pod_space: false,
    fibre: true,
    price_drop: false,
    ...overrides,
  };
}

const FIXTURES: DemoListing[] = [
  listing({
    id: "a",
    county: "Wicklow",
    town: "Bray",
    price_eur: 350000,
    beds: 3,
    baths: 1,
    property_type: "Semi-D",
    ber: "C1",
    floor_area_sqm: 100,
    publish_date: "2026-03-01",
    outbuilding: true,
    outbuilding_sqm: 30,
    fibre: true,
  }),
  listing({
    id: "b",
    county: "Wicklow",
    town: "Greystones",
    price_eur: 550000,
    beds: 4,
    baths: 3,
    property_type: "Detached",
    ber: "A2",
    floor_area_sqm: 180,
    publish_date: "2026-06-15",
    pod_space: true,
    fibre: true,
    price_drop: true,
  }),
  listing({
    id: "c",
    county: "Kerry",
    town: "Tralee",
    price_eur: 220000,
    beds: 2,
    baths: 1,
    property_type: "Cottage",
    ber: "F",
    floor_area_sqm: 70,
    publish_date: "2026-01-10",
    outbuilding: true,
    outbuilding_sqm: 45,
    fibre: false,
  }),
  listing({
    id: "d",
    county: "Dublin",
    town: "Rathmines",
    price_eur: 475000,
    beds: 2,
    baths: 1,
    property_type: "Apartment",
    ber: "B3",
    floor_area_sqm: 75,
    publish_date: "2026-07-20",
    fibre: true,
  }),
];

function ids(results: DemoListing[]): string[] {
  return results.map((l) => l.id);
}

describe("filtering", () => {
  it("returns everything for empty filters", () => {
    expect(search(FIXTURES, {})).toHaveLength(FIXTURES.length);
  });

  it("filters by county", () => {
    expect(ids(search(FIXTURES, { county: "Wicklow" }))).toEqual(["a", "b"]);
  });

  it("filters by county case-insensitively", () => {
    expect(ids(search(FIXTURES, { county: "wicklow" }))).toEqual(["a", "b"]);
  });

  it("filters by town", () => {
    expect(ids(search(FIXTURES, { town: "Tralee" }))).toEqual(["c"]);
  });

  it("filters by price range", () => {
    expect(
      ids(search(FIXTURES, { price_min: 300000, price_max: 500000 })),
    ).toEqual(["a", "d"]);
  });

  it("filters by minimum beds", () => {
    expect(ids(search(FIXTURES, { beds_min: 3 }))).toEqual(["a", "b"]);
  });

  it("filters by minimum baths", () => {
    expect(ids(search(FIXTURES, { baths_min: 3 }))).toEqual(["b"]);
  });

  it("filters by property type", () => {
    expect(ids(search(FIXTURES, { property_type: "Cottage" }))).toEqual(["c"]);
  });

  it("accepts property-type synonyms", () => {
    expect(ids(search(FIXTURES, { property_type: "semi-detached" }))).toEqual([
      "a",
    ]);
    expect(ids(search(FIXTURES, { property_type: "flat" }))).toEqual(["d"]);
  });

  it("treats ber_max as a band cap", () => {
    expect(ids(search(FIXTURES, { ber_max: "B" }))).toEqual(["b", "d"]);
    expect(ids(search(FIXTURES, { ber_max: "A" }))).toEqual(["b"]);
    expect(ids(search(FIXTURES, { ber_max: "G" }))).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("filters by minimum floor area", () => {
    expect(ids(search(FIXTURES, { area_min: 100 }))).toEqual(["a", "b"]);
  });

  it("filters by the boolean attributes", () => {
    expect(ids(search(FIXTURES, { outbuilding: true }))).toEqual(["a", "c"]);
    expect(ids(search(FIXTURES, { pod_space: true }))).toEqual(["b"]);
    expect(ids(search(FIXTURES, { fibre: true }))).toEqual(["a", "b", "d"]);
    expect(ids(search(FIXTURES, { price_drop: true }))).toEqual(["b"]);
  });

  it("treats an explicit false as a real constraint", () => {
    expect(ids(search(FIXTURES, { fibre: false }))).toEqual(["c"]);
  });

  it("treats an absent key as unconstrained, not false", () => {
    expect(search(FIXTURES, {})).toHaveLength(4);
    expect(search(FIXTURES, { outbuilding: false })).toHaveLength(2);
  });

  it("ANDs every populated filter together", () => {
    expect(
      ids(
        search(FIXTURES, {
          county: "Wicklow",
          beds_min: 3,
          price_max: 400000,
          outbuilding: true,
        }),
      ),
    ).toEqual(["a"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(search(FIXTURES, { county: "Sligo" })).toEqual([]);
  });

  it("matches free text against address, place and description", () => {
    expect(ids(search(FIXTURES, { q: "greystones" }))).toEqual(["b"]);
    expect(ids(search(FIXTURES, { q: "semi-detached house" }))).toHaveLength(4);
  });
});

describe("sorting", () => {
  it("sorts by price ascending", () => {
    expect(ids(search(FIXTURES, {}, "price_asc"))).toEqual([
      "c",
      "a",
      "d",
      "b",
    ]);
  });

  it("sorts by price descending", () => {
    expect(ids(search(FIXTURES, {}, "price_desc"))).toEqual([
      "b",
      "d",
      "a",
      "c",
    ]);
  });

  it("sorts by newest first", () => {
    expect(ids(search(FIXTURES, {}, "newest"))).toEqual(["d", "b", "a", "c"]);
  });

  it("sorts by floor area descending", () => {
    expect(ids(search(FIXTURES, {}, "area_desc"))).toEqual([
      "b",
      "a",
      "d",
      "c",
    ]);
  });

  it("keeps dataset order when no sort is given", () => {
    expect(ids(search(FIXTURES, {}))).toEqual(["a", "b", "c", "d"]);
  });

  it("sorts the filtered set, not the whole dataset", () => {
    expect(ids(search(FIXTURES, { county: "Wicklow" }, "price_desc"))).toEqual([
      "b",
      "a",
    ]);
  });
});

describe("purity", () => {
  it("does not mutate the input array or its order", () => {
    const input = FIXTURES.slice();
    const before = ids(input);
    search(input, { beds_min: 2 }, "price_desc");
    expect(ids(input)).toEqual(before);
  });

  it("does not mutate the listings themselves", () => {
    const snapshot = JSON.stringify(FIXTURES);
    search(FIXTURES, { county: "Wicklow", ber_max: "B" }, "newest");
    expect(JSON.stringify(FIXTURES)).toBe(snapshot);
  });

  it("does not mutate the filters object", () => {
    const filters = { county: "Wicklow", beds_min: 3 };
    const snapshot = JSON.stringify(filters);
    search(FIXTURES, filters);
    expect(JSON.stringify(filters)).toBe(snapshot);
  });

  it("returns a new array each call", () => {
    const first = search(FIXTURES, {});
    const second = search(FIXTURES, {});
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });
});

describe("parse + search together", () => {
  it("runs a full prompt end to end", () => {
    const { filters } = parse(
      "3-bed semi in Wicklow under €400k with a garage",
    );
    expect(ids(search(FIXTURES, filters))).toEqual(["a"]);
  });

  it("applies a parsed BER cap", () => {
    const { filters } = parse("BER B or better");
    expect(ids(search(FIXTURES, filters))).toEqual(["b", "d"]);
  });

  it("ignores a BER the prompt said not to care about", () => {
    const { filters } = parse("cottage in Kerry, BER doesn't matter");
    expect(ids(search(FIXTURES, filters))).toEqual(["c"]);
  });
});
