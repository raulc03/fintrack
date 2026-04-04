from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import select

from app.config import settings
from app.database import async_session
from app.models.account import Account
from app.models.category import Category
from app.models.goal import Goal, GoalAllocation
from app.models.movement import Movement
from app.models.obligation import Obligation
from app.models.user import User
from app.models.user_settings import UserSettings
from app.routers.auth import DEFAULT_CATEGORIES, hash_password


def _dt(days_ago: int) -> datetime:
    return datetime.utcnow().replace(hour=12, minute=0, second=0, microsecond=0) - timedelta(days=days_ago)


def _month_deadline(months_ahead: int = 0) -> datetime:
    now = datetime.utcnow().replace(hour=12, minute=0, second=0, microsecond=0)
    month = now.month + months_ahead
    year = now.year + (month - 1) // 12
    month = ((month - 1) % 12) + 1
    day = min(now.day, 28)
    return datetime(year, month, day, 12, 0, 0)


async def _ensure_user(session) -> User:
    result = await session.execute(select(User).where(User.email == settings.dev_seed_email.lower()))
    user = result.scalar_one_or_none()
    hashed_password = hash_password(settings.dev_seed_password)

    if not user:
        user = User(
            name=settings.dev_seed_name,
            email=settings.dev_seed_email.lower(),
            hashed_password=hashed_password,
        )
        session.add(user)
        await session.flush()
    else:
        user.name = settings.dev_seed_name
        user.hashed_password = hashed_password

    return user


async def _ensure_categories(session, user: User) -> dict[str, Category]:
    result = await session.execute(select(Category).where(Category.user_id == user.id))
    existing = {category.name: category for category in result.scalars().all()}

    for category_data in DEFAULT_CATEGORIES:
        if category_data["name"] in existing:
            continue
        category = Category(user_id=user.id, is_default=True, **category_data)
        session.add(category)
        existing[category.name] = category

    await session.flush()
    return existing


async def _ensure_settings(session, user: User) -> None:
    result = await session.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    user_settings = result.scalar_one_or_none()
    if not user_settings:
        user_settings = UserSettings(user_id=user.id)
        session.add(user_settings)

    user_settings.main_currency = "PEN"
    user_settings.usd_to_pen_rate = 3.482


def _add_account(user: User, name: str, currency: str, color: str, initial_balance: float) -> Account:
    return Account(
        user_id=user.id,
        name=name,
        currency=currency,
        color=color,
        initial_balance=initial_balance,
        current_balance=initial_balance,
    )


def _add_movement(
    user: User,
    source_account: Account,
    *,
    movement_type: str,
    amount: float,
    description: str,
    date: datetime,
    category_id: str,
    destination_account: Account | None = None,
    exchange_rate: float | None = None,
) -> Movement:
    movement = Movement(
        user_id=user.id,
        type=movement_type,
        amount=amount,
        currency=source_account.currency,
        description=description,
        date=date,
        account_id=source_account.id,
        destination_account_id=destination_account.id if destination_account else None,
        category_id=category_id,
    )

    if movement_type == "income":
        source_account.current_balance = float(source_account.current_balance) + amount
    elif movement_type == "expense":
        source_account.current_balance = float(source_account.current_balance) - amount
    elif movement_type == "transfer" and destination_account:
        source_account.current_balance = float(source_account.current_balance) - amount
        if source_account.currency != destination_account.currency:
            if not exchange_rate:
                raise ValueError("Cross-currency transfers require an exchange rate")
            destination_amount = round(amount * exchange_rate, 2)
            movement.exchange_rate = exchange_rate
            movement.destination_amount = destination_amount
            destination_account.current_balance = float(destination_account.current_balance) + destination_amount
        else:
            destination_account.current_balance = float(destination_account.current_balance) + amount

    return movement


