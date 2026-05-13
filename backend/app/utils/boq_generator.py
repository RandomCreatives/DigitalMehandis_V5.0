"""
BOQ Generator — matches takeoff items to rates and computes amounts.
"""
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import TakeoffItem, Rate


class BOQGenerator:
    def __init__(self, db: AsyncSession, project_id: UUID, section: str = "COMBINED"):
        self.db = db
        self.project_id = project_id
        self.section = section

    async def generate(self) -> dict:
        items = await self._get_items()
        rates = await self._get_rates()

        lines = []
        total = 0.0

        for idx, item in enumerate(items, 1):
            rate = self._match_rate(item, rates)
            if rate is None:
                continue

            amount = float(item.quantity) * float(rate.rate_per_unit)
            total += amount

            lines.append({
                "item_number": idx,
                "description": item.description,
                "unit": item.unit,
                "quantity": float(item.quantity),
                "rate": float(rate.rate_per_unit),
                "amount": round(amount, 2),
                "notes": item.notes or "",
            })

        return {
            "project_id": self.project_id,
            "section": self.section,
            "lines": lines,
            "total_amount": round(total, 2),
            "currency": "ETB",
        }

    async def _get_items(self) -> list[TakeoffItem]:
        stmt = select(TakeoffItem).where(TakeoffItem.project_id == self.project_id)
        if self.section != "COMBINED":
            stmt = stmt.where(TakeoffItem.section == self.section)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def _get_rates(self) -> list[Rate]:
        # Project-specific rates first, then global rates (project_id IS NULL)
        stmt = select(Rate).where(
            (Rate.project_id == self.project_id) | (Rate.project_id.is_(None))
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    def _match_rate(item: TakeoffItem, rates: list[Rate]) -> Rate | None:
        """
        Tiered matching logic:
        1. Exact item_code + unit match
        2. Exact description + unit match (case-insensitive)
        3. Substring description match (first one found)
        """
        item_desc = item.description.lower().strip()
        item_code = (item.item_code or "").lower().strip()
        item_unit = (item.unit or "").lower().strip()

        # Tier 1: Exact Code + Unit
        if item_code:
            for rate in rates:
                if (rate.item_code or "").lower().strip() == item_code and \
                   (rate.unit or "").lower().strip() == item_unit:
                    return rate

        # Tier 2: Exact Description + Unit
        for rate in rates:
            if rate.description.lower().strip() == item_desc and \
               (rate.unit or "").lower().strip() == item_unit:
                return rate

        # Tier 3: Substring Description Match
        for rate in rates:
            rate_desc = rate.description.lower().strip()
            if rate_desc in item_desc or item_desc in rate_desc:
                return rate

        return None
