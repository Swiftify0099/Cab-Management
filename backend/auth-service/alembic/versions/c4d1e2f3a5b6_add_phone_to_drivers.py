"""add phone to drivers

Revision ID: c4d1e2f3a5b6
Revises: 2e0dd029d3de
Create Date: 2026-06-14 11:56:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d1e2f3a5b6'
down_revision: Union[str, None] = '2e0dd029d3de'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add the missing `phone` column to the drivers table
    op.add_column(
        'drivers',
        sa.Column('phone', sa.String(length=15), nullable=True)
    )
    op.create_index(op.f('ix_drivers_phone'), 'drivers', ['phone'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_drivers_phone'), table_name='drivers')
    op.drop_column('drivers', 'phone')
