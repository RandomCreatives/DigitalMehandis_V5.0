"""
Phase 2 Pydantic schemas — Drawing-Aware QS + Federation Foundation.

Covers:
  - DrawingCalibration
  - Measurement
  - ProjectElement
  - BOQItem / BOQItemSource
  - AuditLog
  - QuantitySource
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator


# ── Drawing Calibration ───────────────────────────────────────────────────────

class DrawingCalibrationCreate(BaseModel):
    page_number: int = Field(default=1, ge=1)
    reference_name: str | None = Field(default=None, max_length=100, examples=["Grid A-1 to A-2"])
    point_a_x: float = Field(..., description="Canvas pixel X of first point")
    point_a_y: float = Field(..., description="Canvas pixel Y of first point")
    point_b_x: float = Field(..., description="Canvas pixel X of second point")
    point_b_y: float = Field(..., description="Canvas pixel Y of second point")
    real_distance: float = Field(..., gt=0, description="Real-world distance between the two points")
    real_unit: str = Field(default="m", pattern="^(m|mm|cm|ft|in)$")
    floor_level: str | None = Field(default=None, max_length=50, examples=["GF", "1F", "B1"])
    grid_reference: str | None = Field(default=None, max_length=100)
    rotation_degrees: float = Field(default=0.0)

    @model_validator(mode="after")
    def points_must_differ(self) -> DrawingCalibrationCreate:
        dx = self.point_b_x - self.point_a_x
        dy = self.point_b_y - self.point_a_y
        if (dx * dx + dy * dy) < 1:
            raise ValueError("point_a and point_b must be at least 1 pixel apart")
        return self


class DrawingCalibrationOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    drawing_id: uuid.UUID
    page_number: int
    reference_name: str | None
    point_a_x: float
    point_a_y: float
    point_b_x: float
    point_b_y: float
    pixel_distance: float
    real_distance: float
    real_unit: str
    scale_factor: float
    pixels_per_meter: float
    floor_level: str | None
    grid_reference: str | None
    rotation_degrees: float
    is_active: bool
    created_by: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Measurement ───────────────────────────────────────────────────────────────

class MeasurementCreate(BaseModel):
    page_number: int = Field(default=1, ge=1)
    label: str = Field(..., max_length=255)
    measurement_type: str = Field(
        ...,
        pattern="^(LENGTH|AREA|COUNT|VOLUME|DEDUCTION|ANNOTATION)$",
        description="LENGTH | AREA | COUNT | VOLUME | DEDUCTION | ANNOTATION",
    )
    discipline: str = Field(
        ...,
        pattern="^(ARCHITECTURAL|STRUCTURAL|ELECTRICAL|SANITARY)$",
    )
    section: str = Field(
        ...,
        pattern="^(SUBSTRUCTURE|SUPERSTRUCTURE)$",
    )
    element_category: str = Field(..., max_length=100)
    points_json: dict = Field(
        ...,
        description='{"points": [{"x": 100, "y": 200}, ...]}',
    )
    multiplier: float = Field(default=1.0, gt=0)
    color: str = Field(default="#eb6905", max_length=20)
    notes: str | None = None
    project_element_id: uuid.UUID | None = None
    calibration_id: uuid.UUID | None = None


class MeasurementUpdate(BaseModel):
    label: str | None = Field(default=None, max_length=255)
    discipline: str | None = None
    section: str | None = None
    element_category: str | None = None
    multiplier: float | None = Field(default=None, gt=0)
    color: str | None = Field(default=None, max_length=20)
    notes: str | None = None
    project_element_id: uuid.UUID | None = None


class MeasurementOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    drawing_id: uuid.UUID
    page_number: int
    calibration_id: uuid.UUID | None
    label: str
    measurement_type: str
    discipline: str
    section: str
    element_category: str
    raw_value: float
    final_value: float
    unit: str
    multiplier: float
    scale_factor_used: float | None
    points_json: Any
    color: str
    project_element_id: uuid.UUID | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Project Element ───────────────────────────────────────────────────────────

class ProjectElementCreate(BaseModel):
    element_code: str = Field(..., max_length=50, examples=["W-001", "C-A1"])
    element_type: str = Field(..., max_length=50, examples=["WALL", "COLUMN"])
    discipline: str = Field(..., max_length=50)
    section: str = Field(..., max_length=50)
    floor_level: str | None = Field(default=None, max_length=50)
    drawing_id: uuid.UUID | None = None
    page_number: int | None = None
    source_type: str = Field(
        default="MANUAL_ENTRY",
        pattern="^(MANUAL_ENTRY|PDF_MEASUREMENT|DXF_LAYER|DXF_BLOCK)$",
    )
    approx_x: float | None = None
    approx_y: float | None = None
    geometry_json: dict | None = None
    material: str | None = Field(default=None, max_length=255)
    specification: dict | None = None


class ProjectElementUpdate(BaseModel):
    element_code: str | None = Field(default=None, max_length=50)
    element_type: str | None = Field(default=None, max_length=50)
    discipline: str | None = None
    section: str | None = None
    floor_level: str | None = None
    material: str | None = None
    specification: dict | None = None
    status: str | None = Field(default=None, pattern="^(ACTIVE|SUPERSEDED|DELETED)$")


class ProjectElementOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    element_code: str
    element_type: str
    discipline: str
    section: str
    floor_level: str | None
    drawing_id: uuid.UUID | None
    page_number: int | None
    source_type: str
    approx_x: float | None
    approx_y: float | None
    geometry_json: Any
    material: str | None
    specification: Any
    status: str
    confidence: float
    created_at: datetime

    model_config = {"from_attributes": True}


# ── BOQ Item ──────────────────────────────────────────────────────────────────

class BOQItemCreate(BaseModel):
    item_no: str = Field(..., max_length=20, examples=["2.1.3"])
    section: str = Field(
        ...,
        pattern="^(PRELIMINARIES|SUBSTRUCTURE|SUPERSTRUCTURE|ELECTRICAL|SANITARY|EXTERNAL_WORKS)$",
    )
    trade: str | None = Field(default=None, max_length=100)
    description: str = Field(..., max_length=500)
    unit: str = Field(..., max_length=20)
    quantity: float = Field(..., gt=0)
    rate: float = Field(default=0.0, ge=0)
    waste_factor: float = Field(default=0.0, ge=0, le=100)
    notes: str | None = None
    sort_order: int = Field(default=0, ge=0)


class BOQItemUpdate(BaseModel):
    item_no: str | None = Field(default=None, max_length=20)
    section: str | None = None
    trade: str | None = None
    description: str | None = None
    unit: str | None = None
    quantity: float | None = Field(default=None, gt=0)
    rate: float | None = Field(default=None, ge=0)
    waste_factor: float | None = Field(default=None, ge=0, le=100)
    notes: str | None = None
    sort_order: int | None = None
    is_locked: bool | None = None


class BOQItemOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    item_no: str
    section: str
    trade: str | None
    description: str
    unit: str
    quantity: float
    rate: float
    amount: float
    waste_factor: float
    notes: str | None
    is_locked: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BOQItemSourceCreate(BaseModel):
    suggested_quantity_id: uuid.UUID | None = None
    measurement_id: uuid.UUID | None = None
    project_element_id: uuid.UUID | None = None
    contribution_quantity: float = Field(..., description="Quantity contributed by this source")
    unit: str = Field(..., max_length=20)
    notes: str | None = Field(default=None, max_length=255)


class BOQItemSourceOut(BaseModel):
    id: uuid.UUID
    boq_item_id: uuid.UUID
    suggested_quantity_id: uuid.UUID | None
    measurement_id: uuid.UUID | None
    project_element_id: uuid.UUID | None
    contribution_quantity: float
    unit: str
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Audit Log ─────────────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID | None
    user_id: uuid.UUID | None
    action: str
    entity_type: str | None
    entity_id: str | None
    description: str | None
    old_value: Any
    new_value: Any
    ip_address: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Quantity Source ───────────────────────────────────────────────────────────

class QuantitySourceOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    suggested_quantity_id: uuid.UUID | None
    boq_item_id: uuid.UUID | None
    source_type: str
    drawing_id: uuid.UUID | None
    page_number: int | None
    measurement_id: uuid.UUID | None
    project_element_id: uuid.UUID | None
    dxf_layer: str | None
    dxf_block_name: str | None
    dxf_entity_id: str | None
    contribution_value: float | None
    contribution_unit: str | None
    confidence: float
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
