#!/usr/bin/env python3
"""
Resume Parser (OCR-first with pytesseract, fallback to text extraction)

Usage:
  python resume_parser.py /path/to/resume.pdf [--out output.json]

Dependencies:
  - pytesseract (+ Tesseract binary installed)
  - PyMuPDF (fitz)
  - Pillow
  - PyPDF2 (fallback)
"""
import os, re, json, argparse, shutil
from PIL import Image
import pytesseract
from PyPDF2 import PdfReader

def normalize_text(s: str) -> str:
    s = s.replace("\ufb01", "fi").replace("\ufb02", "fl")
    s = s.replace("\u2022", "•")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\r", "", s)
    s = "\n".join(line.strip() for line in s.splitlines())
    return s

def extract_text_ocr(pdf_path: str) -> str:
    import fitz
    if shutil.which("tesseract") is None:
        raise RuntimeError("tesseract binary not found")
    doc = fitz.open(pdf_path)
    all_text = []
    for page in doc:
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        txt = pytesseract.image_to_string(img, config="--psm 3")
        all_text.append(txt)
    return "\n".join(all_text)

def extract_text_pymupdf(pdf_path: str) -> str:
    import fitz
    doc = fitz.open(pdf_path)
    return "\n".join(p.get_text() for p in doc)

def extract_text_pypdf2(pdf_path: str) -> str:
    
    reader = PdfReader(pdf_path)
    out = []
    for pg in reader.pages:
        try:
            out.append(pg.extract_text() or "")
        except Exception:
            out.append("")
    return "\n".join(out)

