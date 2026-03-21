import uuid
from datetime import datetime

from sqlalchemy import String, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Movement(Base):
    __tablename__ = "movements"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String, nullable=False)  # income | expense | transfer
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    date: Mapped[datetime] = mapped_column(nullable=False)
    account_id: Mapped[str] = mapped_column(String, ForeignKey("accounts.id"), nullable=False)
    destination_account_id: Mapped[str | None] = mapped_column(String, ForeignKey("accounts.id"), nullable=True)
    category_id: Mapped[str] = mapped_column(String, ForeignKey("categories.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
