"""
BOQ Generator — matches takeoff items to rates and computes amounts.
"""
from uuid import UUID
from typing import Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import TakeoffItem, FederatedQuantity, Rate


class BOQItem:
    """Unified representation of a quantity item for BOQ generation."""
    def __init__(
        self,
        description: str,
        quantity: float,
        unit: str,
        section: str,
        item_code: Optional[str] = None,
        notes: Optional[str] = None
    ):
        self.description = description
        self.quantity = float(quantity)
        self.unit = unit
        self.section = section
        self.item_code = item_code
        self.notes = notes


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

            amount = item.quantity * float(rate.rate_per_unit)
            total += amount

            lines.append({
                "item_number": idx,
                "description": item.description,
                "unit": item.unit,
                "quantity": item.quantity,
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

    async def _get_items(self) -> List[BOQItem]:
        # 1. Fetch Manual Takeoff Items
        stmt_manual = select(TakeoffItem).where(TakeoffItem.project_id == self.project_id)
        if self.section != "COMBINED":
            stmt_manual = stmt_manual.where(TakeoffItem.section == self.section)
        result_manual = await self.db.execute(stmt_manual)
        manual_items = result_manual.scalars().all()

        # 2. Fetch Federated (Approved) Items
        stmt_fed = select(FederatedQuantity).where(FederatedQuantity.project_id == self.project_id)
        if self.section != "COMBINED":
            stmt_fed = stmt_fed.where(FederatedQuantity.section == self.section)
        result_fed = await self.db.execute(stmt_fed)
        fed_items = result_fed.scalars().all()

        # 3. Unify
        unified: List[BOQItem] = []
        for item in manual_items:
            unified.append(BOQItem(
                description=item.description,
                quantity=item.quantity,
                unit=item.unit,
                section=item.section or "GENERAL",
                item_code=item.item_code,
                notes=item.notes
            ))

        for item in fed_items:
            unified.append(BOQItem(
                description=item.element_description,
                quantity=item.quantity_value,
                unit=item.quantity_unit,
                section=item.section,
                notes=item.notes
            ))

        return unified

    async def _get_rates(self) -> List[Rate]:
        # Project-specific rates first, then global rates (project_id IS NULL)
        # We order by project_id DESC so that non-null (project-specific) rates
        # come before null (global) rates.
        stmt = select(Rate).where(
            (Rate.project_id == self.project_id) | (Rate.project_id.is_(None))
        ).order_by(Rate.project_id.desc().nulls_last())
        result = await self.db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    def _match_rate(item: BOQItem, rates: List[Rate]) -> Optional[Rate]:
        desc_lower = item.description.lower()
        unit_lower = item.unit.lower()

        # 1. Try exact item_code match if available
        if item.item_code:
            for rate in rates:
                if rate.item_code == item.item_code:
                    return rate

        # 2. Try exact description + unit match
        for rate in rates:
            if rate.description.lower() == desc_lower and rate.unit.lower() == unit_lower:
                return rate

        # 3. Try exact description match only
        for rate in rates:
            if rate.description.lower() == desc_lower:
                return rate

        # 4. Try fuzzy/substring match + unit match
        for rate in rates:
            rate_desc_lower = rate.description.lower()
            if (rate_desc_lower in desc_lower or desc_lower in rate_desc_lower) and rate.unit.lower() == unit_lower:
                return rate

        # 5. Fallback: Fuzzy/substring match only
        for rate in rates:
            rate_desc_lower = rate.description.lower()
            if rate_desc_lower in desc_lower or desc_lower in rate_desc_lower:
                return rate

        return None
