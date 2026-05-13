from uuid import UUID
from pydantic import BaseModel, ConfigDict

class ProjectElementBase(BaseModel):
    name: str
    category: str | None = None
    discipline: str | None = None
    notes: str | None = None

class ProjectElementCreate(ProjectElementBase):
    pass

class ProjectElementUpdate(ProjectElementBase):
    name: str | None = None

class ProjectElementOut(ProjectElementBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    project_id: UUID

class MeasurementBase(BaseModel):
    label: str | None = None
    type: str  # LENGTH, AREA, COUNT
    value: float
    unit: str
    geometry_json: str
    color: str | None = None

class MeasurementCreate(MeasurementBase):
    page_id: UUID
    element_id: UUID | None = None

class MeasurementUpdate(MeasurementBase):
    type: str | None = None
    value: float | None = None
    unit: str | None = None
    geometry_json: str | None = None

class MeasurementOut(MeasurementBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    page_id: UUID
    element_id: UUID | None = None
