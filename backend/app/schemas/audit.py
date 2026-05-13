from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class AuditLogBase(BaseModel):
    action_category: str
    action_type: str
    description: str
    payload: str | None = None

class AuditLogCreate(AuditLogBase):
    pass

class AuditLogOut(AuditLogBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    user_id: UUID | None = None
    timestamp: datetime
