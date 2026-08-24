/**
 * Presentation metadata for the filter fields.
 *
 * Purely cosmetic — no filtering happens here. It exists so the highlighted
 * phrase in the parse breakdown and the chip it produced can share one source of
 * truth for label, colour and editor shape; the visual link between them is the
 * whole point of the breakdown view, and it falls apart the moment the two sides
 * disagree about what colour "price_max" is.
 *
 * Tailwind class names are written out in full (never assembled from fragments)
 * so the v4 scanner can see them in the source.
 */

import { COUNTY_NAMES } from "./gazetteer";
import type { DemoFilters } from "./types";

export type FilterField = keyof DemoFilters;

/** How a chip lets you change its value. */
export type EditorKind =
  | { kind: "none" }
  | { kind: "text"; placeholder: string }
  | { kind: "number"; min: number; max: number; step: number; unit?: string }
  | { kind: "select"; options: readonly string[] }
  | { kind: "boolean" };

export interface Tone {
  /** Highlighted run of prompt text. */
  mark: string;
  /** Chip surface. */
  chip: string;
  /** Small colour dot / connector anchor. */
  dot: string;
  /** SVG connector stroke (Tailwind palette hex at the 500 step). */
  stroke: string;
}

const TONES = {
  amber: {
    mark: "bg-amber-100 text-amber-950 decoration-amber-400",
    chip: "border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400",
    dot: "bg-amber-500",
    stroke: "#f59e0b",
  },
  teal: {
    mark: "bg-teal-100 text-teal-950 decoration-teal-400",
    chip: "border-teal-300 bg-teal-50 text-teal-900 hover:border-teal-400",
    dot: "bg-teal-500",
    stroke: "#14b8a6",
  },
  violet: {
    mark: "bg-violet-100 text-violet-950 decoration-violet-400",
    chip: "border-violet-300 bg-violet-50 text-violet-900 hover:border-violet-400",
    dot: "bg-violet-500",
    stroke: "#8b5cf6",
  },
  indigo: {
    mark: "bg-indigo-100 text-indigo-950 decoration-indigo-400",
    chip: "border-indigo-300 bg-indigo-50 text-indigo-900 hover:border-indigo-400",
    dot: "bg-indigo-500",
    stroke: "#6366f1",
  },
  purple: {
    mark: "bg-purple-100 text-purple-950 decoration-purple-400",
    chip: "border-purple-300 bg-purple-50 text-purple-900 hover:border-purple-400",
    dot: "bg-purple-500",
    stroke: "#a855f7",
  },
  emerald: {
    mark: "bg-emerald-100 text-emerald-950 decoration-emerald-400",
    chip: "border-emerald-300 bg-emerald-50 text-emerald-900 hover:border-emerald-400",
    dot: "bg-emerald-500",
    stroke: "#10b981",
  },
  cyan: {
    mark: "bg-cyan-100 text-cyan-950 decoration-cyan-400",
    chip: "border-cyan-300 bg-cyan-50 text-cyan-900 hover:border-cyan-400",
    dot: "bg-cyan-500",
    stroke: "#06b6d4",
  },
  orange: {
    mark: "bg-orange-100 text-orange-950 decoration-orange-400",
    chip: "border-orange-300 bg-orange-50 text-orange-900 hover:border-orange-400",
    dot: "bg-orange-500",
    stroke: "#f97316",
  },
  fuchsia: {
    mark: "bg-fuchsia-100 text-fuchsia-950 decoration-fuchsia-400",
    chip: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-900 hover:border-fuchsia-400",
    dot: "bg-fuchsia-500",
    stroke: "#d946ef",
  },
  sky: {
    mark: "bg-sky-100 text-sky-950 decoration-sky-400",
    chip: "border-sky-300 bg-sky-50 text-sky-900 hover:border-sky-400",
    dot: "bg-sky-500",
    stroke: "#0ea5e9",
  },
  rose: {
    mark: "bg-rose-100 text-rose-950 decoration-rose-400",
    chip: "border-rose-300 bg-rose-50 text-rose-900 hover:border-rose-400",
    dot: "bg-rose-500",
    stroke: "#f43f5e",
  },
  slate: {
    mark: "bg-slate-200 text-slate-900 decoration-slate-400",
    chip: "border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-400",
    dot: "bg-slate-500",
    stroke: "#64748b",
  },
} as const satisfies Record<string, Tone>;

export const PROPERTY_TYPES = [
  "Detached",
  "Semi-D",
  "Terrace",
  "Bungalow",
  "Apartment",
  "Cottage",
] as const;

