# user_crud.py
from __future__ import annotations
from typing import Any, Dict, Optional, List
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
    def __init__(self, collection: AsyncIOMotorCollection):
        self.collection = collection

    async def create_indexes(self) -> None:
        await self.collection.create_index([("resume_data.contact.email", 1)], sparse=True)
        await self.collection.create_index([("transcript_data.majors", 1)], sparse=True)
        await self.collection.create_index([("created_at", -1)])

    async def create(self, payload: Dict[str, Any]) -> str:
        doc = {
            **payload,
            "onboarding_complete": True,
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

    async def get_most_recent(self) -> Optional[Dict[str, Any]]:
        doc = await self.collection.find_one({}, sort=[("created_at", -1)])
        return _to_str_id(doc)

    async def update_most_recent_paragraph(self, text: str) -> Optional[Dict[str, Any]]:
        # 1) find most recent doc
        current = await self.collection.find_one({}, sort=[("created_at", -1)])
        if not current:
            return None
        _id = current["_id"]

        # 2) update it
        await self.collection.update_one(
            {"_id": _id},
            {"$set": {"paragraph_text": text, "updated_at": datetime.utcnow()}}
        )

        # 3) fetch updated doc
        updated = await self.collection.find_one({"_id": _id})
        return _to_str_id(updated)

    
    async def add_matched_mentors(self, doc_id: str, mentors: List[str]) -> None:
        await self.collection.update_one(
            {"_id": ObjectId(doc_id)},
            {"$set": {"matched_mentors": mentors}}
        )

    async def get_matched_mentors(self, doc_id: str) -> Optional[List[str]]:
        doc = await self.collection.find_one({"_id": ObjectId(doc_id)})
        if doc and "matched_mentors" in doc:
            return doc["matched_mentors"]
        return []