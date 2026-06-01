import pytest
import os
import json
from app.utils.structured_importer import StructuredRateImporter

def test_clean_cost():
    importer = StructuredRateImporter()
    assert importer.clean_cost("1,658.69") == 1658.69
    assert importer.clean_cost("l4.858.24") == 14858.24
    assert importer.clean_cost("I 7,376 92") == 17376.92
    assert importer.clean_cost("") == 0.0
    assert importer.clean_cost(None) == 0.0

def test_map_entry():
    importer = StructuredRateImporter()
    entry = {
        "ID": "4.1.1",
        "Description": "Test Concrete",
        "Unit": "m3",
        "Cost": "100.50"
    }
    mapped = importer._map_entry(entry)
    assert mapped["item_no"] == "4.1.1"
    assert mapped["description"] == "Test Concrete"
    assert mapped["unit"] == "m3"
    assert mapped["direct_cost"] == 100.50
    assert mapped["is_category"] == False

def test_map_entry_alternate_schema():
    importer = StructuredRateImporter()
    entry = {
        "Unnamed: 0": "1.1",
        "DESCRIPTION": "Demolition",
        "UNIT": None,
        "2018 3rd\n Quarter (Only Direct cost)": None
    }
    mapped = importer._map_entry(entry)
    assert mapped["item_no"] == "1.1"
    assert mapped["description"] == "Demolition"
    assert mapped["is_category"] == True
