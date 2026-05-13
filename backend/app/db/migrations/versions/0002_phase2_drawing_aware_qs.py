"""Phase 2 — Drawing-Aware QS + Federation Foundation

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-12
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── drawing_pages ─────────────────────────────────────────────────────────
    op.create_table(
        "drawing_pages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("drawing_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drawings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=False),
        sa.Column("width_px", sa.Float()),
        sa.Column("height_px", sa.Float()),
        sa.Column("width_mm", sa.Float()),
        sa.Column("height_mm", sa.Float()),
        sa.Column("thumbnail_path", sa.String(500)),
        sa.Column("rendered_image_path", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_drawing_pages_drawing_id", "drawing_pages", ["drawing_id"])

    # ── project_elements ──────────────────────────────────────────────────────
    # Created before drawing_calibrations and measurements (they FK to it)
    op.create_table(
        "project_elements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("element_code", sa.String(50), nullable=False),
        sa.Column("element_type", sa.String(50), nullable=False),
        sa.Column("discipline", sa.String(50), nullable=False),
        sa.Column("section", sa.String(50), nullable=False),
        sa.Column("floor_level", sa.String(50)),
        sa.Column("drawing_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drawings.id", ondelete="SET NULL"), nullable=True),
        sa.Column("page_number", sa.Integer()),
        sa.Column("source_type", sa.String(50), server_default="MANUAL_ENTRY"),
        sa.Column("approx_x", sa.Float()),
        sa.Column("approx_y", sa.Float()),
        sa.Column("geometry_json", postgresql.JSONB()),
        sa.Column("material", sa.String(255)),
        sa.Column("specification", postgresql.JSONB()),
        sa.Column("status", sa.String(20), server_default="ACTIVE"),
        sa.Column("confidence", sa.Float(), server_default="1.0"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_project_elements_project_id", "project_elements", ["project_id"])
    op.create_index("ix_project_elements_type", "project_elements", ["element_type"])

    # ── drawing_calibrations ──────────────────────────────────────────────────
    op.create_table(
        "drawing_calibrations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("drawing_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drawings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("page_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drawing_pages.id", ondelete="SET NULL"), nullable=True),
        sa.Column("page_number", sa.Integer(), server_default="1"),
        sa.Column("reference_name", sa.String(100)),
        sa.Column("point_a_x", sa.Float(), nullable=False),
        sa.Column("point_a_y", sa.Float(), nullable=False),
        sa.Column("point_b_x", sa.Float(), nullable=False),
        sa.Column("point_b_y", sa.Float(), nullable=False),
        sa.Column("pixel_distance", sa.Float(), nullable=False),
        sa.Column("real_distance", sa.Float(), nullable=False),
        sa.Column("real_unit", sa.String(10), server_default="m"),
        sa.Column("scale_factor", sa.Float(), nullable=False),
        sa.Column("pixels_per_meter", sa.Float(), nullable=False),
        sa.Column("floor_level", sa.String(50)),
        sa.Column("grid_reference", sa.String(100)),
        sa.Column("rotation_degrees", sa.Float(), server_default="0.0"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_drawing_calibrations_drawing_id", "drawing_calibrations", ["drawing_id"])

    # ── measurements ──────────────────────────────────────────────────────────
    op.create_table(
        "measurements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("drawing_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drawings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("page_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drawing_pages.id", ondelete="SET NULL"), nullable=True),
        sa.Column("page_number", sa.Integer(), server_default="1"),
        sa.Column("calibration_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drawing_calibrations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("measurement_type", sa.String(20), nullable=False),
        sa.Column("discipline", sa.String(50), nullable=False),
        sa.Column("section", sa.String(50), nullable=False),
        sa.Column("element_category", sa.String(100), nullable=False),
        sa.Column("raw_value", sa.Float(), nullable=False),
        sa.Column("final_value", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(20), nullable=False),
        sa.Column("multiplier", sa.Float(), server_default="1.0"),
        sa.Column("scale_factor_used", sa.Float()),
        sa.Column("points_json", postgresql.JSONB(), nullable=False),
        sa.Column("color", sa.String(20), server_default="#eb6905"),
        sa.Column("stroke_width", sa.Integer(), server_default="2"),
        sa.Column("project_element_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("project_elements.id", ondelete="SET NULL"), nullable=True),
        sa.Column("notes", sa.Text()),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_measurements_project_id", "measurements", ["project_id"])
    op.create_index("ix_measurements_drawing_id", "measurements", ["drawing_id"])

    # ── boq_items ─────────────────────────────────────────────────────────────
    op.create_table(
        "boq_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_no", sa.String(20), nullable=False),
        sa.Column("section", sa.String(50), nullable=False),
        sa.Column("trade", sa.String(100)),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("unit", sa.String(20), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("rate", sa.Float(), server_default="0.0"),
        sa.Column("amount", sa.Float(), server_default="0.0"),
        sa.Column("waste_factor", sa.Float(), server_default="0.0"),
        sa.Column("notes", sa.Text()),
        sa.Column("is_locked", sa.Boolean(), server_default="false"),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_boq_items_project_id", "boq_items", ["project_id"])

    # ── boq_item_sources ──────────────────────────────────────────────────────
    op.create_table(
        "boq_item_sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("boq_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("boq_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("suggested_quantity_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("suggested_quantities.id", ondelete="SET NULL"), nullable=True),
        sa.Column("measurement_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("measurements.id", ondelete="SET NULL"), nullable=True),
        sa.Column("project_element_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("project_elements.id", ondelete="SET NULL"), nullable=True),
        sa.Column("contribution_quantity", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(20), nullable=False),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )

    # ── quantity_sources ──────────────────────────────────────────────────────
    op.create_table(
        "quantity_sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("suggested_quantity_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("suggested_quantities.id", ondelete="CASCADE"), nullable=True),
        sa.Column("boq_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("boq_items.id", ondelete="CASCADE"), nullable=True),
        sa.Column("source_type", sa.String(50), nullable=False),
        sa.Column("drawing_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drawings.id", ondelete="SET NULL"), nullable=True),
        sa.Column("page_number", sa.Integer()),
        sa.Column("measurement_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("measurements.id", ondelete="SET NULL"), nullable=True),
        sa.Column("project_element_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("project_elements.id", ondelete="SET NULL"), nullable=True),
        sa.Column("dxf_layer", sa.String(255)),
        sa.Column("dxf_block_name", sa.String(255)),
        sa.Column("dxf_entity_id", sa.String(255)),
        sa.Column("contribution_value", sa.Float()),
        sa.Column("contribution_unit", sa.String(20)),
        sa.Column("confidence", sa.Float(), server_default="1.0"),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_quantity_sources_project_id", "quantity_sources", ["project_id"])

    # ── audit_logs ────────────────────────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(50)),
        sa.Column("entity_id", sa.String(36)),
        sa.Column("old_value", postgresql.JSONB()),
        sa.Column("new_value", postgresql.JSONB()),
        sa.Column("description", sa.Text()),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_audit_logs_project_id", "audit_logs", ["project_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("quantity_sources")
    op.drop_table("boq_item_sources")
    op.drop_table("boq_items")
    op.drop_table("measurements")
    op.drop_table("drawing_calibrations")
    op.drop_table("project_elements")
    op.drop_table("drawing_pages")
