/**
 * The prompt input and the curated example chips.
 *
 * The input is controlled by the store's `draft`; nothing is parsed until
 * submit, so the breakdown below doesn't flicker on every keystroke. Example
 * chips fill the box *and* run, because a chip that only types for you needs a
 * second click to do anything and reads as broken in a demo.
 */

import { EXAMPLE_PROMPTS } from "@/data/examples";
import { useAppStore } from "@/store/app";

export function PromptBox() {
  const draft = useAppStore((s) => s.draft);
  const prompt = useAppStore((s) => s.prompt);
  const setDraft = useAppStore((s) => s.setDraft);
  const submitPrompt = useAppStore((s) => s.submitPrompt);
  const reset = useAppStore((s) => s.reset);

  return (
    <section className="rounded-3xl border border-paper-300 bg-white/80 p-5 shadow-card backdrop-blur-sm sm:p-7">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitPrompt();
        }}
        className="group flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <label htmlFor="prompt" className="sr-only">
          Describe the house you are looking for
        </label>

        <div className="relative flex-1">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-400"
          >
            <SearchIcon />
          </span>
          <input
            id="prompt"
            name="prompt"
            type="text"
            value={draft}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="e.g. 3-bed semi-detached in Dublin under €600k with fibre"
            className="w-full rounded-2xl border border-paper-300 bg-paper-50 py-3.5 pr-4 pl-11 text-[15px] text-ink-900 transition outline-none placeholder:text-ink-400/80 focus:border-ink-600 focus:bg-white focus:ring-4 focus:ring-ink-900/10"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-ink-900 px-6 py-3.5 text-sm font-semibold text-paper-50 transition hover:bg-ink-800 active:translate-y-px sm:flex-none"
          >
            Search
            <span aria-hidden="true">→</span>
          </button>
          {prompt !== "" || draft !== "" ? (
            <button
              type="button"
              onClick={reset}
              className="rounded-2xl border border-paper-300 px-4 py-3.5 text-sm font-medium text-ink-500 transition hover:border-ink-400 hover:text-ink-800"
            >
              Clear
            </button>
          ) : null}
        </div>
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] font-semibold tracking-[0.14em] text-ink-400 uppercase">
          Try one
        </span>
        {EXAMPLE_PROMPTS.map((example) => {
          const active = prompt === example.prompt;
          return (
            <button
              key={example.id}
              type="button"
              title={example.prompt}
              onClick={() => submitPrompt(example.prompt)}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "border-ink-900 bg-ink-900 text-paper-50"
                  : "border-paper-300 bg-paper-100 text-ink-600 hover:border-ink-400 hover:bg-white hover:text-ink-900",
              ].join(" ")}
            >
              {example.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-[18px]" aria-hidden="true">
      <circle
        cx="9"
        cy="9"
        r="5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m13.5 13.5 3.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
