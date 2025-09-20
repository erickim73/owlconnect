# rice_course_mcp_server.py
# FastMCP tool that fetches Rice course details from courses.rice.edu
# Run:  python rice_course_mcp_server.py
# Deps: pip install fastmcp requests beautifulsoup4 lxml python-dotenv (dotenv optional)

import os
import re
import requests
from bs4 import BeautifulSoup
from mcp.server.fastmcp import FastMCP
from typing import List, Dict, Any, Optional

mcp = FastMCP("rice-course-tools")

RICE_BASE = "https://courses.rice.edu/courses/!SWKSCAT.cat"

def fetch_course_page(subject: str, number: str, ac_year: int = 2026) -> str:
    """GET the Rice catalog HTML for a specific course."""
    params = {
        "p_action": "CATALIST",
        "p_acyr_code": str(ac_year),
        "p_crse_numb": str(number),
        "p_subj": subject.upper(),
    }
    headers = {
        "User-Agent": "rice-course-tools/1.0 (+https://github.com/your-org)",
        "Accept": "text/html,application/xhtml+xml",
    }
    r = requests.get(RICE_BASE, params=params, headers=headers, timeout=20)
    r.raise_for_status()
    return r.text

def parse_course_html(html: str, subject: str, number: str) -> Dict[str, Any]:
    """Parse the Rice HTML into structured fields (robust to minor layout changes)."""
    soup = BeautifulSoup(html, "lxml")
    text = " ".join(s.strip() for s in soup.stripped_strings)

    # Heuristics based on observed layout
    # Example page shows blocks like:
    # COMP 140 - COMPUTATIONAL THINKING Long Title: ... Department: ... Credit Hours: 4 ... Description: ...
    out: Dict[str, Any] = {}

    # course code + title
    m_title = re.search(rf"\b{re.escape(subject)}\s*{re.escape(number)}\s*-\s*(.+?)\s+Long Title:", text, re.I)
    out["title"] = (m_title.group(1).strip() if m_title else None)

    # long title
    m_long = re.search(r"Long Title:\s*(.+?)\s+Department:", text, re.I)
    out["long_title"] = (m_long.group(1).strip() if m_long else None)

    # department
    m_dept = re.search(r"Department:\s*(.+?)\s+Grade Mode:", text, re.I)
    out["department"] = (m_dept.group(1).strip() if m_dept else None)

    # credit hours
    m_cred = re.search(r"Credit Hours?:\s*([0-9.]+)", text, re.I)
    out["credit_hours"] = float(m_cred.group(1)) if m_cred else None

    # description
    # often ends before "Course URL:" or the footer links
    m_desc = re.search(r"Description:\s*(.+?)(?:\s+Course URL:|\s+General Announcements|\s+©\s*20\d{2}\s+Rice University|$)", text, re.I)
    out["description"] = (m_desc.group(1).strip() if m_desc else None)

    return out

def lookup_one(subject: str, number: str, ac_year: int = 2026) -> Dict[str, Any]:
    html = fetch_course_page(subject, number, ac_year)
    data = parse_course_html(html, subject, number)
    return {
        "code": f"{subject.upper()} {str(number).upper()}",
        "year": ac_year,
        "url": f"{RICE_BASE}?p_action=CATALIST&p_acyr_code={ac_year}&p_crse_numb={number}&p_subj={subject.upper()}",
        **data,
        "found": any(data.values()),
    }

@mcp.tool()
async def rice_lookup_courses(courses: List[Dict[str, str]], ac_year: Optional[int] = 2026) -> Dict[str, Any]:
    """
    Fetch Rice course details directly from courses.rice.edu.

    Args:
      courses: list of {"subject": "COMP", "number": "140"} items
      ac_year: academic year code (e.g., 2026 for 2025–2026 catalog)

    Returns:
      dict keyed by "SUBJNUM" -> {code, year, url, title, long_title, department, credit_hours, description, found}
    """
    out: Dict[str, Any] = {}
    for c in courses:
        subj = (c.get("subject") or "").strip().upper()
        num  = (c.get("number")  or "").strip().upper()
        if not subj or not num:
            out[f"{subj}{num}"] = {"error": "Invalid subject/number"}
            continue
        try:
            out[f"{subj}{num}"] = lookup_one(subj, num, ac_year or 2026)
        except Exception as e:
            out[f"{subj}{num}"] = {"error": str(e)}
    return out

if __name__ == "__main__":
    mcp.run(transport="stdio")