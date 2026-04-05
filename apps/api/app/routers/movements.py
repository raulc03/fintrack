from datetime import datetime
from typing import cast

from fastapi import APIRouter, Depends, HTTPException, Query, status
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

def parse_date(iso_str: str) -> datetime:
    """Parse ISO date string and strip timezone info for naive DB columns."""
    dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    return dt.replace(tzinfo=None)


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
        exchangeRate=float(m.exchange_rate) if m.exchange_rate is not None else None,
        destinationAmount=float(m.destination_amount) if m.destination_amount is not None else None,
        createdAt=m.created_at.isoformat(),
        updatedAt=m.updated_at.isoformat(),
    )


@router.get("", response_model=PaginatedMovements)
async def get_movements(
    type: str | None = None,
    accountId: str | None = None,
    categoryId: str | None = None,
    currency: str | None = None,
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
    if currency:
        query = query.where(Movement.currency == currency)
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
        dest_result = await db.execute(select(Account).where(Account.id == data.destinationAccountId, Account.user_id == user.id))
        dest = dest_result.scalar_one_or_none()
        if not dest:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Destination account not found")
        # Validate exchange rate before any balance mutations
        is_cross_currency = account.currency != dest.currency
        if is_cross_currency:
            if not data.exchangeRate or data.exchangeRate <= 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Exchange rate required for cross-currency transfers")
        # All validation passed — now mutate balances
        account.current_balance = float(account.current_balance) - data.amount
        if is_cross_currency:
            dest_amount = round(data.amount * cast(float, data.exchangeRate), 2)
            movement.exchange_rate = data.exchangeRate
            movement.destination_amount = dest_amount
            dest.current_balance = float(dest.current_balance) + dest_amount
        else:
            dest.current_balance = float(dest.current_balance) + data.amount

    await db.flush()
    return to_response(movement)


async def reverse_balance(db: AsyncSession, movement: Movement) -> None:
    """Undo a movement's effect on account balances."""
    acct_result = await db.execute(select(Account).where(Account.id == movement.account_id))
    account = acct_result.scalar_one_or_none()
    if not account:
        return
    if movement.type == "income":
        account.current_balance = float(account.current_balance) - float(movement.amount)
    elif movement.type == "expense":
        account.current_balance = float(account.current_balance) + float(movement.amount)
    elif movement.type == "transfer" and movement.destination_account_id:
        account.current_balance = float(account.current_balance) + float(movement.amount)
        dest_result = await db.execute(select(Account).where(Account.id == movement.destination_account_id))
        dest = dest_result.scalar_one_or_none()
        if dest:
            credit = float(movement.destination_amount) if movement.destination_amount else float(movement.amount)
            dest.current_balance = float(dest.current_balance) - credit


async def apply_balance(db: AsyncSession, movement: Movement) -> None:
    """Apply a movement's effect on account balances."""
    acct_result = await db.execute(select(Account).where(Account.id == movement.account_id))
    account = acct_result.scalar_one_or_none()
    if not account:
        return
    if movement.type == "income":
        account.current_balance = float(account.current_balance) + float(movement.amount)
    elif movement.type == "expense":
        account.current_balance = float(account.current_balance) - float(movement.amount)
    elif movement.type == "transfer" and movement.destination_account_id:
        account.current_balance = float(account.current_balance) - float(movement.amount)
        dest_result = await db.execute(select(Account).where(Account.id == movement.destination_account_id))
        dest = dest_result.scalar_one_or_none()
        if dest:
            credit = float(movement.destination_amount) if movement.destination_amount else float(movement.amount)
            dest.current_balance = float(dest.current_balance) + credit


@router.patch("/{movement_id}", response_model=MovementResponse)
async def update_movement(movement_id: str, data: UpdateMovementInput, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Movement).where(Movement.id == movement_id, Movement.user_id == user.id))
    movement = result.scalar_one_or_none()
    if not movement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movement not found")

    # Reverse old balance effect
    await reverse_balance(db, movement)

    # Apply field updates
    field_map = {
        "accountId": "account_id",
        "destinationAccountId": "destination_account_id",
        "categoryId": "category_id",
        "exchangeRate": "exchange_rate",
    }
    for field, value in data.model_dump(exclude_unset=True).items():
        db_field = cast(str, field_map.get(field, field))
        if db_field == "date" and value:
            value = parse_date(value)
        setattr(movement, db_field, value)

    # Recalculate destination_amount for cross-currency transfers
    if movement.type == "transfer" and movement.exchange_rate and movement.amount:
        movement.destination_amount = round(float(movement.amount) * float(movement.exchange_rate), 2)

    # Re-apply new balance effect
    await apply_balance(db, movement)

    await db.flush()
    return to_response(movement)


@router.delete("/{movement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_movement(movement_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Movement).where(Movement.id == movement_id, Movement.user_id == user.id))
    movement = result.scalar_one_or_none()
    if not movement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movement not found")

    await reverse_balance(db, movement)
    await db.delete(movement)
