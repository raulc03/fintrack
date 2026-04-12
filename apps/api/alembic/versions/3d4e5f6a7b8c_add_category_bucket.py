"""add category bucket

Revision ID: 3d4e5f6a7b8c
Revises: 2c3d4e5f6a7b
Create Date: 2026-04-12 09:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "3d4e5f6a7b8c"
down_revision: Union[str, Sequence[str], None] = "2c3d4e5f6a7b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("categories", sa.Column("bucket", sa.String(), nullable=True))

    op.execute(
        sa.text(
            """
            UPDATE categories
            SET bucket = CASE name
                WHEN 'Food & Groceries' THEN 'necessity'
                WHEN 'Transport' THEN 'necessity'
                WHEN 'Rent' THEN 'necessity'
                WHEN 'Utilities' THEN 'necessity'
                WHEN 'Entertainment' THEN 'desire'
                WHEN 'Health' THEN 'necessity'
                WHEN 'Shopping' THEN 'desire'
                WHEN 'Education' THEN 'desire'
                WHEN 'Transfer' THEN 'save_invest'
                ELSE bucket
            END
            WHERE type = 'expense'
            """
        )
    )


def downgrade() -> None:
    op.drop_column("categories", "bucket")
