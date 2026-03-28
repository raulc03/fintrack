from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.goal import Goal, GoalAllocation
from app.models.movement import Movement
from app.schemas.goal import (
    CreateGoalInput,
    UpdateGoalInput,
    GoalResponse,
    GoalAllocationInput,
    GoalAllocationResponse,
)

router = APIRouter()


def parse_date(iso_str: str) -> datetime:
    dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    return dt.replace(tzinfo=None)


def to_response(g: Goal, spent: float | None = None) -> GoalResponse:
    current = spent if spent is not None else float(g.current_amount)
    return GoalResponse(
        id=g.id,
        name=g.name,
        type=g.type,
        targetAmount=float(g.target_amount),
        currentAmount=current,
        currency=g.currency,
        categoryId=g.category_id,
        deadline=g.deadline.isoformat() if g.deadline else None,
        isActive=g.is_active,
        createdAt=g.created_at.isoformat(),
        updatedAt=g.updated_at.isoformat(),
    )


def alloc_response(a: GoalAllocation) -> GoalAllocationResponse:
    return GoalAllocationResponse(
        id=a.id,
        goalId=a.goal_id,
        movementId=a.movement_id,
        amount=float(a.amount),
        date=a.date.isoformat(),
    )


async def get_monthly_expense_totals(
    db: AsyncSession,
    user_id: str,
    category_id: str | None = None,
    currency: str | None = None,
) -> dict[str, float]:
    """Sum expenses by category for the current month, optionally filtered."""
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    month_end = datetime(now.year + (now.month // 12), (now.month % 12) + 1, 1)

    query = (
        select(Movement.category_id, func.sum(Movement.amount))
        .where(
            Movement.user_id == user_id,
            Movement.type == "expense",
            Movement.date >= month_start,
            Movement.date < month_end,
        )
        .group_by(Movement.category_id)
    )
    if category_id:
        query = query.where(Movement.category_id == category_id)
    if currency:
        query = query.where(Movement.currency == currency)

    result = await db.execute(query)
    return {row[0]: float(row[1]) for row in result.all()}


@router.get("", response_model=list[GoalResponse])
async def get_goals(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Goal).where(Goal.user_id == user.id))
    goals = list(result.scalars().all())

    # Get expense totals grouped by (category, currency) for expense_limit goals
    expense_totals: dict[tuple[str, str], float] = {}
    has_expense_limits = any(g.type == "expense_limit" and g.category_id for g in goals)
    if has_expense_limits:
        now = datetime.utcnow()
        month_start = datetime(now.year, now.month, 1)
        month_end = datetime(now.year + (now.month // 12), (now.month % 12) + 1, 1)
        result = await db.execute(
            select(Movement.category_id, Movement.currency, func.sum(Movement.amount))
            .where(
                Movement.user_id == user.id,
                Movement.type == "expense",
                Movement.date >= month_start,
                Movement.date < month_end,
            )
            .group_by(Movement.category_id, Movement.currency)
        )
        expense_totals = {(row[0], row[1]): float(row[2]) for row in result.all()}

    responses = []
    for g in goals:
        if g.type == "expense_limit" and g.category_id:
            spent = expense_totals.get((g.category_id, g.currency), 0.0)
            responses.append(to_response(g, spent))
        else:
            responses.append(to_response(g))
    return responses


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(goal_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Goal).where(Goal.id == goal_id, Goal.user_id == user.id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    if goal.type == "expense_limit" and goal.category_id:
        totals = await get_monthly_expense_totals(db, user.id, category_id=goal.category_id, currency=goal.currency)
        return to_response(goal, totals.get(goal.category_id, 0.0))
    return to_response(goal)


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(data: CreateGoalInput, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    goal = Goal(
        user_id=user.id,
        name=data.name,
        type=data.type,
        target_amount=data.targetAmount,
        current_amount=0,
        currency=data.currency,
        category_id=data.categoryId,
        deadline=parse_date(data.deadline) if data.deadline else None,
        is_active=True,
    )
    db.add(goal)
    await db.flush()

    if goal.type == "expense_limit" and goal.category_id:
        totals = await get_monthly_expense_totals(db, user.id, category_id=goal.category_id, currency=goal.currency)
        return to_response(goal, totals.get(goal.category_id, 0.0))
    return to_response(goal)


@router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(goal_id: str, data: UpdateGoalInput, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Goal).where(Goal.id == goal_id, Goal.user_id == user.id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    field_map = {"targetAmount": "target_amount", "categoryId": "category_id"}
    for field, value in data.model_dump(exclude_unset=True).items():
        db_field = field_map.get(field, field)
        if db_field == "deadline" and value:
            value = parse_date(value)
        setattr(goal, db_field, value)

    await db.flush()

    if goal.type == "expense_limit" and goal.category_id:
        totals = await get_monthly_expense_totals(db, user.id, category_id=goal.category_id, currency=goal.currency)
        return to_response(goal, totals.get(goal.category_id, 0.0))
    return to_response(goal)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(goal_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Goal).where(Goal.id == goal_id, Goal.user_id == user.id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    await db.delete(goal)


@router.post("/{goal_id}/allocate", response_model=GoalAllocationResponse, status_code=status.HTTP_201_CREATED)
async def allocate(goal_id: str, data: GoalAllocationInput, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Goal).where(Goal.id == goal_id, Goal.user_id == user.id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    goal.current_amount = float(goal.current_amount) + data.amount

    allocation = GoalAllocation(
        goal_id=goal_id,
        movement_id=data.movementId,
        amount=data.amount,
    )
    db.add(allocation)
    await db.flush()
    return alloc_response(allocation)


@router.get("/{goal_id}/allocations", response_model=list[GoalAllocationResponse])
async def get_allocations(goal_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    goal_result = await db.execute(select(Goal).where(Goal.id == goal_id, Goal.user_id == user.id))
    if not goal_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    result = await db.execute(select(GoalAllocation).where(GoalAllocation.goal_id == goal_id))
    return [alloc_response(a) for a in result.scalars()]