export const BER_BANDS = ["A", "B", "C", "D", "E", "F", "G"] as const;

const EUR = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatEuro(value: number): string {
  return EUR.format(value);
}

export interface FieldMeta {
  /** Short name of what the filter constrains ("Budget", "Beds"). */
  group: string;
  tone: Tone;
  editor: EditorKind;
  /** Full chip label for a given value. */
  label: (value: unknown) => string;
}

const META: Record<FilterField, FieldMeta> = {
  county: {
    group: "County",
    tone: TONES.teal,
    editor: { kind: "select", options: COUNTY_NAMES },
    label: (v) => `Co. ${String(v)}`,
  },
  town: {
    group: "Town",
    tone: TONES.teal,
    editor: { kind: "text", placeholder: "Town name" },
    label: (v) => String(v),
  },
  price_min: {
    group: "Price floor",
    tone: TONES.amber,
    editor: { kind: "number", min: 0, max: 3_000_000, step: 25_000 },
    label: (v) => `From ${formatEuro(Number(v))}`,
  },
  price_max: {
    group: "Budget",
    tone: TONES.amber,
    editor: { kind: "number", min: 0, max: 3_000_000, step: 25_000 },
    label: (v) => `Up to ${formatEuro(Number(v))}`,
  },
  beds_min: {
    group: "Beds",
    tone: TONES.violet,
    editor: { kind: "number", min: 1, max: 10, step: 1 },
    label: (v) => `${Number(v)}+ beds`,
  },
  baths_min: {
    group: "Baths",
    tone: TONES.indigo,
    editor: { kind: "number", min: 1, max: 10, step: 1 },
    label: (v) => `${Number(v)}+ baths`,
  },
  property_type: {
    group: "Type",
    tone: TONES.purple,
    editor: { kind: "select", options: PROPERTY_TYPES },
    label: (v) => String(v),
  },
  ber_max: {
    group: "BER",
    tone: TONES.emerald,
    editor: { kind: "select", options: BER_BANDS },
    label: (v) => `BER ${String(v)} or better`,
  },
  area_min: {
    group: "Floor area",
    tone: TONES.cyan,
    editor: { kind: "number", min: 20, max: 500, step: 10, unit: "sqm" },
    label: (v) => `${Number(v)}+ sqm`,
  },
  outbuilding: {
    group: "Outbuilding",
    tone: TONES.orange,
    editor: { kind: "boolean" },
    label: (v) => (v === false ? "No outbuilding" : "Has an outbuilding"),
  },
  pod_space: {
    group: "Pod space",
    tone: TONES.fuchsia,
    editor: { kind: "boolean" },
    label: (v) => (v === false ? "No pod space" : "Room for an office pod"),
  },
  fibre: {
    group: "Broadband",
    tone: TONES.sky,
    editor: { kind: "boolean" },
    label: (v) => (v === false ? "No fibre" : "Fibre broadband"),
  },
  price_drop: {
    group: "Price change",
    tone: TONES.rose,
    editor: { kind: "boolean" },
    label: (v) => (v === false ? "Not reduced" : "Recently reduced"),
  },
  q: {
    group: "Text",
    tone: TONES.slate,
    editor: { kind: "text", placeholder: "Free text" },
    label: (v) => `“${String(v)}”`,
  },
};

export function fieldMeta(field: FilterField): FieldMeta {
  return META[field];
}

/** Chip text for a live filter value, e.g. `price_max: 600000` → "Up to €600,000". */
export function chipLabel(field: FilterField, value: unknown): string {
  return META[field].label(value);
}

/** BER band → the cert's own colour ramp (A green through G red). */
export function berTone(ber: string): { chip: string; bar: string } {
  switch (ber.trim().charAt(0).toUpperCase()) {
    case "A":
      return { chip: "bg-green-600 text-white", bar: "bg-green-600" };
    case "B":
      return { chip: "bg-lime-500 text-lime-950", bar: "bg-lime-500" };
    case "C":
      return { chip: "bg-yellow-400 text-yellow-950", bar: "bg-yellow-400" };
    case "D":
      return { chip: "bg-amber-400 text-amber-950", bar: "bg-amber-400" };
    case "E":
      return { chip: "bg-orange-500 text-white", bar: "bg-orange-500" };
    case "F":
      return { chip: "bg-red-500 text-white", bar: "bg-red-500" };
    default:
      return { chip: "bg-red-700 text-white", bar: "bg-red-700" };
  }
}
