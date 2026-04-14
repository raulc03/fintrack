"""add timezone to user settings

Revision ID: 2c3d4e5f6a7b
Revises: 1b2c3d4e5f6a
Create Date: 2026-04-05 06:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '2c3d4e5f6a7b'
down_revision: Union[str, Sequence[str], None] = '1b2c3d4e5f6a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'user_settings',
        sa.Column('timezone', sa.String(length=64), nullable=False, server_default='America/Lima'),
    )


def downgrade() -> None:
    op.drop_column('user_settings', 'timezone')
