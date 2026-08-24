/**
 * The About overlay: why the demo exists and a step-sequence infographic of
 * the prompt → filters → results pipeline.
 *
 * An in-page modal, not a route — the same deliberate choice as the listing
 * detail view (see ARCHITECTURE.md), and the same dialog conventions: backdrop,
 * Escape to close, Tab cycled within the panel, focus moved in on open and
 * handed back to the trigger on close. The trigger and the dialog live in one
 * component so that hand-back is trivial.
 *
 * All copy comes from `src/content/about.ts` and is rendered as React text
 * nodes; the infographic is inline SVG only. Nothing here fetches anything.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ABOUT_CLOSING,
  ABOUT_MOTIVATION,
  ABOUT_TITLE,
  HOW_IT_WORKS_TITLE,
  PROCESS_STEPS,
} from "@/content/about";
import type { ProcessStep } from "@/content/about";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** The header's "About" button plus the overlay it opens. */
export function About() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-paper-300 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-ink-700 transition hover:border-ink-900 hover:text-ink-900"
      >
        About
      </button>
      {open ? <AboutDialog onClose={close} /> : null}
    </>
  );
}

function AboutDialog({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = "about-dialog-title";

  // Opening the dialog moves focus into it, so the next Tab lands on the
  // panel's own controls rather than back in the header behind it.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Escape always closes; Tab cycles within the panel while it's open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (panel === null) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (focusable.length === 0) return;

      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Stop the page scrolling away behind the dialog.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      {/* Backdrop. Click-to-close is a convenience on top of the close button
          and Escape, so it carries no keyboard role of its own. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-3xl border border-paper-300 bg-paper-50 shadow-lift sm:max-h-[88vh] sm:rounded-3xl"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close about dialog"
          className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full bg-paper-100 text-ink-700 shadow-card transition hover:bg-white hover:text-ink-900"
        >
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>

        <div className="flex flex-col gap-7 p-6 sm:p-8">
          <header className="flex flex-col gap-2 pr-10">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
              About this demo
            </p>
            <h2
              id={titleId}
              className="font-display text-2xl font-semibold tracking-tight text-ink-900 text-balance sm:text-3xl"
            >
              {ABOUT_TITLE}
            </h2>
          </header>

          <div className="flex flex-col gap-3">
            {ABOUT_MOTIVATION.map((paragraph) => (
              <p
                key={paragraph}
                className="text-[15px] leading-relaxed text-ink-700"
              >
                {paragraph}
              </p>
            ))}
          </div>

          <section aria-label={HOW_IT_WORKS_TITLE}>
            <h3 className="text-[11px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
              {HOW_IT_WORKS_TITLE}
            </h3>
            <ol className="mt-4 grid gap-6 sm:grid-cols-4 sm:gap-3">
              {PROCESS_STEPS.map((step, index) => (
                <StepItem
                  key={step.label}
                  step={step}
                  index={index}
                  last={index === PROCESS_STEPS.length - 1}
                />
              ))}
            </ol>
          </section>

          <p className="border-t border-paper-300 pt-4 text-xs leading-relaxed text-ink-500">
            {ABOUT_CLOSING}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * One node of the infographic. Vertical timeline on mobile (icon rail on the
 * left, connector dropping to the next node), horizontal pipeline on sm+
 * (connector running to the next node, tipped with an arrowhead).
 */
function StepItem({
  step,
  index,
  last,
}: {
  step: ProcessStep;
  index: number;
  last: boolean;
}) {
  return (
    <li className="relative flex items-start gap-3.5 sm:flex-col sm:gap-3">
      {!last ? (
        <>
          {/* Mobile: vertical connector from below this icon to the next. */}
          <span
            aria-hidden="true"
            className="absolute top-11 -bottom-5 left-5 w-px bg-paper-300 sm:hidden"
          />
          {/* Desktop: horizontal connector, tipped with an arrowhead. */}
          <span
            aria-hidden="true"
            className="absolute top-5 right-2.5 left-12 hidden h-px bg-paper-300 sm:block"
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 8 10"
            className="absolute top-5 right-0.5 hidden h-2.5 w-2 -translate-y-1/2 text-paper-300 sm:block"
            fill="currentColor"
          >
            <path d="M0 0l8 5-8 5z" />
          </svg>
        </>
      ) : null}

      <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-ink-900 text-gorse-400 shadow-card">
        <StepGlyph index={index} />
      </span>

      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-ink-400 uppercase">
          Step {index + 1}
        </p>
        <p className="font-display text-base font-semibold text-ink-900">
          {step.label}
        </p>
        <p className="mt-1 text-[13px] leading-snug text-ink-600">
          {step.detail}
        </p>
      </div>
    </li>
  );
}

/** Inline pictograms, one per pipeline stage — gorse strokes on the ink tile,
 *  echoing the brand mark. Decorative; the step text carries the meaning. */
function StepGlyph({ index }: { index: number }) {
  const shared = {
    viewBox: "0 0 20 20",
    className: "h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  switch (index) {
    case 0:
      // Terminal caret: the prompt.
      return (
        <svg aria-hidden="true" {...shared}>
          <path d="M4 6l4 4-4 4" />
          <path d="M11 14.5h5" />
        </svg>
      );
    case 1:
      // Two filter chips: the parse.
      return (
        <svg aria-hidden="true" {...shared}>
          <rect x="2.5" y="4.5" width="9.5" height="4.5" rx="2.25" />
          <rect x="8" y="11" width="9.5" height="4.5" rx="2.25" />
        </svg>
      );
    case 2:
      // Magnifier: the search over the dataset.
      return (
        <svg aria-hidden="true" {...shared}>
          <circle cx="8.5" cy="8.5" r="4.75" />
          <path d="M12.2 12.2l4.3 4.3" />
        </svg>
      );
    default:
      // Map pin: results on the map.
      return (
        <svg aria-hidden="true" {...shared}>
          <path d="M10 17.5c3.6-3.5 5.4-6.3 5.4-8.6a5.4 5.4 0 1 0-10.8 0c0 2.3 1.8 5.1 5.4 8.6z" />
          <circle cx="10" cy="8.8" r="1.8" />
        </svg>
      );
  }
}
