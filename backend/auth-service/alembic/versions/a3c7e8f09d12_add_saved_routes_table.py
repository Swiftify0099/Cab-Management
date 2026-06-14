"""Add saved_routes table

Revision ID: a3c7e8f09d12
Revises: f1e90a47c62e
Create Date: 2026-06-11 16:53:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a3c7e8f09d12'
down_revision: Union[str, None] = 'f1e90a47c62e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'saved_routes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('route_name', sa.String(150), nullable=False),
        sa.Column('pickup_label', sa.String(100), nullable=False),
        sa.Column('pickup_address', sa.Text, nullable=False),
        sa.Column('pickup_lat', sa.Float, nullable=False),
        sa.Column('pickup_lon', sa.Float, nullable=False),
        sa.Column('drop_label', sa.String(100), nullable=False),
        sa.Column('drop_address', sa.Text, nullable=False),
        sa.Column('drop_lat', sa.Float, nullable=False),
        sa.Column('drop_lon', sa.Float, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('saved_routes')
