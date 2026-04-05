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
from app.models.obligation import Obligation, ObligationHistory
from app.schemas.obligation import (
    CreateObligationInput,
    UpdateObligationInput,
    LinkMovementInput,
    ObligationResponse,
    ObligationSummaryResponse,
    ObligationHistoryItemResponse,
    ObligationHistoryMonthResponse,
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


def get_month_label(value: datetime) -> str:
    return value.strftime("%b %Y")


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


async def get_history_rows(
    db: AsyncSession,
    obligations: list[Obligation],
) -> dict[tuple[str, datetime], ObligationHistory]:
    obligation_ids = [obligation.id for obligation in obligations]
    if not obligation_ids:
        return {}

    result = await db.execute(
        select(ObligationHistory).where(ObligationHistory.obligation_id.in_(obligation_ids))
    )
    return {
        (row.obligation_id, get_month_start(row.month_start)): row
        for row in result.scalars().all()
    }


def sync_history_row(
    db: AsyncSession,
    history_rows: dict[tuple[str, datetime], ObligationHistory],
    obligation: Obligation,
    month_start: datetime,
    carryover_amount: float,
    paid_amount: float,
    linked_movement_id: str | None,
) -> None:
    key = (obligation.id, month_start)
    due_amount = float(obligation.estimated_amount) + carryover_amount
    row = history_rows.get(key)
    if row is None:
        row = ObligationHistory(
            obligation_id=obligation.id,
            month_start=month_start,
            name=obligation.name,
            currency=obligation.currency,
            base_amount=float(obligation.estimated_amount),
            carryover_amount=carryover_amount,
            due_amount=due_amount,
            paid_amount=paid_amount,
            linked_movement_id=linked_movement_id,
            is_paid=paid_amount > 0,
        )
        db.add(row)
        history_rows[key] = row
        return

    row.name = obligation.name
    row.currency = obligation.currency
    row.base_amount = float(obligation.estimated_amount)
    row.carryover_amount = carryover_amount
    row.due_amount = due_amount
    row.paid_amount = paid_amount
    row.linked_movement_id = linked_movement_id
    row.is_paid = paid_amount > 0


async def sync_current_history_row(
    db: AsyncSession,
    obligation: Obligation,
    linked_movement: Movement | None,
) -> None:
    history_rows = await get_history_rows(db, [obligation])
    current_cycle_start = get_month_start(obligation.cycle_start)
    paid_amount = 0.0
    linked_movement_id: str | None = None
    if linked_movement is not None and current_cycle_start <= linked_movement.date < add_months(current_cycle_start, 1):
        paid_amount = float(linked_movement.amount)
        linked_movement_id = linked_movement.id
    sync_history_row(
        db,
        history_rows,
        obligation,
        current_cycle_start,
        float(obligation.carryover_amount),
        paid_amount,
        linked_movement_id,
    )
    await db.flush()


async def sync_obligations_for_current_month(
    db: AsyncSession,
    obligations: list[Obligation],
    user_id: str,
) -> dict[str, Movement]:
    if not obligations:
        return {}

    current_cycle_start, current_cycle_end = get_current_month_range()
    linked_movements = await get_linked_movements(db, obligations, user_id)
    history_rows = await get_history_rows(db, obligations)
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
            tracked_paid_amount = float(linked_movement.amount) if was_paid_in_tracked_cycle and linked_movement else 0.0
            sync_history_row(
                db,
                history_rows,
                obligation,
                cycle_start,
                carryover_amount,
                tracked_paid_amount,
                linked_movement.id if was_paid_in_tracked_cycle and linked_movement else None,
            )

            next_carryover = max(base_amount + carryover_amount - tracked_paid_amount, 0.0)
            for offset in range(1, elapsed_months):
                missed_month_start = add_months(cycle_start, offset)
                sync_history_row(
                    db,
                    history_rows,
                    obligation,
                    missed_month_start,
                    next_carryover,
                    0.0,
                    None,
                )
                next_carryover += base_amount

            if carryover_amount != next_carryover:
                obligation.carryover_amount = next_carryover
                changed = True
            if obligation.linked_movement_id is not None:
                obligation.linked_movement_id = None
                changed = True
            if obligation.cycle_start != current_cycle_start:
                obligation.cycle_start = current_cycle_start
                changed = True

        if obligation.linked_movement_id is not None and not is_paid_in_current_cycle:
            obligation.linked_movement_id = None
            changed = True

        current_paid_amount = float(linked_movement.amount) if is_paid_in_current_cycle and linked_movement else 0.0
        sync_history_row(
            db,
            history_rows,
            obligation,
            current_cycle_start,
            float(obligation.carryover_amount),
            current_paid_amount,
            linked_movement.id if is_paid_in_current_cycle and linked_movement else None,
        )

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


@router.get("/history", response_model=list[ObligationHistoryMonthResponse])
async def get_history(
    months: int = 6,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    months = max(1, min(months, 24))
    result = await db.execute(
        select(Obligation)
        .where(Obligation.user_id == user.id, Obligation.is_active.is_(True))
        .order_by(Obligation.due_day)
    )
    obligations = list(result.scalars().all())
    await sync_obligations_for_current_month(db, obligations, user.id)

    current_month_start = get_month_start(datetime.utcnow())
    first_month_start = add_months(current_month_start, -months)
    history_result = await db.execute(
        select(ObligationHistory)
        .join(Obligation, Obligation.id == ObligationHistory.obligation_id)
        .where(
            Obligation.user_id == user.id,
            ObligationHistory.month_start >= first_month_start,
            ObligationHistory.month_start < current_month_start,
        )
        .order_by(ObligationHistory.month_start.desc(), ObligationHistory.name)
    )
    rows = list(history_result.scalars().all())

    months_map: dict[datetime, list[ObligationHistory]] = {}
    for row in rows:
        months_map.setdefault(get_month_start(row.month_start), []).append(row)

    return [
        ObligationHistoryMonthResponse(
            month=month_start.strftime("%Y-%m"),
            monthLabel=get_month_label(month_start),
            totalDue=sum(float(item.due_amount) for item in items),
            totalPaid=sum(float(item.paid_amount) for item in items),
            items=[
                ObligationHistoryItemResponse(
                    obligationId=item.obligation_id,
                    name=item.name,
                    currency=item.currency,
                    dueAmount=float(item.due_amount),
                    paidAmount=float(item.paid_amount),
                    isPaid=item.is_paid,
                )
                for item in items
            ],
        )
        for month_start, items in sorted(months_map.items(), key=lambda entry: entry[0], reverse=True)
    ]


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
    await sync_current_history_row(db, obligation, None)
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
    linked_movement = None
    if obligation.linked_movement_id:
        linked_movement_result = await db.execute(
            select(Movement).where(Movement.id == obligation.linked_movement_id, Movement.user_id == user.id)
        )
        linked_movement = linked_movement_result.scalar_one_or_none()
    await sync_current_history_row(db, obligation, linked_movement)
    return to_response(obligation)


@router.delete("/{obligation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_obligation(
    obligation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    obligation = await get_user_obligation(db, obligation_id, user.id)
    history_result = await db.execute(
        select(ObligationHistory).where(ObligationHistory.obligation_id == obligation.id)
    )
    for history_row in history_result.scalars().all():
        await db.delete(history_row)
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
    mov: Movement | None = None
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
    await sync_current_history_row(db, obligation, mov if data.movementId else None)
    return to_response(obligation, linked_amount)
