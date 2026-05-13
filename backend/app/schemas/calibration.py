from uuid import UUID
from pydantic import BaseModel, ConfigDict

class DrawingCalibrationBase(BaseModel):
    scale_factor: float
    unit: str = "m"
    point1_x: float | None = None
    point1_y: float | None = None
    point2_x: float | None = None
    point2_y: float | None = None
    known_distance: float | None = None

class DrawingCalibrationCreate(DrawingCalibrationBase):
    page_id: UUID

class DrawingCalibrationUpdate(DrawingCalibrationBase):
    scale_factor: float | None = None
    unit: str | None = None

class DrawingCalibrationOut(DrawingCalibrationBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    page_id: UUID

class DrawingPageBase(BaseModel):
    page_number: int
    image_path: str | None = None
    width_px: int | None = None
    height_px: int | None = None

class DrawingPageOut(DrawingPageBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    drawing_id: UUID
    calibration: DrawingCalibrationOut | None = None
