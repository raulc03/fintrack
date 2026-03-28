from datetime import datetime

from sqlalchemy import String, Numeric, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), primary_key=True)
    main_currency: Mapped[str] = mapped_column(String(3), nullable=False, default="PEN")
    usd_to_pen_rate: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False, default=3.70)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
