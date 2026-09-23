/**
 * Curated example prompts.
 *
 * These are the one-click prompts offered under the search box, so every one of
 * them has to return a useful number of results against the 300-listing demo
 * dataset — an example that lands on an empty state makes the whole demo look
 * broken. `npm run validate-examples` (and the dataset generator's own final
 * check) enforces a floor of 5 results per prompt, so a dataset regeneration
 * can never silently strand one of these.
 *
 * The set is chosen to cover the parser's full pattern range between them:
 * county, price (under / between / around), beds, baths, property-type
 * synonyms, BER band, "BER doesn't matter", floor area, and the four richer
 * attributes (outbuilding, home-office pod space, fibre, price drop).
 *
 * Deliberately absent: a town-scoped prompt. Towns hold 1-4 listings each in a
 * 300-row dataset, so no realistic town prompt can clear the 5-result floor.
 * Town parsing is supported and unit-tested, just not showcased here.
 */

export interface ExamplePrompt {
  id: string;
  /** Short chip label for the UI. */
  label: string;
  /** The full prompt text typed into the search box. */
  prompt: string;
}

export const EXAMPLE_PROMPTS: readonly ExamplePrompt[] = [
  {
    id: "dublin-semi",
    label: "3-bed semi in Dublin",
    prompt: "3-bed semi-detached in Dublin under €600k",
  },
  {
    id: "apartment-ber",
    label: "Well-rated apartment",
    prompt:
      "2-bed apartment under €300k with good broadband and BER C or better",
  },
  {
    id: "meath-family",
    label: "Family home in Meath",
    prompt: "Family home in Meath, at least 4 beds and 2 bathrooms",
  },
  {
    id: "cottage-budget",
    label: "Budget cottage",
    prompt: "Cottage under €250k, BER doesn't matter",
  },
  {
    id: "detached-workshop",
    label: "Detached with a workshop",
    prompt: "4-bed detached house over 150 sqm with a workshop",
  },
  {
    id: "garden-office",
    label: "Room for a garden office",
    prompt: "Something around €300k with 3 beds and a garden office",
  },
  {
    id: "terrace-fibre",
    label: "Terrace with fibre",
    prompt: "Terraced house between €200k and €350k with fibre broadband",
  },
  {
    id: "price-drop",
    label: "Recently reduced",
    prompt: "Recently reduced 3-bed semi under €400k",
  },
];

/** Minimum results an example prompt must return to be shippable. */
export const MIN_EXAMPLE_RESULTS = 5;
