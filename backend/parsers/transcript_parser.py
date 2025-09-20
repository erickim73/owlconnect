#!/usr/bin/env python3
from __future__ import annotations
import os, re, json, argparse, shutil
from typing import List, Dict, Any, Optional

def _normalize(s: str) -> str:
    s = s.replace("\ufb01","fi").replace("\ufb02","fl").replace("\xa0"," ")
    s = s.replace("\u2013","–").replace("\u2014","—").replace("\u2022","•")
    s = re.sub(r"[ \t]+"," ", s)
    s = "\n".join(line.rstrip() for line in s.splitlines())
    return s

def _extract_text_ocr(pdf_path: str) -> str:
    import fitz
    from PIL import Image
    import pytesseract
    if shutil.which("tesseract") is None:
        raise RuntimeError("tesseract binary not found (install tesseract-ocr)")
    doc = fitz.open(pdf_path)
    parts=[]
    for p in doc:
        pix = p.get_pixmap(matrix=fitz.Matrix(2.5,2.5))
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        parts.append(pytesseract.image_to_string(img, config="--psm 3"))
    return "\n".join(parts)

def _extract_text_pymupdf(pdf_path: str) -> str:
    import fitz
    doc = fitz.open(pdf_path)
    return "\n".join(p.get_text() for p in doc)

def _extract_text_pypdf2(pdf_path: str) -> str:
    from PyPDF2 import PdfReader
    r = PdfReader(pdf_path)
    return "\n".join((pg.extract_text() or "") for pg in r.pages)

def _extract_course_pairs(transcript_data: Dict[str, Any]) -> List[Dict[str, str]]:
    pairs: set[tuple[str, str]] = set()
    for bucket in ("courses_completed", "courses_in_progress"):
        for row in transcript_data.get(bucket, []) or []:
            subj = (row.get("subject") or "").strip().upper()
            num  = (row.get("number")  or "").strip().upper()
            if subj and num:
                pairs.add((subj, num))
    return [{"subject": s, "number": n} for s, n in sorted(pairs)]


# ---- Majors ----

def _clean_major(tok: str) -> str:
    tok = re.sub(r"^(Department|Major)\s*:\s*", "", tok, flags=re.IGNORECASE).strip(" ,")
    return tok

def parse_majors(text: str) -> List[str]:
    majors=[]
    m = re.search(r"Curriculum Information(.*?)(?:TRANSFER|INSTITUTION CREDIT|TRANSCRIPT TOTALS|COURSES IN PROGRESS|$)", text, re.IGNORECASE|re.DOTALL)
    block = m.group(1) if m else text[:800]
    lines = [l.strip() for l in block.splitlines() if l.strip()]
    i=0
    while i < len(lines):
        l = lines[i]
        if re.search(r"\bMajor\b", l, re.IGNORECASE):
            m1 = re.search(r"Major[^:]*:\s*(.*)$", l, re.IGNORECASE)
            if m1 and m1.group(1).strip():
                cand = _clean_major(m1.group(1))
                if cand and cand.lower() not in ("and","department","engineering division,"):
                    majors.append(cand)
            else:
                j=i+1
                while j < len(lines) and not lines[j].strip():
                    j+=1
                if j < len(lines):
                    cand = _clean_major(lines[j])
                    if cand and cand.lower() not in ("and","department"):
                        majors.append(cand)
                    i = j
        i+=1
    # dedupe
    out=[]; seen=set()
    for x in majors:
        if x not in seen:
            seen.add(x); out.append(x)
    return out

# ---- Courses ----

RE_SUBJ = r"[A-Z]{2,4}"
RE_NUM  = r"\d{3}[A-Z]?"
RE_LVL  = r"[A-Z]{2}"
RE_CRED = r"\d+\.\d{3}|\d+\.\d{2}|\d+"
RE_GRADE = r"(?:A\+?|A-?|B\+?|B-?|C\+?|C-?|D\+?|D-?|F|P|S|CR|TR|NC)"

