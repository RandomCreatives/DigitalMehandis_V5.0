"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import { api } from "@/lib/api";
import type { TakeoffItem, TakeoffItemCreate, Section } from "@/types";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const UNITS    = ["m³", "m²", "m", "Nr", "kg", "tonne", "lump sum"];
const SECTIONS: Section[] = ["SUBSTRUCTURE", "SUPERSTRUCTURE"];

export default function TakeoffPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { current, fetchProject } = useProjectStore();
  const [items, setItems]     = useState<TakeoffItem[]>([]);
  const [section, setSection] = useState<Section>("SUBSTRUCTURE");
  const [newItem, setNewItem] = useState<TakeoffItemCreate>({
    description: "", unit: "m³", quantity: 0, section: "SUBSTRUCTURE",
  });

  useEffect(() => { fetchProject(projectId); }, [projectId, fetchProject]);

  async function load() {
    const { data } = await api.get(`/projects/${projectId}/takeoff`);
    setItems(data);
  }
  useEffect(() => { load(); }, [projectId]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await api.post(`/projects/${projectId}/takeoff`, { ...newItem, section });
    setItems((prev) => [...prev, data]);
    setNewItem({ description: "", unit: "m³", quantity: 0, section });
  }

  async function updateQty(id: string, quantity: number) {
    await api.put(`/projects/${projectId}/takeoff/${id}`, { quantity });
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
  }

  async function deleteItem(id: string) {
    await api.delete(`/projects/${projectId}/takeoff/${id}`);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const filtered = items.filter((i) => i.section === section);
  const totalItems = filtered.length;

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto w-full">
        {/* Header row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-title-sm text-on-surface">Manual Take-off Sheet</h2>
            <span className="chip chip-progress text-xs">LIVE CALCULATION</span>
          </div>
          <div className="flex items-center gap-2">
            {SECTIONS.map((s) => (
              <button key={s} onClick={() => setSection(s)}
                className={cn("section-tab", section === s ? "active" : "inactive")}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Add item form */}
        <div className="card">
          <form onSubmit={addItem} className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="block text-label-caps text-on-surface-variant mb-1">Description</label>
              <input className="input" placeholder="e.g. Bulk excavation in ordinary soil" value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} required />
            </div>
            <div className="w-24">
              <label className="block text-label-caps text-on-surface-variant mb-1">Item Code</label>
              <input className="input" placeholder="EXC-001" onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })} />
            </div>
            <div className="w-28">
              <label className="block text-label-caps text-on-surface-variant mb-1">Unit</label>
              <select className="input" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-label-caps text-on-surface-variant mb-1">Quantity</label>
              <div className="input-unit relative">
                <input type="number" step="0.001" className="input pr-10" value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })} required />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-label-caps text-on-surface-variant pointer-events-none">
                  {newItem.unit}
                </span>
              </div>
            </div>
            <button type="submit" className="btn-primary flex items-center gap-1.5">
              <Plus size={15} /> Add New Row
            </button>
          </form>
        </div>

        {/* Table */}
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item Code</th>
                <th>Description</th>
                <th>Unit</th>
                <th className="num">Quantity</th>
                <th>Notes / Technical Spec</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-on-surface-variant">
                    No items yet. Add your first take-off item above.
                  </td>
                </tr>
              ) : filtered.map((item, i) => (
                <tr key={item.id}>
                  <td className="text-on-surface-variant">{i + 1}</td>
                  <td className="font-mono text-xs text-on-surface-variant">{item.item_code ?? "—"}</td>
                  <td>
                    <p className="font-medium text-on-surface">{item.description}</p>
                  </td>
                  <td className="text-on-surface-variant">{item.unit}</td>
                  <td className="num">
                    <input type="number" step="0.001"
                      className="input w-28 py-1 text-right text-accent font-semibold"
                      defaultValue={item.quantity}
                      onBlur={(e) => updateQty(item.id, parseFloat(e.target.value))} />
                  </td>
                  <td className="text-on-surface-variant text-xs">{item.notes ?? <span className="text-outline italic">Add technical notes…</span>}</td>
                  <td>
                    <button onClick={() => deleteItem(item.id)} className="btn-ghost p-1.5 text-error" aria-label="Delete">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4} className="text-right text-on-surface font-bold">TOTAL ESTIMATED COST (ETB)</td>
                  <td className="num text-accent font-bold">CALCULATING FROM BOQ LINKS…</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Summary cards */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <p className="text-label-caps text-on-surface-variant uppercase">Progressive Total</p>
              <p className="text-2xl font-bold text-on-surface mt-1">{totalItems.toLocaleString()} Items</p>
              <p className="text-xs text-on-surface-variant mt-1">Last updated just now</p>
            </div>
            <div className="card">
              <p className="text-label-caps text-on-surface-variant uppercase">WBS Distribution</p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex-1 bg-surface-highest rounded-full h-2">
                    <div className="bg-accent h-2 rounded-full" style={{ width: "65%" }} />
                  </div>
                  <span className="text-on-surface-variant w-32">Substructure (65%)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex-1 bg-surface-highest rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: "35%" }} />
                  </div>
                  <span className="text-on-surface-variant w-32">Superstructure (35%)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
