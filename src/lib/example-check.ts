/**
 * Shared self-check for the curated example prompts.
 *
 * Used by both `npm run validate-examples` and the dataset generator's final
 * gate, so the rule ("every example prompt returns at least
 * MIN_EXAMPLE_RESULTS listings") has exactly one implementation.
 */

import { EXAMPLE_PROMPTS, MIN_EXAMPLE_RESULTS } from "../data/examples";
import { parse } from "./parse";
import { search } from "./search";
import type { DemoFilters, DemoListing } from "./types";

export interface ExampleCheck {
  id: string;
  prompt: string;
  filters: DemoFilters;
  count: number;
  ok: boolean;
}

export function checkExamples(listings: DemoListing[]): ExampleCheck[] {
  return EXAMPLE_PROMPTS.map((example) => {
    const { filters } = parse(example.prompt);
    const count = search(listings, filters).length;
    return {
      id: example.id,
      prompt: example.prompt,
      filters,
      count,
      ok: count >= MIN_EXAMPLE_RESULTS,
    };
  });
}
