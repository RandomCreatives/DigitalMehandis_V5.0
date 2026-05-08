"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { TakeoffItem, TakeoffItemCreate, Section } from "@/types";
import { Plus, Trash2, Save } from "lucide-react";

const UNITS = ["m³", "m²", "m", "Nr", "kg", "tonne", "lump sum"];
const SECTIONS: Section[] = ["SUBSTRUCTURE", "SUPERSTRUCTURE"];

export default function TakeoffPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [items, setItems] = useState<TakeoffItem[]>([]);
  const [section, setSection] = useState<Section>("SUBSTRUCTURE");
  const [newItem, setNewItem] = useState<TakeoffItemCreate>({ description: "", unit: "m³", quantity: 0, section: "SUBSTRUCTURE" });
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Take-off Sheet</h1>
        <div className="flex gap-2">
          {SECTIONS.map((s) => (
            <button key={s} onClick={() => setSection(s)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${section === s ? "bg-[#1F4E79] text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Add item form */}
      <div className="card">
        <h2 className="font-medium text-gray-700 mb-3">Add Item — {section}</h2>
        <form onSubmit={addItem} className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-48">
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <input className="input" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} required />
          </div>
          <div className="w-28">
            <label className="block text-xs text-gray-500 mb-1">Unit</label>
            <select className="input" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="w-28">
            <label className="block text-xs text-gray-500 mb-1">Quantity</label>
            <input type="number" step="0.001" className="input" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })} required />
          </div>
          <button type="submit" className="btn-primary flex items-center gap-1">
            <Plus size={16} /> Add
          </button>
        </form>
      </div>

      {/* Items table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b bg-gray-50">
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Quantity</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No items yet. Add your first take-off item above.</td></tr>
            ) : filtered.map((item) => (
              <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-400 text-xs">{item.item_code ?? "—"}</td>
                <td className="px-3 py-2 font-medium text-gray-800">{item.description}</td>
                <td className="px-3 py-2 text-gray-500">{item.unit}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.001"
                    className="input w-24 py-1"
                    defaultValue={item.quantity}
                    onBlur={(e) => updateQty(item.id, parseFloat(e.target.value))}
                  />
                </td>
                <td className="px-3 py-2 text-gray-400 text-xs">{item.notes}</td>
                <td className="px-3 py-2">
                  <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600" aria-label="Delete item"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="mt-3 text-right text-sm text-gray-500">
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
