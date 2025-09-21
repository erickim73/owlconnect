# database/mentors_crud.py (or onboarding_crud.py)
from __future__ import annotations
from typing import Any, Dict, List, Optional, Iterable
from motor.motor_asyncio import AsyncIOMotorCollection
from bson import ObjectId

def _to_str_id_one(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return None
    # copy to avoid mutating Motor’s internal dicts (good practice)
    out = dict(doc)
    _id = out.pop("_id", None)
    if _id is not None:
        out["id"] = str(_id)
    return out

def _to_str_id_many(docs: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [d for d in (_to_str_id_one(doc) for doc in docs) if d is not None]

class MentorsCRUD:
    def __init__(self, collection: AsyncIOMotorCollection):
        self.collection = collection

    async def get_all(self) -> List[Dict[str, Any]]:
        cursor = self.collection.find({})  # add filters here if needed
        docs = await cursor.to_list(length=None)
        return _to_str_id_many(docs)

    async def get(self, id: str) -> Optional[Dict[str, Any]]:
        doc = await self.collection.find_one({"_id": ObjectId(id)})
        return _to_str_id_one(doc)
