import uuid
from datetime import datetime

from sqlalchemy import String, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)  # USD | PEN
    initial_balance: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    current_balance: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#3b82f6")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
