# onboarding_crud.py
from __future__ import annotations
from typing import Any, Dict, Optional
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection

def _to_str_id(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return None
    doc["id"] = str(doc["_id"])
    doc.pop("_id", None)
    return doc

class OnboardingCRUD:
    """
    Stores the exact object you return from /onboard:
      {
        "paragraph_text": str,
        "resume_data": {...},
        "transcript_data": {...},
        "rice_catalog": {...}
      }
    """
    def __init__(self, collection: AsyncIOMotorCollection):
        self.collection = collection

    async def create_indexes(self) -> None:
        # helpful, but minimal
        await self.collection.create_index([("resume_data.contact.email", 1)], sparse=True)
        await self.collection.create_index([("transcript_data.majors", 1)], sparse=True)

    async def create(self, payload: Dict[str, Any]) -> str:
        doc = {
            **payload,                      # the exact onboarding blob
            "onboarding_complete": True,    # you've already parsed it
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        res = await self.collection.insert_one(doc)
        return str(res.inserted_id)

    async def get(self, doc_id: str) -> Optional[Dict[str, Any]]:
        try:
            doc = await self.collection.find_one({"_id": ObjectId(doc_id)})
        except Exception:
            return None
        return _to_str_id(doc)