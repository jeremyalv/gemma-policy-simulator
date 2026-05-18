"""
Take media gallery screenshots for InfiniPol submission.

Usage:
    python scripts/take_screenshots.py

Saves to: docs/submission/media/
"""

from __future__ import annotations

import time
from pathlib import Path

from playwright.sync_api import sync_playwright, Page

BASE_URL = "http://localhost:5173"
OUT_DIR = Path(__file__).resolve().parent.parent / "docs/submission/media"
OUT_DIR.mkdir(parents=True, exist_ok=True)

VIEWPORT = {"width": 1440, "height": 900}


def wait_and_screenshot(page: Page, path: str, *, wait_ms: int = 1800) -> None:
    page.wait_for_load_state("networkidle", timeout=15000)
    page.wait_for_timeout(wait_ms)
    out = OUT_DIR / path
    page.screenshot(path=str(out), full_page=False)
    print(f"  Saved: {out}")


def shot_cover(page: Page) -> None:
    """1. Cover — landing page hero at full viewport."""
    print("[1/5] Cover: landing page")
    page.goto(BASE_URL, wait_until="networkidle")
    # Move mouse off the hero so no hover states distract
    page.mouse.move(0, 0)
    page.wait_for_timeout(1200)
    wait_and_screenshot(page, "cover_infinipol.png", wait_ms=600)


RUNNING_SIM_ID = "sim_610a6c0f"  # running sim seeded during dry run


def shot_run_status(page: Page) -> None:
    """3. Run status — navigate directly to a running simulation's progress page."""
    import urllib.request, json as _json, urllib.error
    print("[3/5] Run status: screenshot progress page")

    # Navigate to already-running simulation (no API call needed)
    page.goto(f"{BASE_URL}/simulations/{RUNNING_SIM_ID}", wait_until="networkidle")
    page.wait_for_timeout(2500)
    print(f"  URL: {page.url}")
    page.mouse.move(0, 0)
    wait_and_screenshot(page, "ui_run_status.png", wait_ms=600)


def shot_results(page: Page) -> None:
    """4. Results — Carbon Dividend results, scrolled to show distribution + demographics."""
    print("[4/5] Results: carbon dividend")
    page.goto(f"{BASE_URL}/simulations/sim_demo_carbon/results", wait_until="networkidle")
    page.wait_for_timeout(2000)
    page.mouse.move(0, 0)

    # Screenshot Overview tab (shows nutshell + summary cards)
    wait_and_screenshot(page, "ui_results_overview.png", wait_ms=600)

    # Click Demographics tab for breakdown
    demo_tab = page.get_by_role("tab", name="Demographics")
    if demo_tab.count():
        demo_tab.click()
        page.wait_for_timeout(1500)
        page.mouse.move(0, 0)
        wait_and_screenshot(page, "ui_results_breakdown.png", wait_ms=600)
    else:
        # Scroll down to show the charts
        page.evaluate("window.scrollBy(0, 400)")
        page.wait_for_timeout(800)
        wait_and_screenshot(page, "ui_results_breakdown.png", wait_ms=400)


def shot_challenge(page: Page) -> None:
    """5. Challenge flow — navigate to the challenge page, pick focus, generate, respond."""
    print("[5/5] Challenge: UBI challenge page")

    # The challenge page is a full route (not a drawer)
    page.goto(f"{BASE_URL}/simulations/sim_demo_ubi/results/challenge", wait_until="networkidle")
    page.wait_for_timeout(2000)
    print(f"  URL: {page.url}")

    # If we ended up on the challenge full page, interact with it
    # Otherwise fall back to the results page + open the drawer
    if "/challenge" not in page.url:
        # Fall back: open from results page
        page.goto(f"{BASE_URL}/simulations/sim_demo_ubi/results", wait_until="networkidle")
        page.wait_for_timeout(1500)
        challenge_btn = page.get_by_role("button", name="Challenge Results")
        if not challenge_btn.count():
            challenge_btn = page.locator("button:has-text('Challenge')")
        if challenge_btn.count():
            challenge_btn.first.click()
            page.wait_for_timeout(1500)

    # Pick "Weak Segment" focus
    weak_seg = page.locator("text=Weak Segment").first
    if weak_seg.count():
        weak_seg.click()
        page.wait_for_timeout(600)

    # Click "Generate Challenge"
    gen_btn = page.get_by_role("button", name="Generate Challenge")
    if not gen_btn.count():
        gen_btn = page.locator("button:has-text('Generate')")
    if gen_btn.count():
        gen_btn.first.click()
        page.wait_for_timeout(2500)

    # Type and submit a response
    textarea = page.locator("textarea").first
    if textarea.count():
        textarea.fill(
            "We will introduce targeted supplements for workers aged 55+ — an enhanced "
            "earned income tax credit and cost-of-living indexed dividend payments. "
            "Rural delivery infrastructure will be prioritised in the first two years."
        )
        page.wait_for_timeout(500)

        submit_btn = page.get_by_role("button", name="Submit Response")
        if not submit_btn.count():
            submit_btn = page.locator("button:has-text('Submit')")
        if submit_btn.count():
            submit_btn.first.click()
            page.wait_for_timeout(2500)

    page.mouse.move(0, 0)
    wait_and_screenshot(page, "ui_challenge_roundtrip.png", wait_ms=800)


def main() -> None:
    print(f"Output dir: {OUT_DIR}")
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(viewport=VIEWPORT)
        page = ctx.new_page()

        shot_cover(page)
        shot_run_status(page)
        shot_results(page)
        shot_challenge(page)

        browser.close()

    print("\nAll screenshots done:")
    for f in sorted(OUT_DIR.glob("*.png")):
        kb = f.stat().st_size // 1024
        print(f"  {f.name}  ({kb} KB)")


if __name__ == "__main__":
    main()
