"""add service_type, pricing_mode, preferred_driver_ids to ride_requests and is_preferred to ride_offers

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-08-24 22:00:00.000000

Adds columns needed for multi-service dispatch (outstation, cab, parcel, transport)
and preferred driver direct routing.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f7a8b9c0d1e2'
down_revision: Union[str, None] = 'e6f7a8b9c0d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    def column_exists(table: str, column: str) -> bool:
        result = conn.execute(
            sa.text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name = :tbl AND column_name = :col"
            ),
            {"tbl": table, "col": column},
        ).fetchone()
        return result is not None

    # ride_requests: service_type
    if not column_exists('ride_requests', 'service_type'):
        op.add_column('ride_requests', sa.Column('service_type', sa.String(50), nullable=True, index=True))

    # ride_requests: pricing_mode
    if not column_exists('ride_requests', 'pricing_mode'):
        op.add_column('ride_requests', sa.Column('pricing_mode', sa.String(30), server_default='STANDARD', nullable=False))

    # ride_requests: preferred_driver_ids
    if not column_exists('ride_requests', 'preferred_driver_ids'):
        op.add_column('ride_requests', sa.Column('preferred_driver_ids', postgresql.JSONB, nullable=True))

    # ride_offers: is_preferred
    if not column_exists('ride_offers', 'is_preferred'):
        op.add_column('ride_offers', sa.Column('is_preferred', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    conn = op.get_bind()

    def column_exists(table: str, column: str) -> bool:
        result = conn.execute(
            sa.text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name = :tbl AND column_name = :col"
            ),
            {"tbl": table, "col": column},
        ).fetchone()
        return result is not None

    if column_exists('ride_offers', 'is_preferred'):
        op.drop_column('ride_offers', 'is_preferred')
    if column_exists('ride_requests', 'preferred_driver_ids'):
        op.drop_column('ride_requests', 'preferred_driver_ids')
    if column_exists('ride_requests', 'pricing_mode'):
        op.drop_column('ride_requests', 'pricing_mode')
    if column_exists('ride_requests', 'service_type'):
        op.drop_column('ride_requests', 'service_type')
