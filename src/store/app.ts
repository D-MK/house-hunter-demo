/**
 * The app's single Zustand store.
 *
 * This layer holds no business logic of its own: it owns the UI's state
 * (`draft`, `prompt`, `filters`, `spans`, `sort`, `results`) and delegates every
 * decision to Phase 3's pure `parse()` and `search()`. Two rules keep it honest:
 *
 *  1. `results` is always exactly `search(LISTINGS, filters, sort)` — every
 *     action that touches `filters` or `sort` recomputes it in the same update,
 *     so no component ever sees a stale result set.
 *  2. `spans` describe the *current* filters. Removing a chip drops its span, so
 *     the highlighted phrase in the parse breakdown disappears with it and the
 *     prompt→chip mapping can never lie.
 *
 * Hand-editing a chip is a third case: the phrase that produced the filter is
 * still the phrase that produced it, so the span stays — but the field is
 * recorded in `edited` so the UI can show that the value no longer matches what
 * the parser read.
 */

import { create } from "zustand";
import listingsJson from "@/data/listings.json";
import { parse } from "@/lib/parse";
import { search } from "@/lib/search";
import type { DemoFilters, DemoListing, MatchSpan, SortKey } from "@/lib/types";

/** The bundled dataset. Static JSON, loaded once at module scope. */
export const LISTINGS = listingsJson as unknown as DemoListing[];

export const DEFAULT_SORT: SortKey = "price_asc";

export interface AppState {
  /** Live contents of the prompt input (not yet searched). */
  draft: string;
  /** The prompt the current filters/spans were parsed from. */
  prompt: string;
  filters: DemoFilters;
  spans: MatchSpan[];
  sort: SortKey;
  results: DemoListing[];
  /** Filter fields whose value has been hand-edited since parsing. */
  edited: (keyof DemoFilters)[];
  /** The listing open in the detail modal, or `null` when it's closed. It lives
   *  here rather than in `ResultsSection` because the modal's own "similar
   *  listings" section re-opens it on a different house, and because the
   *  checklist inside it reads `filters` — one owner for both keeps them in
   *  step. Nothing about it is persisted. */
  selected: DemoListing | null;

  setDraft: (draft: string) => void;
  /** Parse `text` (defaults to the current draft) and search with the result. */
  submitPrompt: (text?: string) => void;
  setFilter: <K extends keyof DemoFilters>(
    field: K,
    value: NonNullable<DemoFilters[K]>,
  ) => void;
  removeFilter: (field: keyof DemoFilters) => void;
  clearFilters: () => void;
  setSort: (sort: SortKey) => void;
  openListing: (listing: DemoListing) => void;
  closeListing: () => void;
  reset: () => void;
}

/** Recompute the derived result set for a filter/sort pair. */
function resultsFor(filters: DemoFilters, sort: SortKey): DemoListing[] {
  return search(LISTINGS, filters, sort);
}

export const useAppStore = create<AppState>()((set, get) => ({
  draft: "",
  prompt: "",
  filters: {},
  spans: [],
  sort: DEFAULT_SORT,
  results: resultsFor({}, DEFAULT_SORT),
  edited: [],
  selected: null,

  setDraft: (draft) => set({ draft }),

  submitPrompt: (text) => {
    const prompt = (text ?? get().draft).trim();
    const { filters, spans } = parse(prompt);
    set({
      draft: prompt,
      prompt,
      filters,
      spans,
      edited: [],
      // A new search replaces what's underneath the modal, so leaving a house
      // from the previous result set open on top of it would be a lie.
      selected: null,
      results: resultsFor(filters, get().sort),
    });
  },

  setFilter: (field, value) => {
    const state = get();
    if (state.filters[field] === value) return;
    const filters: DemoFilters = { ...state.filters, [field]: value };
    const edited = state.edited.includes(field)
      ? state.edited
      : [...state.edited, field];
    set({ filters, edited, results: resultsFor(filters, state.sort) });
  },

  removeFilter: (field) => {
    const state = get();
    if (state.filters[field] === undefined) return;
    const filters: DemoFilters = { ...state.filters };
    delete filters[field];
    set({
      filters,
      spans: state.spans.filter((span) => span.field !== field),
      edited: state.edited.filter((key) => key !== field),
      results: resultsFor(filters, state.sort),
    });
  },

  clearFilters: () =>
    set((state) => ({
      filters: {},
      spans: [],
      edited: [],
      results: resultsFor({}, state.sort),
    })),

  setSort: (sort) =>
    set((state) => ({ sort, results: resultsFor(state.filters, sort) })),

  // Editing or removing a filter deliberately leaves the modal open: its "why
  // this matched" checklist is derived from `filters`, so it updates in place
  // and you can watch a reason disappear as you drop the chip that caused it.
  openListing: (listing) => set({ selected: listing }),

  closeListing: () => set({ selected: null }),

  reset: () =>
    set({
      draft: "",
      prompt: "",
      filters: {},
      spans: [],
      edited: [],
      selected: null,
      sort: DEFAULT_SORT,
      results: resultsFor({}, DEFAULT_SORT),
    }),
}));

/** Fields currently constrained, in the order their phrases appear in the
 *  prompt; filters with no span (hand-added) sort last, alphabetically. */
export function orderedFilterFields(
  state: Pick<AppState, "filters" | "spans">,
): (keyof DemoFilters)[] {
  const fields = Object.keys(state.filters) as (keyof DemoFilters)[];
  const positionOf = (field: keyof DemoFilters): number => {
    const span = state.spans.find((s) => s.field === field);
    return span === undefined ? Number.MAX_SAFE_INTEGER : span.start;
  };
  return fields
    .slice()
    .sort(
      (a, b) => positionOf(a) - positionOf(b) || String(a).localeCompare(b),
    );
}
