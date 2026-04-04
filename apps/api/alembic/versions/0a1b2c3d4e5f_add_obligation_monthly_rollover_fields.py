"""add obligation monthly rollover fields

Revision ID: 0a1b2c3d4e5f
Revises: f6a7b8c9d0e1
Create Date: 2026-04-04 11:00:00.000000

"""
from datetime import datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0a1b2c3d4e5f'
down_revision: Union[str, Sequence[str], None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    cycle_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    op.add_column('obligations', sa.Column('carryover_amount', sa.Numeric(12, 2), nullable=False, server_default='0'))
    op.add_column('obligations', sa.Column('cycle_start', sa.DateTime(), nullable=False, server_default=cycle_start.isoformat(sep=' ')))
    op.alter_column('obligations', 'carryover_amount', server_default=None)
    op.alter_column('obligations', 'cycle_start', server_default=None)


def downgrade() -> None:
    op.drop_column('obligations', 'cycle_start')
    op.drop_column('obligations', 'carryover_amount')
