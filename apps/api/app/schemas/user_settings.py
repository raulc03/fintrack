from typing import Literal

from pydantic import BaseModel, Field


class UserSettingsResponse(BaseModel):
    mainCurrency: str
    usdToPenRate: float


class UpdateUserSettingsInput(BaseModel):
    mainCurrency: Literal["USD", "PEN"] | None = None
    usdToPenRate: float | None = Field(default=None, gt=0, le=100)
