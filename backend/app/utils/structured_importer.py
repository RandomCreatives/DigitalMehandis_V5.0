import json
import csv
import os
import re
from typing import List, Dict, Any, Optional
from loguru import logger

class StructuredRateImporter:
    """
    Imports MoWUD cost data from structured JSON and CSV files.
    Handles variations in column names and data formatting across different category files.
    """

    COLUMN_MAPPING = {
        "item_no": ["ID", "Unnamed: 0", "item_no", "Item No", "Code"],
        "description": ["Description", "DESCRIPTION", "description", "item_description"],
        "unit": ["Unit", "UNIT", "unit"],
        "cost": ["Cost", "COST", "cost", "2018 3rd\n Quarter (Only Direct cost)", "Rate", "Direct Cost"]
    }

    def __init__(self):
        pass

    def clean_cost(self, cost_str: Any) -> float:
        """
        Cleans numeric strings from PDFs/JSON, handling commas and OCR errors.
        Example: "1,658.69" -> 1658.69, "l4.858.24" -> 14858.24
        """
        if cost_str is None or cost_str == "":
            return 0.0
        if isinstance(cost_str, (int, float)):
            return float(cost_str)

        # Remove commas and handle OCR errors (l -> 1, I -> 1)
        s = str(cost_str).replace(",", "").strip()
        s = s.replace("l", "1").replace("I", "1")

        # If there's more than one dot, the first one might be a typo for a comma
        if s.count(".") > 1:
            parts = s.split(".")
            s = "".join(parts[:-1]) + "." + parts[-1]

        # Handle spaces as thousands/decimal separators
        if " " in s:
            digits = re.findall(r'\d+', s)
            if len(digits) >= 2:
                if len(digits[-1]) <= 2:
                    s = "".join(digits[:-1]) + "." + digits[-1]
                else:
                    s = "".join(digits)

        # Remove all remaining whitespace
        s = s.replace(" ", "")

        # Extract numeric value
        match = re.search(r'(\d+\.?\d*)', s)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                return 0.0
        return 0.0

    def parse_json(self, file_path: str) -> List[Dict[str, Any]]:
        """Parses a single JSON task file into a standardized list of items."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            if not isinstance(data, list):
                logger.error(f"JSON data in {file_path} is not a list")
                return []

            results = []
            for entry in data:
                item = self._map_entry(entry)
                if item:
                    results.append(item)
            return results
        except Exception as e:
            logger.error(f"Error parsing JSON {file_path}: {e}")
            return []

    def parse_csv(self, file_path: str) -> List[Dict[str, Any]]:
        """Parses a CSV file into a standardized list of items."""
        results = []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                for row in reader:
                    # CSVs often have [ID, Description, Unit, Cost] or similar
                    # We'll try to map common patterns
                    if len(row) < 2:
                        continue

                    # Skip empty rows
                    if not row[1].strip():
                        continue

                    # Basic mapping for the CSV format seen in Task - Concrete Work.csv
                    # a,C-7 Lean Concrete...,m²,751.11
                    item = {
                        "item_no": row[0].strip() if row[0] else None,
                        "description": row[1].strip(),
                        "unit": row[2].strip() if len(row) > 2 else "—",
                        "direct_cost": self.clean_cost(row[3]) if len(row) > 3 else 0.0,
                        "is_category": len(row) <= 3 or not row[3]
                    }
                    results.append(item)
            return results
        except Exception as e:
            logger.error(f"Error parsing CSV {file_path}: {e}")
            return []

    def _map_entry(self, entry: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Maps varying JSON keys to canonical internal fields."""
        mapped = {}
        for target, aliases in self.COLUMN_MAPPING.items():
            val = None
            for alias in aliases:
                if alias in entry:
                    val = entry[alias]
                    break
            mapped[target] = val

        # Essential check: Must have a description
        if not mapped.get("description") or str(mapped["description"]).strip() == "":
            return None

        # Determine if it's a category/header based on cost being missing
        is_cat = mapped["cost"] is None or str(mapped["cost"]).strip() == ""

        return {
            "item_no": str(mapped["item_no"]) if mapped["item_no"] is not None else None,
            "description": str(mapped["description"]).strip(),
            "unit": str(mapped["unit"]) if mapped["unit"] else "—",
            "direct_cost": self.clean_cost(mapped["cost"]),
            "is_category": is_cat
        }

    def process_directory(self, directory: str) -> List[Dict[str, Any]]:
        """Scans a directory for Task_*.json or Task*.csv files and processes them."""
        all_items = []
        if not os.path.exists(directory):
            logger.warning(f"Directory {directory} does not exist")
            return []

        for filename in sorted(os.listdir(directory)):
            path = os.path.join(directory, filename)
            category_name = filename.replace("Task", "").replace("_", " ").replace("-", "").replace(".json", "").replace(".csv", "").strip().title()

            items = []
            if filename.endswith(".json") and "Task" in filename:
                logger.info(f"Processing JSON: {filename}")
                items = self.parse_json(path)
            elif filename.endswith(".csv") and "Task" in filename:
                logger.info(f"Processing CSV: {filename}")
                items = self.parse_csv(path)

            for item in items:
                item["sub_category"] = category_name
                all_items.append(item)

        return all_items
