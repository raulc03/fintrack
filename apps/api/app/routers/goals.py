from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status


def parse_date(iso_str: str) -> datetime:
    dt = parse_date(iso_str.replace("Z", "+00:00"))
    return dt.replace(tzinfo=None)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.goal import Goal, GoalAllocation
from app.schemas.goal import (
    CreateGoalInput,
    UpdateGoalInput,
    GoalResponse,
    GoalAllocationInput,
    GoalAllocationResponse,
)

router = APIRouter()


def to_response(g: Goal) -> GoalResponse:
    return GoalResponse(
        id=g.id,
        name=g.name,
        type=g.type,
        targetAmount=float(g.target_amount),
        currentAmount=float(g.current_amount),
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


@router.get("", response_model=list[GoalResponse])
async def get_goals(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Goal).where(Goal.user_id == user.id))
    return [to_response(g) for g in result.scalars()]


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(goal_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Goal).where(Goal.id == goal_id, Goal.user_id == user.id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
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
    # Verify goal belongs to user
    goal_result = await db.execute(select(Goal).where(Goal.id == goal_id, Goal.user_id == user.id))
    if not goal_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    result = await db.execute(select(GoalAllocation).where(GoalAllocation.goal_id == goal_id))
    return [alloc_response(a) for a in result.scalars()]
