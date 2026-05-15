"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Plus, Trash2, Pencil, Check, X, Search, Download, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface Rate {
  id: string;
  project_id: string | null;
  item_code: string | null;
  description: string;
  unit: string;
  rate_per_unit: number;
  rate_source: string | null;
  region: string | null;
  created_at: string;
}

const REGIONS = ["Addis Ababa", "Dire Dawa", "Mekelle", "Hawassa", "Bahir Dar", "Adama", "All Regions"];
const UNITS   = ["m³", "m²", "m", "Nr", "kg", "tonne", "lump sum", "m²/day", "hr"];

interface AddForm {
  item_code: string; description: string; unit: string;
  rate_per_unit: string; rate_source: string; region: string;
}
const DEFAULT_ADD: AddForm = {
  item_code: "", description: "", unit: "m³",
  rate_per_unit: "", rate_source: "MoUDC 2023", region: "Addis Ababa",
};

export default function RatesPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [rates, setRates]         = useState<Rate[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [regionFilter, setRegion] = useState("All Regions");
  const [showAdd, setShowAdd]     = useState(false);
  const [addForm, setAddForm]     = useState<AddForm>(DEFAULT_ADD);
  const [saving, setSaving]       = useState(false);

  // Inline edit
  const [editId, setEditId]       = useState<string | null>(null);
  const [editRate, setEditRate]   = useState("");
  const [editDesc, setEditDesc]   = useState("");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (regionFilter !== "All Regions") params.set("region", regionFilter);
      if (search) params.set("search", search);
      const { data } = await api.get<Rate[]>(`/projects/${projectId}/rates?${params}`);
      setRates(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [projectId, regionFilter]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(load, 400);
    return () => clearTimeout(t);
  }, [search]);

  async function handleAdd() {
    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/rates`, {
        item_code: addForm.item_code || null,
        description: addForm.description,
        unit: addForm.unit,
        rate_per_unit: parseFloat(addForm.rate_per_unit),
        rate_source: addForm.rate_source || null,
        region: addForm.region,
      });
      await load();
      setShowAdd(false);
      setAddForm(DEFAULT_ADD);
    } finally {
      setSaving(false);
    }
  }

  async function commitEdit(rate: Rate) {
    await api.put(`/projects/${projectId}/rates/${rate.id}`, {
      description: editDesc || rate.description,
      rate_per_unit: parseFloat(editRate) || rate.rate_per_unit,
    });
    setEditId(null);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this rate?")) return;
    await api.delete(`/projects/${projectId}/rates/${id}`);
    setRates((r) => r.filter((x) => x.id !== id));
  }

  async function exportExcel() {
    try {
      const res = await api.get(`/projects/${projectId}/rates/export-excel`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Rates_Project.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export rates");
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      await api.post(`/projects/${projectId}/rates/import-excel`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await load();
      alert("Rates imported successfully");
    } catch {
      alert("Failed to import rates");
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  }

  const projectRates = rates.filter(r => r.project_id !== null);
  const globalRates  = rates.filter(r => r.project_id === null);

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-title-sm text-on-surface">Rate Library</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Project-specific rates + global MoUDC database. Project rates override global rates in BOQ generation.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportExcel} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={14} /> Export Excel
          </button>
          <label className="btn-secondary flex items-center gap-2 text-sm cursor-pointer">
            <Upload size={14} /> Import Excel
            <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleImport} />
          </label>
          <button onClick={() => setShowAdd(v => !v)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Add Rate
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input className="input pl-9" placeholder="Search description…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-label-caps text-on-surface-variant">Region:</label>
          <select className="input w-40" value={regionFilter} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-on-surface">New Project Rate</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-label-caps text-on-surface-variant mb-1">Item Code</label>
              <input className="input" placeholder="e.g. 02.03" value={addForm.item_code} onChange={(e) => setAddForm(f => ({ ...f, item_code: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-label-caps text-on-surface-variant mb-1">Description *</label>
              <input className="input" placeholder="e.g. Grade C-25 Concrete in columns" value={addForm.description} onChange={(e) => setAddForm(f => ({ ...f, description: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-label-caps text-on-surface-variant mb-1">Unit *</label>
              <select className="input" value={addForm.unit} onChange={(e) => setAddForm(f => ({ ...f, unit: e.target.value }))}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-label-caps text-on-surface-variant mb-1">Rate (ETB) *</label>
              <input type="number" className="input" placeholder="0.00" value={addForm.rate_per_unit} onChange={(e) => setAddForm(f => ({ ...f, rate_per_unit: e.target.value }))} />
            </div>
            <div>
              <label className="block text-label-caps text-on-surface-variant mb-1">Region</label>
              <select className="input" value={addForm.region} onChange={(e) => setAddForm(f => ({ ...f, region: e.target.value }))}>
                {REGIONS.filter(r => r !== "All Regions").map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-label-caps text-on-surface-variant mb-1">Source</label>
              <input className="input" placeholder="e.g. MoUDC 2023" value={addForm.rate_source} onChange={(e) => setAddForm(f => ({ ...f, rate_source: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleAdd} disabled={saving || !addForm.description || !addForm.rate_per_unit} className="btn-primary disabled:opacity-40">
              {saving ? "Saving…" : "Add Rate"}
            </button>
          </div>
        </div>
      )}

      {/* Project rates */}
      <div className="panel overflow-x-auto">
        <div className="px-5 py-3 border-b border-outline-variant flex items-center justify-between">
          <h3 className="font-semibold text-on-surface">Project Rates</h3>
          <span className="text-xs text-on-surface-variant">{projectRates.length} custom rates</span>
        </div>
        {projectRates.length === 0 ? (
          <p className="px-5 py-6 text-sm text-on-surface-variant">No project-specific rates yet. Add one above or use rates from Cost Data.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Unit</th>
                <th className="num">Rate (ETB)</th>
                <th>Region</th>
                <th>Source</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projectRates.map((rate) => (
                <tr key={rate.id}>
                  <td className="font-mono text-xs text-on-surface-variant">{rate.item_code ?? "—"}</td>
                  <td>
                    {editId === rate.id ? (
                      <input className="input py-1 text-sm" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                    ) : (
                      <span className="text-on-surface">{rate.description}</span>
                    )}
                  </td>
                  <td className="text-on-surface-variant">{rate.unit}</td>
                  <td className="num">
                    {editId === rate.id ? (
                      <input type="number" className="input w-28 py-1 text-right" value={editRate} onChange={(e) => setEditRate(e.target.value)} />
                    ) : (
                      <span className="font-semibold text-on-surface">{rate.rate_per_unit.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="text-on-surface-variant text-xs">{rate.region ?? "—"}</td>
                  <td className="text-on-surface-variant text-xs">{rate.rate_source ?? "—"}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      {editId === rate.id ? (
                        <>
                          <button onClick={() => commitEdit(rate)} className="btn-ghost p-1.5 text-green-600"><Check size={14} /></button>
                          <button onClick={() => setEditId(null)} className="btn-ghost p-1.5 text-on-surface-variant"><X size={14} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditId(rate.id); setEditRate(String(rate.rate_per_unit)); setEditDesc(rate.description); }} className="btn-ghost p-1.5 text-primary"><Pencil size={13} /></button>
                          <button onClick={() => handleDelete(rate.id)} className="btn-ghost p-1.5 text-error"><Trash2 size={13} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Global rates (read-only) */}
      <div className="panel overflow-x-auto">
        <div className="px-5 py-3 border-b border-outline-variant flex items-center justify-between">
          <h3 className="font-semibold text-on-surface">Global MoUDC Rates</h3>
          <span className="text-xs text-on-surface-variant">{globalRates.length} rates · read-only</span>
        </div>
        {loading ? (
          <p className="px-5 py-6 text-sm text-on-surface-variant animate-pulse">Loading…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Unit</th>
                <th className="num">Rate (ETB)</th>
                <th>Region</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {globalRates.map((rate) => (
                <tr key={rate.id}>
                  <td className="font-mono text-xs text-on-surface-variant">{rate.item_code ?? "—"}</td>
                  <td className="text-on-surface">{rate.description}</td>
                  <td className="text-on-surface-variant">{rate.unit}</td>
                  <td className="num font-semibold text-on-surface">{rate.rate_per_unit.toLocaleString()}</td>
                  <td className="text-on-surface-variant text-xs">{rate.region ?? "—"}</td>
                  <td className="text-on-surface-variant text-xs">{rate.rate_source ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
