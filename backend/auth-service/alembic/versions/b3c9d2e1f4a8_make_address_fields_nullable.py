"""Make pincode district state nullable in saved_addresses

Revision ID: b3c9d2e1f4a8
Revises: f1e90a47c62e
Create Date: 2026-06-12 00:20:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b3c9d2e1f4a8'
down_revision: Union[str, None] = 'f1e90a47c62e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make pincode, district, state optional — map-based picker doesn't collect them
    op.alter_column('saved_addresses', 'pincode', nullable=True, existing_type=sa.String(10))
    op.alter_column('saved_addresses', 'district', nullable=True, existing_type=sa.String(100))
    op.alter_column('saved_addresses', 'state', nullable=True, existing_type=sa.String(100))


def downgrade() -> None:
    # Restore NOT NULL: back-fill blanks first
    op.execute("UPDATE saved_addresses SET pincode='000000' WHERE pincode IS NULL")
    op.execute("UPDATE saved_addresses SET district='Unknown' WHERE district IS NULL")
    op.execute("UPDATE saved_addresses SET state='Unknown' WHERE state IS NULL")
    op.alter_column('saved_addresses', 'pincode', nullable=False, existing_type=sa.String(10))
    op.alter_column('saved_addresses', 'district', nullable=False, existing_type=sa.String(100))
    op.alter_column('saved_addresses', 'state', nullable=False, existing_type=sa.String(100))
