#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
LinkedIn Alumni Agent (Rice University) — robust Experience/Education scraper

Key fixes for empty sections:
- Scrolls until section headers (Experience/Education) are in-view
- Expands all 'See more' / '…see more' / 'Show more' (global + item-level)
- Prefers aria-hidden text; falls back to visible text; final fallback uses node.textContent
- Handles both grouped and flat experiences
- Adds multiple CSS + XPath fallbacks tailored to LinkedIn A/B variants (matches your samples)

Setup
-----
pip install playwright requests python-dotenv
playwright install

.env
----
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
LI_EMAIL=you@example.com
LI_PASSWORD=your_password

Run
---
python alumni_agent.py "backend engineer Houston energy" --profiles-limit 10
"""

import os
import re
import time
import csv
import json
import argparse
from pathlib import Path
from typing import Optional, Dict, Any, List, Set

import requests
from dotenv import load_dotenv
from playwright.sync_api import (
    sync_playwright,
    TimeoutError as PWTimeoutError,
    Page,
    Locator,
)

ALUMNI_URL = "https://www.linkedin.com/school/riceuniversity/people/"
LOGIN_URL_CONTAINS = "/login"

# -------------------- OpenRouter helpers -------------------- #
def openrouter_call(messages: List[Dict[str, str]], temperature: float = 0.2) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("Missing OPENROUTER_API_KEY in .env")
    model = os.getenv("OPENROUTER_MODEL", "anthropic/claude-3.5-sonnet")
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://github.com/arjunrai/rice-alumni-agent",
        "X-Title": "LinkedIn Alumni Agent",
        "Content-Type": "application/json",
    }
    payload = {"model": model, "messages": messages, "temperature": temperature}
    resp = requests.post(url, headers=headers, json=payload, timeout=60)
    resp.raise_for_status()
    js = resp.json()
    return js["choices"][0]["message"]["content"].strip()

def parse_prompt(prompt: str) -> Dict[str, Any]:
    system = "Extract minimal alumni facets and concise keyword candidates."
    user = f"""
Return STRICT JSON with keys:
- where_they_work (array of strings): company/org names
- where_they_live (array of strings): cities/regions
- what_they_do (array of strings): roles/fields
- what_they_studied (array of strings): majors/fields of study
- candidate_keywords (array of strings): ≤5 phrases, each ≤3 words, most specific first.
  Prefer exact job titles/skills over broad terms. No punctuation except spaces-hyphens.

