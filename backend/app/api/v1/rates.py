from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import Rate
from app.schemas.boq import RateOut
from app.dependencies import get_current_user

router = APIRouter(prefix="/rates", tags=["rates"])


@router.get("/database", response_model=list[RateOut])
async def get_global_rates(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    """Return the pre-loaded global rate database (project_id IS NULL)."""
    result = await db.execute(select(Rate).where(Rate.project_id.is_(None)))
    return result.scalars().all()
