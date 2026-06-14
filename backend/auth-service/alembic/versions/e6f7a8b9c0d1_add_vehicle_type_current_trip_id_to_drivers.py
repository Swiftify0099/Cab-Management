"""add vehicle_type and current_trip_id to drivers

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-06-14 12:10:00.000000

Adds the two remaining Driver model columns that were detected missing
by alembic autogenerate: vehicle_type and current_trip_id.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e6f7a8b9c0d1'
down_revision: Union[str, None] = 'd5e6f7a8b9c0'
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

    # Add vehicle_type if missing
    if not column_exists('drivers', 'vehicle_type'):
        op.add_column('drivers', sa.Column('vehicle_type', sa.String(50), nullable=True))

    # Add current_trip_id if missing (FK to trips.id)
    if not column_exists('drivers', 'current_trip_id'):
        op.add_column(
            'drivers',
            sa.Column(
                'current_trip_id',
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey('trips.id'),
                nullable=True,
            ),
        )


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

    if column_exists('drivers', 'current_trip_id'):
        op.drop_column('drivers', 'current_trip_id')
    if column_exists('drivers', 'vehicle_type'):
        op.drop_column('drivers', 'vehicle_type')
