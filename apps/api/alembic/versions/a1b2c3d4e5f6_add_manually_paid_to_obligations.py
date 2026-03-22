"""add manually_paid to obligations

Revision ID: a1b2c3d4e5f6
Revises: cec68055d876
Create Date: 2026-03-21 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'cec68055d876'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('obligations', sa.Column('manually_paid', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('obligations', 'manually_paid')
