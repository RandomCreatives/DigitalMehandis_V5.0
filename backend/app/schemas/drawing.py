from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class DrawingOut(BaseModel):
    id: UUID
    project_id: UUID
    filename: str
    file_size_mb: float | None
    category: str | None
    page_count: int | None
    scale: str | None
    title_block_text: str | None
    user_notes: str | None
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class DrawingUpdate(BaseModel):
    category: str | None = None
    user_notes: str | None = None
    scale: str | None = None