Prompt: "{prompt}"
    """
    try:
        raw = openrouter_call(
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.2,
        )
        j = json.loads(raw)
    except Exception:
        kw = openrouter_call(
            [{"role": "system", "content": "Return ≤3 word keyword only."},
             {"role": "user", "content": prompt}],
            temperature=0.2,
        )
        j = {
            "where_they_work": [],
            "where_they_live": [],
            "what_they_do": [],
            "what_they_studied": [],
            "candidate_keywords": [" ".join(kw.split())[:50]],
        }

    def clean_list(x, limit=10):
        if not isinstance(x, list):
            return []
        out = []
        for s in x:
            if isinstance(s, str):
                s2 = re.sub(r"\s+", " ", s).strip()
                if s2:
                    out.append(s2)
        return out[:limit]

    return {
        "where_they_work": clean_list(j.get("where_they_work")),
        "where_they_live": clean_list(j.get("where_they_live")),
        "what_they_do": clean_list(j.get("what_they_do")),
        "what_they_studied": clean_list(j.get("what_they_studied")),
        "candidate_keywords": clean_list(j.get("candidate_keywords"), limit=5),
    }

def select_most_specific_keyword(parsed: Dict[str, Any]) -> str:
    def is_specific(term: str) -> bool:
        t = term.lower()
        broad = {"engineer", "software", "developer", "manager", "student", "intern", "researcher"}
        words = t.split()
        if len(words) == 0 or len(words) > 3:
            return False
        if all(w in broad for w in words):
            return False
        return True

    for term in parsed.get("what_they_do", []):
        if is_specific(term):
            return term[:50]
    for term in parsed.get("candidate_keywords", []):
        if is_specific(term):
            return term[:50]
    return ""  # bars-only

# -------------------- Playwright helpers -------------------- #
def ensure_profile(profile_dir: Path) -> None:
    profile_dir.mkdir(parents=True, exist_ok=True)

def open_alumni_page(context):
    page = context.new_page()
    page.set_default_timeout(25000)
    page.goto(ALUMNI_URL, wait_until="domcontentloaded")
    return page

def click_sign_in_if_present(page: Page) -> bool:
    selectors = [
        "a:has-text('Sign in')",
        "button:has-text('Sign in')",
        "a.nav__button-secondary",
        "a[href*='login']",
    ]
    for sel in selectors:
        try:
            loc = page.locator(sel).first
            if loc and loc.count() > 0 and loc.is_visible():
                loc.click()
                return True
        except Exception:
            continue
    return False

def on_login_page(page: Page) -> bool:
    url = page.url or ""
    if LOGIN_URL_CONTAINS in url:
        return True
    try:
        page.wait_for_selector("input#username, input[name='session_key']", timeout=800)
        page.wait_for_selector("input#password, input[name='session_password']", timeout=800)
        return True
    except PWTimeoutError:
        return False

def perform_auto_login_if_credentials(page: Page, email: Optional[str], password: Optional[str]) -> bool:
    if not (email and password) or not on_login_page(page):
        return False
    for sel in ["input#username", "input[name='session_key']"]:
        try:
            page.fill(sel, email, timeout=2000); break
        except Exception:
            continue
    for sel in ["input#password", "input[name='session_password']"]:
        try:
            page.fill(sel, password, timeout=2000); break
        except Exception:
            continue
    for sel in ["button[type='submit']", "button:has-text('Sign in')", "button:has-text('Log in')"]:
        try:
            page.click(sel, timeout=2000); break
        except Exception:
            continue
    return True

def ensure_search_bar(page: Page):
    page.goto(ALUMNI_URL, wait_until="domcontentloaded")
    page.wait_for_selector("textarea#people-search-keywords.org-people__search-input[placeholder*='Search alumni']", timeout=30000)

def focus_search_box(page: Page):
    sel = "textarea#people-search-keywords.org-people__search-input[placeholder*='Search alumni']"
    page.wait_for_selector(sel, timeout=30000)
    area = page.locator(sel)
    area.click()
    try:
        area.fill("")
    except Exception:
        pass
    return area

# -------------------- Reset between prompts -------------------- #
def clear_selected_bars(page: Page, max_clicks: int = 30):
    try:
        selected = page.locator("button.org-people-bar-graph-element.org-people-bar-graph-element--is-selected")
        n = min(selected.count(), max_clicks)
        for i in range(n):
            try:
                selected.nth(i).click(timeout=800)
                time.sleep(0.2)
            except Exception:
                continue
    except Exception:
        pass

def reset_search_box(page: Page):
    try:
        area = focus_search_box(page)
        area.fill("")
        area.press("Enter")
        time.sleep(0.6)
    except Exception:
        pass

# -------------------- Seed minimal search (optional) -------------------- #
def seed_minimal_search_if_needed(page: Page, keyword: str):
    if not keyword:
        return
    area = focus_search_box(page)
    area.type(keyword, delay=15)
    area.press("Enter")

# --------- Change detection --------- #
def snapshot_first_links(page: Page, limit: int = 6) -> List[str]:
    anchors = page.locator(".org-people-profile-card__profile-info a[href*='/in/'], a[href*='/in/']")
    n = min(anchors.count(), limit)
    out = []
    for i in range(n):
        try:
            href = anchors.nth(i).get_attribute("href") or ""
            if "/in/" in href:
                out.append(href.split("?")[0])
        except Exception:
            continue
    return out

def wait_until_results_change(page: Page, baseline: List[str], timeout_ms: int = 22000):
    deadline = time.time() + (timeout_ms / 1000.0)
    while time.time() < deadline:
        current = snapshot_first_links(page, limit=len(baseline) or 6)
        if current and current != baseline:
            return
        try:
            page.mouse.wheel(0, 300)
        except Exception:
            pass
        time.sleep(0.4)
    return

# --------- Insight Bars (with horizontal scrolling) --------- #
def normalize_label(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip().lower()

def click_chevron_if_present(container: Locator, direction: str = "right", clicks: int = 3):
    sel = "button[aria-label*='Scroll right'],button[aria-label*='Next']" if direction == "right" else "button[aria-label*='Scroll left'],button[aria-label*='Previous']"
    try:
        chevrons = container.locator(sel)
        n = min(chevrons.count(), clicks)
        for i in range(n):
            chevrons.nth(i).click(timeout=800)
            time.sleep(0.25)
    except Exception:
        pass

def scroll_insight_row(container: Locator, direction: str = "right", step_px: int = 500, passes: int = 6, sleep: float = 0.25):
    click_chevron_if_present(container, direction, clicks=3)
    for _ in range(passes):
        try:
            container.evaluate(
                """(el, dx) => { el.scrollBy({left: dx, top: 0, behavior: 'instant'}); }""",
                step_px if direction == "right" else -step_px
            )
        except Exception:
            pass
        time.sleep(sleep)

def click_bars_in_section(page: Page, section_title: str, terms: List[str], max_clicks: int) -> int:
    if not terms:
        return 0
    terms_norm = [normalize_label(t) for t in terms]
    container = page.locator(f".insight-container:has(h3:has-text('{section_title}'))").first
    if not container or container.count() == 0:
        return 0

    clicked = 0
    seen_labels = set()

    def try_visible() -> int:
        nonlocal clicked
        bars = container.locator("button.org-people-bar-graph-element")
        total = min(bars.count(), 140)
        local = 0
        for i in range(total):
            if clicked >= max_clicks:
                break
            bar = bars.nth(i)
            if not bar.is_visible():
                continue
            try:
                label_node = bar.locator(".org-people-bar-graph-element__category").first
                if label_node.count() == 0:
                    continue
                label = normalize_label(label_node.inner_text())
            except Exception:
                continue
            if not label or label in seen_labels:
                continue
            seen_labels.add(label)

            if any(t in label or label in t for t in terms_norm):
                selected = "org-people-bar-graph-element--is-selected" in (bar.get_attribute("class") or "")
                if not selected:
                    try:
                        bar.click(timeout=1400)
                        clicked += 1
                        local += 1
                        time.sleep(0.5)
                    except Exception:
                        continue
        return local

    try_visible()
    if clicked >= max_clicks: return clicked
    scroll_insight_row(container, "right", step_px=700, passes=6, sleep=0.2)
    try_visible()
    if clicked >= max_clicks: return clicked
    scroll_insight_row(container, "left", step_px=700, passes=3, sleep=0.2)
    try_visible()
    return clicked

def apply_facets(page: Page, terms: Dict[str, Any]) -> int:
    clicks = 0
    clicks += click_bars_in_section(page, "Where they work", terms.get("where_they_work", []), max_clicks=4)
    clicks += click_bars_in_section(page, "What they do", terms.get("what_they_do", []), max_clicks=3)
    clicks += click_bars_in_section(page, "Where they live", terms.get("where_they_live", []), max_clicks=3)
    clicks += click_bars_in_section(page, "What they studied", terms.get("what_they_studied", []), max_clicks=2)
    return clicks

# -------------------- Results page enrich: scroll & "Show more results" -------------------- #
def vertical_scroll(page: Page, steps: int = 6, pause: float = 0.8):
    for _ in range(steps):
        try:
            page.mouse.wheel(0, 1300)
        except Exception:
            pass
        time.sleep(pause)

def click_show_more_results(page: Page, max_clicks: int = 2, wait_after: float = 1.0):
    for _ in range(max_clicks):
        try:
            btn = page.locator("button.scaffold-finite-scroll__load-button:has-text('Show more results')").first
            if btn and btn.count() > 0 and btn.is_visible():
                btn.click()
                time.sleep(wait_after)
            else:
                break
        except Exception:
            break

# -------------------- Scrape results list -------------------- #
def extract_results(page: Page) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    anchors = page.locator(".org-people-profile-card__profile-info a[href*='/in/'], a[href*='/in/']")
    n = anchors.count()
    seen: Set[str] = set()

    for i in range(min(n, 1200)):
        a = anchors.nth(i)
        try:
            href = a.get_attribute("href") or ""
        except Exception:
            continue
        if "/in/" not in href:
            continue
        link = href.split("?")[0]
        if link in seen:
            continue
        seen.add(link)

        # Name: title, img alt, or anchor text
        name = ""
        try:
            title_div = a.locator("xpath=ancestor::*[contains(@class,'org-people-profile-card__profile-info')]//div[contains(@class,'artdeco-entity-lockup__title')]").first
            if title_div.count() > 0:
                t = (title_div.inner_text() or "").strip()
                if t:
                    name = re.sub(r"\s+", " ", t)
        except Exception:
            pass
        if not name:
            try:
                img = a.locator("img[alt]").first
                if img.count() > 0:
                    alt = img.get_attribute("alt") or ""
                    if alt:
                        name = alt.strip()
            except Exception:
                pass
        if not name:
            try:
                t = (a.inner_text() or "").strip()
                if t:
                    name = re.sub(r"\s+", " ", t)
            except Exception:
                pass

        results.append({"name": name, "profile_link": link})
    return results

def save_csv(rows: List[Dict[str, Any]], path: Path, fieldnames: List[str]):
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fieldnames})
    print(f"💾 Saved {len(rows)} rows to {path}")

def save_jsonl(rows: List[Dict[str, Any]], path: Path):
    with path.open("w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"💾 Saved {len(rows)} JSON lines to {path}")

# -------------------- Profile scraping (robust) -------------------- #
def wait_for_profile_loaded(p: Page, timeout_ms: int = 30000):
    # Wait until some header text or the experience anchor shows up
    selectors = [
        "main h1",
        ".pv-text-details__left-panel h1",
        ".text-heading-xlarge",
        "nav a[href*='experience']",
        "section:has(h2:has-text('Experience'))",
        "section#experience, section[id*='experience']",
    ]
    deadline = time.time() + timeout_ms / 1000.0
    while time.time() < deadline:
        for sel in selectors:
            try:
                loc = p.locator(sel)
                if loc.count() > 0 and loc.first.is_visible():
                    return
            except Exception:
                pass
        time.sleep(0.35)

def smooth_scroll(p: Page, pixels: int = 1000, steps: int = 1, pause: float = 0.25):
    for _ in range(steps):
        try:
            p.mouse.wheel(0, pixels)
        except Exception:
            pass
        time.sleep(pause)

def scroll_to_section(p: Page, header_text: str, fallback_css: str, max_scrolls: int = 20) -> Locator:
    """
    Scroll until we see a section whose h2 contains `header_text`, else fall back to CSS.
    Returns the section locator (may be empty if not found).
    """
    for _ in range(max_scrolls):
        sec = p.locator(f"section:has(h2:has-text('{header_text}'))")
        if sec.count() > 0 and sec.first.is_visible():
            try: sec.first.scroll_into_view_if_needed()
            except Exception: pass
            return sec.first
        sec2 = p.locator(fallback_css).first
        if sec2.count() > 0 and sec2.is_visible():
            try: sec2.scroll_into_view_if_needed()
            except Exception: pass
            return sec2
        smooth_scroll(p, pixels=1100, steps=1, pause=0.25)
    return p.locator(fallback_css).first

def click_if_visible(p: Page, selector: str) -> bool:
    try:
        loc = p.locator(selector)
        if loc.count() > 0 and loc.first.is_visible():
            loc.first.click()
            time.sleep(0.25)
            return True
    except Exception:
        pass
    return False

def expand_all_sections(p: Page, scope: Optional[Locator] = None):
    """
    Click all variants of 'see/show more' within the page or a given scope.
    """
    root = scope if scope is not None else p
    # cover unicode ellipsis + generic controls
    for _ in range(8):
        any_clicked = False
        for sel in [
            "button:has-text('See more')",
            "button:has-text('Show more')",
            "button:has-text('…see more')",
            "button.inline-show-more-text__button",
            "button:has-text('Show all experiences')",
        ]:
            try:
                btns = root.locator(sel)
                cnt = min(btns.count(), 6)
                for i in range(cnt):
                    if btns.nth(i).is_visible():
                        btns.nth(i).click()
                        time.sleep(0.2)
                        any_clicked = True
            except Exception:
                continue
        if not any_clicked:
            break

def clean_text(t: str) -> str:
    return re.sub(r"\s+", " ", (t or "").strip())

def text_from(node: Locator) -> str:
    # Try inner_text
    try:
        t = node.inner_text()
        if t: 
            t = clean_text(t)
            if t: return t
    except Exception:
        pass
    # Fallback: textContent
    try:
        t2 = node.evaluate("n => n.textContent")
        t2 = clean_text(t2 or "")
        return t2
    except Exception:
        return ""

def first_text(node_or_page, selectors: List[str]) -> str:
    # Accept Page or Locator
    for sel in selectors:
        try:
            loc = node_or_page.locator(sel).first
            if loc and loc.count() > 0:
                t = text_from(loc)
                if t:
                    return t
        except Exception:
            continue
    return ""

def first_aria_text(node: Locator, selectors: List[str]) -> str:
    for sel in selectors:
        try:
            locs = node.locator(sel).all()
            for loc in locs:
                # prefer aria-hidden nodes
                try:
                    hidden = (loc.get_attribute("aria-hidden") or "").lower() == "true"
                except Exception:
                    hidden = False
                t = text_from(loc)
                if t and (hidden or True):
                    return t
        except Exception:
            continue
    return ""

def extract_experiences_from_dom(p: Page, section: Locator, max_items: int = 80) -> List[Dict[str, str]]:
    exps: List[Dict[str, str]] = []
    if not section or section.count() == 0:
        return exps

    expand_all_sections(p, scope=section)

    # Each experience block is often a profile-component-entity, otherwise <li>.
    items = section.locator("[data-view-name='profile-component-entity'], li").all()[:max_items]
    for li in items:
        try:
            # Role / Title
            role = first_aria_text(li, [
                "div.t-bold span[aria-hidden='true']",
                ".hoverable-link-text.t-bold span[aria-hidden='true']",
                "span[aria-hidden='true']"
            ]) or first_text(li, [".t-bold span", ".hoverable-link-text.t-bold span"])

            # Company + employment type (e.g., "PitchBook · Internship")
            comp_line = first_aria_text(li, [
                "span.t-14.t-normal span[aria-hidden='true']",
                ".t-14.t-normal span[aria-hidden='true']",
            ]) or first_text(li, ["span.t-14.t-normal", ".t-14.t-normal"])

            company, employment_type = "", ""
            if "·" in comp_line:
                parts = [x.strip() for x in comp_line.split("·")]
                if len(parts) >= 1: company = parts[0]
                if len(parts) >= 2: employment_type = parts[1]
            else:
                company = comp_line

            # Dates + duration (e.g., "Jun 2024 - Aug 2024 · 3 mos")
            dates_line = first_aria_text(li, [
                ".pvs-entity__caption-wrapper[aria-hidden='true']",
                ".pvs-entity__caption-wrapper span[aria-hidden='true']",
            ]) or first_text(li, [
                ".pvs-entity__caption-wrapper",
                "span.t-14.t-normal.t-black--light span[aria-hidden='true']",
                "span.t-14.t-normal.t-black--light",
            ])
            dates, duration = "", ""
            if "·" in dates_line:
                parts = [x.strip() for x in dates_line.split("·")]
                if len(parts) >= 1: dates = parts[0]
                if len(parts) >= 2: duration = parts[1]
            else:
                dates = dates_line

            # Location line (often aria-hidden too)
            location = first_aria_text(li, [
                "span.t-14.t-normal.t-black--light span[aria-hidden='true']",
            ]) or first_text(li, ["span.t-14.t-normal.t-black--light"])

            # Expand item-level “…see more” then read description
            try:
                see = li.locator("button.inline-show-more-text__button, button:has-text('…see more'), button:has-text('See more')").first
                if see and see.count() > 0 and see.is_visible():
                    see.click()
                    time.sleep(0.2)
            except Exception:
                pass
            description = first_text(li, [
                "div[class*='inline-show-more-text'] span[aria-hidden='true']",
                "div[class*='inline-show-more-text']",
                ".pvs-list__outer-container p",
                "p",
            ])

            # Skip empty shells
            if role or company or dates or description:
                exps.append({
                    "role": role,
                    "company": company,
                    "employment_type": employment_type,
                    "dates": dates,
                    "duration": duration,
                    "location": location,
                    "description": description,
                })
        except Exception:
            continue
    return exps

def extract_education_from_dom(p: Page, section: Locator, max_items: int = 40) -> List[Dict[str, str]]:
    edus: List[Dict[str, str]] = []
    if not section or section.count() == 0:
        return edus

    expand_all_sections(p, scope=section)

    items = section.locator("[data-view-name='profile-component-entity'], li").all()[:max_items]
    for li in items:
        try:
            school = first_aria_text(li, [
                ".t-bold span[aria-hidden='true']",
                "span[aria-hidden='true']",
            ]) or first_text(li, [".t-bold span"])

            degree = first_text(li, [
                ".t-14.t-normal.t-black--light span[aria-hidden='true']",
                ".t-14.t-normal.t-black--light",
                ".t-normal span",
            ])

            dates = first_aria_text(li, [
                ".pvs-entity__caption-wrapper[aria-hidden='true']",
                ".pvs-entity__caption-wrapper span[aria-hidden='true']",
            ]) or first_text(li, [".pvs-entity__caption-wrapper"])

            extra = first_text(li, [
                "div[class*='inline-show-more-text'] span[aria-hidden='true']",
                "div[class*='inline-show-more-text']",
            ])

            if school or degree or dates or extra:
                edus.append({"school": school, "degree": degree, "dates": dates, "extra": extra})
        except Exception:
            continue
    return edus

def extract_skills(p: Page, max_items: int = 30) -> List[str]:
    skills: List[str] = []
    section = p.locator("section#skills, section[id*='skills'], section:has(h2:has-text('Skills'))").first
    if section and section.count() > 0:
        expand_all_sections(p, scope=section)
        entries = section.locator("span.mr1.t-bold, span[aria-hidden='true'], .pv-skill-category-entity__name-text").all()[:max_items*2]
        for e in entries:
            try:
                t = clean_text(e.inner_text() or "") or clean_text(e.evaluate("n=>n.textContent") or "")
                if t and len(skills) < max_items and t.lower() not in [s.lower() for s in skills]:
                    skills.append(t)
            except Exception:
                continue
    return skills

def scrape_profile_details(context, url: str) -> Dict[str, Any]:
    p = context.new_page()
    p.set_default_timeout(30000)
    details: Dict[str, Any] = {
        "profile_url": url,
        "name": "",
        "headline": "",
        "location": "",
        "about": "",
        "experiences": [],
        "education": [],
        "skills": [],
    }

    try:
        p.goto(url, wait_until="domcontentloaded")
        wait_for_profile_loaded(p, timeout_ms=35000)

        # Preload
        smooth_scroll(p, pixels=900, steps=4, pause=0.25)

        # Header basics (with fallbacks)
        details["name"] = first_text(p, ["main h1", ".pv-text-details__left-panel h1", ".text-heading-xlarge", "h1"])
        details["headline"] = first_text(p, ["main .text-body-medium.break-words", ".pv-text-details__left-panel .text-body-medium", "div.text-body-medium.break-words"])
        details["location"] = first_text(p, ["main .pv-text-details__left-panel span.text-body-small", "main .pv-text-details__left-panel .inline.t-14.t-black--light.break-words", "section .pv-text-details__left-panel span.text-body-small"])

        # About
        expand_all_sections(p)  # catch collapsed about
        details["about"] = first_text(p, [
            "section#about .display-flex.ph5.pv3 span.visually-hidden+span",
            "section#about .inline-show-more-text span[aria-hidden='true']",
            "section#about .inline-show-more-text span:nth-child(1)",
            "section:has(h2:has-text('About')) .inline-show-more-text span[aria-hidden='true']",
            "section:has(h2:has-text('About')) p",
        ])

        # Experience — find section by header text first; then fallback id/css
        exp_section = scroll_to_section(
            p,
            header_text="Experience",
            fallback_css="section#experience, section[id*='experience']",
            max_scrolls=24
        )
        expand_all_sections(p, scope=exp_section)
        details["experiences"] = extract_experiences_from_dom(p, exp_section, max_items=90)

        # Education
        edu_section = scroll_to_section(
            p,
            header_text="Education",
            fallback_css="section#education, section[id*='education']",
            max_scrolls=18
        )
        expand_all_sections(p, scope=edu_section)
        details["education"] = extract_education_from_dom(p, edu_section, max_items=50)

        # Skills
        smooth_scroll(p, pixels=1000, steps=3, pause=0.2)
        details["skills"] = extract_skills(p, max_items=30)

    except Exception:
        pass
    finally:
        try:
            p.close()
        except Exception:
            pass
    return details

# -------------------- Main flow -------------------- #
def main():
    load_dotenv()

    parser = argparse.ArgumentParser(description="LinkedIn Alumni Agent (Rice)")
    parser.add_argument("prompts", help="One or more prompts; separate with ';'")
    parser.add_argument("--headless", action="store_true", help="Run headless (default: headed)")
    parser.add_argument("--scroll-steps", type=int, default=6, help="Vertical scroll steps after filters")
    parser.add_argument("--profile-dir", default=".ll_browser_profile", help="Persistent browser profile dir")
    parser.add_argument("--profiles-limit", type=int, default=10, help="Max profiles to visit for detailed scraping")
    parser.add_argument("--show-more-clicks", type=int, default=2, help="Times to click 'Show more results'")
    args = parser.parse_args()

    raw_prompts = [p.strip() for p in args.prompts.split(";") if p.strip()]

    # Parse prompts -> ONE concise keyword + bars
    bundles: List[Dict[str, Any]] = []
    for rp in raw_prompts:
        parsed = parse_prompt(rp)
        keyword = select_most_specific_keyword(parsed)
        bundles.append({
            "most_specific_keyword": keyword,
            "where_they_work": parsed["where_they_work"],
            "where_they_live": parsed["where_they_live"],
            "what_they_do": parsed["what_they_do"],
            "what_they_studied": parsed["what_they_studied"],
        })

    # Dedup
    seen = set(); unique_bundles = []
    for b in bundles:
        key = (b.get("most_specific_keyword",""),
               tuple(b.get("where_they_work",[])),
               tuple(b.get("where_they_live",[])),
               tuple(b.get("what_they_do",[])),
               tuple(b.get("what_they_studied",[])))
        if key in seen: continue
        seen.add(key); unique_bundles.append(b)

    li_email = os.getenv("LI_EMAIL")
    li_password = os.getenv("LI_PASSWORD")

    profile_dir = Path(args.profile_dir)
    ensure_profile(profile_dir)

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(profile_dir),
            headless=args.headless,
            viewport={"width": 1400, "height": 900},
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
            ],
        )
        page = open_alumni_page(context)

        # Login
        clicked = click_sign_in_if_present(page)
        if clicked or on_login_page(page):
            attempted = perform_auto_login_if_credentials(page, li_email, li_password)
            if not attempted:
                print("Complete login in the opened window…")
                start = time.time()
                while on_login_page(page) and (time.time() - start) < 300:
                    time.sleep(1.0)
            ensure_search_bar(page)
            print("🔓 Auth complete. Alumni search bar ready.")
        else:
            try:
                ensure_search_bar(page)
                print("🔓 Already signed in.")
            except Exception:
                if click_sign_in_if_present(page) or on_login_page(page):
                    attempted = perform_auto_login_if_credentials(page, li_email, li_password)
                    if not attempted:
                        start = time.time()
                        while on_login_page(page) and (time.time() - start) < 300:
                            time.sleep(1.0)
                    ensure_search_bar(page)

        # For each prompt bundle
        for idx, b in enumerate(unique_bundles, start=1):
            print(f"\n=== Search {idx}/{len(unique_bundles)} ===")
            print(f"keyword: {b.get('most_specific_keyword','(none)')}")
            print(f"work: {b.get('where_they_work', [])}")
            print(f"do: {b.get('what_they_do', [])}")
            print(f"live: {b.get('where_they_live', [])}")
            print(f"studied: {b.get('what_they_studied', [])}")

            # Reset
            ensure_search_bar(page)
            clear_selected_bars(page)
            reset_search_box(page)

            baseline = snapshot_first_links(page, limit=6)

            # minimal keyword
            seed_minimal_search_if_needed(page, b.get("most_specific_keyword",""))
            time.sleep(0.8)

            # use bars
            _ = apply_facets(page, b)
            time.sleep(1.0)

            # wait for change
            wait_until_results_change(page, baseline, timeout_ms=22000)

            # scroll + show more
            vertical_scroll(page, steps=args.scroll_steps, pause=0.8)
            click_show_more_results(page, max_clicks=args.show_more_clicks, wait_after=1.0)
            vertical_scroll(page, steps=2, pause=0.8)

            # list scrape
            list_rows = extract_results(page)
            list_csv = Path(f"alumni_results_{idx:03d}.csv")
            save_csv(list_rows, list_csv, fieldnames=["name", "profile_link"])

            # profile details
            details_rows: List[Dict[str, Any]] = []
            exps_flat: List[Dict[str, Any]] = []
            edus_flat: List[Dict[str, Any]] = []

            to_visit = [r["profile_link"] for r in list_rows if r.get("profile_link")] [: args.profiles_limit]
            print(f"🔎 Visiting {len(to_visit)} profiles for details…")
            for u in to_visit:
                try:
                    d = scrape_profile_details(context, u)
                    details_rows.append(d)
                    for e in d.get("experiences", []) or []:
                        exps_flat.append({
                            "profile_url": d.get("profile_url",""),
                            "name": d.get("name",""),
                            **e
                        })
                    for e in d.get("education", []) or []:
                        edus_flat.append({
                            "profile_url": d.get("profile_url",""),
                            "name": d.get("name",""),
                            **e
                        })
                except Exception:
                    continue

            details_jsonl = Path(f"alumni_profile_details_{idx:03d}.jsonl")
            save_jsonl(details_rows, details_jsonl)

            exps_csv = Path(f"alumni_profile_experiences_{idx:03d}.csv")
            save_csv(
                exps_flat, exps_csv,
                fieldnames=["profile_url","name","role","company","employment_type","dates","duration","location","description"]
            )

            edus_csv = Path(f"alumni_profile_education_{idx:03d}.csv")
            save_csv(
                edus_flat, edus_csv,
                fieldnames=["profile_url","name","school","degree","dates","extra"]
            )

        if not args.headless:
            print("👀 Leaving window open for 5s…")
            time.sleep(5)
        context.close()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Aborted by user.")
