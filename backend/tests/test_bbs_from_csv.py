"""
Validation tests against real Ethiopian BBS CSV data (BBS.csv).

The CSV follows Ethiopian / IS standard:
- Unit weight = D² / 162  (kg/m)
- "Bar Length" = cutting length per bar (already includes hooks/bends)
- Total Length = Total No.of Bars × Bar Length
- Total Weight = Total Length × Unit Weight

This test verifies our calculator reproduces the CSV totals for unambiguous
straight-bar rows. Stirrup rows are excluded because the CSV's "Bar Length"
for stirrups may encode total member-run length rather than per-bar length.
"""
import pytest
from app.utils.bbs_calculator import BBSCalculator
from app.core.constants import UNIT_WEIGHTS_KG_PER_M


@pytest.mark.parametrize("diameter,expected_weight", [
    (6, 0.222),
    (8, 0.395),
    (10, 0.617),
    (12, 0.888),
    (14, 1.21),
    (16, 1.58),
    (20, 2.47),
    (24, 3.55),
])
def test_unit_weights_match_ethiopian_standard(diameter, expected_weight):
    """Verify D²/162 formula matches the BBS.csv exactly."""
    actual = UNIT_WEIGHTS_KG_PER_M.get(diameter, 0.0)
    assert actual == pytest.approx(expected_weight, rel=1e-3)


class TestStraightBarCSVReplication:
    """Reproduce unambiguous straight-bar rows from BBS.csv."""

    def test_f1_bottom_bar_12mm(self):
        """F-1 Bottom bar: 12mm, 2.21m cutting length, 72 bars → 159.12m total."""
        bar = {
            "bar_shape": "STRAIGHT",
            "clear_length_m": 2.21,
            "cutting_length_m": 2.21,
            "bar_diameter_mm": 12,
            "hook_length_mm": 0,
            "cover_top_mm": 50,
            "cover_bottom_mm": 50,
            "quantity": 72,
        }
        enriched = BBSCalculator.enrich_bar(bar)

        # Direct cutting length should be used (not recomputed from clear_length)
        assert enriched["cutting_length_m"] == pytest.approx(2.21, abs=0.001)
        # Weight per bar = 2.21 × 0.888 = 1.96248
        assert enriched["weight_per_unit_kg"] == pytest.approx(1.96248, abs=0.001)
        # Total weight = 72 × 1.96248 = 141.298 ≈ 141.3 (matches CSV subtotal)
        assert enriched["total_weight_kg"] == pytest.approx(141.298, abs=0.1)

    def test_f2_bottom_bar_14mm(self):
        """F-2 Bottom bar: 14mm, 2.5m cutting length, 418 bars → 1045m total."""
        bar = {
            "bar_shape": "STRAIGHT",
            "clear_length_m": 2.5,
            "cutting_length_m": 2.5,
            "bar_diameter_mm": 14,
            "hook_length_mm": 0,
            "cover_top_mm": 50,
            "cover_bottom_mm": 50,
            "quantity": 418,
        }
        enriched = BBSCalculator.enrich_bar(bar)
        assert enriched["cutting_length_m"] == pytest.approx(2.5, abs=0.001)
        # Weight per bar = 2.5 × 1.21 = 3.025
        assert enriched["weight_per_unit_kg"] == pytest.approx(3.025, abs=0.001)
        # Total weight = 418 × 3.025 = 1264.45
        assert enriched["total_weight_kg"] == pytest.approx(1264.45, abs=0.1)

    def test_f3_bottom_bar_14mm(self):
        """F-3 Bottom bar: 14mm, 3.11m, 216 bars → 671.76m total."""
        bar = {
            "bar_shape": "STRAIGHT",
            "clear_length_m": 3.11,
            "cutting_length_m": 3.11,
            "bar_diameter_mm": 14,
            "hook_length_mm": 0,
            "cover_top_mm": 50,
            "cover_bottom_mm": 50,
            "quantity": 216,
        }
        enriched = BBSCalculator.enrich_bar(bar)
        assert enriched["cutting_length_m"] == pytest.approx(3.11, abs=0.001)
        # 216 × 3.11 × 1.21 = 812.6376
        assert enriched["total_weight_kg"] == pytest.approx(812.83, abs=0.1)

    def test_c3_bottom_bar_16mm(self):
        """C-3 (-2.50 - 0.00): 16mm, 4.01m, 40 bars → 160.4m total."""
        bar = {
            "bar_shape": "STRAIGHT",
            "clear_length_m": 4.01,
            "cutting_length_m": 4.01,
            "bar_diameter_mm": 16,
            "hook_length_mm": 0,
            "cover_top_mm": 50,
            "cover_bottom_mm": 50,
            "quantity": 40,
        }
        enriched = BBSCalculator.enrich_bar(bar)
        assert enriched["cutting_length_m"] == pytest.approx(4.01, abs=0.001)
        # 40 × 4.01 × 1.58 = 253.432
        assert enriched["total_weight_kg"] == pytest.approx(253.432, abs=0.1)

    def test_grade_beam_top_bar_14mm(self):
        """Axis-1&3 Top bar: 14mm, 5.59m, 4 bars → 22.36m total."""
        bar = {
            "bar_shape": "STRAIGHT",
            "clear_length_m": 5.59,
            "cutting_length_m": 5.59,
            "bar_diameter_mm": 14,
            "hook_length_mm": 0,
            "cover_top_mm": 50,
            "cover_bottom_mm": 50,
            "quantity": 4,
        }
        enriched = BBSCalculator.enrich_bar(bar)
        assert enriched["cutting_length_m"] == pytest.approx(5.59, abs=0.001)
        # 4 × 5.59 × 1.21 = 27.0556
        assert enriched["total_weight_kg"] == pytest.approx(27.056, abs=0.01)

    def test_ground_floor_slab_bottom_8mm(self):
        """GF Slab Bottom: 8mm, 10.19m, 24 bars → 244.44m total."""
        bar = {
            "bar_shape": "STRAIGHT",
            "clear_length_m": 10.19,
            "cutting_length_m": 10.19,
            "bar_diameter_mm": 8,
            "hook_length_mm": 0,
            "cover_top_mm": 50,
            "cover_bottom_mm": 50,
            "quantity": 24,
        }
        enriched = BBSCalculator.enrich_bar(bar)
        assert enriched["cutting_length_m"] == pytest.approx(10.19, abs=0.001)
        # 24 × 10.19 × 0.395 = 96.6012
        assert enriched["total_weight_kg"] == pytest.approx(96.601, abs=0.01)


