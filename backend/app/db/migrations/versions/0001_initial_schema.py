"""Initial schema — all tables

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255)),
        sa.Column("organization", sa.String(255)),
        sa.Column("role", sa.String(50), server_default="STUDENT"),
        sa.Column("preferred_language", sa.String(5), server_default="EN"),
        sa.Column("email_verified", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    # projects
    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("location", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("code_of_practice", sa.String(50)),
        sa.Column("unit_system", sa.String(10), server_default="METRIC"),
        sa.Column("currency", sa.String(3), server_default="ETB"),
        sa.Column("rate_database_version", sa.String(50)),
        sa.Column("scale", sa.String(50)),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    # drawings
    op.create_table(
        "drawings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("file_path", sa.String(500), nullable=False),
        sa.Column("file_size_mb", sa.Numeric(10, 2)),
        sa.Column("category", sa.String(50)),
        sa.Column("page_count", sa.Integer()),
        sa.Column("scale", sa.String(50)),
        sa.Column("title_block_text", sa.Text()),
        sa.Column("user_notes", sa.Text()),
        sa.Column("uploaded_at", sa.DateTime(timezone=True)),
    )

    # takeoff_items
    op.create_table(
        "takeoff_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_code", sa.String(50)),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("unit", sa.String(50), nullable=False),
        sa.Column("quantity", sa.Numeric(15, 3), nullable=False),
        sa.Column("section", sa.String(50)),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    # rates
    op.create_table(
        "rates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("item_code", sa.String(50)),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("unit", sa.String(50), nullable=False),
        sa.Column("rate_per_unit", sa.Numeric(15, 2), nullable=False),
        sa.Column("rate_source", sa.String(255)),
        sa.Column("region", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )

    # bbs_bars
    op.create_table(
        "bbs_bars",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("bar_mark", sa.String(50)),
        sa.Column("member_name", sa.String(255), nullable=False),
        sa.Column("bar_diameter_mm", sa.Integer(), nullable=False),
        sa.Column("bar_shape", sa.String(50), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("clear_length_m", sa.Numeric(8, 3), nullable=False),
        sa.Column("hook_length_mm", sa.Integer(), server_default="0"),
        sa.Column("bend_deduction_mm", sa.Integer(), server_default="0"),
        sa.Column("cover_top_mm", sa.Integer(), server_default="50"),
        sa.Column("cover_bottom_mm", sa.Integer(), server_default="50"),
        sa.Column("lap_length_mm", sa.Integer()),
        sa.Column("section", sa.String(50)),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    # boq_outputs
    op.create_table(
        "boq_outputs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("section", sa.String(50), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True)),
        sa.Column("total_amount", sa.Numeric(15, 2)),
        sa.Column("currency", sa.String(3), server_default="ETB"),
        sa.Column("pdf_path", sa.String(500)),
        sa.Column("excel_path", sa.String(500)),
    )

    # suggested_quantities
    op.create_table(
        "suggested_quantities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("drawing_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drawings.id", ondelete="SET NULL"), nullable=True),
        sa.Column("discipline", sa.String(50), nullable=False),
        sa.Column("element_category", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("quantity_value", sa.Numeric(15, 3), nullable=False),
        sa.Column("quantity_unit", sa.String(20), nullable=False),
        sa.Column("section", sa.String(50), nullable=False),
        sa.Column("source_layer", sa.String(255)),
        sa.Column("confidence", sa.Numeric(4, 3), server_default="0.8"),
        sa.Column("notes", sa.Text()),
        sa.Column("status", sa.String(20), server_default="PENDING"),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
    )

    # federated_quantities
    op.create_table(
        "federated_quantities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("drawing_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drawings.id", ondelete="SET NULL"), nullable=True),
        sa.Column("suggested_quantity_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("suggested_quantities.id", ondelete="SET NULL"), nullable=True),
        sa.Column("discipline", sa.String(50), nullable=False),
        sa.Column("element_category", sa.String(100), nullable=False),
        sa.Column("element_description", sa.Text(), nullable=False),
        sa.Column("quantity_value", sa.Numeric(15, 3), nullable=False),
        sa.Column("quantity_unit", sa.String(20), nullable=False),
        sa.Column("section", sa.String(50), nullable=False),
        sa.Column("source_layer", sa.String(255)),
        sa.Column("is_verified", sa.Boolean(), server_default="true"),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )


def downgrade() -> None:
    op.drop_table("federated_quantities")
    op.drop_table("suggested_quantities")
    op.drop_table("boq_outputs")
    op.drop_table("bbs_bars")
    op.drop_table("rates")
    op.drop_table("takeoff_items")
    op.drop_table("drawings")
    op.drop_table("projects")
    op.drop_table("users")