COURSE_INST = re.compile(
    rf"^(?P<subject>{RE_SUBJ})\s+(?P<number>{RE_NUM})\s+(?P<level>{RE_LVL})\s+(?P<title>.*?)\s+(?P<grade>{RE_GRADE})\s+(?P<credits>{RE_CRED})\s+(?P<qpoints>{RE_CRED}|0\.00)$",
    re.MULTILINE
)
COURSE_TR = re.compile(
    rf"^(?P<subject>{RE_SUBJ})\s+(?P<number>{RE_NUM})\s+(?P<title>.*?)\s+(?P<grade>TR|AP|IB|CR)\s+(?P<credits>{RE_CRED})\s+(?P<qpoints>{RE_CRED}|0\.00)$",
    re.MULTILINE
)
COURSE_INPROG = re.compile(
    rf"^(?P<subject>{RE_SUBJ})\s+(?P<number>{RE_NUM})\s+(?P<level>{RE_LVL})\s+(?P<title>.*?)\s+(?P<credits>{RE_CRED})$",
    re.MULTILINE
)

SEASON_HEADER = re.compile(r"^(Fall|Spring|Summer|Winter)\s+\d{4}\s*:", re.IGNORECASE|re.MULTILINE)
TERM_LINE = re.compile(r"^\s*Term:\s*(.+)$", re.MULTILINE)

def _find_term(text: str, pos: int) -> Optional[str]:
    prior = text[:pos]
    m = list(TERM_LINE.finditer(prior))
    if m: return m[-1].group(1).strip()
    m2 = list(SEASON_HEADER.finditer(prior))
    if m2: return m2[-1].group(0).split(":")[0].strip()
    return None

def parse_courses_completed(text: str) -> List[Dict[str,Any]]:
    out=[]
    for m in COURSE_INST.finditer(text):
        out.append({
            "term": _find_term(text, m.start()),
            "subject": m.group("subject"), "number": m.group("number"),
            "level": m.group("level"),
            "title": m.group("title").strip(),
            "grade": m.group("grade"),
            "credits": float(m.group("credits")),
            "source": "institution", "status": "completed"
        })
    for m in COURSE_TR.finditer(text):
        out.append({
            "term": _find_term(text, m.start()),
            "subject": m.group("subject"), "number": m.group("number"),
            "title": m.group("title").strip(),
            "grade": m.group("grade"),
            "credits": float(m.group("credits")),
            "source": "transfer", "status": "completed"
        })
    return out

def parse_courses_in_progress(text: str, text_plain: Optional[str]) -> List[Dict[str,Any]]:
    sec = None
    for t in [text, text_plain or ""]:
        if not t: continue
        m = re.search(r"COURSES IN PROGRESS(.*?)(?:Esther Privacy|$)", t, re.IGNORECASE|re.DOTALL)
        if m: sec = m.group(1); break
    if not sec: return []
    tm = re.search(r"\bTerm:\s*(.+)", sec)
    term = tm.group(1).strip() if tm else None
    courses=[]
    for m in COURSE_INPROG.finditer(sec):
        title = m.group("title").strip()
        if re.search(rf"\s{RE_GRADE}$", title):  # avoid completed lines
            continue
        courses.append({
            "term": term,
            "subject": m.group("subject"), "number": m.group("number"),
            "level": m.group("level"), "title": title,
            "credits": float(m.group("credits")),
            "source":"institution","status":"in_progress"
        })
    return courses

def parse_major_and_courses(pdf_path: str) -> Dict[str, Any]:
    # prefer PyMuPDF text; fallback to OCR then PyPDF2 — OCR is noisy for columns
    try:
        text = _normalize(_extract_text_pymupdf(pdf_path)); method = "pymupdf_text"
    except Exception:
        try:
            text = _normalize(_extract_text_ocr(pdf_path)); method = "pytesseract_ocr"
        except Exception:
            text = _normalize(_extract_text_pypdf2(pdf_path)); method = "pypdf2_text"
    # also a plain variant for CIP fallback
    try:
        plain = _normalize(_extract_text_pymupdf(pdf_path))
    except Exception:
        plain = None
    majors = parse_majors(text)
    completed = parse_courses_completed(text)
    inprog = parse_courses_in_progress(text, plain)
    return {"majors": majors, "courses_completed": completed, "courses_in_progress": inprog, "_extracted_by": method}

# def main():
#     ap = argparse.ArgumentParser()
#     ap.add_argument("pdf")
#     ap.add_argument("--out")
#     args = ap.parse_args()
#     data = parse_major_and_courses(args.pdf)
#     out_path = args.out or (os.path.splitext(args.pdf)[0] + ".major_courses.json")
#     with open(out_path, "w") as f: json.dump(data, f, indent=2)
#     print(f"Saved to {out_path}")

# if __name__ == "__main__":
#     main()
