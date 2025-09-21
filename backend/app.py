import os
import tempfile
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from dotenv import load_dotenv
from parsers.resume_parser import parse_resume
from parsers.transcript_parser import parse_major_and_courses, _extract_course_pairs
from agents.mentor_mentee_matching import init_MAN
from agents.ws_streamer import router as ws_router
from mcp_servers.course_mcp import rice_lookup_courses
from database.user_crud import OnboardingCRUD
from database.mentors_crud import MentorsCRUD
import certifi
from fastapi import Body


load_dotenv()

# MongoDB setup
MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("Please add MONGODB_URI to your environment variables")

client = AsyncIOMotorClient(
    MONGODB_URI,
    tls=True,                       # ensure TLS
    tlsCAFile=certifi.where(),      # <- trust store
    serverSelectionTimeoutMS=30000
    )
db = client.owlconnect
users_collection = db.users

# Initialize CRUD operations
user_crud = OnboardingCRUD(users_collection)

mentors = MentorsCRUD(db.mentors)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ws_router)

@app.get("/users/newest", response_model=dict)
async def get_newest_user():
    """
    Get the most recently created user.
    """
    user = await user_crud.get_most_recent()
    if not user:
        raise HTTPException(status_code=404, detail="No users found")
    return user

@app.get("/mentors", response_model=list[dict])
async def get_mentors():
    """
    Get all users who have indicated they want to be mentors.
    """
    mentorsdata = await mentors.get_all()
    return mentorsdata


# @app.post("/onboard")
# async def onboard(
#     resume_file: UploadFile = File(...),
#     transcript_file: UploadFile = File(...),
#     paragraph_text: str = Form(...)
# ):
#     resume_path = transcript_path = None
#     try:

#         with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as rtmp:
#             rtmp.write(await resume_file.read())
#             resume_path = rtmp.name
#         with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as ttmp:
#             ttmp.write(await transcript_file.read())
#             transcript_path = ttmp.name


#         resume_data = parse_resume(resume_path)
#         transcript_data = parse_major_and_courses(transcript_path)

#         # Build course list and call the tool function directly
#         course_pairs = _extract_course_pairs(transcript_data)
#         rice_catalog = await rice_lookup_courses(course_pairs, ac_year=2026)

#         payload = {
#             "paragraph_text": paragraph_text,
#             "resume_data": resume_data,
#             "transcript_data": transcript_data,
#             "rice_catalog": rice_catalog,
#         }
#         print(payload)
#         doc_id = await user_crud.create(payload)

#         return {"id": doc_id, **payload}
    
#     except Exception as e:
#         raise HTTPException(400, detail=f"Parsing failed: {e}")
#     finally:
#         for p in (resume_path, transcript_path):
#             if p:
#                 try: os.remove(p)
#                 except Exception: pass


@app.post("/onboard-files")
async def onboard_files(
    resume_file: UploadFile = File(...),
    transcript_file: UploadFile = File(...),
):
    resume_path = transcript_path = None
    try:

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as rtmp:
            rtmp.write(await resume_file.read())
            resume_path = rtmp.name
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as ttmp:
            ttmp.write(await transcript_file.read())
            transcript_path = ttmp.name


        resume_data = parse_resume(resume_path)
        transcript_data = parse_major_and_courses(transcript_path)

        # Build course list and call the tool function directly
        course_pairs = _extract_course_pairs(transcript_data)
        rice_catalog = await rice_lookup_courses(course_pairs, ac_year=2026)

        payload = {
            "resume_data": resume_data,
            "transcript_data": transcript_data,
            "rice_catalog": rice_catalog,
        }
        print(payload)
        doc_id = await user_crud.create(payload)

        return {"id": doc_id, **payload}
    
    except Exception as e:
        raise HTTPException(400, detail=f"Parsing failed: {e}")
    finally:
        for p in (resume_path, transcript_path):
            if p:
                try: os.remove(p)
                except Exception: pass

@app.post("/onboard-text")
async def onboard_text(paragraph_text: str = Form(...)):
    try:
        updated = await user_crud.update_most_recent_paragraph(paragraph_text)
        if not updated:
            raise HTTPException(status_code=404, detail="No onboarding document found. Call /onboard first.")
        return {
            "id": updated["id"],
            "paragraph_text": updated.get("paragraph_text"),
            "updated_at": updated.get("updated_at"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, detail=f"Update failed: {e}")


@app.post("/add-matched-mentors")
async def add_matched_mentors(
    doc_id: str = Body(...),
    mentors: List[Tuple] = Body(...)
):
    await user_crud.add_matched_mentors(doc_id, mentors)
    return {"id": doc_id, "matched_mentors": mentors}

@app.get("/get-matched-mentors")
async def get_matched_mentors():
    user = await user_crud.get_most_recent()
    return await user_crud.get_matched_mentors(user.get("id", ""))

@app.get("/get-mentor")
async def get_mentor(mentor_id: str):
    return await mentors.get(mentor_id)

# 
# llm call
# 
import json
import httpx
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "anthropic/claude-sonnet-4")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

Track = Literal[
    "Academics", "Research", "Internships", "Projects",
    "Skills", "Leadership", "Network", "Impact"
]

