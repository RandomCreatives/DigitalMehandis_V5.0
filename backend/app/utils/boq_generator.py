"""
BOQ Generator — matches takeoff items to rates and computes amounts.
"""
from difflib import SequenceMatcher
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import TakeoffItem, Rate


class BOQGenerator:
    # Minimum similarity threshold for fuzzy rate matching (0.0–1.0)
    FUZZY_THRESHOLD = 0.55

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
            rate = self._match_rate(item.description, rates)
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
    def _match_rate(description: str, rates: list[Rate]) -> Rate | None:
        """
        Match a takeoff description to the best available rate.

        Strategy:
        1. Substring match (exact containment) — highest confidence.
        2. Token overlap — medium confidence (e.g. "concrete C25" vs "C25 concrete").
        3. Fuzzy similarity (SequenceMatcher) — fallback for typos / slight wording differences.
        """
        desc_lower = description.lower().strip()
        desc_tokens = set(desc_lower.split())
        best_rate = None
        best_score = 0.0

        for rate in rates:
            rate_desc = rate.description.lower().strip()

            # 1. Exact substring containment
            if rate_desc in desc_lower or desc_lower in rate_desc:
                return rate  # immediate strong match

            # 2. Token overlap ratio
            rate_tokens = set(rate_desc.split())
            if desc_tokens and rate_tokens:
                overlap = len(desc_tokens & rate_tokens)
                token_score = overlap / max(len(desc_tokens), len(rate_tokens))
                if token_score > best_score:
                    best_score = token_score
                    best_rate = rate

            # 3. Fuzzy sequence similarity
            fuzzy = SequenceMatcher(None, desc_lower, rate_desc).ratio()
            if fuzzy > best_score:
                best_score = fuzzy
                best_rate = rate

        if best_score >= BOQGenerator.FUZZY_THRESHOLD:
            return best_rate

        return None
