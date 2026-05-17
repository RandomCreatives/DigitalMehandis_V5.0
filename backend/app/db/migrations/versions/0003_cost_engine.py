"""Phase 2 — Cost Engine: Government Rate Library, Rate Matching, Pricing

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-12
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── rate_sources ──────────────────────────────────────────────────────────
    op.create_table(
        "rate_sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("issuing_authority", sa.String(255), nullable=True),
        sa.Column("region", sa.String(100), nullable=True),
        sa.Column("fiscal_year", sa.String(50), nullable=True),
        sa.Column("quarter", sa.String(50), nullable=True),
        sa.Column("calendar_system", sa.String(50), server_default="EC"),
        sa.Column("cost_type", sa.String(50), server_default="DIRECT_COST"),
        sa.Column("currency", sa.String(10), server_default="ETB"),
        sa.Column("source_file_path", sa.String(500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_official", sa.Boolean(), server_default="true"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    # ── rate_items ────────────────────────────────────────────────────────────
    op.create_table(
        "rate_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "rate_source_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("rate_sources.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("item_no", sa.String(50), nullable=True),
        sa.Column("work_category", sa.String(100), nullable=True),
        sa.Column("sub_category", sa.String(150), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("normalized_description", sa.Text(), nullable=True),
        sa.Column("unit", sa.String(30), nullable=False),
        sa.Column("normalized_unit", sa.String(30), nullable=True),
        sa.Column("direct_cost", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(10), server_default="ETB"),
        sa.Column("region", sa.String(100), nullable=True),
        sa.Column("fiscal_year", sa.String(50), nullable=True),
        sa.Column("source_page", sa.Integer(), nullable=True),
        sa.Column("confidence", sa.Float(), server_default="1.0"),
        sa.Column("is_verified", sa.Boolean(), server_default="false"),
        sa.Column("verified_by", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_rate_items_rate_source_id", "rate_items", ["rate_source_id"])
    op.create_index("ix_rate_items_work_category", "rate_items", ["work_category"])

    # ── raw_rate_import_rows ──────────────────────────────────────────────────
    op.create_table(
        "raw_rate_import_rows",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "rate_source_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("rate_sources.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("source_page", sa.Integer(), nullable=True),
        sa.Column("raw_item_no", sa.String(100), nullable=True),
        sa.Column("raw_description", sa.Text(), nullable=True),
        sa.Column("raw_unit", sa.String(50), nullable=True),
        sa.Column("raw_cost", sa.String(100), nullable=True),
        sa.Column("parsed_item_no", sa.String(50), nullable=True),
        sa.Column("parsed_description", sa.Text(), nullable=True),
        sa.Column("parsed_unit", sa.String(30), nullable=True),
        sa.Column("parsed_cost", sa.Float(), nullable=True),
        sa.Column("confidence", sa.Float(), server_default="0.0"),
        sa.Column("status", sa.String(30), server_default="PENDING"),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )
    op.create_index(
        "ix_raw_rate_import_rows_rate_source_id",
        "raw_rate_import_rows",
        ["rate_source_id"],
    )
    op.create_index(
        "ix_raw_rate_import_rows_status",
        "raw_rate_import_rows",
        ["status"],
    )

    # ── project_pricing_settings ──────────────────────────────────────────────
    op.create_table(
        "project_pricing_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "selected_rate_source_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("rate_sources.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("contractor_grade", sa.String(50), nullable=True),
        sa.Column("overhead_percent", sa.Float(), server_default="8.0"),
        sa.Column("profit_percent", sa.Float(), server_default="10.0"),
        sa.Column("tax_percent", sa.Float(), server_default="0.0"),
        sa.Column("pricing_mode", sa.String(50), server_default="ADDITIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    # ── element_rate_matches ──────────────────────────────────────────────────
    op.create_table(
        "element_rate_matches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "project_element_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("project_elements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "rate_item_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("rate_items.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("match_confidence", sa.Float(), server_default="0.0"),
        sa.Column("match_reason", sa.Text(), nullable=True),
        sa.Column("status", sa.String(30), server_default="SUGGESTED"),
        sa.Column("applied_direct_cost", sa.Float(), nullable=True),
        sa.Column("applied_final_rate", sa.Float(), nullable=True),
        sa.Column("override_reason", sa.Text(), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_index(
        "ix_element_rate_matches_project_id",
        "element_rate_matches",
        ["project_id"],
    )
    op.create_index(
        "ix_element_rate_matches_element_id",
        "element_rate_matches",
        ["project_element_id"],
    )


def downgrade() -> None:
    op.drop_table("element_rate_matches")
    op.drop_table("project_pricing_settings")
    op.drop_table("raw_rate_import_rows")
    op.drop_table("rate_items")
    op.drop_table("rate_sources")
