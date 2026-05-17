"""
Phase 2 — Cost Engine: Government Direct Cost Library + Rate Matching + Pricing
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Integer, Text, ForeignKey, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


def now_utc():
    return datetime.now(timezone.utc)


# ── Rate Sources ──────────────────────────────────────────────────────────────

class RateSource(Base):
    __tablename__ = "rate_sources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    issuing_authority: Mapped[str | None] = mapped_column(String(255), nullable=True)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fiscal_year: Mapped[str | None] = mapped_column(String(50), nullable=True)
    quarter: Mapped[str | None] = mapped_column(String(50), nullable=True)
    calendar_system: Mapped[str] = mapped_column(String(50), default="EC")
    cost_type: Mapped[str] = mapped_column(String(50), default="DIRECT_COST")
    currency: Mapped[str] = mapped_column(String(10), default="ETB")
    source_file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_official: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    rate_items: Mapped[list["RateItem"]] = relationship(
        "RateItem", back_populates="rate_source", cascade="all, delete-orphan"
    )
    raw_import_rows: Mapped[list["RawRateImportRow"]] = relationship(
        "RawRateImportRow", back_populates="rate_source", cascade="all, delete-orphan"
    )


# ── Rate Items ────────────────────────────────────────────────────────────────

class RateItem(Base):
    __tablename__ = "rate_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rate_source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rate_sources.id", ondelete="CASCADE"), nullable=False
    )
    item_no: Mapped[str | None] = mapped_column(String(50), nullable=True)
    work_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sub_category: Mapped[str | None] = mapped_column(String(150), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    normalized_unit: Mapped[str | None] = mapped_column(String(30), nullable=True)
    direct_cost: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="ETB")
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fiscal_year: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source_page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    rate_source: Mapped["RateSource"] = relationship("RateSource", back_populates="rate_items")
    element_matches: Mapped[list["ElementRateMatch"]] = relationship(
        "ElementRateMatch", back_populates="rate_item"
    )


# ── Raw Rate Import Rows ──────────────────────────────────────────────────────

class RawRateImportRow(Base):
    __tablename__ = "raw_rate_import_rows"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rate_source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rate_sources.id", ondelete="CASCADE"), nullable=False
    )
    source_page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    raw_item_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    raw_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    raw_cost: Mapped[str | None] = mapped_column(String(100), nullable=True)
    parsed_item_no: Mapped[str | None] = mapped_column(String(50), nullable=True)
    parsed_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    parsed_unit: Mapped[str | None] = mapped_column(String(30), nullable=True)
    parsed_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(30), default="PENDING")
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    rate_source: Mapped["RateSource"] = relationship("RateSource", back_populates="raw_import_rows")


# ── Project Pricing Settings ──────────────────────────────────────────────────

class ProjectPricingSettings(Base):
    __tablename__ = "project_pricing_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    selected_rate_source_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rate_sources.id", ondelete="SET NULL"), nullable=True
    )
    contractor_grade: Mapped[str | None] = mapped_column(String(50), nullable=True)
    overhead_percent: Mapped[float] = mapped_column(Float, default=8.0)
    profit_percent: Mapped[float] = mapped_column(Float, default=10.0)
    tax_percent: Mapped[float] = mapped_column(Float, default=0.0)
    pricing_mode: Mapped[str] = mapped_column(String(50), default="ADDITIVE")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    selected_rate_source: Mapped["RateSource | None"] = relationship("RateSource")


# ── Element Rate Matches ──────────────────────────────────────────────────────

class ElementRateMatch(Base):
    __tablename__ = "element_rate_matches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    project_element_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("project_elements.id", ondelete="CASCADE"), nullable=False
    )
    rate_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rate_items.id", ondelete="SET NULL"), nullable=True
    )
    match_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    match_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="SUGGESTED")
    applied_direct_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    applied_final_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    override_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    rate_item: Mapped["RateItem | None"] = relationship("RateItem", back_populates="element_matches")
