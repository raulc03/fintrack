from pydantic import BaseModel


class CreateGoalInput(BaseModel):
    name: str
    type: str  # savings | investment | expense_limit
    targetAmount: float
    currency: str
    categoryId: str | None = None
    deadline: str | None = None


class UpdateGoalInput(BaseModel):
    name: str | None = None
    type: str | None = None
    targetAmount: float | None = None
    currency: str | None = None
    categoryId: str | None = None
    deadline: str | None = None


class GoalResponse(BaseModel):
    id: str
    name: str
    type: str
    targetAmount: float
    currentAmount: float
    currency: str
    categoryId: str | None = None
    deadline: str | None = None
    isActive: bool
    createdAt: str
    updatedAt: str


class GoalAllocationInput(BaseModel):
    amount: float
    movementId: str


class GoalAllocationResponse(BaseModel):
    id: str
    goalId: str
    movementId: str
    amount: float
    date: str
