"""Add cutting_length_m to bbs_bars

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-05
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "bbs_bars",
        sa.Column("cutting_length_m", sa.Numeric(8, 3), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("bbs_bars", "cutting_length_m")
