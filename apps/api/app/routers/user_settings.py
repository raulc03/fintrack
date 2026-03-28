from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.user_settings import UserSettings
from app.schemas.user_settings import UserSettingsResponse, UpdateUserSettingsInput

router = APIRouter()

DEFAULT_SETTINGS = UserSettingsResponse(mainCurrency="PEN", usdToPenRate=3.70)


def to_response(s: UserSettings) -> UserSettingsResponse:
    return UserSettingsResponse(
        mainCurrency=s.main_currency,
        usdToPenRate=float(s.usd_to_pen_rate),
    )


@router.get("", response_model=UserSettingsResponse)
async def get_settings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == user.id)
    )
    settings = result.scalar_one_or_none()
    if not settings:
        return DEFAULT_SETTINGS
    return to_response(settings)


@router.patch("", response_model=UserSettingsResponse)
async def update_settings(
    data: UpdateUserSettingsInput,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == user.id)
    )
    settings = result.scalar_one_or_none()
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.add(settings)

    if data.mainCurrency is not None:
        settings.main_currency = data.mainCurrency
    if data.usdToPenRate is not None:
        settings.usd_to_pen_rate = data.usdToPenRate

    await db.flush()
    return to_response(settings)
