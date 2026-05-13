from uuid import UUID
from pydantic import BaseModel, ConfigDict

class BOQItemSourceBase(BaseModel):
    contribution_value: float
    federated_quantity_id: UUID | None = None
    measurement_id: UUID | None = None

class BOQItemSourceOut(BOQItemSourceBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    boq_item_id: UUID

class BOQItemBase(BaseModel):
    item_code: str | None = None
    description: str
    unit: str
    quantity: float
    rate: float
    amount: float
    section: str = "SUBSTRUCTURE"
    is_manual: bool = False

class BOQItemCreate(BOQItemBase):
    pass

class BOQItemUpdate(BOQItemBase):
    description: str | None = None
    unit: str | None = None
    quantity: float | None = None
    rate: float | None = None
    amount: float | None = None

class BOQItemOut(BOQItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    project_id: UUID
    sources: list[BOQItemSourceOut] = []
