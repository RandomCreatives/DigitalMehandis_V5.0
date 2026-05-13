import json
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import AuditLog

async def log_action(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID | None,
    category: str,
    action_type: str,
    description: str,
    payload: dict | None = None
) -> AuditLog:
    """
    Utility to log system actions for traceability.
    """
    log = AuditLog(
        project_id=project_id,
        user_id=user_id,
        action_category=category.upper(),
        action_type=action_type.upper(),
        description=description,
        payload=json.dumps(payload) if payload else None
    )
    db.add(log)
    await db.flush() # ensure it gets an ID
    return log
