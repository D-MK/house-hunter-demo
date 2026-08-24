/**
 * Zero-results state.
 *
 * A dead end is the worst thing that can happen in a demo, so this doesn't just
 * say "no results" — it names the filters that are currently narrowing the
 * search and lets you drop any of them from here. One click and the grid is
 * populated again.
 */

import { chipLabel, fieldMeta } from "@/lib/field-meta";
import { orderedFilterFields, useAppStore } from "@/store/app";

export function EmptyState() {
  const filters = useAppStore((s) => s.filters);
  const spans = useAppStore((s) => s.spans);
  const removeFilter = useAppStore((s) => s.removeFilter);
  const clearFilters = useAppStore((s) => s.clearFilters);

  const fields = orderedFilterFields({ filters, spans });

  return (
    <div className="rounded-2xl border border-dashed border-paper-300 bg-white/70 px-6 py-10 text-center">
      <svg
        viewBox="0 0 64 48"
        className="mx-auto mb-4 h-16 w-20"
        role="img"
        aria-label="An empty street"
      >
        <path d="M0 38h64" stroke="#e2d6c2" strokeWidth="2" />
        <path d="M14 38V22l10-8 10 8v16Z" fill="#f1e9dc" stroke="#d6c9b4" />
        <path
          d="M10 23 24 12l14 11"
          fill="none"
          stroke="#b9a88e"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect x="20" y="28" width="8" height="10" fill="#cbbda5" />
        <circle
          cx="46"
          cy="20"
          r="8"
          fill="none"
          stroke="#b9a88e"
          strokeWidth="2"
        />
        <path
          d="m52 26 6 6"
          stroke="#b9a88e"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      <h3 className="font-display text-xl font-semibold text-ink-900">
        Nothing matches all of those at once
      </h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
        The demo dataset holds 300 listings, so a tight combination can come
        back empty. Loosen one constraint — drop a filter below, or widen its
        value on the chip rail.
      </p>

      {fields.length > 0 ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {fields.map((field) => (
            <button
              key={field}
              type="button"
              onClick={() => removeFilter(field)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${fieldMeta(field).tone.chip}`}
            >
              <span aria-hidden="true" className="text-xs opacity-60">
                ✕
              </span>
              Drop {chipLabel(field, filters[field])}
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-full border border-ink-900 bg-ink-900 px-3 py-1.5 text-sm font-medium text-paper-50 transition hover:bg-ink-800"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  );
}
