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
    TogglePaidInput,
    ObligationResponse,
    ObligationSummaryResponse,
)

router = APIRouter()


def to_response(o: Obligation) -> ObligationResponse:
    return ObligationResponse(
        id=o.id,
        name=o.name,
        categoryId=o.category_id,
        estimatedAmount=float(o.estimated_amount),
        currency=o.currency,
        dueDay=o.due_day,
        isPaid=o.manually_paid or o.linked_movement_id is not None,
        manuallyPaid=o.manually_paid,
        linkedMovementId=o.linked_movement_id,
        isActive=o.is_active,
        createdAt=o.created_at.isoformat(),
        updatedAt=o.updated_at.isoformat(),
    )


async def get_user_obligation(db: AsyncSession, obligation_id: str, user_id: str) -> Obligation:
    """Fetch an obligation by ID, ensuring it belongs to the user."""
    result = await db.execute(
        select(Obligation).where(Obligation.id == obligation_id, Obligation.user_id == user_id)
    )
    obligation = result.scalar_one_or_none()
    if not obligation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Obligation not found")
    return obligation


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
    return [to_response(o) for o in result.scalars().all()]


@router.get("/summary", response_model=list[ObligationSummaryResponse])
async def get_summary(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Obligation).where(Obligation.user_id == user.id, Obligation.is_active.is_(True))
    )
    obligations = result.scalars().all()

    # Group by currency
    by_currency: dict[str, list[Obligation]] = {}
    for o in obligations:
        by_currency.setdefault(o.currency, []).append(o)

    # Fetch all balances in one query
    balance_result = await db.execute(
        select(Account.currency, func.sum(Account.current_balance))
        .where(Account.user_id == user.id)
        .group_by(Account.currency)
    )
    balances = dict(balance_result.all())

    summaries = []
    for currency, obs in by_currency.items():
        total = sum(float(o.estimated_amount) for o in obs)
        paid = sum(
            float(o.estimated_amount) for o in obs
            if o.manually_paid or o.linked_movement_id is not None
        )
        pending = total - paid
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
        currency=data.currency,
        due_day=data.dueDay,
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

    field_map = {"categoryId": "category_id", "estimatedAmount": "estimated_amount", "dueDay": "due_day"}
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obligation, field_map.get(field, field), value)

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

    if data.movementId:
        mov_result = await db.execute(
            select(Movement).where(Movement.id == data.movementId, Movement.user_id == user.id)
        )
        if not mov_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movement not found")

    obligation.linked_movement_id = data.movementId
    await db.flush()
    return to_response(obligation)


@router.patch("/{obligation_id}/toggle-paid", response_model=ObligationResponse)
async def toggle_paid(
    obligation_id: str,
    data: TogglePaidInput,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    obligation = await get_user_obligation(db, obligation_id, user.id)
    obligation.manually_paid = data.manuallyPaid

    # If marking as unpaid, also clear the linked movement
    if not data.manuallyPaid:
        obligation.linked_movement_id = None

    await db.flush()
    return to_response(obligation)
