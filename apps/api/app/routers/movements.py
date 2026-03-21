from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status


def parse_date(iso_str: str) -> datetime:
    """Parse ISO date string and strip timezone info for naive DB columns."""
    dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    return dt.replace(tzinfo=None)
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.account import Account
from app.models.movement import Movement
from app.schemas.movement import (
    CreateMovementInput,
    UpdateMovementInput,
    MovementResponse,
    MonthlySummary,
    PaginatedMovements,
)

router = APIRouter()


def to_response(m: Movement) -> MovementResponse:
    return MovementResponse(
        id=m.id,
        type=m.type,
        amount=float(m.amount),
        currency=m.currency,
        description=m.description,
        date=m.date.isoformat(),
        accountId=m.account_id,
        destinationAccountId=m.destination_account_id,
        categoryId=m.category_id,
        createdAt=m.created_at.isoformat(),
        updatedAt=m.updated_at.isoformat(),
    )


@router.get("", response_model=PaginatedMovements)
async def get_movements(
    type: str | None = None,
    accountId: str | None = None,
    categoryId: str | None = None,
    dateFrom: str | None = None,
    dateTo: str | None = None,
    minAmount: float | None = None,
    maxAmount: float | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Movement).where(Movement.user_id == user.id)

    if type:
        query = query.where(Movement.type == type)
    if accountId:
        query = query.where(
            or_(Movement.account_id == accountId, Movement.destination_account_id == accountId)
        )
    if categoryId:
        query = query.where(Movement.category_id == categoryId)
    if dateFrom:
        query = query.where(Movement.date >= parse_date(dateFrom))
    if dateTo:
        query = query.where(Movement.date <= parse_date(dateTo))
    if minAmount is not None:
        query = query.where(Movement.amount >= minAmount)
    if maxAmount is not None:
        query = query.where(Movement.amount <= maxAmount)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Paginate and sort
    query = query.order_by(Movement.date.desc()).offset((page - 1) * pageSize).limit(pageSize)
    result = await db.execute(query)
    movements = [to_response(m) for m in result.scalars()]

    return PaginatedMovements(data=movements, total=total, page=page, pageSize=pageSize)


@router.get("/summary", response_model=MonthlySummary)
async def get_monthly_summary(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    currency: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start = datetime(year, month, 1)
    end = datetime(year + (month // 12), (month % 12) + 1, 1) if month < 12 else datetime(year + 1, 1, 1)

    query = select(Movement).where(
        Movement.user_id == user.id,
        Movement.date >= start,
        Movement.date < end,
    )
    if currency:
        query = query.where(Movement.currency == currency)

    result = await db.execute(query)
    movements = result.scalars().all()

    income = sum(float(m.amount) for m in movements if m.type == "income")
    expense = sum(float(m.amount) for m in movements if m.type == "expense")

    return MonthlySummary(income=income, expense=expense, net=income - expense)


@router.get("/account/{account_id}", response_model=list[MovementResponse])
async def get_by_account(
    account_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Movement)
        .where(
            Movement.user_id == user.id,
            or_(Movement.account_id == account_id, Movement.destination_account_id == account_id),
        )
        .order_by(Movement.date.desc())
    )
    return [to_response(m) for m in result.scalars()]


@router.get("/{movement_id}", response_model=MovementResponse)
async def get_movement(movement_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Movement).where(Movement.id == movement_id, Movement.user_id == user.id))
    movement = result.scalar_one_or_none()
    if not movement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movement not found")
    return to_response(movement)


@router.post("", response_model=MovementResponse, status_code=status.HTTP_201_CREATED)
async def create_movement(data: CreateMovementInput, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Get account to determine currency
    result = await db.execute(select(Account).where(Account.id == data.accountId, Account.user_id == user.id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account not found")

    movement = Movement(
        user_id=user.id,
        type=data.type,
        amount=data.amount,
        currency=account.currency,
        description=data.description,
        date=parse_date(data.date),
        account_id=data.accountId,
        destination_account_id=data.destinationAccountId,
        category_id=data.categoryId,
    )
    db.add(movement)

    # Update balances
    if data.type == "income":
        account.current_balance = float(account.current_balance) + data.amount
    elif data.type == "expense":
        account.current_balance = float(account.current_balance) - data.amount
    elif data.type == "transfer" and data.destinationAccountId:
        account.current_balance = float(account.current_balance) - data.amount
        dest_result = await db.execute(select(Account).where(Account.id == data.destinationAccountId, Account.user_id == user.id))
        dest = dest_result.scalar_one_or_none()
        if dest:
            dest.current_balance = float(dest.current_balance) + data.amount

    await db.flush()
    return to_response(movement)


@router.patch("/{movement_id}", response_model=MovementResponse)
async def update_movement(movement_id: str, data: UpdateMovementInput, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Movement).where(Movement.id == movement_id, Movement.user_id == user.id))
    movement = result.scalar_one_or_none()
    if not movement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movement not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        field_map = {"accountId": "account_id", "destinationAccountId": "destination_account_id", "categoryId": "category_id"}
        db_field = field_map.get(field, field)
        if db_field == "date" and value:
            value = parse_date(value)
        setattr(movement, db_field, value)

    await db.flush()
    return to_response(movement)


@router.delete("/{movement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_movement(movement_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Movement).where(Movement.id == movement_id, Movement.user_id == user.id))
    movement = result.scalar_one_or_none()
    if not movement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movement not found")
    await db.delete(movement)
