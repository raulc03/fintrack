"""add obligation history table

Revision ID: 1b2c3d4e5f6a
Revises: 0a1b2c3d4e5f
Create Date: 2026-04-04 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '1b2c3d4e5f6a'
down_revision: Union[str, Sequence[str], None] = '0a1b2c3d4e5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table('obligation_history'):
        op.create_table(
            'obligation_history',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('obligation_id', sa.String(), nullable=False),
            sa.Column('month_start', sa.DateTime(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('currency', sa.String(length=3), nullable=False),
            sa.Column('base_amount', sa.Numeric(12, 2), nullable=False),
            sa.Column('carryover_amount', sa.Numeric(12, 2), nullable=False, server_default='0'),
            sa.Column('due_amount', sa.Numeric(12, 2), nullable=False),
            sa.Column('paid_amount', sa.Numeric(12, 2), nullable=False, server_default='0'),
            sa.Column('linked_movement_id', sa.String(), nullable=True),
            sa.Column('is_paid', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['linked_movement_id'], ['movements.id']),
            sa.ForeignKeyConstraint(['obligation_id'], ['obligations.id']),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('obligation_id', 'month_start', name='uq_obligation_history_month'),
        )
        op.alter_column('obligation_history', 'carryover_amount', server_default=None)
        op.alter_column('obligation_history', 'paid_amount', server_default=None)
        op.alter_column('obligation_history', 'is_paid', server_default=None)

    existing_indexes = {index['name'] for index in inspector.get_indexes('obligation_history')}
    month_index = op.f('ix_obligation_history_month_start')
    obligation_index = op.f('ix_obligation_history_obligation_id')

    if month_index not in existing_indexes:
        op.create_index(month_index, 'obligation_history', ['month_start'], unique=False)
    if obligation_index not in existing_indexes:
        op.create_index(obligation_index, 'obligation_history', ['obligation_id'], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table('obligation_history'):
        return

    existing_indexes = {index['name'] for index in inspector.get_indexes('obligation_history')}
    month_index = op.f('ix_obligation_history_month_start')
    obligation_index = op.f('ix_obligation_history_obligation_id')

    if obligation_index in existing_indexes:
        op.drop_index(obligation_index, table_name='obligation_history')
    if month_index in existing_indexes:
        op.drop_index(month_index, table_name='obligation_history')
    op.drop_table('obligation_history')
