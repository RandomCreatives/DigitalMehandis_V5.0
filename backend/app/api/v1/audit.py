from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import AuditLog, User, Project
from app.schemas.audit import AuditLogOut
from app.dependencies import get_current_user

router = APIRouter(prefix="/projects/{project_id}/audit", tags=["audit"])

async def _check_project(project_id: UUID, user: User, db: AsyncSession):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user.id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

@router.get("", response_model=list[AuditLogOut])
async def list_audit_logs(
    project_id: UUID,
    category: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await _check_project(project_id, user, db)
    stmt = select(AuditLog).where(AuditLog.project_id == project_id).order_by(AuditLog.timestamp.desc())
    if category:
        stmt = stmt.where(AuditLog.action_category == category.upper())
    result = await db.execute(stmt)
    return result.scalars().all()
