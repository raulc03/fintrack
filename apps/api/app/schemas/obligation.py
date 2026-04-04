from pydantic import BaseModel, Field


class CreateObligationInput(BaseModel):
    name: str = Field(min_length=1)
    categoryId: str
    estimatedAmount: float = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3)
    dueDay: int = Field(ge=1, le=31)


class UpdateObligationInput(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    categoryId: str | None = None
    estimatedAmount: float | None = Field(default=None, gt=0)
    dueDay: int | None = Field(default=None, ge=1, le=31)


class LinkMovementInput(BaseModel):
    movementId: str | None = None


class ObligationResponse(BaseModel):
    id: str
    name: str
    categoryId: str
    estimatedAmount: float
    baseAmount: float | None = None
    carryoverAmount: float | None = None
    currency: str
    dueDay: int
    isPaid: bool
    linkedMovementId: str | None = None
    linkedMovementAmount: float | None = None
    isActive: bool
    createdAt: str
    updatedAt: str


class ObligationSummaryResponse(BaseModel):
    currency: str
    totalObligations: float
    paidAmount: float
    pendingAmount: float
    coveragePercent: float
    currentBalance: float
    freeAfterObligations: float


class ObligationHistoryItemResponse(BaseModel):
    obligationId: str
    name: str
    currency: str
    dueAmount: float
    paidAmount: float
    isPaid: bool


class ObligationHistoryMonthResponse(BaseModel):
    month: str
    monthLabel: str
    totalDue: float
    totalPaid: float
    items: list[ObligationHistoryItemResponse]
