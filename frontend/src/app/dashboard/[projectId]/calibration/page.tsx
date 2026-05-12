"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import { api } from "@/lib/api";
import {
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Drawing {
  id: string;
  filename: string;
  category: string;
  page_count: number | null;
  uploaded_at: string;
}

interface Calibration {
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
  grid_reference: string | null;
  is_active: boolean;
}

interface CalibrationForm {
  page_number: number;
  reference_name: string;
  point_a_x: string;
  point_a_y: string;
  point_b_x: string;
  point_b_y: string;
  real_distance: string;
  real_unit: string;
  floor_level: string;
  grid_reference: string;
  rotation_degrees: string;
}

const DEFAULT_FORM: CalibrationForm = {
  page_number: 1,
  reference_name: "",
  point_a_x: "",
  point_a_y: "",
  point_b_x: "",
  point_b_y: "",
  real_distance: "",
  real_unit: "m",
  floor_level: "",
  grid_reference: "",
  rotation_degrees: "0",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function scaleSummary(cal: Calibration): string {
  const mmPerPx = cal.scale_factor * 1000;
  return `1 px = ${mmPerPx.toFixed(3)} mm  ·  ${cal.pixels_per_meter.toFixed(1)} px/m`;
}

function previewScaleFactor(form: CalibrationForm): string | null {
  const ax = parseFloat(form.point_a_x);
  const ay = parseFloat(form.point_a_y);
  const bx = parseFloat(form.point_b_x);
  const by = parseFloat(form.point_b_y);
  const dist = parseFloat(form.real_distance);
  if (isNaN(ax) || isNaN(ay) || isNaN(bx) || isNaN(by) || isNaN(dist) || dist <= 0) return null;
  const dx = bx - ax;
  const dy = by - ay;
  const pixelDist = Math.sqrt(dx * dx + dy * dy);
  if (pixelDist < 1) return null;
  const unitToM: Record<string, number> = { m: 1, mm: 0.001, cm: 0.01, ft: 0.3048, in: 0.0254 };
  const realM = dist * (unitToM[form.real_unit] ?? 1);
  const sf = realM / pixelDist;
  const mmPerPx = sf * 1000;
  const pxPerM = pixelDist / realM;
  return `1 px = ${mmPerPx.toFixed(3)} mm  ·  ${pxPerM.toFixed(1)} px/m`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CalibrationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { fetchProject } = useProjectStore();

  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [calibrations, setCalibrations] = useState<Record<string, Calibration[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [panelDrawing, setPanelDrawing] = useState<Drawing | null>(null);
  const [form, setForm] = useState<CalibrationForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProject(projectId);
    loadDrawings();
  }, [projectId]);

  async function loadDrawings() {
    const { data } = await api.get<Drawing[]>(`/projects/${projectId}/drawings`);
    setDrawings(data);
  }

  async function loadCalibrations(drawingId: string) {
    const { data } = await api.get<Calibration[]>(
      `/projects/${projectId}/drawings/${drawingId}/calibrations`
    );
    setCalibrations((prev) => ({ ...prev, [drawingId]: data }));
  }

  function toggleExpand(drawingId: string) {
    if (expanded === drawingId) {
      setExpanded(null);
    } else {
      setExpanded(drawingId);
      loadCalibrations(drawingId);
    }
  }

  function openPanel(drawing: Drawing) {
    setPanelDrawing(drawing);
    setForm(DEFAULT_FORM);
    setError(null);
  }

  function closePanel() {
    setPanelDrawing(null);
    setError(null);
  }

  function handleFormChange(field: keyof CalibrationForm, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!panelDrawing) return;
    setError(null);
    setSaving(true);
    try {
      await api.post(
        `/projects/${projectId}/drawings/${panelDrawing.id}/calibrations`,
        {
          page_number: form.page_number,
          reference_name: form.reference_name || null,
          point_a_x: parseFloat(form.point_a_x),
          point_a_y: parseFloat(form.point_a_y),
          point_b_x: parseFloat(form.point_b_x),
          point_b_y: parseFloat(form.point_b_y),
          real_distance: parseFloat(form.real_distance),
          real_unit: form.real_unit,
          floor_level: form.floor_level || null,
          grid_reference: form.grid_reference || null,
          rotation_degrees: parseFloat(form.rotation_degrees) || 0,
        }
      );
      await loadCalibrations(panelDrawing.id);
      setExpanded(panelDrawing.id);
      closePanel();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to save calibration";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(drawingId: string, calId: string) {
    if (!confirm("Delete this calibration?")) return;
    await api.delete(`/projects/${projectId}/calibrations/${calId}`);
    setCalibrations((prev) => ({
      ...prev,
      [drawingId]: (prev[drawingId] ?? []).filter((c) => c.id !== calId),
    }));
  }

  const scaleLive = previewScaleFactor(form);

  return (
    <div className="flex h-full">
      {/* ── Main list ── */}
      <div className="flex-1 p-6 space-y-5 overflow-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-title-sm text-on-surface">Drawing Calibration</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Set the real-world scale for each drawing so measurements are accurate.
            </p>
          </div>
        </div>

        {drawings.length === 0 && (
          <div className="card text-center py-16 text-on-surface-variant">
            <SlidersHorizontal size={32} className="mx-auto mb-3 text-outline" />
            <p className="font-medium">No drawings uploaded yet.</p>
            <p className="text-sm mt-1">Upload drawings in the Drawings tab first.</p>
          </div>
        )}

        <div className="space-y-3">
          {drawings.map((drawing) => {
            const cals = calibrations[drawing.id] ?? [];
            const isExpanded = expanded === drawing.id;
            const hasActive = cals.some((c) => c.is_active);

            return (
              <div key={drawing.id} className="panel overflow-hidden">
                {/* Drawing row */}
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-on-surface truncate">{drawing.filename}</span>
                      <span className="chip chip-draft text-xs">{drawing.category}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {drawing.page_count ?? "?"} page{drawing.page_count !== 1 ? "s" : ""} ·{" "}
                      {new Date(drawing.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Calibration status badge */}
                  {hasActive ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                      <CheckCircle2 size={13} /> Calibrated
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                      <AlertCircle size={13} /> Not calibrated
                    </span>
                  )}

                  <button
                    onClick={() => openPanel(drawing)}
                    className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3"
                    aria-label="Calibrate drawing"
                  >
                    <Plus size={14} /> Calibrate
                  </button>

                  <button
                    onClick={() => toggleExpand(drawing.id)}
                    className="btn-ghost p-1.5"
                    aria-label={isExpanded ? "Collapse" : "Expand calibrations"}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Calibration list */}
                {isExpanded && (
                  <div className="border-t border-outline-variant">
                    {cals.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-on-surface-variant">
                        No calibrations yet for this drawing.
                      </p>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Page</th>
                            <th>Reference</th>
                            <th>Floor</th>
                            <th>Real Distance</th>
                            <th>Scale</th>
                            <th>Status</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {cals.map((cal) => (
                            <tr key={cal.id}>
                              <td className="font-mono text-xs">{cal.page_number}</td>
                              <td>{cal.reference_name ?? "—"}</td>
                              <td>{cal.floor_level ?? "—"}</td>
                              <td>
                                {cal.real_distance} {cal.real_unit}
                              </td>
                              <td className="font-mono text-xs text-on-surface-variant">
                                {scaleSummary(cal)}
                              </td>
                              <td>
                                {cal.is_active ? (
                                  <span className="chip chip-approved text-xs">Active</span>
                                ) : (
                                  <span className="chip chip-draft text-xs">Inactive</span>
                                )}
                              </td>
                              <td>
                                <button
                                  onClick={() => handleDelete(drawing.id, cal.id)}
                                  className="btn-ghost p-1.5 text-error"
                                  aria-label="Delete calibration"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Calibration panel ── */}
      {panelDrawing && (
        <div
          className="w-96 border-l border-outline-variant flex flex-col bg-white"
          style={{ background: "var(--surface)" }}
        >
          {/* Panel header */}
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                Calibrate Drawing
              </p>
              <p className="text-sm font-semibold text-on-surface truncate max-w-[220px]">
                {panelDrawing.filename}
              </p>
            </div>
            <button onClick={closePanel} className="btn-ghost p-1.5" aria-label="Close panel">
              <X size={16} />
            </button>
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-auto p-5 space-y-4">
            {/* Instructions */}
            <div
              className="rounded-lg p-3 text-sm"
              style={{
                background: "var(--surface-variant)",
                color: "var(--on-surface-variant)",
              }}
            >
              <p className="font-semibold mb-1">How to calibrate</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Open the drawing and identify two points with a known distance.</li>
                <li>Note the canvas pixel coordinates of each point.</li>
                <li>Enter the coordinates and the real-world distance below.</li>
                <li>The scale factor is computed automatically.</li>
              </ol>
            </div>

            {/* Page number */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
                Page Number
              </label>
              <input
                type="number"
                min={1}
                className="input w-full"
                value={form.page_number}
                onChange={(e) => handleFormChange("page_number", parseInt(e.target.value) || 1)}
              />
            </div>

            {/* Floor level */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
                Floor Level
              </label>
              <select
                className="input w-full"
                value={form.floor_level}
                onChange={(e) => handleFormChange("floor_level", e.target.value)}
              >
                <option value="">— Select —</option>
                {["B2", "B1", "GF", "1F", "2F", "3F", "4F", "5F", "RF"].map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Reference name */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
                Reference Name
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder="e.g. Grid A-1 to A-2"
                value={form.reference_name}
                onChange={(e) => handleFormChange("reference_name", e.target.value)}
              />
            </div>

            {/* Point A */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
                Point A (canvas pixels)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input flex-1"
                  placeholder="X"
                  value={form.point_a_x}
                  onChange={(e) => handleFormChange("point_a_x", e.target.value)}
                />
                <input
                  type="number"
                  className="input flex-1"
                  placeholder="Y"
                  value={form.point_a_y}
                  onChange={(e) => handleFormChange("point_a_y", e.target.value)}
                />
              </div>
            </div>

            {/* Point B */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
                Point B (canvas pixels)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input flex-1"
                  placeholder="X"
                  value={form.point_b_x}
                  onChange={(e) => handleFormChange("point_b_x", e.target.value)}
                />
                <input
                  type="number"
                  className="input flex-1"
                  placeholder="Y"
                  value={form.point_b_y}
                  onChange={(e) => handleFormChange("point_b_y", e.target.value)}
                />
              </div>
            </div>

            {/* Real distance */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
                Real Distance
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input flex-1"
                  placeholder="e.g. 5000"
                  value={form.real_distance}
                  onChange={(e) => handleFormChange("real_distance", e.target.value)}
                />
                <select
                  className="input w-20"
                  value={form.real_unit}
                  onChange={(e) => handleFormChange("real_unit", e.target.value)}
                >
                  {["mm", "cm", "m", "ft", "in"].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid reference */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
                Grid Reference (optional)
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder="e.g. A-1"
                value={form.grid_reference}
                onChange={(e) => handleFormChange("grid_reference", e.target.value)}
              />
            </div>

            {/* Live scale preview */}
            {scaleLive && (
              <div
                className="rounded-lg p-3 text-sm font-mono"
                style={{
                  background: "rgba(235, 105, 5, 0.08)",
                  border: "1px solid rgba(235, 105, 5, 0.3)",
                  color: "var(--accent)",
                }}
              >
                <p className="text-xs font-semibold mb-0.5 uppercase tracking-wide">
                  Computed Scale Factor
                </p>
                {scaleLive}
              </div>
            )}

            {error && (
              <div className="rounded-lg p-3 text-sm text-red-700 bg-red-50 border border-red-200">
                {error}
              </div>
            )}
          </div>

          {/* Panel footer */}
          <div className="px-5 py-4 border-t border-outline-variant flex gap-3">
            <button onClick={closePanel} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !scaleLive}
              className="btn-primary flex-1 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save Calibration"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
