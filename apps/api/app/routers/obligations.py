from datetime import datetime
from typing import cast

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.account import Account
from app.models.movement import Movement
from app.models.obligation import Obligation
from app.schemas.obligation import (
    CreateObligationInput,
    UpdateObligationInput,
    LinkMovementInput,
    ObligationResponse,
    ObligationSummaryResponse,
)
from app.schemas.movement import MovementResponse

router = APIRouter()


def get_month_start(value: datetime) -> datetime:
    return datetime(value.year, value.month, 1)


def add_months(value: datetime, months: int) -> datetime:
    total_months = (value.year * 12 + value.month - 1) + months
    year, month_index = divmod(total_months, 12)
    return datetime(year, month_index + 1, 1)


def month_diff(start: datetime, end: datetime) -> int:
    return (end.year - start.year) * 12 + (end.month - start.month)


def get_current_month_range() -> tuple[datetime, datetime]:
    month_start = get_month_start(datetime.utcnow())
    return month_start, add_months(month_start, 1)


def get_current_due_amount(obligation: Obligation) -> float:
    return float(obligation.estimated_amount) + float(obligation.carryover_amount)


def to_response(o: Obligation, linked_amount: float | None = None) -> ObligationResponse:
    base_amount = float(o.estimated_amount)
    carryover_amount = float(o.carryover_amount)
    return ObligationResponse(
        id=o.id,
        name=o.name,
        categoryId=o.category_id,
        estimatedAmount=base_amount + carryover_amount,
        baseAmount=base_amount,
        carryoverAmount=carryover_amount,
        currency=o.currency,
        dueDay=o.due_day,
        isPaid=o.linked_movement_id is not None,
        linkedMovementId=o.linked_movement_id,
        linkedMovementAmount=linked_amount,
        isActive=o.is_active,
        createdAt=o.created_at.isoformat(),
        updatedAt=o.updated_at.isoformat(),
    )


def mov_to_response(m: Movement) -> MovementResponse:
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


async def get_user_obligation(db: AsyncSession, obligation_id: str, user_id: str) -> Obligation:
    result = await db.execute(
        select(Obligation).where(Obligation.id == obligation_id, Obligation.user_id == user_id)
    )
    obligation = result.scalar_one_or_none()
    if not obligation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Obligation not found")
    return obligation


async def get_linked_movements(
    db: AsyncSession,
    obligations: list[Obligation],
    user_id: str,
) -> dict[str, Movement]:
    linked_ids = [o.linked_movement_id for o in obligations if o.linked_movement_id]
    if not linked_ids:
        return {}

    result = await db.execute(
        select(Movement).where(Movement.id.in_(linked_ids), Movement.user_id == user_id)
    )
    return {movement.id: movement for movement in result.scalars().all()}


async def sync_obligations_for_current_month(
    db: AsyncSession,
    obligations: list[Obligation],
    user_id: str,
) -> dict[str, Movement]:
    if not obligations:
        return {}

    current_cycle_start, current_cycle_end = get_current_month_range()
    linked_movements = await get_linked_movements(db, obligations, user_id)
    changed = False

    for obligation in obligations:
        cycle_start = get_month_start(obligation.cycle_start)
        if obligation.cycle_start != cycle_start:
            obligation.cycle_start = cycle_start
            changed = True

        elapsed_months = month_diff(cycle_start, current_cycle_start)
        linked_movement = linked_movements.get(obligation.linked_movement_id) if obligation.linked_movement_id else None
        base_amount = float(obligation.estimated_amount)
        carryover_amount = float(obligation.carryover_amount)
        was_paid_in_tracked_cycle = (
            linked_movement is not None
            and cycle_start <= linked_movement.date < add_months(cycle_start, 1)
        )
        is_paid_in_current_cycle = (
            linked_movement is not None
            and current_cycle_start <= linked_movement.date < current_cycle_end
        )

        if elapsed_months > 0:
            if was_paid_in_tracked_cycle:
                next_carryover = base_amount * max(elapsed_months - 1, 0)
            else:
                next_carryover = carryover_amount + base_amount * elapsed_months

            if carryover_amount != next_carryover:
                obligation.carryover_amount = next_carryover
                changed = True
            if obligation.linked_movement_id is not None:
                obligation.linked_movement_id = None
                changed = True
            if obligation.cycle_start != current_cycle_start:
                obligation.cycle_start = current_cycle_start
                changed = True
            continue

        if obligation.linked_movement_id is not None and not is_paid_in_current_cycle:
            obligation.linked_movement_id = None
            changed = True

    if changed:
        await db.flush()

    return {
        movement_id: movement
        for movement_id, movement in linked_movements.items()
        if current_cycle_start <= movement.date < current_cycle_end
    }


async def get_linked_amounts(db: AsyncSession, obligations: list[Obligation], user_id: str) -> dict[str, float]:
    """Batch-load actual amounts for linked movements."""
    linked_ids = [o.linked_movement_id for o in obligations if o.linked_movement_id]
    if not linked_ids:
        return {}
    result = await db.execute(
        select(Movement.id, Movement.amount).where(Movement.id.in_(linked_ids), Movement.user_id == user_id)
    )
    return {row[0]: float(row[1]) for row in result.all()}


