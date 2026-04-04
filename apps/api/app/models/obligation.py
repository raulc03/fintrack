import uuid
from datetime import datetime

from sqlalchemy import String, Numeric, Integer, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Obligation(Base):
    __tablename__ = "obligations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    category_id: Mapped[str] = mapped_column(String, ForeignKey("categories.id"), nullable=False)
    estimated_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    carryover_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    due_day: Mapped[int] = mapped_column(Integer, nullable=False)
    linked_movement_id: Mapped[str | None] = mapped_column(String, ForeignKey("movements.id"), nullable=True)
    cycle_start: Mapped[datetime] = mapped_column(nullable=False, default=lambda: datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


class ObligationHistory(Base):
    __tablename__ = "obligation_history"
    __table_args__ = (UniqueConstraint("obligation_id", "month_start", name="uq_obligation_history_month"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    obligation_id: Mapped[str] = mapped_column(String, ForeignKey("obligations.id"), nullable=False, index=True)
    month_start: Mapped[datetime] = mapped_column(nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    base_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    carryover_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    due_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    paid_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    linked_movement_id: Mapped[str | None] = mapped_column(String, ForeignKey("movements.id"), nullable=True)
    is_paid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
