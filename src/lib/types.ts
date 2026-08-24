/**
 * Shared types for the demo.
 *
 * The dataset is a static, generated JSON file bundled at build time — there is no
 * database and no API. `DemoListing` is deliberately a *subset* of the private
 * house-hunter schema: the personal scoring/verdict fields (score, tier, drive_min,
 * dan_verdict, over_budget_flag, reno_band, reno_cost_*, all_in_*, tags) encode
 * private buying criteria and must never appear in this public demo.
 */

export interface DemoListing {
  id: string;
  source: "demo";
  address: string;
  town: string;
  county: string;
  eircode: string;
  price_eur: number;
  beds: number;
  baths: number;
  property_type: string; // "Detached" | "Semi-D" | "Terrace" | "Bungalow" | "Apartment" | "Cottage"
  ber: string; // band + subgrade, e.g. "B2", "G"
  floor_area_sqm: number;
  lat: number;
  lng: number;
  description: string;
  publish_date: string; // ISO date
  outbuilding: boolean;
  outbuilding_sqm: number | null;
  pod_space: boolean;
  fibre: boolean;
  price_drop: boolean;
}

/** Structured search state, as produced by the prompt parser. All fields optional: an
 *  absent key means "unconstrained", not "false". */
export interface DemoFilters {
  county?: string;
  town?: string;
  price_min?: number;
  price_max?: number;
  beds_min?: number;
  property_type?: string;
  ber_max?: string; // band letter cap, e.g. "B" = A or B
  outbuilding?: boolean;
  pod_space?: boolean;
  fibre?: boolean;
  price_drop?: boolean;
  area_min?: number;
  q?: string;
}

/** Parser output: the filters plus the character ranges of the raw prompt that produced
 *  each one, so the UI can highlight which words drove which filter. */
export interface ParseResult {
  filters: DemoFilters;
  spans: { start: number; end: number; field: keyof DemoFilters }[];
}
