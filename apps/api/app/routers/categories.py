from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.category import Category
from app.schemas.category import (
    CreateCategoryInput,
    UpdateCategoryInput,
    CategoryResponse,
)

router = APIRouter()


def to_response(c: Category) -> CategoryResponse:
    return CategoryResponse(
        id=c.id,
        name=c.name,
        type=c.type,
        bucket=c.bucket,
        icon=c.icon,
        color=c.color,
        isDefault=c.is_default,
        createdAt=c.created_at.isoformat(),
    )


@router.get("", response_model=list[CategoryResponse])
async def get_categories(
    type: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Category).where(
        or_(Category.user_id == user.id, Category.user_id.is_(None))
    )
    if type:
        query = query.where(Category.type == type)
    result = await db.execute(query)
    return [to_response(c) for c in result.scalars()]


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CreateCategoryInput,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    category = Category(
        user_id=user.id,
        name=data.name,
        type=data.type,
        bucket=data.bucket,
        icon=data.icon or "tag",
        color=data.color or "#64748b",
        is_default=False,
    )
    db.add(category)
    await db.flush()
    return to_response(category)


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    data: UpdateCategoryInput,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Category).where(Category.id == category_id, Category.user_id == user.id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(category, field, value)

    await db.flush()
    return to_response(category)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Category).where(Category.id == category_id, Category.user_id == user.id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    await db.delete(category)
