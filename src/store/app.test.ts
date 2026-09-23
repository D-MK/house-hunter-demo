/**
 * Store round-trip tests.
 *
 * The point of these is the chip rail's contract: whatever the UI does to an
 * individual filter — remove it, retype its value — the store must land on
 * exactly the result set `search()` would give for the resulting filters, with
 * `spans` still describing only the filters that actually exist.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { search } from "@/lib/search";
import type { DemoFilters } from "@/lib/types";
import { LISTINGS, orderedFilterFields, useAppStore } from "./app";

const PROMPT = "3-bed semi-detached in Dublin under €600k";

function state() {
  return useAppStore.getState();
}

/** `results` must always equal a fresh `search()` for the live filters/sort. */
function expectResultsConsistent(): void {
  const { filters, sort, results } = state();
  expect(results).toEqual(search(LISTINGS, filters, sort));
}

describe("app store", () => {
  beforeEach(() => {
    state().reset();
  });

  it("starts with the whole dataset and no filters", () => {
    expect(state().prompt).toBe("");
    expect(state().filters).toEqual({});
    expect(state().spans).toEqual([]);
    expect(state().results).toHaveLength(LISTINGS.length);
    expectResultsConsistent();
  });

  it("parses a submitted prompt into filters, spans and results", () => {
    state().submitPrompt(PROMPT);

    const { prompt, draft, filters, spans, results } = state();
    expect(prompt).toBe(PROMPT);
    expect(draft).toBe(PROMPT);
    expect(filters).toMatchObject({
      beds_min: 3,
      property_type: "Semi-D",
      county: "Dublin",
      price_max: 600_000,
    });
    expect(spans.length).toBeGreaterThan(0);
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThan(LISTINGS.length);
    expectResultsConsistent();
  });

  it("submits the current draft when called with no argument", () => {
    state().setDraft(`  ${PROMPT}  `);
    state().submitPrompt();
    expect(state().prompt).toBe(PROMPT);
    expect(state().filters.county).toBe("Dublin");
  });

  it("every span refers to a filter that exists", () => {
    state().submitPrompt(PROMPT);
    for (const span of state().spans) {
      expect(state().filters[span.field]).toBeDefined();
    }
  });

  it("removing a chip drops the filter, its span, and widens the results", () => {
    state().submitPrompt(PROMPT);
    const before = state().results.length;

    state().removeFilter("county");

    expect(state().filters.county).toBeUndefined();
    expect(state().spans.some((span) => span.field === "county")).toBe(false);
    expect(state().results.length).toBeGreaterThan(before);
    expectResultsConsistent();
  });

  it("removing every chip returns the full dataset", () => {
    state().submitPrompt(PROMPT);
    for (const field of Object.keys(state().filters) as (keyof DemoFilters)[]) {
      state().removeFilter(field);
    }
    expect(state().filters).toEqual({});
    expect(state().spans).toEqual([]);
    expect(state().results).toHaveLength(LISTINGS.length);
  });

  it("removing an absent filter is a no-op", () => {
    state().submitPrompt(PROMPT);
    const before = state().results;
    state().removeFilter("fibre");
    expect(state().results).toBe(before);
  });

  it("editing a chip re-runs the search and marks the field edited", () => {
    state().submitPrompt(PROMPT);
    expect(state().edited).toEqual([]);

    state().setFilter("price_max", 400_000);

    expect(state().filters.price_max).toBe(400_000);
    expect(state().edited).toContain("price_max");
    expect(state().results.every((l) => l.price_eur <= 400_000)).toBe(true);
    expectResultsConsistent();
  });

  it("keeps the span when a chip is edited, so the phrase stays linked", () => {
    state().submitPrompt(PROMPT);
    state().setFilter("beds_min", 5);
    expect(state().spans.some((span) => span.field === "beds_min")).toBe(true);
  });

  it("can add a filter that the prompt never produced", () => {
    state().submitPrompt(PROMPT);
    state().setFilter("fibre", true);
    expect(state().filters.fibre).toBe(true);
    expect(state().results.every((l) => l.fibre)).toBe(true);
    expectResultsConsistent();
  });

  it("re-submitting a prompt clears hand edits", () => {
    state().submitPrompt(PROMPT);
    state().setFilter("price_max", 400_000);
    state().submitPrompt(PROMPT);
    expect(state().edited).toEqual([]);
    expect(state().filters.price_max).toBe(600_000);
  });

  it("changing sort re-orders the same result set", () => {
    state().submitPrompt(PROMPT);
    state().setSort("price_desc");

    const prices = state().results.map((l) => l.price_eur);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
    expectResultsConsistent();
  });

  it("keeps the sort when filters change", () => {
    state().setSort("area_desc");
    state().submitPrompt(PROMPT);
    expect(state().sort).toBe("area_desc");
    state().removeFilter("county");
    expect(state().sort).toBe("area_desc");
    expectResultsConsistent();
  });

  it("clearFilters empties the rail but keeps the prompt text", () => {
    state().submitPrompt(PROMPT);
    state().clearFilters();
    expect(state().prompt).toBe(PROMPT);
    expect(state().filters).toEqual({});
    expect(state().spans).toEqual([]);
    expect(state().results).toHaveLength(LISTINGS.length);
  });

  it("orders chips by where their phrase appears in the prompt", () => {
    state().submitPrompt(PROMPT);
    expect(orderedFilterFields(state())).toEqual([
      "beds_min",
      "property_type",
      "county",
      "price_max",
    ]);
  });

  it("sorts hand-added filters after parsed ones", () => {
    state().submitPrompt("3-bed in Dublin");
    state().setFilter("fibre", true);
    const fields = orderedFilterFields(state());
    expect(fields[fields.length - 1]).toBe("fibre");
  });

  it("an unmatchable prompt yields zero results, not a crash", () => {
    state().submitPrompt("10-bed cottage in Leitrim under €50k");
    expect(state().results).toHaveLength(0);
    expectResultsConsistent();
  });
});
