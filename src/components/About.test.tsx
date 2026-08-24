/**
 * About-overlay tests, driven through the trigger button the way a visitor
 * would reach it: click "About", read the story and the pipeline steps, get
 * back out again with focus where it started.
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { About } from "@/components/About";
import { SiteHeader } from "@/components/SiteHeader";
import {
  ABOUT_CLOSING,
  ABOUT_MOTIVATION,
  ABOUT_TITLE,
  PROCESS_STEPS,
} from "@/content/about";

function trigger(): HTMLElement {
  return screen.getByRole("button", { name: "About" });
}

afterEach(() => {
  cleanup();
});

describe("about overlay", () => {
  it("is reachable from a visible nav button in the site header", () => {
    render(<SiteHeader />);
    expect(trigger()).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens on click and shows the motivation, every step, and the closing pointer", async () => {
    const user = userEvent.setup();
    render(<About />);

    await user.click(trigger());
    const dialog = await screen.findByRole("dialog");

    for (const paragraph of ABOUT_MOTIVATION) {
      expect(within(dialog).getByText(paragraph)).toBeTruthy();
    }
    expect(PROCESS_STEPS.length).toBeGreaterThanOrEqual(4);
    for (const step of PROCESS_STEPS) {
      expect(within(dialog).getByText(step.label)).toBeTruthy();
      expect(within(dialog).getByText(step.detail)).toBeTruthy();
    }
    expect(within(dialog).getByText(ABOUT_CLOSING)).toBeTruthy();
  });

  it("renders the pipeline as an ordered list of steps", async () => {
    const user = userEvent.setup();
    render(<About />);

    await user.click(trigger());
    const dialog = await screen.findByRole("dialog");
    const steps = within(dialog).getByRole("list");

    expect(within(steps).getAllByRole("listitem")).toHaveLength(
      PROCESS_STEPS.length,
    );
  });

  it("is labelled as a modal dialog by the page title", async () => {
    const user = userEvent.setup();
    render(<About />);

    await user.click(trigger());
    const dialog = await screen.findByRole("dialog");

    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const labelId = dialog.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId as string)?.textContent).toBe(
      ABOUT_TITLE,
    );
  });

  it("moves focus into the dialog when it opens", async () => {
    const user = userEvent.setup();
    render(<About />);

    await user.click(trigger());
    const dialog = await screen.findByRole("dialog");

    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(
      within(dialog).getByRole("button", { name: "Close about dialog" }),
    );
  });

  it("closes on Escape and returns focus to the nav button", async () => {
    const user = userEvent.setup();
    render(<About />);

    await user.click(trigger());
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it("closes on the X button and returns focus to the nav button", async () => {
    const user = userEvent.setup();
    render(<About />);

    await user.click(trigger());
    const dialog = await screen.findByRole("dialog");

    await user.click(
      within(dialog).getByRole("button", { name: "Close about dialog" }),
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });
});
