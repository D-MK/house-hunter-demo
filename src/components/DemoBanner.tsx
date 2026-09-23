/**
 * The honesty disclosure.
 *
 * This banner is permanent by design: the info panel collapses, the one-line
 * statement does not, and there is no "never show again" that takes it out of
 * the DOM. Anyone looking at this demo should be able to tell within one line
 * that no LLM is being called, without reading the README first.
 *
 * The copy is deliberate and reviewed — treat edits to it as a content change,
 * not a styling tweak.
 */

import { useId, useState } from "react";

export function DemoBanner() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <aside
      aria-label="Demo mode notice"
      className="border-b border-ink-800/60 bg-ink-900 text-paper-100"
    >
      <div className="mx-auto max-w-6xl px-5 py-2.5 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gorse-400 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-ink-950 uppercase">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-ink-950"
            />
            Demo mode
          </span>

          <p className="text-sm text-paper-200">
            Prompts are parsed by a local rule-based parser, not a live LLM.
          </p>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={panelId}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-paper-100/25 px-3 py-1 text-xs font-medium text-paper-100 transition hover:border-gorse-400 hover:text-gorse-300"
          >
            <span
              aria-hidden="true"
              className="grid size-4 place-items-center rounded-full border border-current text-[10px] font-bold"
            >
              i
            </span>
            {open ? "Hide details" : "Why?"}
          </button>
        </div>

        {open ? (
          <div
            id={panelId}
            className="mt-3 grid gap-3 border-t border-paper-100/15 pt-3 text-sm leading-relaxed text-paper-200 sm:grid-cols-2"
          >
            <p>
              This is a static site on GitHub Pages. There is no backend to hold
              an LLM API key, so a deterministic local parser simulates the LLM
              structured-output step.
            </p>
            <p>
              A production version would call a real LLM through a server-side
              gateway. Same contract (prompt in, structured filters out), same
              downstream search; only the parsing step differs.
            </p>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
