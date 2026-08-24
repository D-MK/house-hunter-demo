/**
 * Detail-modal tests, driven through the results grid rather than by rendering
 * the modal directly — the thing worth protecting is the whole gesture: click a
 * card, get *that* card's house, read all of it, get back out again.
 *
 * The map is stubbed out. It's lazy-loaded Leaflet against a live tile server,
 * it has nothing to do with the modal, and jsdom has no layout for it to
 * measure.
 */

import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResultsSection } from "@/components/ResultsSection";
import { similarListings } from "@/lib/detail";
import type { DemoListing } from "@/lib/types";
import { LISTINGS, useAppStore } from "@/store/app";

vi.mock("@/components/MapPanel", () => ({ MapPanel: () => null }));

/** Nine Dublin semis, none of them reduced. */
const PROMPT = "3-bed semi-detached in Dublin under €600k";
/** Two Cork houses, both with a price drop. */
const REDUCED_PROMPT = "reduced 3-bed houses in Cork";

function results(): DemoListing[] {
  return useAppStore.getState().results;
}

function cardTriggers(): HTMLElement[] {
  return screen.getAllByRole("button", { name: /^View details for/ });
}

beforeEach(() => {
  useAppStore.getState().reset();
});

afterEach(() => {
  cleanup();
});

describe("listing detail modal", () => {
  it("opens on a card click and shows that listing's full description", async () => {
    const user = userEvent.setup();
    useAppStore.getState().submitPrompt(PROMPT);
    const listing = results()[0] as DemoListing;
    render(<ResultsSection />);

    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(cardTriggers()[0] as HTMLElement);

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: listing.address }),
    ).toBeTruthy();
    // The card truncates the blurb with `line-clamp-2`; the modal is where the
    // whole thing is readable.
    expect(listing.description.length).toBeGreaterThan(200);
    expect(within(dialog).getByText(listing.description)).toBeTruthy();
  });

  it("opens the listing that was clicked, not just the first one", async () => {
    const user = userEvent.setup();
    useAppStore.getState().submitPrompt(PROMPT);
    const second = results()[1] as DemoListing;
    render(<ResultsSection />);

    await user.click(cardTriggers()[1] as HTMLElement);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(second.description)).toBeTruthy();
    expect(useAppStore.getState().selected?.id).toBe(second.id);
  });

  it("lists why the listing matched the active filters", async () => {
    const user = userEvent.setup();
    useAppStore.getState().submitPrompt(PROMPT);
    const listing = results()[0] as DemoListing;
    render(<ResultsSection />);

    await user.click(cardTriggers()[0] as HTMLElement);
    const dialog = await screen.findByRole("dialog");
    const why = within(dialog).getByRole("region", {
      name: "Why this listing matched",
    });

    expect(within(why).getByText("Budget")).toBeTruthy();
    expect(
      within(why).getByText(
        `€${listing.price_eur.toLocaleString("en-IE")} — under your €600,000 budget`,
      ),
    ).toBeTruthy();
    expect(within(why).getByText("3 beds — you asked for 3+")).toBeTruthy();
    expect(within(why).getByText("Semi-D")).toBeTruthy();
  });

  it("explains itself when nothing is filtered", async () => {
    const user = userEvent.setup();
    render(<ResultsSection />);

    await user.click(cardTriggers()[0] as HTMLElement);
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByText(/No filters are active/)).toBeTruthy();
  });

  it("charts the price history of a reduced listing", async () => {
    const user = userEvent.setup();
    useAppStore.getState().submitPrompt(REDUCED_PROMPT);
    const listing = results()[0] as DemoListing;
    expect(listing.price_drop).toBe(true);
    render(<ResultsSection />);

    await user.click(cardTriggers()[0] as HTMLElement);
    const dialog = await screen.findByRole("dialog");
    const history = within(dialog).getByRole("region", {
      name: "Price history",
    });

    // Every point in the series is listed, starting at the original price the
    // blurb names and ending at the current asking price.
    expect(listing.description).toContain("reduced from €285,000");
    expect(within(history).getByText("€285,000")).toBeTruthy();
    expect(within(history).getByText("€261,000")).toBeTruthy();
    expect(within(history).getByText("€250,000")).toBeTruthy();
    expect(within(history).getByText("−12%")).toBeTruthy();
  });

  it("shows no price history for a listing that never dropped", async () => {
    const user = userEvent.setup();
    useAppStore.getState().submitPrompt(PROMPT);
    expect((results()[0] as DemoListing).price_drop).toBe(false);
    render(<ResultsSection />);

    await user.click(cardTriggers()[0] as HTMLElement);
    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).queryByRole("region", { name: "Price history" }),
    ).toBeNull();
  });

  it("offers similar listings and re-opens the modal on the one clicked", async () => {
    const user = userEvent.setup();
    useAppStore.getState().submitPrompt(PROMPT);
    const listing = results()[0] as DemoListing;
    const expected = similarListings(LISTINGS, listing, 3);
    expect(expected.length).toBeGreaterThan(0);
    render(<ResultsSection />);

    await user.click(cardTriggers()[0] as HTMLElement);
    const similar = within(await screen.findByRole("dialog")).getByRole(
      "region",
      { name: "Similar listings" },
    );
    const options = within(similar).getAllByRole("button");
    expect(options).toHaveLength(expected.length);

    await user.click(options[0] as HTMLElement);

    expect(useAppStore.getState().selected?.id).toBe(expected[0]?.id);
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText((expected[0] as DemoListing).description),
    ).toBeTruthy();
  });

  it("closes on the X button and returns focus to the card", async () => {
    const user = userEvent.setup();
    useAppStore.getState().submitPrompt(PROMPT);
    render(<ResultsSection />);

    const trigger = cardTriggers()[0] as HTMLElement;
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog");

    await user.click(
      within(dialog).getByRole("button", { name: "Close listing details" }),
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(useAppStore.getState().selected).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    useAppStore.getState().submitPrompt(PROMPT);
    render(<ResultsSection />);

    await user.click(cardTriggers()[0] as HTMLElement);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(useAppStore.getState().selected).toBeNull();
  });

  it("moves focus into the modal when it opens", async () => {
    const user = userEvent.setup();
    useAppStore.getState().submitPrompt(PROMPT);
    render(<ResultsSection />);

    await user.click(cardTriggers()[0] as HTMLElement);
    const dialog = await screen.findByRole("dialog");

    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(
      within(dialog).getByRole("button", { name: "Close listing details" }),
    );
  });

  it("is labelled as a modal dialog", async () => {
    const user = userEvent.setup();
    useAppStore.getState().submitPrompt(PROMPT);
    const listing = results()[0] as DemoListing;
    render(<ResultsSection />);

    await user.click(cardTriggers()[0] as HTMLElement);
    const dialog = await screen.findByRole("dialog");

    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const labelId = dialog.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId as string)?.textContent).toBe(
      listing.address,
    );
  });

  it("closes itself when a new search runs underneath it", async () => {
    const user = userEvent.setup();
    useAppStore.getState().submitPrompt(PROMPT);
    render(<ResultsSection />);

    await user.click(cardTriggers()[0] as HTMLElement);
    await screen.findByRole("dialog");

    act(() => {
      useAppStore.getState().submitPrompt(REDUCED_PROMPT);
    });

    expect(useAppStore.getState().selected).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
