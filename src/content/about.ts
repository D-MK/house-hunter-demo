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
}

export const ABOUT_TITLE = "The filter that doesn't exist";

/** First-person origin story, one paragraph per entry. */
export const ABOUT_MOTIVATION: string[] = [
  "This started with a real search. I wanted a house with an outbuilding — somewhere to work from — and found that no property portal can filter for one. The forms stop at county, price, beds and BER; a garage, room for a garden office, or fibre at the door only ever live in the listing's blurb.",
  "So this demo tries the obvious fix: describe the house you actually want in plain English, and let the words become the structured filters a normal search form never offers.",
];

export const HOW_IT_WORKS_TITLE = "How it works";

/** The pipeline, in order. Rendered as the step-sequence infographic. */
export const PROCESS_STEPS: ProcessStep[] = [
  {
    label: "Write the brief",
    detail:
      "One plain-English sentence: county, budget, beds — and the awkward stuff, like an outbuilding or room for an office pod.",
  },
  {
    label: "Words become filters",
    detail:
      "A parser turns each phrase into a structured filter and highlights exactly which words it read.",
  },
  {
    label: "Filters run the search",
    detail:
      "Those filters query 300 synthetic Irish listings right in the browser — the query a normal search form could never build.",
  },
  {
    label: "Results land on a map",
    detail:
      "Matching homes appear as cards and map pins, and every one can explain why it matched.",
  },
];

/** Pointer to the deeper technical writeup — kept to one line on purpose. */
export const ABOUT_CLOSING =
  "Curious why the parsing is simulated rather than a live LLM call, and how the real version would work? The technical deep-dive is in ARCHITECTURE.md in this repo.";