@router.get("/available-movements", response_model=list[MovementResponse])
async def get_available_movements(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current month expense movements not linked to any obligation."""
    obligation_result = await db.execute(
        select(Obligation).where(Obligation.user_id == user.id, Obligation.is_active.is_(True))
    )
    await sync_obligations_for_current_month(db, list(obligation_result.scalars().all()), user.id)

    month_start, month_end = get_current_month_range()

    # NOT EXISTS is NULL-safe (unlike NOT IN)
    linked_exists = (
        select(Obligation.id)
        .where(
            Obligation.user_id == user.id,
            Obligation.linked_movement_id == Movement.id,
        )
        .exists()
    )

    result = await db.execute(
        select(Movement)
        .where(
            Movement.user_id == user.id,
            Movement.type == "expense",
            Movement.date >= month_start,
            Movement.date < month_end,
            ~linked_exists,
        )
        .order_by(Movement.date.desc())
    )
    return [mov_to_response(m) for m in result.scalars().all()]


@router.get("", response_model=list[ObligationResponse])
async def get_obligations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Obligation)
        .where(Obligation.user_id == user.id, Obligation.is_active.is_(True))
        .order_by(Obligation.due_day)
    )
    obligations = list(result.scalars().all())
    await sync_obligations_for_current_month(db, obligations, user.id)
    amounts = await get_linked_amounts(db, obligations, user.id)
    return [
        to_response(o, amounts.get(o.linked_movement_id))
        for o in obligations
    ]


@router.get("/summary", response_model=list[ObligationSummaryResponse])
async def get_summary(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Obligation).where(Obligation.user_id == user.id, Obligation.is_active.is_(True))
    )
    obligations = list(result.scalars().all())
    await sync_obligations_for_current_month(db, obligations, user.id)
    amounts = await get_linked_amounts(db, obligations, user.id)

    by_currency: dict[str, list[Obligation]] = {}
    for o in obligations:
        by_currency.setdefault(o.currency, []).append(o)

    balance_result = await db.execute(
        select(Account.currency, func.sum(Account.current_balance))
        .where(Account.user_id == user.id)
        .group_by(Account.currency)
    )
    balances = dict(balance_result.all())

    summaries = []
    for currency, obs in by_currency.items():
        total = sum(get_current_due_amount(o) for o in obs)
        paid = 0.0
        for o in obs:
            if o.linked_movement_id:
                # Use actual movement amount if available, else estimated
                paid += amounts.get(o.linked_movement_id, get_current_due_amount(o))
        pending = max(total - paid, 0.0)
        coverage = (paid / total * 100) if total > 0 else 100
        current_balance = float(balances.get(currency, 0))

        summaries.append(ObligationSummaryResponse(
            currency=currency,
            totalObligations=total,
            paidAmount=paid,
            pendingAmount=pending,
            coveragePercent=round(coverage, 1),
            currentBalance=current_balance,
            freeAfterObligations=current_balance - pending,
        ))

    return summaries


@router.post("", response_model=ObligationResponse, status_code=status.HTTP_201_CREATED)
async def create_obligation(
    data: CreateObligationInput,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    obligation = Obligation(
        user_id=user.id,
        name=data.name,
        category_id=data.categoryId,
        estimated_amount=data.estimatedAmount,
        carryover_amount=0,
        currency=data.currency,
        due_day=data.dueDay,
        cycle_start=get_month_start(datetime.utcnow()),
        is_active=True,
    )
    db.add(obligation)
    await db.flush()
    return to_response(obligation)


@router.patch("/{obligation_id}", response_model=ObligationResponse)
async def update_obligation(
    obligation_id: str,
    data: UpdateObligationInput,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    obligation = await get_user_obligation(db, obligation_id, user.id)
    await sync_obligations_for_current_month(db, [obligation], user.id)

    field_map = {"categoryId": "category_id", "estimatedAmount": "estimated_amount", "dueDay": "due_day"}
    for field, value in data.model_dump(exclude_unset=True).items():
        target_field = cast(str, field_map.get(field, field))
        setattr(obligation, target_field, value)

    await db.flush()
    return to_response(obligation)


@router.delete("/{obligation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_obligation(
    obligation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    obligation = await get_user_obligation(db, obligation_id, user.id)
    await db.delete(obligation)


@router.patch("/{obligation_id}/link", response_model=ObligationResponse)
async def link_movement(
    obligation_id: str,
    data: LinkMovementInput,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    obligation = await get_user_obligation(db, obligation_id, user.id)
    await sync_obligations_for_current_month(db, [obligation], user.id)

    linked_amount: float | None = None
    if data.movementId:
        month_start, month_end = get_current_month_range()
        mov_result = await db.execute(
            select(Movement).where(Movement.id == data.movementId, Movement.user_id == user.id)
        )
        mov = mov_result.scalar_one_or_none()
        if not mov:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movement not found")
        if not (month_start <= mov.date < month_end):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only current-month movements can be linked to an obligation",
            )
        linked_amount = float(mov.amount)

    obligation.linked_movement_id = data.movementId
    await db.flush()
    return to_response(obligation, linked_amount)
