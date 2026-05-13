// ── Measurement Types ─────────────────────────────────────────────────────────

export interface Calibration {
  id: string;
  drawing_id: string;
  page_number: number;
  reference_name: string | null;
  point_a_x: number;
  point_a_y: number;
  point_b_x: number;
  point_b_y: number;
  pixel_distance: number;
  real_distance: number;
  real_unit: string;
  scale_factor: number;
  pixels_per_meter: number;
  floor_level: string | null;
  is_active: boolean;
}

export interface MeasurementPoint {
  x: number;
  y: number;
}

export interface SavedMeasurement {
  id: string;
  label: string;
  measurement_type: string;
  discipline: string;
  section: string;
  element_category: string;
  raw_value: number;
  final_value: number;
  unit: string;
  multiplier: number;
  color: string;
  points_json: { points: MeasurementPoint[] };
  notes: string | null;
  created_at: string;
}

export type Tool = "select" | "calibrate" | "length" | "area" | "count";
export type Discipline = "ARCHITECTURAL" | "STRUCTURAL" | "ELECTRICAL" | "SANITARY";
export type Section = "SUBSTRUCTURE" | "SUPERSTRUCTURE";
