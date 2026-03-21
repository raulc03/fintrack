import uuid
from datetime import datetime

from sqlalchemy import String, Numeric, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)  # savings | investment | expense_limit
    target_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    current_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    category_id: Mapped[str | None] = mapped_column(String, ForeignKey("categories.id"), nullable=True)
    deadline: Mapped[datetime | None] = mapped_column(nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


class GoalAllocation(Base):
    __tablename__ = "goal_allocations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    goal_id: Mapped[str] = mapped_column(String, ForeignKey("goals.id"), nullable=False, index=True)
    movement_id: Mapped[str] = mapped_column(String, ForeignKey("movements.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    date: Mapped[datetime] = mapped_column(default=datetime.utcnow)
