from pydantic import BaseModel


class CreateAccountInput(BaseModel):
    name: str
    currency: str  # USD | PEN
    initialBalance: float
    color: str | None = "#3b82f6"


class UpdateAccountInput(BaseModel):
    name: str | None = None
    color: str | None = None
    initialBalance: float | None = None


class AccountResponse(BaseModel):
    id: str
    name: str
    currency: str
    initialBalance: float
    currentBalance: float
    color: str
    createdAt: str
    updatedAt: str
