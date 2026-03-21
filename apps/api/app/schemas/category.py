from pydantic import BaseModel


class CreateCategoryInput(BaseModel):
    name: str
    type: str  # income | expense
    icon: str | None = "tag"
    color: str | None = "#64748b"


class UpdateCategoryInput(BaseModel):
    name: str | None = None
    type: str | None = None
    icon: str | None = None
    color: str | None = None


class CategoryResponse(BaseModel):
    id: str
    name: str
    type: str
    icon: str
    color: str
    isDefault: bool
    createdAt: str
