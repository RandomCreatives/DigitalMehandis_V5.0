"""Tests for the BBS CSV importer using the real Ethiopian BBS.csv format."""
import pytest
from app.utils.bbs_csv_parser import parse_bbs_csv, _infer_shape, _clean_section


SAMPLE_CSV = b'''"LOCATION","Bar Type","Bar dia","Bar shape","Bar Length","No. of","No. of","Total","LENGTH",,,,,,,,
,,(mm),,,Members,Bars,No.of Bars,6,8,10,12,14,16,20,24
"SUB STRUCTURE",,,,,,,,,,,,,,,,
"Footing Pad",,,,,,,,,,,,,,,,
"F-1","Bottom bar",12,,2.21,4,18,72,,,,159.12,,,,,
"F-2","Bottom bar",14,,2.5,11,38,418,,,,,1045,,,,
"C-1","(-2.50 - 0.00)",14,,3.88,2,10,20,,,,,77.6,,,,
"C-1","(0.00 - 4.00)",14,,4.91,2,10,20,,,,,98.2,,,,
"C-1","st",8,,1.5,2,14,28,,42,,,,,,,
"Grade Beam","Top bar",14,,5.59,2,2,4,,,,,22.36,,,,
"Grade Beam","Stirrups",8,,87.75,2,94,188,,16497,,,,,,,
"Ground Floor SLAB @ LEVEL +0.00",,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,
,"Bottom",8,,10.19,1,24,24,,244.44,,,,,,,
"On Axis-1","Negative",12,,2.5,1,98,98,,,,245,,,,,
"STAIR CASE b/n -3.06 to +0.00",,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,
"","",14,,6.2,2,14,28,,,,,173.6,,,,
"","mager",8,,1.55,2,15,30,,46.5,,,,,,,
'''


class TestInferShape:
    def test_stirrup(self):
        assert _infer_shape("st", "") == "SPIRAL"
        assert _infer_shape("Stirrups", "") == "SPIRAL"
        assert _infer_shape("st-1", "") == "SPIRAL"

    def test_hook(self):
        assert _infer_shape("Bottom bar", "`") == "HOOK"
        assert _infer_shape("Bottom bar", "'") == "HOOK"

    def test_straight(self):
        assert _infer_shape("Bottom bar", "") == "STRAIGHT"
        assert _infer_shape("Top bar", "") == "STRAIGHT"
        assert _infer_shape("Negative", "") == "STRAIGHT"


class TestCleanSection:
    def test_substructure(self):
        assert _clean_section("SUB STRUCTURE") == "SUBSTRUCTURE"
        assert _clean_section("sub structure") == "SUBSTRUCTURE"

    def test_superstructure(self):
        assert _clean_section("SUPER STRUCTURE") == "SUPERSTRUCTURE"
        assert _clean_section("Ground Floor SLAB") == "SUPERSTRUCTURE"
        assert _clean_section("Floor Beam") == "SUPERSTRUCTURE"

    def test_staircase(self):
        assert _clean_section("STAIR CASE b/n -3.06 to +0.00") == "SUPERSTRUCTURE"


class TestParseBBSCSV:
    def test_parses_footing_pad(self):
        rows = list(parse_bbs_csv(SAMPLE_CSV))
        f1 = [r for r in rows if r.member_name == "F-1 — Bottom bar"][0]
        assert f1.bar_diameter_mm == 12
        assert f1.cutting_length_m == 2.21
        assert f1.quantity == 72
        assert f1.bar_shape == "STRAIGHT"
        assert f1.section == "SUBSTRUCTURE"

    def test_parses_f2(self):
        rows = list(parse_bbs_csv(SAMPLE_CSV))
        f2 = [r for r in rows if r.member_name == "F-2 — Bottom bar"][0]
        assert f2.bar_diameter_mm == 14
        assert f2.cutting_length_m == 2.5
        assert f2.quantity == 418
        assert f2.section == "SUBSTRUCTURE"

    def test_parses_column_stirrups(self):
        rows = list(parse_bbs_csv(SAMPLE_CSV))
        st = [r for r in rows if "st" in r.bar_type][0]
        assert st.bar_diameter_mm == 8
        assert st.cutting_length_m == 1.5
        assert st.quantity == 28
        assert st.bar_shape == "SPIRAL"
        assert st.section == "SUBSTRUCTURE"

    def test_parses_grade_beam(self):
        rows = list(parse_bbs_csv(SAMPLE_CSV))
        gb = [r for r in rows if "Grade Beam" in r.member_name and "Stirrups" in r.bar_type][0]
        assert gb.bar_diameter_mm == 8
        assert gb.cutting_length_m == 87.75
        assert gb.quantity == 188
        assert gb.bar_shape == "SPIRAL"

    def test_parses_slab_bottom(self):
        rows = list(parse_bbs_csv(SAMPLE_CSV))
        # After "Ground Floor SLAB" section header, rows have empty location
        # so member_name uses the bar type only (or previous location)
        slab = [r for r in rows if r.bar_type == "Bottom" and r.section == "SUPERSTRUCTURE"][0]
        assert slab.bar_diameter_mm == 8
        assert slab.cutting_length_m == 10.19
        assert slab.quantity == 24
        assert slab.section == "SUPERSTRUCTURE"

    def test_parses_negative_bar(self):
        rows = list(parse_bbs_csv(SAMPLE_CSV))
        neg = [r for r in rows if "Negative" in r.bar_type][0]
        assert neg.bar_diameter_mm == 12
        assert neg.cutting_length_m == 2.5
        assert neg.quantity == 98
        assert neg.bar_shape == "STRAIGHT"

    def test_staircase_section(self):
        rows = list(parse_bbs_csv(SAMPLE_CSV))
        stair = [r for r in rows if "mager" in r.bar_type][0]
        assert stair.bar_diameter_mm == 8
        assert stair.cutting_length_m == 1.55
        assert stair.quantity == 30
        assert stair.section == "SUPERSTRUCTURE"

    def test_total_rows(self):
        rows = list(parse_bbs_csv(SAMPLE_CSV))
        assert len(rows) >= 10

    def test_direct_cutting_length(self):
        rows = list(parse_bbs_csv(SAMPLE_CSV))
        for row in rows:
            assert row.cutting_length_m == row.clear_length_m

    def test_notes_contain_import_info(self):
        rows = list(parse_bbs_csv(SAMPLE_CSV))
        for row in rows:
            assert "Imported from CSV" in row.notes


class TestEmptyAndInvalidRows:
    def test_empty_csv(self):
        rows = list(parse_bbs_csv(b""))
        assert len(rows) == 0

    def test_csv_with_only_headers(self):
        rows = list(parse_bbs_csv(b'"LOCATION","Bar Type","Bar dia"\n,,(mm),,,\n"SUB STRUCTURE"'))
        assert len(rows) == 0

    def test_no_valid_data_rows(self):
        csv = b'''"LOCATION","Bar Type","Bar dia","Bar shape","Bar Length","No. of","No. of","Total"
,,(mm),,,Members,Bars,No.of Bars
"SUB STRUCTURE"
"","",,,,,,
'''
        rows = list(parse_bbs_csv(csv))
        assert len(rows) == 0
