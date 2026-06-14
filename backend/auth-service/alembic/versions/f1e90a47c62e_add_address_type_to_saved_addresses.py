"""Add address_type to saved_addresses

Revision ID: f1e90a47c62e
Revises: 
Create Date: 2026-06-11 16:02:05.915340

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f1e90a47c62e'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add address_type column to saved_addresses
    op.add_column('saved_addresses', sa.Column('address_type', sa.String(length=20), server_default='general', nullable=False))


def downgrade() -> None:
    op.drop_column('saved_addresses', 'address_type')
