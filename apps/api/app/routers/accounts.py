from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.account import Account
from app.schemas.account import CreateAccountInput, UpdateAccountInput, AccountResponse

router = APIRouter()


def to_response(a: Account) -> AccountResponse:
    return AccountResponse(
        id=a.id,
        name=a.name,
        currency=a.currency,
        initialBalance=float(a.initial_balance),
        currentBalance=float(a.current_balance),
        color=a.color,
        createdAt=a.created_at.isoformat(),
        updatedAt=a.updated_at.isoformat(),
    )


@router.get("", response_model=list[AccountResponse])
async def get_accounts(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Account).where(Account.user_id == user.id))
    return [to_response(a) for a in result.scalars()]


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(account_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Account).where(Account.id == account_id, Account.user_id == user.id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return to_response(account)


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(data: CreateAccountInput, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    account = Account(
        user_id=user.id,
        name=data.name,
        currency=data.currency,
        initial_balance=data.initialBalance,
        current_balance=data.initialBalance,
        color=data.color or "#3b82f6",
    )
    db.add(account)
    await db.flush()
    return to_response(account)


@router.patch("/{account_id}", response_model=AccountResponse)
async def update_account(account_id: str, data: UpdateAccountInput, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Account).where(Account.id == account_id, Account.user_id == user.id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    if data.name is not None:
        account.name = data.name
    if data.color is not None:
        account.color = data.color
    if data.initialBalance is not None:
        delta = data.initialBalance - float(account.initial_balance)
        account.initial_balance = data.initialBalance
        account.current_balance = float(account.current_balance) + delta

    await db.flush()
    return to_response(account)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(account_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Account).where(Account.id == account_id, Account.user_id == user.id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    await db.delete(account)
