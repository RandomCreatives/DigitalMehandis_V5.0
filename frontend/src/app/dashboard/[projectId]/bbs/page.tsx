"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { BBSBar, BBSBarCreate, BarShape, CuttingListItem, Section } from "@/types";
import { calcCuttingLength, calcWeight, calcLapLength } from "@/lib/calculations";
import { Plus, Trash2, FileSpreadsheet } from "lucide-react";

const DIAMETERS = [6, 8, 10, 12, 16, 20, 25, 32];
const SHAPES: BarShape[] = ["STRAIGHT", "L_SHAPE", "HOOK", "U_SHAPE", "SPIRAL"];
const SECTIONS: Section[] = ["SUBSTRUCTURE", "SUPERSTRUCTURE"];

const EMPTY: BBSBarCreate = {
  member_name: "",
  bar_diameter_mm: 16,
  bar_shape: "STRAIGHT",
  quantity: 1,
  clear_length_m: 1.0,
  hook_length_mm: 0,
  cover_top_mm: 50,
  cover_bottom_mm: 50,
  section: "SUBSTRUCTURE",
  standard: "EBCS_3",
};

export default function BBSPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [bars, setBars] = useState<BBSBar[]>([]);
  const [cuttingList, setCuttingList] = useState<CuttingListItem[]>([]);
  const [form, setForm] = useState<BBSBarCreate>(EMPTY);
  const [activeSection, setActiveSection] = useState<Section>("SUBSTRUCTURE");
  const [showCutting, setShowCutting] = useState(false);

  async function load() {
    const [barsRes, clRes] = await Promise.all([
      api.get(`/projects/${projectId}/bbs`),
      api.get(`/projects/${projectId}/bbs/cutting-list`),
    ]);
    setBars(barsRes.data);
    setCuttingList(clRes.data);
  }

  useEffect(() => { load(); }, [projectId]);

  // Live preview calculations
  const previewCutting = calcCuttingLength(form.bar_shape, form.clear_length_m, form.bar_diameter_mm, form.hook_length_mm, Math.max(form.cover_top_mm ?? 50, form.cover_bottom_mm ?? 50));
  const previewWeight = calcWeight(form.bar_diameter_mm, previewCutting);
  const previewLap = calcLapLength(form.bar_diameter_mm, form.standard);

  async function addBar(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await api.post(`/projects/${projectId}/bbs`, form);
    setBars((prev) => [...prev, data]);
    // Refresh cutting list
    const cl = await api.get(`/projects/${projectId}/bbs/cutting-list`);
    setCuttingList(cl.data);
    setForm({ ...EMPTY, section: form.section });
  }

  async function deleteBar(id: string) {
    await api.delete(`/projects/${projectId}/bbs/${id}`);
    setBars((prev) => prev.filter((b) => b.id !== id));
    const cl = await api.get(`/projects/${projectId}/bbs/cutting-list`);
    setCuttingList(cl.data);
  }

  async function exportExcel() {
    const res = await api.post(`/projects/${projectId}/bbs/export-excel`, {}, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a"); a.href = url; a.download = "BBS.xlsx"; a.click();
  }

  const filtered = bars.filter((b) => b.section === activeSection);
  const totalWeight = filtered.reduce((sum, b) => sum + (b.total_weight_kg ?? 0), 0);

  function upd(field: keyof BBSBarCreate, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-bold text-gray-900">Bar Bending Schedule</h1>
        <div className="flex gap-2">
          {SECTIONS.map((s) => (
            <button key={s} onClick={() => setActiveSection(s)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeSection === s ? "bg-[#1F4E79] text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Add bar form */}
      <div className="card">
        <h2 className="font-medium text-gray-700 mb-4">Add Bar — {activeSection}</h2>
        <form onSubmit={addBar} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Member Name</label>
            <input className="input" placeholder="e.g. Footing F1" value={form.member_name} onChange={(e) => upd("member_name", e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Diameter (mm)</label>
            <select className="input" value={form.bar_diameter_mm} onChange={(e) => upd("bar_diameter_mm", parseInt(e.target.value))}>
              {DIAMETERS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Shape</label>
            <select className="input" value={form.bar_shape} onChange={(e) => upd("bar_shape", e.target.value as BarShape)}>
              {SHAPES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Quantity</label>
            <input type="number" min={1} className="input" value={form.quantity} onChange={(e) => upd("quantity", parseInt(e.target.value))} required />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Clear Length (m)</label>
            <input type="number" step="0.001" min={0} className="input" value={form.clear_length_m} onChange={(e) => upd("clear_length_m", parseFloat(e.target.value))} required />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hook Length (mm)</label>
            <input type="number" min={0} className="input" value={form.hook_length_mm} onChange={(e) => upd("hook_length_mm", parseInt(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cover Top/Bottom (mm)</label>
            <input type="number" min={0} className="input" value={form.cover_top_mm} onChange={(e) => { upd("cover_top_mm", parseInt(e.target.value)); upd("cover_bottom_mm", parseInt(e.target.value)); }} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Standard</label>
            <select className="input" value={form.standard} onChange={(e) => upd("standard", e.target.value)}>
              <option value="EBCS_3">EBCS 3</option>
              <option value="BS_8666">BS 8666</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Section</label>
            <select className="input" value={form.section} onChange={(e) => { upd("section", e.target.value); setActiveSection(e.target.value as Section); }}>
              {SECTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Live preview */}
          <div className="col-span-2 md:col-span-4 bg-blue-50 rounded-lg p-3 text-sm grid grid-cols-3 gap-4">
            <div><span className="text-gray-500">Cutting Length:</span> <strong>{previewCutting.toFixed(3)} m</strong></div>
            <div><span className="text-gray-500">Weight/unit:</span> <strong>{previewWeight.toFixed(3)} kg</strong></div>
            <div><span className="text-gray-500">Lap Length:</span> <strong>{previewLap} mm</strong></div>
          </div>

          <div className="col-span-2 md:col-span-4 flex justify-end">
            <button type="submit" className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Bar</button>
          </div>
        </form>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={exportExcel} className="btn-secondary flex items-center gap-2"><FileSpreadsheet size={16} /> Export Excel (BBS + Cutting List)</button>
        <button onClick={() => setShowCutting(!showCutting)} className="btn-secondary text-sm">
          {showCutting ? "Hide" : "Show"} Cutting List
        </button>
      </div>

      {/* BBS Table */}
      <div className="card overflow-x-auto">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-800">BBS — {activeSection}</h2>
          <span className="text-sm text-gray-500">Total weight: <strong>{totalWeight.toFixed(2)} kg</strong></span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#1F4E79] text-white">
              {["Mark", "Member", "Ø (mm)", "Shape", "Qty", "Clear (m)", "Cut (m)", "Wt/unit (kg)", "Total Wt (kg)", "Lap (mm)", ""].map((h) => (
                <th key={h} className="px-2 py-2 text-left font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-8 text-gray-400">No bars yet. Add your first bar above.</td></tr>
            ) : filtered.map((bar, i) => (
              <tr key={bar.id} className={i % 2 === 0 ? "bg-white" : "bg-blue-50"}>
                <td className="px-2 py-1.5 font-medium text-[#1F4E79]">{bar.bar_mark}</td>
                <td className="px-2 py-1.5">{bar.member_name}</td>
                <td className="px-2 py-1.5 text-center">{bar.bar_diameter_mm}</td>
                <td className="px-2 py-1.5">{bar.bar_shape}</td>
                <td className="px-2 py-1.5 text-center">{bar.quantity}</td>
                <td className="px-2 py-1.5 text-right">{Number(bar.clear_length_m).toFixed(3)}</td>
                <td className="px-2 py-1.5 text-right font-medium">{bar.cutting_length_m?.toFixed(3)}</td>
                <td className="px-2 py-1.5 text-right">{bar.weight_per_unit_kg?.toFixed(3)}</td>
                <td className="px-2 py-1.5 text-right font-semibold">{bar.total_weight_kg?.toFixed(3)}</td>
                <td className="px-2 py-1.5 text-right">{bar.lap_length_mm}</td>
                <td className="px-2 py-1.5">
                  <button onClick={() => deleteBar(bar.id)} className="text-red-400 hover:text-red-600" aria-label="Delete bar"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
            {filtered.length > 0 && (
              <tr className="bg-[#1F4E79]/10 font-bold text-sm">
                <td colSpan={8} className="px-2 py-2 text-right text-gray-700">TOTAL WEIGHT</td>
                <td className="px-2 py-2 text-right text-[#1F4E79]">{totalWeight.toFixed(2)} kg</td>
                <td colSpan={2} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cutting List */}
      {showCutting && cuttingList.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="font-semibold text-gray-800 mb-3">Cutting List (for supplier)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                {["Diameter (mm)", "Cutting Length (m)", "Total Qty", "Total Weight (kg)"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cuttingList.map((item, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">Ø{item.diameter_mm}</td>
                  <td className="px-3 py-2">{item.cutting_length_m.toFixed(3)}</td>
                  <td className="px-3 py-2">{item.total_qty}</td>
                  <td className="px-3 py-2 font-semibold">{item.total_weight_kg.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
