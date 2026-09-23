/**
 * One filter, as an editable chip.
 *
 * The chip is the interactive half of the parse breakdown: clicking the label
 * opens a small editor for that field's value, the × removes the filter
 * entirely. Both paths go through the store, which re-runs `search()` — the
 * chip itself never filters anything.
 *
 * The editor shape comes from `fieldMeta(field).editor`, so adding a filter
 * field to the parser needs no new component here.
 */

import { useEffect, useRef, useState } from "react";
import { chipLabel, fieldMeta } from "@/lib/field-meta";
import type { DemoFilters } from "@/lib/types";

type Field = keyof DemoFilters;

interface FilterChipProps {
  field: Field;
  value: NonNullable<DemoFilters[Field]>;
  /** Value has been hand-edited since it was parsed. */
  edited: boolean;
  /** A phrase in the prompt produced this filter (so a connector is drawn). */
  linked: boolean;
  active: boolean;
  onHover: (field: Field | null) => void;
  onChange: (field: Field, value: string | number | boolean) => void;
  onRemove: (field: Field) => void;
  registerRef: (field: Field, el: HTMLElement | null) => void;
}

export function FilterChip({
  field,
  value,
  edited,
  linked,
  active,
  onHover,
  onChange,
  onRemove,
  registerRef,
}: FilterChipProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const meta = fieldMeta(field);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const editable = meta.editor.kind !== "none";

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={() => onHover(field)}
      onMouseLeave={() => onHover(null)}
    >
      <span
        ref={(el) => {
          registerRef(field, el);
        }}
        className={[
          "inline-flex items-center gap-2 rounded-full border py-1.5 pr-1.5 pl-3 text-sm font-medium shadow-sm transition",
          meta.tone.chip,
          active ? "-translate-y-0.5 ring-2 ring-ink-900/15" : "",
          linked ? "" : "border-dashed",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className={`size-2 shrink-0 rounded-full ${meta.tone.dot}`}
        />

        <button
          type="button"
          disabled={!editable}
          onFocus={() => onHover(field)}
          onBlur={() => onHover(null)}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={editable ? open : undefined}
          title={editable ? `Edit ${meta.group.toLowerCase()}` : meta.group}
          className="inline-flex items-center gap-1.5 rounded-full text-left disabled:cursor-default"
        >
          {chipLabel(field, value)}
          {edited ? (
            <span className="rounded-full bg-white/70 px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase opacity-80">
              edited
            </span>
          ) : null}
          {editable ? (
            <span aria-hidden="true" className="text-[10px] opacity-60">
              ▾
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => onRemove(field)}
          aria-label={`Remove ${meta.group.toLowerCase()} filter`}
          className="grid size-5 shrink-0 place-items-center rounded-full text-current transition hover:bg-white/80 hover:text-ink-900"
        >
          <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden="true">
            <path
              d="M1 1 9 9M9 1 1 9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </span>

      {open && editable ? (
        <div className="absolute top-full left-0 z-20 mt-2 w-60 rounded-2xl border border-paper-300 bg-white p-3 shadow-lift">
          <p className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-ink-400 uppercase">
            {meta.group}
          </p>
          <ChipEditor
            field={field}
            value={value}
            onChange={(next) => onChange(field, next)}
            onDone={() => setOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}

interface ChipEditorProps {
  field: Field;
  value: unknown;
  onChange: (value: string | number | boolean) => void;
  onDone: () => void;
}

function ChipEditor({ field, value, onChange, onDone }: ChipEditorProps) {
  const editor = fieldMeta(field).editor;

  if (editor.kind === "number") {
    const current = Number(value);
    const clamp = (next: number) =>
      Math.min(editor.max, Math.max(editor.min, next));
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Decrease"
          onClick={() => onChange(clamp(current - editor.step))}
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-paper-300 text-ink-600 transition hover:border-ink-400 hover:text-ink-900"
        >
          −
        </button>
        <input
          type="number"
          value={current}
          min={editor.min}
          max={editor.max}
          step={editor.step}
          aria-label={fieldMeta(field).group}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(clamp(next));
          }}
          className="w-full min-w-0 rounded-lg border border-paper-300 px-2 py-1.5 text-sm tabular-nums outline-none focus:border-ink-600"
        />
        <button
          type="button"
          aria-label="Increase"
          onClick={() => onChange(clamp(current + editor.step))}
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-paper-300 text-ink-600 transition hover:border-ink-400 hover:text-ink-900"
        >
          +
        </button>
      </div>
    );
  }

  if (editor.kind === "select") {
    return (
      <select
        value={String(value)}
        aria-label={fieldMeta(field).group}
        onChange={(event) => {
          onChange(event.target.value);
          onDone();
        }}
        className="w-full rounded-lg border border-paper-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-ink-600"
      >
        {editor.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (editor.kind === "boolean") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[true, false].map((option) => (
          <button
            key={String(option)}
            type="button"
            onClick={() => {
              onChange(option);
              onDone();
            }}
            className={[
              "rounded-lg border px-2 py-1.5 text-sm font-medium transition",
              value === option
                ? "border-ink-900 bg-ink-900 text-paper-50"
                : "border-paper-300 text-ink-600 hover:border-ink-400",
            ].join(" ")}
          >
            {option ? "Must have" : "Must not"}
          </button>
        ))}
      </div>
    );
  }

  if (editor.kind === "text") {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onDone();
        }}
      >
        <input
          type="text"
          defaultValue={String(value)}
          placeholder={editor.placeholder}
          aria-label={fieldMeta(field).group}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-paper-300 px-2 py-1.5 text-sm outline-none focus:border-ink-600"
        />
      </form>
    );
  }

  return null;
}
