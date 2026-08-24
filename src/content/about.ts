/**
 * Copy for the About overlay, kept as data so the words can be reviewed and
 * edited without touching the component that lays them out.
 *
 * The copy is deliberate — treat edits here as a content change, not a
 * refactor. The Phase 7 spec caps this file's total word count, so keep it
 * tight: the friendly front door lives here, the technical deep-dive lives in
 * ARCHITECTURE.md and should not be re-explained.
 */

/** One stage of the prompt → results pipeline, for the infographic. */
export interface ProcessStep {
  /** Short step name. */
  label: string;
  /** One-line caption under the label. */
  detail: string;
  /** Repo-relative path to the source file that implements this step. */
  sourcePath: string;
}

export const ABOUT_TITLE = "User generated filters";

/** First-person origin story, one paragraph per entry. */
export const ABOUT_MOTIVATION: string[] = [
  "I was searching for a house with an outbuilding I could use as a home office. No Irish property portal exposes that as a filter — Daft and MyHome stop at county, price, beds and BER. Structural details like outbuildings only appear in the free-text listing description.",
  "This demo tests one approach: accept a plain-English description of the house, parse it into structured filters, and run those filters against the dataset.",
];

export const HOW_IT_WORKS_TITLE = "How it works";

/** The pipeline, in order. Rendered as the step-sequence infographic. */
export const PROCESS_STEPS: ProcessStep[] = [
  {
    label: "Prompt",
    detail: "County, budget, beds — plus criteria no form covers.",
    sourcePath: "src/components/PromptBox.tsx",
  },
  {
    label: "Parse",
    detail: "Each phrase maps to a filter, traced to its source words.",
    sourcePath: "src/lib/parse.ts",
  },
  {
    label: "Query",
    detail: "Filters run against 300 listings, client-side.",
    sourcePath: "src/lib/search.ts",
  },
  {
    label: "Results",
    detail: "Cards and map pins, each showing why it matched.",
    sourcePath: "src/components/ResultsSection.tsx",
  },
];

/** Pointer to the deeper technical writeup — kept to one line on purpose. */
export const ABOUT_CLOSING =
  "ARCHITECTURE.md in this repo covers the technical detail, including how a production version would differ from this demo.";