async def seed_dev_data() -> None:
    async with async_session() as session:
        user = await _ensure_user(session)
        categories = await _ensure_categories(session, user)
        await _ensure_settings(session, user)

        existing_accounts = await session.execute(select(Account).where(Account.user_id == user.id))
        if existing_accounts.scalars().first() is not None:
            await session.commit()
            return

        checking_usd = _add_account(user, "BCP Checking", "USD", "#3b82f6", 1800)
        savings_pen = _add_account(user, "Interbank Soles Ahorro", "PEN", "#10b981", 4200)
        savings_usd = _add_account(user, "Interbank Dolares Ahorro", "USD", "#8b5cf6", 900)
        broker_usd = _add_account(user, "Broker USD", "USD", "#f59e0b", 2500)
        session.add_all([checking_usd, savings_pen, savings_usd, broker_usd])
        await session.flush()

        movements = [
            _add_movement(user, savings_pen, movement_type="income", amount=6500, description="Monthly salary", date=_dt(3), category_id=categories["Salary"].id),
            _add_movement(user, checking_usd, movement_type="income", amount=1250, description="Freelance landing page project", date=_dt(14), category_id=categories["Freelance"].id),
            _add_movement(user, broker_usd, movement_type="income", amount=220, description="Dividend payout", date=_dt(32), category_id=categories["Investments"].id),
            _add_movement(user, savings_pen, movement_type="expense", amount=2350, description="Apartment rent", date=_dt(2), category_id=categories["Rent"].id),
            _add_movement(user, savings_pen, movement_type="expense", amount=280, description="Electricity and water", date=_dt(6), category_id=categories["Utilities"].id),
            _add_movement(user, savings_pen, movement_type="expense", amount=140, description="Weekend dinner", date=_dt(8), category_id=categories["Entertainment"].id),
            _add_movement(user, savings_pen, movement_type="expense", amount=210, description="Groceries restock", date=_dt(10), category_id=categories["Food & Groceries"].id),
            _add_movement(user, savings_pen, movement_type="expense", amount=75, description="Taxi and metro", date=_dt(11), category_id=categories["Transport"].id),
            _add_movement(user, checking_usd, movement_type="expense", amount=48, description="Online course subscription", date=_dt(12), category_id=categories["Education"].id),
            _add_movement(user, checking_usd, movement_type="expense", amount=96, description="Running shoes", date=_dt(18), category_id=categories["Shopping"].id),
            _add_movement(user, savings_pen, movement_type="expense", amount=180, description="Medical checkup", date=_dt(25), category_id=categories["Health"].id),
            _add_movement(user, checking_usd, movement_type="transfer", amount=1000, description="Cambio", date=_dt(5), category_id=categories["Transfer"].id, destination_account=savings_pen, exchange_rate=3.482),
            _add_movement(user, checking_usd, movement_type="transfer", amount=850, description="Transfer to USD savings", date=_dt(20), category_id=categories["Transfer"].id, destination_account=savings_usd),
        ]

        session.add_all(movements)
        await session.flush()

        goals = [
            Goal(user_id=user.id, name="Emergency Fund", type="savings", target_amount=15000, current_amount=3482, currency="PEN", deadline=_month_deadline(8), is_active=True),
            Goal(user_id=user.id, name="ETF Portfolio", type="investment", target_amount=12000, current_amount=970, currency="USD", deadline=_month_deadline(10), is_active=True),
            Goal(user_id=user.id, name="Dining Out Limit", type="expense_limit", target_amount=450, current_amount=0, currency="PEN", category_id=categories["Food & Groceries"].id, deadline=None, is_active=True),
        ]
        session.add_all(goals)
        await session.flush()

        allocations = [
            GoalAllocation(goal_id=goals[0].id, movement_id=movements[11].id, amount=3482, date=_dt(5)),
            GoalAllocation(goal_id=goals[1].id, movement_id=movements[1].id, amount=750, date=_dt(14)),
            GoalAllocation(goal_id=goals[1].id, movement_id=movements[2].id, amount=220, date=_dt(32)),
        ]
        session.add_all(allocations)

        obligations = [
            Obligation(user_id=user.id, name="Apartment Rent", category_id=categories["Rent"].id, estimated_amount=2350, currency="PEN", due_day=2, linked_movement_id=movements[3].id, is_active=True),
            Obligation(user_id=user.id, name="Electricity & Water", category_id=categories["Utilities"].id, estimated_amount=280, currency="PEN", due_day=8, linked_movement_id=movements[4].id, is_active=True),
            Obligation(user_id=user.id, name="Netflix", category_id=categories["Entertainment"].id, estimated_amount=45, currency="PEN", due_day=18, linked_movement_id=None, is_active=True),
            Obligation(user_id=user.id, name="Gym Membership", category_id=categories["Health"].id, estimated_amount=120, currency="PEN", due_day=20, linked_movement_id=None, is_active=True),
        ]
        session.add_all(obligations)

        await session.commit()
