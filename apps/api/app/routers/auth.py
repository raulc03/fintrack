from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.category import Category
from app.schemas.auth import LoginInput, SignupInput, AuthResponse, UserResponse

router = APIRouter()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

DEFAULT_CATEGORIES = [
    {"name": "Food & Groceries", "type": "expense", "icon": "shopping-cart", "color": "#ef4444"},
    {"name": "Transport", "type": "expense", "icon": "car", "color": "#f97316"},
    {"name": "Rent", "type": "expense", "icon": "home", "color": "#8b5cf6"},
    {"name": "Utilities", "type": "expense", "icon": "zap", "color": "#06b6d4"},
    {"name": "Entertainment", "type": "expense", "icon": "film", "color": "#ec4899"},
    {"name": "Health", "type": "expense", "icon": "heart", "color": "#14b8a6"},
    {"name": "Shopping", "type": "expense", "icon": "shopping-bag", "color": "#a855f7"},
    {"name": "Education", "type": "expense", "icon": "book-open", "color": "#6366f1"},
    {"name": "Salary", "type": "income", "icon": "briefcase", "color": "#22c55e"},
    {"name": "Freelance", "type": "income", "icon": "laptop", "color": "#3b82f6"},
    {"name": "Investments", "type": "income", "icon": "trending-up", "color": "#10b981"},
    {"name": "Other Income", "type": "income", "icon": "plus-circle", "color": "#64748b"},
    {"name": "Transfer", "type": "expense", "icon": "arrow-left-right", "color": "#64748b"},
]


def create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        createdAt=user.created_at.isoformat(),
    )


@router.post("/signup", response_model=AuthResponse)
async def signup(data: SignupInput, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")

    user = User(
        name=data.name,
        email=data.email.lower(),
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    await db.flush()

    # Seed default categories for the new user
    for cat in DEFAULT_CATEGORIES:
        db.add(Category(user_id=user.id, is_default=True, **cat))

    return AuthResponse(user=user_response(user), token=create_token(user.id))


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginInput, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    return AuthResponse(user=user_response(user), token=create_token(user.id))
