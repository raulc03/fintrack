from pydantic import BaseModel


class BudgetBucketSummaryResponse(BaseModel):
    key: str
    label: str
    targetAmount: float
    actualAmount: float
    remainingAmount: float
    progressPercent: float
    percentOfIncome: float
    isOver: bool


class BudgetSummaryResponse(BaseModel):
    currency: str
    income: float
    unclassifiedExpenseAmount: float
    hasDebtPriority: bool
    buckets: list[BudgetBucketSummaryResponse]
