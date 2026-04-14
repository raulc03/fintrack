from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.timezone import normalize_timezone_name


class UserSettingsResponse(BaseModel):
    mainCurrency: str
    usdToPenRate: float
    timezone: str


class UpdateUserSettingsInput(BaseModel):
    mainCurrency: Literal["USD", "PEN"] | None = None
    usdToPenRate: float | None = Field(default=None, gt=0, le=100)
    timezone: str | None = None

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = normalize_timezone_name(value)
        if normalized != value:
            raise ValueError("Invalid timezone")
        return value