Icon = Literal[
    "GraduationCap", "FlaskConical", "Briefcase", "Code",
    "BookOpen", "Users", "Target", "Trophy"
]

class Action(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    label: str

class Milestone(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    title: str
    track: Track
    icon: Icon
    why: str
    mentorDid: str
    menteeNow: str
    deltaNote: str
    etaWeeks: int = Field(ge=1, le=52)
    impact: int = Field(ge=1, le=5)
    effort: int = Field(ge=1, le=5)
    actions: list[Action]
    deps: list[str] | None = None

    @field_validator("actions")
    @classmethod
    def _actions_len(cls, v: list[Action]):
        if len(v) != 3:
            raise ValueError("actions must contain exactly 3 items")
        return v

    @field_validator("icon")
    @classmethod
    def _icon_matches_track(cls, v: Icon, info):
        mapping = {
            "Academics": "GraduationCap",
            "Research": "FlaskConical",
            "Internships": "Briefcase",
            "Projects": "Code",
            "Skills": "BookOpen",
            "Leadership": "Users",
            "Network": "Target",
            "Impact": "Trophy",
        }
        track = info.data.get("track")
        if track and mapping.get(track) != v:
            raise ValueError(f"icon must be '{mapping[track]}' for track '{track}'")
        return v

class GenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mentee_background: str = Field(..., min_length=10)
    mentor_background: str = Field(..., min_length=10)
    count: int = Field(8, ge=8, le=9)

class GenerateResponse(BaseModel):
    milestones: list[Milestone]

    @model_validator(mode="after")
    def _len_check(self):
        ms = getattr(self, "milestones", [])
        if not (8 <= len(ms) <= 9):
            raise ValueError("milestones must contain 8 or 9 items")
        return self
    
SYSTEM_INSTRUCTIONS = """
You output ONLY strict JSON, no prose/markdown. Return a JSON ARRAY of 8 or 9
milestone objects (use the requested count) that map a mentee->mentor roadmap.

Each item MUST include exactly:
id, title, track, icon, why, mentorDid, menteeNow, deltaNote,
etaWeeks (1..52), impact (1..5), effort (1..5),
actions (exactly 3 items: {id,label}), deps (optional array of ids).

Valid tracks: "Academics","Research","Internships","Projects","Skills","Leadership","Network","Impact".
icon MUST match track exactly:
  Academics->GraduationCap
  Research->FlaskConical
  Internships->Briefcase
  Projects->Code
  Skills->BookOpen
  Leadership->Users
  Network->Target
  Impact->Trophy

Use ONLY details inferable from the provided backgrounds.
ids must be kebab-case. Action labels are short, imperative.
Return ONLY the JSON array (no wrapper keys, no commentary).
"""

def _user_prompt(mentee: str, mentor: str, count: int) -> str:
    return f"""
Mentee background:
\"\"\"{mentee}\"\"\"

Mentor background:
\"\"\"{mentor}\"\"\"

Produce exactly {count} milestone objects following the schema and rules. Return ONLY the JSON array.
"""

async def _call_openrouter(mentee_bg: str, mentor_bg: str, count: int) -> list[dict]:
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured")

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_INSTRUCTIONS.strip()},
            {"role": "user", "content": _user_prompt(mentee_bg, mentor_bg, count).strip()},
        ],
        "temperature": 0.2,
        "max_tokens": 2000,
        # JSON mode hint (gracefully ignored if unsupported)
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "X-Title": "OwlConnect Roadmap Generator",
    }

    async with httpx.AsyncClient(timeout=60) as client:
        res = await client.post(OPENROUTER_URL, headers=headers, json=payload)
        if res.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"OpenRouter error {res.status_code}: {res.text}")
        data = res.json()

    try:
        content = data["choices"][0]["message"]["content"]
    except Exception:
        raise HTTPException(status_code=502, detail="Malformed OpenRouter response")

    # parse array (or extract first array if model wrapped)
    try:
        parsed = json.loads(content)
        if isinstance(parsed, dict) and "milestones" in parsed and isinstance(parsed["milestones"], list):
            parsed = parsed["milestones"]
        if not isinstance(parsed, list):
            raise ValueError("Top-level JSON must be an array")
        return parsed
    except Exception:
        import re
        m = re.search(r"\[\s*{.*}\s*\]", content, re.DOTALL)
        if not m:
            raise HTTPException(status_code=502, detail="Failed to parse JSON array from model")
        return json.loads(m.group(0))


@app.post("/roadmap", response_model=GenerateResponse)
async def generate_roadmap(req: GenerateRequest):
    """
    Generate 8–9 milestone JSON objects based ONLY on mentee/mentor backgrounds.
    Returns an exact, validated array matching the SEED shape your UI expects.
    """
    raw = await _call_openrouter(req.mentee_background, req.mentor_background, req.count)

    # Strict validation (forbid extra keys, enforce icon mapping, 3 actions, etc.)
    try:
        milestones = [Milestone(**item).model_dump() for item in raw]
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Validation failed: {e}")

    # if len(milestones) != req.count:
    #     raise HTTPException(status_code=422, detail=f"Expected {req.count} items, got {len(milestones)}")

    return GenerateResponse(milestones=milestones)