"""merge heads

Revision ID: 2e0dd029d3de
Revises: a3c7e8f09d12, b3c9d2e1f4a8
Create Date: 2026-06-14 11:41:33.700044

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2e0dd029d3de'
down_revision: Union[str, None] = ('a3c7e8f09d12', 'b3c9d2e1f4a8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
