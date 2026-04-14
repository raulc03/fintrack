from datetime import UTC, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_settings import UserSettings

DEFAULT_TIMEZONE = "America/Lima"


def normalize_timezone_name(name: str | None) -> str:
    if not name:
        return DEFAULT_TIMEZONE
    try:
        ZoneInfo(name)
        return name
    except ZoneInfoNotFoundError:
        return DEFAULT_TIMEZONE


def get_timezone(name: str | None) -> ZoneInfo:
    return ZoneInfo(normalize_timezone_name(name))


def to_local_datetime(value: datetime, timezone_name: str | None) -> datetime:
    return value.replace(tzinfo=UTC).astimezone(get_timezone(timezone_name))


def get_local_month_start(value: datetime, timezone_name: str | None) -> datetime:
    local = to_local_datetime(value, timezone_name)
    return datetime(local.year, local.month, 1)


def add_months_local(value: datetime, months: int) -> datetime:
    total_months = (value.year * 12 + value.month - 1) + months
    year, month_index = divmod(total_months, 12)
    return datetime(year, month_index + 1, 1)


def local_month_start_to_utc(value: datetime, timezone_name: str | None) -> datetime:
    local = value.replace(tzinfo=get_timezone(timezone_name))
    return local.astimezone(UTC).replace(tzinfo=None)


def get_month_range_for_timezone(
    timezone_name: str | None,
    *,
    reference: datetime | None = None,
    year: int | None = None,
    month: int | None = None,
) -> tuple[datetime, datetime]:
    zone = get_timezone(timezone_name)
    if year is not None and month is not None:
        local_start = datetime(year, month, 1)
    else:
        current = reference or datetime.utcnow()
        local_current = current.replace(tzinfo=UTC).astimezone(zone)
        local_start = datetime(local_current.year, local_current.month, 1)

    next_start = add_months_local(local_start, 1)
    return local_month_start_to_utc(local_start, timezone_name), local_month_start_to_utc(next_start, timezone_name)


def get_month_label(value: datetime, timezone_name: str | None) -> str:
    return to_local_datetime(value, timezone_name).strftime("%b %Y")


def month_diff(start: datetime, end: datetime, timezone_name: str | None) -> int:
    start_local = get_local_month_start(start, timezone_name)
    end_local = get_local_month_start(end, timezone_name)
    return (end_local.year - start_local.year) * 12 + (end_local.month - start_local.month)


def add_month_boundary(value: datetime, months: int, timezone_name: str | None) -> datetime:
    local = get_local_month_start(value, timezone_name)
    return local_month_start_to_utc(add_months_local(local, months), timezone_name)


def normalize_month_boundary(value: datetime, timezone_name: str | None) -> datetime:
    # Legacy month boundaries were stored as naive UTC midnight on day 1.
    # Treat those as nominal month markers, not real UTC instants, so April stays April in local time.
    if (
        value.day == 1
        and value.hour == 0
        and value.minute == 0
        and value.second == 0
        and value.microsecond == 0
    ):
        return local_month_start_to_utc(datetime(value.year, value.month, 1), timezone_name)
    return add_month_boundary(value, 0, timezone_name)


def parse_datetime_for_timezone(iso_str: str, timezone_name: str | None) -> datetime:
    parsed = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        local = parsed.replace(tzinfo=get_timezone(timezone_name))
        return local.astimezone(UTC).replace(tzinfo=None)
    return parsed.astimezone(UTC).replace(tzinfo=None)


async def get_user_timezone_name(db: AsyncSession, user_id: str) -> str:
    result = await db.execute(select(UserSettings.timezone).where(UserSettings.user_id == user_id))
    return normalize_timezone_name(result.scalar_one_or_none())
