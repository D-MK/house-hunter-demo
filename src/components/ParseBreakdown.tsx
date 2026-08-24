/**
 * The parse breakdown — the demo's centrepiece.
 *
 * It shows the prompt exactly as typed, with the phrases the parser understood
 * highlighted, and draws a curved connector from each highlighted phrase down to
 * the filter chip it produced. That link is the whole pitch of the project: you
 * can see which words became which constraint, and then edit or delete the
 * constraint and watch the results move.
 *
 * Two implementation notes:
 *
 *  - The prompt is rendered as React text nodes sliced by character offset, so
 *    user-typed text is escaped by React and never assembled into raw markup.
 *    (The repo has a build check for the raw-HTML escape hatch; the string
 *    itself is deliberately not written anywhere in `src/`, comments included.)
 *  - The connectors are measured from the live DOM (mark rects and chip rects,
 *    both relative to this container) and redrawn on resize, so they survive
 *    wrapping, zoom and any chip rail that spills onto a second row. If the
 *    measurement can't run, the lines simply don't render — colour-coding and
 *    the ordering still carry the mapping.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FilterChip } from "@/components/FilterChip";
import { fieldMeta } from "@/lib/field-meta";
import type { DemoFilters, MatchSpan } from "@/lib/types";
import { orderedFilterFields, useAppStore } from "@/store/app";

type Field = keyof DemoFilters;

/** A run of prompt text: either untouched, or a phrase claimed by the parser. */
interface Segment {
  text: string;
  /** Fields produced by this phrase — "between €200k and €350k" makes two. */
  fields: Field[];
  key: string;
}

interface Connector {
  key: string;
  field: Field;
  path: string;
  stroke: string;
  dashed: boolean;
}

/** Slice the prompt into plain and highlighted runs. Spans never overlap (the
 *  parser claims ranges), but a single range can carry several fields. */
function toSegments(prompt: string, spans: MatchSpan[]): Segment[] {
  const grouped = new Map<
    string,
    { start: number; end: number; fields: Field[] }
  >();
  for (const span of spans) {
    const key = `${span.start}-${span.end}`;
    const existing = grouped.get(key);
    if (existing) existing.fields.push(span.field);
    else
      grouped.set(key, {
        start: span.start,
        end: span.end,
        fields: [span.field],
      });
  }

  const ranges = [...grouped.values()].sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start < cursor) continue;
    if (range.start > cursor) {
      segments.push({
        text: prompt.slice(cursor, range.start),
        fields: [],
        key: `plain-${cursor}`,
      });
    }
    segments.push({
      text: prompt.slice(range.start, range.end),
      fields: range.fields,
      key: `match-${range.start}-${range.end}`,
    });
    cursor = range.end;
  }

  if (cursor < prompt.length) {
    segments.push({
      text: prompt.slice(cursor),
      fields: [],
      key: `plain-${cursor}`,
    });
  }
  return segments;
}

