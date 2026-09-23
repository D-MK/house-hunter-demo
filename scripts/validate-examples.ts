/**
 * Gate for the curated example prompts.
 *
 * Runs every prompt in `src/data/examples.ts` through the real parser and the
 * real search against the committed dataset, and fails the build if any of them
 * returns fewer than MIN_EXAMPLE_RESULTS listings. Run with
 * `npm run validate-examples`.
 *
 * The dataset is read from disk rather than imported, so this stays a plain
 * Node script with no bundler-specific JSON import semantics.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MIN_EXAMPLE_RESULTS } from "../src/data/examples";
import { checkExamples } from "../src/lib/example-check";
import type { DemoListing } from "../src/lib/types";

function loadListings(): DemoListing[] {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = resolve(here, "..", "src", "data", "listings.json");
  return JSON.parse(readFileSync(path, "utf8")) as DemoListing[];
}

function main(): void {
  const listings = loadListings();
  const results = checkExamples(listings);
  const failures = results.filter((result) => !result.ok);

  for (const result of results) {
    const mark = result.ok ? "ok  " : "FAIL";
    console.log(
      `${mark} ${String(result.count).padStart(3)} result(s)  "${result.prompt}"`,
    );
  }

  if (failures.length > 0) {
    console.error(
      `\n${failures.length} example prompt(s) returned fewer than ${MIN_EXAMPLE_RESULTS} results:`,
    );
    for (const failure of failures) {
      console.error(`  - "${failure.prompt}" -> ${failure.count} result(s)`);
      console.error(`    filters: ${JSON.stringify(failure.filters)}`);
    }
    console.error(
      "\nLoosen the prompt or pick a more common attribute combination.",
    );
    process.exit(1);
  }

  console.log(
    `\n${results.length} example prompts checked against ${listings.length} listings — all examples validated (min ${MIN_EXAMPLE_RESULTS} results each).`,
  );
}

// Only run when invoked directly, never on import.
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
