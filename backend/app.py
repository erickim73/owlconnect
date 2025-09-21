import os
import tempfile
from typing import Dict, Any, List, Optional
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
    mentors: List[str] = Body(...)
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