DATE_RANGE_RE = re.compile(
    r"(?P<start>(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.? ?\d{4}|[A-Za-z]{3,9}\.? ?\d{4})\s*(–|—|-|to)\s*(?P<end>(Present|Now|Current|[A-Za-z]{3,9}\.? ?\d{4}))",
    re.IGNORECASE
)
SIMPLE_DATE_RE = re.compile(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.? ?\d{4}", re.IGNORECASE)
SECTION_HEADERS = ["education", "experience", "projects", "technical skills", "skills"]

def split_sections(text: str):
    lines = text.splitlines()
    sections = {}
    cur = "_preamble"
    sections[cur] = []
    for line in lines:
        key = line.strip().lower()
        if key in SECTION_HEADERS:
            cur = key
            sections[cur] = []
        else:
            sections.setdefault(cur, []).append(line)
    return {k: "\n".join(v).strip() for k, v in sections.items()}

def parse_contact_and_name(text: str):
    PHONE_RE = re.compile(r"(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}")
    EMAIL_RE = re.compile(r"[\w\.-]+@[\w\.-]+\.\w+")
    URL_RE = re.compile(r"(https?://)?([\w\-]+\.)+[a-z]{2,}(/[^\s|]+)?", re.IGNORECASE)

    lines = [l for l in text.splitlines() if l.strip()]
    name = None
    for i, line in enumerate(lines[:5]):
        if ("@" in line) or ("linkedin" in line.lower()) or ("github" in line.lower()) or ("http" in line.lower()):
            continue
        if any(h in line.lower() for h in SECTION_HEADERS):
            break
        if len(line.split()) <= 6:
            name = line.strip()
            break

    header = "\n".join(lines[:6])
    m = PHONE_RE.search(header); phone = m.group(0) if m else None
    m = EMAIL_RE.search(header); email = m.group(0) if m else None

    urls = re.findall(URL_RE, header)
    linkedin = None; github = None
    def rebuild_url(match_tuple):
        full = "".join(match_tuple) if isinstance(match_tuple, tuple) else str(match_tuple)
        if not full.startswith("http"):
            full = "https://" + full
        return full
    for tup in urls:
        url = rebuild_url(tup)
        low = url.lower()
        if "linkedin" in low and not linkedin:
            linkedin = url
        if "github" in low and not github:
            github = url

    # Fix common OCR
    def fix(u):
        if not u: return u
        u = u.replace("linkedin./", "linkedin.com/")
        u = u.replace("github./", "github.com/")
        return u
    linkedin = fix(linkedin); github = fix(github)

    return {"name": name, "phone": phone, "email": email, "linkedin": linkedin, "github": github}

def collect_bullets_any(lines, i):
    bullets = []
    while i < len(lines):
        l = lines[i].strip()
        if l.startswith(("•", "- ", "+ ")):
            bullets.append(l.lstrip("•").lstrip("-").lstrip("+").strip())
            i += 1
        else:
            break
    return bullets, i

def fix_institution_location(inst, loc):
    tokens = ["University", "College", "Institute", "School"]
    if loc:
        for t in tokens:
            pref = t + " "
            if loc.startswith(pref):
                inst = (inst + " " + t).strip()
                loc = loc[len(pref):]
    return inst, loc

def parse_education(txt: str):
    if not txt: return []
    lines = [l for l in txt.splitlines() if l.strip()]
    out = []; i = 0
    while i < len(lines):
        line = lines[i]
        inst = None; location = None; degree = None; dates = None
        m = re.search(r"(.*?)[ ]+([A-Za-z .'-]+,\s*[A-Z]{2})$", line)
        if m:
            inst = m.group(1).strip(); location = m.group(2).strip()
        else:
            inst = line.strip()
        j = i + 1
        if j < len(lines):
            nxt = lines[j]
            if any(w in nxt.lower() for w in ["bachelor", "master", "associate", "minor", "major", "degree"]):
                degree = nxt.strip()
                m2 = SIMPLE_DATE_RE.search(nxt) or DATE_RANGE_RE.search(nxt)
                if m2: dates = m2.group(0)
                j += 1
            if not dates and j < len(lines):
                nxt2 = lines[j]
                m3 = SIMPLE_DATE_RE.search(nxt2) or DATE_RANGE_RE.search(nxt2)
                if m3: dates = m3.group(0); j += 1
        inst, location = fix_institution_location(inst, location)
        out.append({"institution": inst, "location": location, "degree": degree, "dates": dates})
        i = j if j > i else i + 1
    return out

def parse_experience(txt: str):
    if not txt: return []
    lines = [l for l in txt.splitlines() if l.strip()]
    res = []; i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.lower() in SECTION_HEADERS: i += 1; continue
        if line.startswith(("•", "- ", "+ ")): i += 1; continue
        role = None; dates = None; company = None; location = None
        m = DATE_RANGE_RE.search(line)
        if m:
            dates = m.group(0); role = DATE_RANGE_RE.sub("", line).strip(" -—–"); i += 1
        else:
            role = line
            if i + 1 < len(lines):
                m2 = DATE_RANGE_RE.search(lines[i+1]) or SIMPLE_DATE_RE.search(lines[i+1])
                if m2: dates = m2.group(0); i += 2
                else: i += 1
            else:
                i += 1
        if i < len(lines):
            comp_line = lines[i].strip()
            mloc = re.search(r"(.*?)[ ]+([A-Za-z .'-]+,\s*[A-Z]{2})$", comp_line)
            if mloc:
                company = mloc.group(1).strip(); location = mloc.group(2).strip(); i += 1
            else:
                if comp_line and not comp_line.startswith(("•", "- ", "+ ")):
                    company = comp_line; i += 1
        bullets, i = collect_bullets_any(lines, i)
        res.append({"role": role, "company": company, "location": location, "dates": dates, "bullets": bullets})
    return res

def parse_projects(txt: str):
    if not txt: return []
    lines = [l for l in txt.splitlines() if l.strip()]
    out = []; i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.lower() in SECTION_HEADERS or line.startswith(("•", "- ", "+ ")):
            i += 1; continue
        header = line; name, tech, dates = header, None, None
        if "|" in header: name, tech = [p.strip() for p in header.split("|", 1)]
        m = DATE_RANGE_RE.search(header) or SIMPLE_DATE_RE.search(header)
        if m: dates = m.group(0)
        elif i + 1 < len(lines):
            m2 = DATE_RANGE_RE.search(lines[i+1]) or SIMPLE_DATE_RE.search(lines[i+1])
            if m2: dates = m2.group(0); i += 1
        bullets, i2 = collect_bullets_any(lines, i+1); i = i2
        out.append({"name": name, "tech": tech, "dates": dates, "bullets": bullets})
    return out

def parse_skills(txt: str):
    if not txt: return {}
    out = {}
    for line in txt.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            key = k.strip().lower()
            items = [x.strip() for x in re.split(r",|;", v) if x.strip()]
            out[key] = items
    return out

def parse_resume(pdf_path: str) -> dict:
    # prefer OCR
    try:
        raw = extract_text_ocr(pdf_path)
        method = "pytesseract_ocr"
    except Exception:
        try:
            raw = extract_text_pymupdf(pdf_path)
            method = "pymupdf_text"
        except Exception:
            raw = extract_text_pypdf2(pdf_path)
            method = "pypdf2_text"
    raw = normalize_text(raw)
    sections = split_sections(raw)
    out = {
        "source_pdf": os.path.basename(pdf_path),
        "extracted_by": method,
        "contact": parse_contact_and_name(raw),
        "education": parse_education(sections.get("education", "")),
        "experience": parse_experience(sections.get("experience", "")),
        "projects": parse_projects(sections.get("projects", "")),
        "skills": parse_skills(sections.get("technical skills", "") or sections.get("skills", "")),
    }
    return out

# def main():
#     ap = argparse.ArgumentParser()
#     ap.add_argument("pdf", help="Path to resume PDF")
#     ap.add_argument("--out", help="Output JSON path (default: <pdf>.json)")
#     args = ap.parse_args()

#     data = parse_resume(args.pdf)
#     out_path = args.out or (os.path.splitext(args.pdf)[0] + ".json")
#     with open(out_path, "w") as f:
#         json.dump(data, f, indent=2)
#     print(f"Saved to {out_path}")

# if __name__ == "__main__":
#     main()
