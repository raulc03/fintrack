"""add bucket to obligations

Revision ID: 4e5f6a7b8c9d
Revises: 3d4e5f6a7b8c
Create Date: 2026-04-12 18:20:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4e5f6a7b8c9d"
down_revision: Union[str, Sequence[str], None] = "3d4e5f6a7b8c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("obligations", sa.Column("bucket", sa.String(), nullable=True))
    op.execute(
        sa.text(
            """
            UPDATE obligations
            SET bucket = COALESCE(categories.bucket, 'necessity')
            FROM categories
            WHERE categories.id = obligations.category_id
            """
        )
    )
    op.alter_column("obligations", "bucket", nullable=False)


def downgrade() -> None:
    op.drop_column("obligations", "bucket")
