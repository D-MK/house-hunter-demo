/**
 * Sticky brand bar. Purely chrome — no state, no navigation (single view by
 * design, so there is nothing to route to).
 */

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-paper-300/70 bg-paper-50/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3 sm:px-8">
        <BrandMark />
        <div className="leading-tight">
          <p className="font-display text-lg font-semibold tracking-tight text-ink-900">
            House Hunter
          </p>
          <p className="text-[11px] tracking-[0.14em] text-ink-400 uppercase">
            Natural-language property search
          </p>
        </div>
        <p className="ml-auto hidden text-xs text-ink-500 sm:block">
          300 synthetic listings · 26 counties
        </p>
      </div>
    </header>
  );
}

function BrandMark() {
  return (
    <svg
      viewBox="0 0 40 40"
      className="size-9 shrink-0"
      role="img"
      aria-label="House Hunter"
    >
      <rect width="40" height="40" rx="11" fill="var(--color-ink-900)" />
      <path
        d="M9 21.5 20 12l11 9.5"
        fill="none"
        stroke="var(--color-gorse-400)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 21v8.5h15V21"
        fill="none"
        stroke="var(--color-paper-100)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24.5" cy="25" r="1.6" fill="var(--color-gorse-400)" />
    </svg>
  );
}
