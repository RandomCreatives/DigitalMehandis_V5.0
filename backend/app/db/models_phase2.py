"""
Phase 2 — Drawing-Aware QS + Federation Foundation
New tables added alongside Phase 1 tables (backward compatible).

New tables:
  drawing_pages         — multi-page PDF support
  drawing_calibrations  — scale calibration per drawing/page
  measurements          — persistent canvas measurements with geometry
  project_elements      — simple element identity (Phase 3 will expand)
  quantity_sources      — traceability: every quantity knows its origin
  boq_items             — editable BOQ builder (replaces generated-only)
  boq_item_sources      — links BOQ items to approved quantities
  audit_logs            — professional accountability trail
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    String, Boolean, Integer, Numeric, Text,
    ForeignKey, DateTime, JSON, Float,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


def now_utc():
    return datetime.now(timezone.utc)


# ── Drawing Pages ─────────────────────────────────────────────────────────────

class DrawingPage(Base):
    """One page of a multi-page PDF drawing."""
    __tablename__ = "drawing_pages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    drawing_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("drawings.id", ondelete="CASCADE"), nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    width_px: Mapped[float | None] = mapped_column(Float)
    height_px: Mapped[float | None] = mapped_column(Float)
    width_mm: Mapped[float | None] = mapped_column(Float)
    height_mm: Mapped[float | None] = mapped_column(Float)
    thumbnail_path: Mapped[str | None] = mapped_column(String(500))
    rendered_image_path: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    calibrations: Mapped[list["DrawingCalibration"]] = relationship(
        "DrawingCalibration", back_populates="page", cascade="all, delete-orphan"
    )
    measurements: Mapped[list["Measurement"]] = relationship(
        "Measurement", back_populates="page", cascade="all, delete-orphan"
    )


# ── Drawing Calibration ───────────────────────────────────────────────────────

class DrawingCalibration(Base):
    """
    Scale calibration for a drawing page.
    User clicks two known points → enters real-world distance → scale factor computed.
    Prepares drawings for future global coordinate federation.
    """
    __tablename__ = "drawing_calibrations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    drawing_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("drawings.id", ondelete="CASCADE"), nullable=False)
    page_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("drawing_pages.id", ondelete="SET NULL"), nullable=True)
    page_number: Mapped[int] = mapped_column(Integer, default=1)

    # Two-point calibration
    reference_name: Mapped[str | None] = mapped_column(String(100))  # e.g. "Grid A-1 to A-2"
    point_a_x: Mapped[float] = mapped_column(Float, nullable=False)  # canvas pixels
    point_a_y: Mapped[float] = mapped_column(Float, nullable=False)
    point_b_x: Mapped[float] = mapped_column(Float, nullable=False)
    point_b_y: Mapped[float] = mapped_column(Float, nullable=False)
    pixel_distance: Mapped[float] = mapped_column(Float, nullable=False)

    # Real-world measurement
    real_distance: Mapped[float] = mapped_column(Float, nullable=False)
    real_unit: Mapped[str] = mapped_column(String(10), default="m")  # m, mm, cm

    # Computed
    scale_factor: Mapped[float] = mapped_column(Float, nullable=False)  # real_distance / pixel_distance
    pixels_per_meter: Mapped[float] = mapped_column(Float, nullable=False)

    # Optional spatial metadata (for Phase 3 federation)
    floor_level: Mapped[str | None] = mapped_column(String(50))   # GF, 1F, B1
    grid_reference: Mapped[str | None] = mapped_column(String(100))
    rotation_degrees: Mapped[float] = mapped_column(Float, default=0.0)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    page: Mapped["DrawingPage | None"] = relationship("DrawingPage", back_populates="calibrations")
    project: Mapped["Project"] = relationship("Project", back_populates="calibrations", foreign_keys="[DrawingCalibration.project_id]")


# ── Measurements ──────────────────────────────────────────────────────────────

class Measurement(Base):
    """
    A persistent canvas measurement on a drawing page.
    Stores geometry (points), computed value, and links to a project element.
    This is the core of drawing-aware QS.
    """
    __tablename__ = "measurements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    drawing_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("drawings.id", ondelete="CASCADE"), nullable=False)
    page_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("drawing_pages.id", ondelete="SET NULL"), nullable=True)
    page_number: Mapped[int] = mapped_column(Integer, default=1)
    calibration_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("drawing_calibrations.id", ondelete="SET NULL"), nullable=True)

    # Measurement identity
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    measurement_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # LENGTH | AREA | COUNT | VOLUME | DEDUCTION | ANNOTATION

    # Classification
    discipline: Mapped[str] = mapped_column(String(50), nullable=False)
    # ARCHITECTURAL | STRUCTURAL | ELECTRICAL | SANITARY
    section: Mapped[str] = mapped_column(String(50), nullable=False)
    # SUBSTRUCTURE | SUPERSTRUCTURE
    element_category: Mapped[str] = mapped_column(String(100), nullable=False)
    # WALL | COLUMN | FLOOR | DOOR | SOCKET etc.

    # Computed values
    raw_value: Mapped[float] = mapped_column(Float, nullable=False)   # in canvas units
    final_value: Mapped[float] = mapped_column(Float, nullable=False) # in real-world units
    unit: Mapped[str] = mapped_column(String(20), nullable=False)     # m, m², m³, Nr
    multiplier: Mapped[float] = mapped_column(Float, default=1.0)     # e.g. 2 faces of wall
    scale_factor_used: Mapped[float | None] = mapped_column(Float)    # from calibration

    # Geometry — canvas pixel coordinates
    # LENGTH: [{"x": 100, "y": 200}, {"x": 400, "y": 200}, ...]
    # AREA:   [{"x": 100, "y": 200}, {"x": 400, "y": 200}, ...]  (polygon)
    # COUNT:  [{"x": 100, "y": 200}]  (single point per item)
    points_json: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Visual
    color: Mapped[str] = mapped_column(String(20), default="#eb6905")
    stroke_width: Mapped[int] = mapped_column(Integer, default=2)

    # Link to project element (optional — user can create/link element after measuring)
    project_element_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("project_elements.id", ondelete="SET NULL"), nullable=True
    )

    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    page: Mapped["DrawingPage | None"] = relationship("DrawingPage", back_populates="measurements")
    project_element: Mapped["ProjectElement | None"] = relationship("ProjectElement", back_populates="measurements")
    quantity_sources: Mapped[list["QuantitySource"]] = relationship("QuantitySource", back_populates="measurement", cascade="all, delete-orphan")
    project: Mapped["Project"] = relationship("Project", back_populates="measurements", foreign_keys="[Measurement.project_id]")


# ── Project Elements ──────────────────────────────────────────────────────────

class ProjectElement(Base):
    """
    Simple element identity for Phase 2.
    Represents a physical construction element (wall, column, socket, etc.)
    linked to one or more measurements.

    Phase 3 will expand this with full spatial federation, bounding boxes,
    cross-discipline matching, and relationship detection.
    """
    __tablename__ = "project_elements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    # Identity
    element_code: Mapped[str] = mapped_column(String(50), nullable=False)  # W-001, C-A1, DR-05
    element_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # WALL | COLUMN | BEAM | SLAB | DOOR | WINDOW | SOCKET | LIGHT | PIPE | FOOTING | etc.

    # Classification
    discipline: Mapped[str] = mapped_column(String(50), nullable=False)
    section: Mapped[str] = mapped_column(String(50), nullable=False)  # SUBSTRUCTURE | SUPERSTRUCTURE
    floor_level: Mapped[str | None] = mapped_column(String(50))       # GF, 1F, B1

    # Source
    drawing_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("drawings.id", ondelete="SET NULL"), nullable=True)
    page_number: Mapped[int | None] = mapped_column(Integer)
    source_type: Mapped[str] = mapped_column(String(50), default="MANUAL_ENTRY")
    # MANUAL_ENTRY | PDF_MEASUREMENT | DXF_LAYER | DXF_BLOCK

    # Approximate location (canvas coords — Phase 3 converts to global)
    approx_x: Mapped[float | None] = mapped_column(Float)
    approx_y: Mapped[float | None] = mapped_column(Float)

    # Geometry (flexible JSON)
    geometry_json: Mapped[dict | None] = mapped_column(JSON)

    # Specification
    material: Mapped[str | None] = mapped_column(String(255))
    specification: Mapped[dict | None] = mapped_column(JSON)

    # Status
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
    # ACTIVE | SUPERSEDED | DELETED
    confidence: Mapped[float] = mapped_column(Float, default=1.0)

    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    measurements: Mapped[list["Measurement"]] = relationship("Measurement", back_populates="project_element")
    quantity_sources: Mapped[list["QuantitySource"]] = relationship("QuantitySource", back_populates="project_element")
    project: Mapped["Project"] = relationship("Project", back_populates="project_elements", foreign_keys="[ProjectElement.project_id]")


# ── Quantity Sources ──────────────────────────────────────────────────────────

class QuantitySource(Base):
    """
    Traceability record: every approved quantity knows exactly where it came from.
    This is the key Phase 2 architectural addition.

    A quantity can have multiple sources (e.g., wall area from 3 different measurements).
    """
    __tablename__ = "quantity_sources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    # What quantity does this source belong to?
    # Can point to either a SuggestedQuantity (legacy) or a BOQItem (new)
    suggested_quantity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("suggested_quantities.id", ondelete="CASCADE"), nullable=True
    )
    boq_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("boq_items.id", ondelete="CASCADE"), nullable=True
    )

    # Source type
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # PDF_MEASUREMENT | DXF_LAYER_EXTRACTION | DXF_BLOCK_COUNT
    # MANUAL_ENTRY | BBS_CALCULATION | PDF_OCR | PDF_TEXT_EXTRACTION

    # Source references (all optional — depends on source_type)
    drawing_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("drawings.id", ondelete="SET NULL"), nullable=True)
    page_number: Mapped[int | None] = mapped_column(Integer)
    measurement_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("measurements.id", ondelete="SET NULL"), nullable=True)
    project_element_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("project_elements.id", ondelete="SET NULL"), nullable=True)

    # DXF-specific
    dxf_layer: Mapped[str | None] = mapped_column(String(255))
    dxf_block_name: Mapped[str | None] = mapped_column(String(255))
    dxf_entity_id: Mapped[str | None] = mapped_column(String(255))

    # Contribution
    contribution_value: Mapped[float | None] = mapped_column(Float)
    contribution_unit: Mapped[str | None] = mapped_column(String(20))

    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    measurement: Mapped["Measurement | None"] = relationship("Measurement", back_populates="quantity_sources")
    project_element: Mapped["ProjectElement | None"] = relationship("ProjectElement", back_populates="quantity_sources")


# ── BOQ Items (Phase 2 editable BOQ builder) ──────────────────────────────────

class BOQItem(Base):
    """
    Editable BOQ line item.
    Replaces the generated-only BOQ from Phase 1.
    Each item can be linked to multiple approved quantities via BOQItemSource.
    """
    __tablename__ = "boq_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    # BOQ structure
    item_no: Mapped[str] = mapped_column(String(20), nullable=False)   # 1.1, 2.3, etc.
    section: Mapped[str] = mapped_column(String(50), nullable=False)   # SUBSTRUCTURE | SUPERSTRUCTURE | ELECTRICAL | SANITARY | PRELIMINARIES
    trade: Mapped[str | None] = mapped_column(String(100))             # Concrete Works, Masonry, etc.

    description: Mapped[str] = mapped_column(Text, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    rate: Mapped[float] = mapped_column(Float, default=0.0)
    amount: Mapped[float] = mapped_column(Float, default=0.0)          # quantity × rate

    # Adjustments
    waste_factor: Mapped[float] = mapped_column(Float, default=0.0)    # percentage
    notes: Mapped[str | None] = mapped_column(Text)

    # Status
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False)    # locked after approval
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    sources: Mapped[list["BOQItemSource"]] = relationship("BOQItemSource", back_populates="boq_item", cascade="all, delete-orphan")
    quantity_sources: Mapped[list["QuantitySource"]] = relationship("QuantitySource", back_populates="boq_item")
    project: Mapped["Project"] = relationship("Project", back_populates="boq_items", foreign_keys="[BOQItem.project_id]")


class BOQItemSource(Base):
    """Links a BOQ item to its contributing approved quantities and measurements."""
    __tablename__ = "boq_item_sources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    boq_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("boq_items.id", ondelete="CASCADE"), nullable=False)

    # What contributes to this BOQ item
    suggested_quantity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("suggested_quantities.id", ondelete="SET NULL"), nullable=True)
    measurement_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("measurements.id", ondelete="SET NULL"), nullable=True)
    project_element_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("project_elements.id", ondelete="SET NULL"), nullable=True)

    contribution_quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    boq_item: Mapped["BOQItem"] = relationship("BOQItem", back_populates="sources")


# ── Audit Logs ────────────────────────────────────────────────────────────────

class AuditLog(Base):
    """
    Professional accountability trail.
    Every significant QS action is logged.
    """
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    action: Mapped[str] = mapped_column(String(100), nullable=False)
    # DRAWING_UPLOADED | DRAWING_CALIBRATED | MEASUREMENT_CREATED
    # QUANTITY_APPROVED | QUANTITY_REJECTED | BOQ_GENERATED
    # RATE_CHANGED | BBS_ITEM_CREATED | EXPORT_GENERATED
    # ELEMENT_CREATED | ELEMENT_LINKED | BOQ_ITEM_CREATED

    entity_type: Mapped[str | None] = mapped_column(String(50))   # Drawing, Measurement, BOQItem, etc.
    entity_id: Mapped[str | None] = mapped_column(String(36))     # UUID as string

    old_value: Mapped[dict | None] = mapped_column(JSON)
    new_value: Mapped[dict | None] = mapped_column(JSON)
    description: Mapped[str | None] = mapped_column(Text)

    ip_address: Mapped[str | None] = mapped_column(String(45))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    project: Mapped["Project | None"] = relationship("Project", back_populates="audit_logs", foreign_keys="[AuditLog.project_id]")
