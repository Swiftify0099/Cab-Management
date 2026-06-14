"""add missing driver columns (is_online, is_active, is_verified, and others)

Revision ID: d5e6f7a8b9c0
Revises: c4d1e2f3a5b6
Create Date: 2026-06-14 12:02:00.000000

This migration adds all columns that exist in the Driver SQLAlchemy model
but were never added to the actual PostgreSQL drivers table via a migration.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, None] = 'c4d1e2f3a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Helper: only add column if it doesn't already exist
    def add_if_missing(table, column_name, column_def):
        result = conn.execute(
            sa.text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name = :tbl AND column_name = :col"
            ),
            {"tbl": table, "col": column_name},
        ).fetchone()
        if result is None:
            op.add_column(table, sa.Column(column_name, column_def))

    # Boolean flags mapped via _is_online → is_online, etc.
    add_if_missing('drivers', 'is_online',   sa.Boolean())
    add_if_missing('drivers', 'is_active',   sa.Boolean())
    add_if_missing('drivers', 'is_verified', sa.Boolean())

    # Set sensible defaults for existing rows (NOT NULL columns)
    conn.execute(sa.text(
        "UPDATE drivers SET "
        "  is_online   = COALESCE(is_online,   FALSE), "
        "  is_active   = COALESCE(is_active,   TRUE),  "
        "  is_verified = COALESCE(is_verified, FALSE)  "
        "WHERE is_online IS NULL OR is_active IS NULL OR is_verified IS NULL"
    ))

    # Now make them NOT NULL with proper defaults
    op.alter_column('drivers', 'is_online',   nullable=False,
                    server_default=sa.text('false'), existing_type=sa.Boolean())
    op.alter_column('drivers', 'is_active',   nullable=False,
                    server_default=sa.text('true'),  existing_type=sa.Boolean())
    op.alter_column('drivers', 'is_verified', nullable=False,
                    server_default=sa.text('false'), existing_type=sa.Boolean())

    # Also add any other columns that might be missing (safe no-op if they exist)
    add_if_missing('drivers', 'fatigue_score',    sa.Float())
    add_if_missing('drivers', 'suspension_until', sa.DateTime(timezone=True))
    add_if_missing('drivers', 'home_city',        sa.String(100))
    add_if_missing('drivers', 'referral_code',    sa.String(20))
    add_if_missing('drivers', 'wallet_balance',   sa.Numeric(12, 2))
    add_if_missing('drivers', 'total_earnings',   sa.Numeric(14, 2))
    add_if_missing('drivers', 'total_trips',      sa.Integer())

    # Set defaults for numeric columns on existing rows
    conn.execute(sa.text(
        "UPDATE drivers SET "
        "  fatigue_score  = COALESCE(fatigue_score, 0.0), "
        "  wallet_balance = COALESCE(wallet_balance, 0),  "
        "  total_earnings = COALESCE(total_earnings, 0),  "
        "  total_trips    = COALESCE(total_trips, 0)      "
        "WHERE fatigue_score IS NULL OR wallet_balance IS NULL "
        "   OR total_earnings IS NULL OR total_trips IS NULL"
    ))


def downgrade() -> None:
    for col in ['is_online', 'is_active', 'is_verified',
                'fatigue_score', 'suspension_until', 'home_city',
                'referral_code', 'wallet_balance', 'total_earnings', 'total_trips']:
        try:
            op.drop_column('drivers', col)
        except Exception:
            pass
