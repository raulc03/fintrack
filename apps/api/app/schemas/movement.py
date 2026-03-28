from pydantic import BaseModel


class CreateMovementInput(BaseModel):
    type: str  # income | expense | transfer
    amount: float
    description: str
    date: str
    accountId: str
    destinationAccountId: str | None = None
    categoryId: str
    exchangeRate: float | None = None


class UpdateMovementInput(BaseModel):
    type: str | None = None
    amount: float | None = None
    description: str | None = None
    date: str | None = None
    accountId: str | None = None
    destinationAccountId: str | None = None
    categoryId: str | None = None


class MovementResponse(BaseModel):
    id: str
    type: str
    amount: float
    currency: str
    description: str
    date: str
    accountId: str
    destinationAccountId: str | None = None
    categoryId: str
    exchangeRate: float | None = None
    destinationAmount: float | None = None
    createdAt: str
    updatedAt: str


class MonthlySummary(BaseModel):
    income: float
    expense: float
    net: float


class PaginatedMovements(BaseModel):
    data: list[MovementResponse]
    total: int
    page: int
    pageSize: int