export function ParseBreakdown() {
  const prompt = useAppStore((s) => s.prompt);
  const spans = useAppStore((s) => s.spans);
  const filters = useAppStore((s) => s.filters);
  const edited = useAppStore((s) => s.edited);
  const setFilter = useAppStore((s) => s.setFilter);
  const removeFilter = useAppStore((s) => s.removeFilter);
  const clearFilters = useAppStore((s) => s.clearFilters);

  const [activeField, setActiveField] = useState<Field | null>(null);
  const [connectors, setConnectors] = useState<Connector[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const markRefs = useRef(new Map<Field, HTMLElement>());
  const chipRefs = useRef(new Map<Field, HTMLElement>());

  const segments = useMemo(() => toSegments(prompt, spans), [prompt, spans]);
  const fields = useMemo(
    () => orderedFilterFields({ filters, spans }),
    [filters, spans],
  );
  const linkedFields = useMemo(
    () => new Set(spans.map((span) => span.field)),
    [spans],
  );

  const registerMark = useCallback((field: Field, el: HTMLElement | null) => {
    if (el) markRefs.current.set(field, el);
    else markRefs.current.delete(field);
  }, []);

  const registerChip = useCallback((field: Field, el: HTMLElement | null) => {
    if (el) chipRefs.current.set(field, el);
    else chipRefs.current.delete(field);
  }, []);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const base = container.getBoundingClientRect();
    const next: Connector[] = [];

    for (const field of fields) {
      const mark = markRefs.current.get(field);
      const chip = chipRefs.current.get(field);
      if (!mark || !chip) continue;

      // A highlighted phrase can wrap across two lines; its bounding box then
      // covers both, and anchoring to the middle of that box puts the line's
      // tail in the wrong place. The last client rect is the fragment the
      // connector should actually leave from.
      const rects = mark.getClientRects();
      const from =
        rects.length > 0
          ? rects[rects.length - 1]
          : mark.getBoundingClientRect();
      const to = chip.getBoundingClientRect();
      const x1 = from.left + from.width / 2 - base.left;
      const y1 = from.bottom - base.top + 1;
      const x2 = to.left + Math.min(28, to.width / 2) - base.left;
      const y2 = to.top - base.top - 1;
      if (y2 <= y1) continue;

      const lift = Math.max(14, (y2 - y1) * 0.55);
      next.push({
        key: field,
        field,
        path: `M ${x1} ${y1} C ${x1} ${y1 + lift}, ${x2} ${y2 - lift}, ${x2} ${y2}`,
        stroke: fieldMeta(field).tone.stroke,
        dashed: edited.includes(field),
      });
    }

    setConnectors((current) =>
      current.length === next.length &&
      current.every(
        (c, i) =>
          c.path === next[i]?.path &&
          c.key === next[i]?.key &&
          c.dashed === next[i]?.dashed,
      )
        ? current
        : next,
    );
  }, [fields, edited]);

  useLayoutEffect(() => {
    measure();
  }, [measure, segments, filters]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  if (prompt === "" && fields.length === 0) return null;

  const matchedPhrases = new Set(
    spans.map((span) => `${span.start}-${span.end}`),
  ).size;

  // Note: no `overflow-hidden` on the panel — a chip's editor popover opens
  // below the rail and would be clipped by the panel edge.
  return (
    <section
      ref={containerRef}
      className="relative rounded-3xl border border-paper-300 bg-white/70 p-5 shadow-card backdrop-blur-sm sm:p-7"
      aria-label="How the prompt was parsed"
    >
      <header className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-display text-lg font-semibold text-ink-900">
          What the parser understood
        </h2>
        <p className="text-xs text-ink-400">
          {matchedPhrases === 0
            ? "no phrases matched"
            : `${matchedPhrases} phrase${matchedPhrases === 1 ? "" : "s"} → ${fields.length} filter${fields.length === 1 ? "" : "s"}`}
        </p>
        {fields.length > 0 ? (
          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto text-xs font-medium text-ink-400 underline-offset-4 transition hover:text-ink-800 hover:underline"
          >
            Clear all filters
          </button>
        ) : null}
      </header>

      {/* Connector layer. Behind the text and chips, never interactive. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {connectors.map((connector) => {
          const dim = activeField !== null && activeField !== connector.field;
          return (
            <path
              key={connector.key}
              d={connector.path}
              fill="none"
              stroke={connector.stroke}
              strokeWidth={activeField === connector.field ? 2.4 : 1.5}
              strokeLinecap="round"
              strokeDasharray={connector.dashed ? "4 4" : undefined}
              opacity={dim ? 0.2 : activeField === connector.field ? 1 : 0.65}
              style={{ transition: "opacity 150ms, stroke-width 150ms" }}
            />
          );
        })}
      </svg>

      <p className="relative font-display text-xl leading-[2.1] text-ink-700 sm:text-2xl sm:leading-[2.2]">
        {prompt === "" ? (
          <span className="text-ink-400 italic">
            No prompt yet. The filters below were set by hand.
          </span>
        ) : (
          segments.map((segment) =>
            segment.fields.length === 0 ? (
              <span key={segment.key}>{segment.text}</span>
            ) : (
              <Mark
                key={segment.key}
                segment={segment}
                activeField={activeField}
                onHover={setActiveField}
                registerMark={registerMark}
              />
            ),
          )
        )}
      </p>

      {/* Room for the connectors to arc through. */}
      <div aria-hidden="true" className="h-12 sm:h-14" />

      {fields.length === 0 ? (
        <p className="relative rounded-2xl border border-dashed border-paper-300 bg-paper-100/70 px-4 py-3 text-sm text-ink-500">
          Nothing in that prompt mapped to a filter, so every listing is
          showing. Try an example prompt above, or mention a county, budget,
          beds, BER, an outbuilding, fibre or a price drop.
        </p>
      ) : (
        <div className="relative flex flex-wrap gap-2">
          {fields.map((field) => (
            <FilterChip
              key={field}
              field={field}
              value={filters[field] as NonNullable<DemoFilters[Field]>}
              edited={edited.includes(field)}
              linked={linkedFields.has(field)}
              active={activeField === field}
              onHover={setActiveField}
              onChange={(target, value) => setFilter(target, value)}
              onRemove={removeFilter}
              registerRef={registerChip}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface MarkProps {
  segment: Segment;
  activeField: Field | null;
  onHover: (field: Field | null) => void;
  registerMark: (field: Field, el: HTMLElement | null) => void;
}

function Mark({ segment, activeField, onHover, registerMark }: MarkProps) {
  const primary = segment.fields[0];
  const meta = fieldMeta(primary);
  const active = segment.fields.includes(activeField as Field);

  return (
    <span
      ref={(el) => {
        for (const field of segment.fields) registerMark(field, el);
      }}
      onMouseEnter={() => onHover(primary)}
      onMouseLeave={() => onHover(null)}
      className={[
        "relative -mx-0.5 rounded-md px-1.5 py-0.5 underline decoration-2 underline-offset-4 transition",
        meta.tone.mark,
        active ? "ring-2 ring-ink-900/15" : "",
      ].join(" ")}
      title={segment.fields.map((field) => fieldMeta(field).group).join(" + ")}
    >
      {segment.text}
    </span>
  );
}
