from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class TakeoffItemCreate(BaseModel):
    description: str
    unit: str
    quantity: float
    section: str | None = None
    notes: str | None = None
    item_code: str | None = None


class TakeoffItemUpdate(BaseModel):
    description: str | None = None
    unit: str | None = None
    quantity: float | None = None
    section: str | None = None
    notes: str | None = None


class TakeoffItemOut(BaseModel):
    id: UUID
    project_id: UUID
    item_code: str | None
    description: str
    unit: str
    quantity: float
    section: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
