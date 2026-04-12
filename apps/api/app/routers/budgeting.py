from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.category import Category
from app.models.goal import Goal, GoalAllocation
from app.models.movement import Movement
from app.models.obligation import Obligation
from app.models.user import User
from app.schemas.budgeting import BudgetBucketSummaryResponse, BudgetSummaryResponse
from app.timezone import get_month_range_for_timezone, get_user_timezone_name

router = APIRouter()

BUCKET_TARGETS = (
    ("necessity", "Necessities", 0.50),
    ("desire", "Desires", 0.30),
    ("save_invest", "Save & Invest", 0.20),
)


def get_current_due_amount(obligation: Obligation) -> float:
    return float(obligation.estimated_amount) + float(obligation.carryover_amount)


@router.get("/summary", response_model=BudgetSummaryResponse)
async def get_budget_summary(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    currency: str = Query(..., min_length=3, max_length=3),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    timezone_name = await get_user_timezone_name(db, user.id)
    start, end = get_month_range_for_timezone(timezone_name, year=year, month=month)

    movement_result = await db.execute(
        select(Movement, Category.bucket)
        .join(Category, Category.id == Movement.category_id)
        .where(
            Movement.user_id == user.id,
            Movement.currency == currency,
            Movement.date >= start,
            Movement.date < end,
        )
    )
    movement_rows = movement_result.all()
    obligation_result = await db.execute(
        select(Obligation).where(
            Obligation.user_id == user.id,
            Obligation.currency == currency,
            Obligation.is_active.is_(True),
        )
    )
    obligations = obligation_result.scalars().all()
    linked_expense_ids = {
        obligation.linked_movement_id
        for obligation in obligations
        if obligation.linked_movement_id is not None
    }

    income = 0.0
    bucket_fixed_amounts = {key: 0.0 for key, _, _ in BUCKET_TARGETS}
    bucket_variable_amounts = {key: 0.0 for key, _, _ in BUCKET_TARGETS}
    unclassified_expense_amount = 0.0

    for obligation in obligations:
        if obligation.bucket in bucket_fixed_amounts:
            bucket_fixed_amounts[obligation.bucket] += get_current_due_amount(
                obligation
            )

    for movement, bucket in movement_rows:
        amount = float(movement.amount)
        if movement.type == "income":
            income += amount
            continue
        if movement.type != "expense":
            continue
        if movement.id in linked_expense_ids:
            continue
        if bucket in bucket_variable_amounts:
            bucket_variable_amounts[bucket] += amount
        else:
            unclassified_expense_amount += amount

    allocation_result = await db.execute(
        select(GoalAllocation.amount)
        .join(Goal, Goal.id == GoalAllocation.goal_id)
        .where(
            Goal.user_id == user.id,
            Goal.currency == currency,
            Goal.type.in_(["savings", "investment"]),
            GoalAllocation.date >= start,
            GoalAllocation.date < end,
        )
    )
    bucket_variable_amounts["save_invest"] += sum(
        float(amount) for amount in allocation_result.scalars().all()
    )

    buckets = []
    for key, label, percent in BUCKET_TARGETS:
        target_amount = income * percent
        fixed_amount = bucket_fixed_amounts[key]
        variable_amount = bucket_variable_amounts[key]
        actual_amount = fixed_amount + variable_amount
        remaining_amount = target_amount - actual_amount
        progress_percent = (
            (actual_amount / target_amount * 100) if target_amount > 0 else 0.0
        )
        buckets.append(
            BudgetBucketSummaryResponse(
                key=key,
                label=label,
                targetAmount=target_amount,
                fixedAmount=fixed_amount,
                variableAmount=variable_amount,
                actualAmount=actual_amount,
                remainingAmount=remaining_amount,
                progressPercent=progress_percent,
                percentOfIncome=percent * 100,
                isOver=actual_amount > target_amount if target_amount > 0 else False,
            )
        )

    return BudgetSummaryResponse(
        currency=currency,
        income=income,
        unclassifiedExpenseAmount=unclassified_expense_amount,
        hasDebtPriority=any(
            float(obligation.carryover_amount) > 0 for obligation in obligations
        ),
        buckets=buckets,
    )