class TestDirectCuttingLengthPriority:
    """When cutting_length_m is provided, it must override formula computation."""

    def test_direct_cutting_used_over_clear_length(self):
        """If cutting_length_m is supplied, the calculator should use it directly
        even if clear_length_m and shape would compute a different value."""
        bar = {
            "bar_shape": "L_SHAPE",
            "clear_length_m": 1.0,  # would normally trigger formula
            "cutting_length_m": 2.5,  # but direct value overrides
            "bar_diameter_mm": 12,
            "hook_length_mm": 0,
            "cover_top_mm": 50,
            "cover_bottom_mm": 50,
            "quantity": 10,
        }
        enriched = BBSCalculator.enrich_bar(bar)
        assert enriched["cutting_length_m"] == pytest.approx(2.5, abs=0.001)
        # Weight uses 2.5m directly, not the L-shape formula result
        assert enriched["weight_per_unit_kg"] == pytest.approx(2.5 * 0.888, abs=0.001)

    def test_fallback_to_formula_when_cutting_missing(self):
        """If cutting_length_m is None, the calculator falls back to clear_length + shape formula."""
        bar = {
            "bar_shape": "STRAIGHT",
            "clear_length_m": 2.0,
            "cutting_length_m": None,
            "bar_diameter_mm": 10,
            "hook_length_mm": 0,
            "cover_top_mm": 50,
            "cover_bottom_mm": 50,
            "quantity": 5,
        }
        enriched = BBSCalculator.enrich_bar(bar)
        # STRAIGHT formula: clear_mm + 2*cover = 2000 + 100 = 2100mm = 2.1m
        assert enriched["cutting_length_m"] == pytest.approx(2.1, abs=0.001)


class TestCSVGrandTotals:
    """Verify the calculator can reproduce the CSV's bottom-line totals."""

    def test_substructure_14mm_total_length(self):
        """CSV substructure total for 14mm = 3,458.93m.
        We verify our unit weight × total length matches the CSV subtotal weight.
        """
        total_length_14mm = 3458.93
        total_weight_14mm = total_length_14mm * UNIT_WEIGHTS_KG_PER_M[14]
        # CSV Sub Total Wt. for 14mm = 4,185.30
        assert total_weight_14mm == pytest.approx(4185.30, abs=0.5)

    def test_substructure_16mm_total_length(self):
        """CSV substructure total for 16mm = 953.52m.
        CSV Sub Total Wt. for 16mm = 1,506.60
        """
        total_length_16mm = 953.52
        total_weight_16mm = total_length_16mm * UNIT_WEIGHTS_KG_PER_M[16]
        assert total_weight_16mm == pytest.approx(1506.60, abs=0.5)

    def test_substructure_8mm_total_length(self):
        """CSV substructure total for 8mm = 52,315.58m.
        CSV Sub Total Wt. for 8mm = 20,664.70
        """
        total_length_8mm = 52315.58
        total_weight_8mm = total_length_8mm * UNIT_WEIGHTS_KG_PER_M[8]
        assert total_weight_8mm == pytest.approx(20664.70, abs=1.0)
