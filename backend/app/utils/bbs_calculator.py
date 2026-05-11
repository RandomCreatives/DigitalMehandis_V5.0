"""
BBS Cutting Length & Weight Calculator
Per BS 8666 and EBCS 3 standards.
"""
from app.core.constants import UNIT_WEIGHTS_KG_PER_M


class BBSCalculator:
    @staticmethod
    def calculate_cutting_length(
        bar_shape: str,
        clear_length_m: float,
        diameter_mm: int,
        hook_length_mm: int = 0,
        cover_deduction_mm: int = 0,
    ) -> float:
        """
        Returns cutting length in meters based on formulas in USER_GUIDE.md.

        STRAIGHT: Clear length + 2 * cover
        L_SHAPE:  2 * Clear length - 2d + 2 * cover
        HOOK:     Clear length + hook length + 2 * cover
        U_SHAPE:  2 * Clear length + hook length - 2d + 2 * cover
        SPIRAL:   2 * Clear length - 4d
        """
        clear_mm = clear_length_m * 1000
        d = diameter_mm
        c = cover_deduction_mm
        h = hook_length_mm

        match bar_shape:
            case "STRAIGHT":
                length = clear_mm + (2 * c)
            case "L_SHAPE":
                length = (clear_mm * 2) - (2 * d) + (2 * c)
            case "HOOK":
                length = clear_mm + h + (2 * c)
            case "U_SHAPE":
                length = (clear_mm * 2) + h - (2 * d) + (2 * c)
            case "SPIRAL":
                length = (clear_mm * 2) - (4 * d)
            case _:
                raise ValueError(f"Unknown bar shape: {bar_shape}")

        return round(length / 1000, 3)

    @staticmethod
    def calculate_weight(diameter_mm: int, length_m: float) -> float:
        """Returns weight in kg."""
        unit_weight = UNIT_WEIGHTS_KG_PER_M.get(diameter_mm, 0.0)
        return round(length_m * unit_weight, 3)

    @staticmethod
    def calculate_lap_length(diameter_mm: int, standard: str = "EBCS_3") -> int:
        """
        Returns lap length in mm.
        EBCS 3: 50d (tension), BS 8666: 40d
        """
        factor = 50 if standard == "EBCS_3" else 40
        return diameter_mm * factor

    @classmethod
    def enrich_bar(cls, bar: dict, standard: str = "EBCS_3") -> dict:
        """
        Given a bar dict with raw inputs, compute and attach:
        - cutting_length_m
        - weight_per_unit_kg
        - total_weight_kg
        - lap_length_mm
        """
        cover = max(bar.get("cover_top_mm", 50), bar.get("cover_bottom_mm", 50))
        cutting_length = cls.calculate_cutting_length(
            bar_shape=bar["bar_shape"],
            clear_length_m=float(bar["clear_length_m"]),
            diameter_mm=bar["bar_diameter_mm"],
            hook_length_mm=bar.get("hook_length_mm", 0),
            cover_deduction_mm=cover,
        )
        weight_per_unit = cls.calculate_weight(bar["bar_diameter_mm"], cutting_length)
        lap_length = cls.calculate_lap_length(bar["bar_diameter_mm"], standard)

        return {
            **bar,
            "cutting_length_m": cutting_length,
            "weight_per_unit_kg": weight_per_unit,
            "total_weight_kg": round(weight_per_unit * bar["quantity"], 3),
            "lap_length_mm": lap_length,
        }
