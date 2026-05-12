"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  FileSpreadsheet,
  Zap,
  Link2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BOQItem {
  id: string;
  project_id: string;
  item_no: string;
  section: string;
  trade: string | null;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  waste_factor: number;
  notes: string | null;
  is_locked: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface SourceEntry {
  id: string;
  contribution_quantity: number;
  unit: string;
  notes: string | null;
  suggested_quantity_id: string | null;
  measurement_id: string | null;
  project_element_id: string | null;
  source_label: string | null;
  source_drawing: string | null;
  source_page: number | null;
}

interface SourcesResponse {
  boq_item: {
    id: string;
    item_no: string;
    description: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
  };
  sources: SourceEntry[];
  source_count: number;
}

type SectionKey =
  | "ALL"
  | "PRELIMINARIES"
  | "SUBSTRUCTURE"
  | "SUPERSTRUCTURE"
  | "ELECTRICAL"
  | "SANITARY"
  | "EXTERNAL_WORKS";

const SECTIONS: SectionKey[] = [
  "ALL",
  "PRELIMINARIES",
  "SUBSTRUCTURE",
  "SUPERSTRUCTURE",
  "ELECTRICAL",
  "SANITARY",
  "EXTERNAL_WORKS",
];

const SECTION_LABELS: Record<SectionKey, string> = {
  ALL: "All",
  PRELIMINARIES: "Preliminaries",
  SUBSTRUCTURE: "Substructure",
  SUPERSTRUCTURE: "Superstructure",
  ELECTRICAL: "Electrical",
  SANITARY: "Sanitary",
  EXTERNAL_WORKS: "External Works",
};

interface AddForm {
  item_no: string;
  section: string;
  trade: string;
  description: string;
  unit: string;
  quantity: string;
  rate: string;
  waste_factor: string;
  notes: string;
}

const DEFAULT_ADD: AddForm = {
  item_no: "",
  section: "SUBSTRUCTURE",
  trade: "",
  description: "",
  unit: "m²",
  quantity: "",
  rate: "",
  waste_factor: "0",
  notes: "",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function BOQItemsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { fetchProject } = useProjectStore();

  const [items, setItems] = useState<BOQItem[]>([]);
  const [activeSection, setActiveSection] = useState<SectionKey>("ALL");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(DEFAULT_ADD);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editRate, setEditRate] = useState("");

  // Sources panel
  const [sourcesPanel, setSourcesPanel] = useState<SourcesResponse | null>(null);
  const [loadingSources, setLoadingSources] = useState(false);

  useEffect(() => {
    fetchProject(projectId);
    loadItems();
  }, [projectId]);

  async function loadItems() {
    const { data } = await api.get<BOQItem[]>(`/projects/${projectId}/boq-items`);
    setItems(data);
  }

  const filtered =
    activeSection === "ALL"
      ? items
      : items.filter((i) => i.section === activeSection);

  const grandTotal = filtered.reduce((s, i) => s + i.amount, 0);

  // ── Add item ──────────────────────────────────────────────────────────────

  async function handleAdd() {
    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/boq-items`, {
        item_no: addForm.item_no,
        section: addForm.section,
        trade: addForm.trade || null,
        description: addForm.description,
        unit: addForm.unit,
        quantity: parseFloat(addForm.quantity),
        rate: parseFloat(addForm.rate) || 0,
        waste_factor: parseFloat(addForm.waste_factor) || 0,
        notes: addForm.notes || null,
      });
      await loadItems();
      setShowAddForm(false);
      setAddForm(DEFAULT_ADD);
    } finally {
      setSaving(false);
    }
  }

  // ── Inline edit ───────────────────────────────────────────────────────────

  function startEdit(item: BOQItem) {
    setEditingId(item.id);
    setEditQty(String(item.quantity));
    setEditRate(String(item.rate));
  }

  async function commitEdit(item: BOQItem) {
    await api.put(`/projects/${projectId}/boq-items/${item.id}`, {
      quantity: parseFloat(editQty) || item.quantity,
      rate: parseFloat(editRate) || item.rate,
    });
    setEditingId(null);
    await loadItems();
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm("Delete this BOQ item?")) return;
    await api.delete(`/projects/${projectId}/boq-items/${id}`);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  // ── Generate from approved ────────────────────────────────────────────────

  async function handleGenerate() {
    setGenerating(true);
    try {
      const section = activeSection === "ALL" ? "SUBSTRUCTURE" : activeSection;
      await api.post(`/projects/${projectId}/boq-items/from-quantities`, {
        section,
        auto_match_rates: true,
      });
      await loadItems();
    } finally {
      setGenerating(false);
    }
  }

  // ── Export Excel ──────────────────────────────────────────────────────────

  async function handleExport() {
    const res = await api.post(
      `/projects/${projectId}/boq/export-excel?section=${activeSection === "ALL" ? "COMBINED" : activeSection}`,
      {},
      { responseType: "blob" }
    );
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "BOQ_Items.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Sources panel ─────────────────────────────────────────────────────────

  async function openSources(itemId: string) {
    setLoadingSources(true);
    setSourcesPanel(null);
    const { data } = await api.get<SourcesResponse>(
      `/projects/${projectId}/boq-items/${itemId}/sources`
    );
    setSourcesPanel(data);
    setLoadingSources(false);
  }

  return (
    <div className="flex h-full">
      {/* ── Main content ── */}
      <div className="flex-1 p-6 space-y-5 overflow-auto">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-title-sm text-on-surface">BOQ Builder 2.0</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Editable Bill of Quantities with full source traceability.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleExport}
              disabled={items.length === 0}
              className="btn-secondary flex items-center gap-2 disabled:opacity-40"
            >
              <FileSpreadsheet size={15} /> Export Excel
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary flex items-center gap-2"
            >
              <Zap size={15} className={generating ? "animate-pulse" : ""} />
              {generating ? "Generating…" : "Generate from Approved"}
            </button>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-semibold transition-colors",
                activeSection === s
                  ? "bg-accent text-white"
                  : "bg-surface-variant text-on-surface-variant hover:text-on-surface"
              )}
            >
              {SECTION_LABELS[s]}
            </button>
          ))}
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="ml-auto btn-secondary flex items-center gap-1.5 text-sm"
          >
            <Plus size={14} /> Add Item
          </button>
        </div>

        {/* Add item form */}
        {showAddForm && (
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-on-surface">New BOQ Item</h3>
              <button onClick={() => setShowAddForm(false)} className="btn-ghost p-1">
                <X size={15} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Item No</label>
                <input
                  className="input w-full"
                  placeholder="2.1.3"
                  value={addForm.item_no}
                  onChange={(e) => setAddForm((f) => ({ ...f, item_no: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Section</label>
                <select
                  className="input w-full"
                  value={addForm.section}
                  onChange={(e) => setAddForm((f) => ({ ...f, section: e.target.value }))}
                >
                  {SECTIONS.filter((s) => s !== "ALL").map((s) => (
                    <option key={s} value={s}>
                      {SECTION_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Trade</label>
                <input
                  className="input w-full"
                  placeholder="Concrete Works"
                  value={addForm.trade}
                  onChange={(e) => setAddForm((f) => ({ ...f, trade: e.target.value }))}
                />
              </div>
              <div className="col-span-2 sm:col-span-3">
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Description</label>
                <input
                  className="input w-full"
                  placeholder="Provide concrete in foundations..."
                  value={addForm.description}
                  onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Unit</label>
                <input
                  className="input w-full"
                  placeholder="m³"
                  value={addForm.unit}
                  onChange={(e) => setAddForm((f) => ({ ...f, unit: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Quantity</label>
                <input
                  type="number"
                  className="input w-full"
                  placeholder="0.000"
                  value={addForm.quantity}
                  onChange={(e) => setAddForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Rate (ETB)</label>
                <input
                  type="number"
                  className="input w-full"
                  placeholder="0.00"
                  value={addForm.rate}
                  onChange={(e) => setAddForm((f) => ({ ...f, rate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Waste Factor (%)</label>
                <input
                  type="number"
                  className="input w-full"
                  placeholder="0"
                  value={addForm.waste_factor}
                  onChange={(e) => setAddForm((f) => ({ ...f, waste_factor: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Notes</label>
                <input
                  className="input w-full"
                  placeholder="Optional notes"
                  value={addForm.notes}
                  onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAddForm(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !addForm.description || !addForm.quantity}
                className="btn-primary disabled:opacity-40"
              >
                {saving ? "Saving…" : "Add Item"}
              </button>
            </div>
          </div>
        )}

        {/* BOQ table */}
        {filtered.length > 0 ? (
          <div className="panel overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item No</th>
                  <th>Description</th>
                  <th>Unit</th>
                  <th className="num">Quantity</th>
                  <th className="num">Rate (ETB)</th>
                  <th className="num">Amount (ETB)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="font-mono text-xs text-on-surface-variant">{item.item_no}</td>
                    <td>
                      <div className="font-medium text-on-surface">{item.description}</div>
                      {item.trade && (
                        <div className="text-xs text-on-surface-variant">{item.trade}</div>
                      )}
                    </td>
                    <td className="text-on-surface-variant">{item.unit}</td>

                    {/* Inline-editable quantity */}
                    <td className="num">
                      {editingId === item.id ? (
                        <input
                          type="number"
                          className="input w-24 text-right"
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <span>{item.quantity.toFixed(3)}</span>
                      )}
                    </td>

                    {/* Inline-editable rate */}
                    <td className="num">
                      {editingId === item.id ? (
                        <input
                          type="number"
                          className="input w-28 text-right"
                          value={editRate}
                          onChange={(e) => setEditRate(e.target.value)}
                        />
                      ) : (
                        <span>{item.rate.toLocaleString()}</span>
                      )}
                    </td>

                    <td className="num font-semibold text-accent">
                      {formatCurrency(item.amount, "ETB")}
                    </td>

                    <td>
                      <div className="flex items-center gap-1">
                        {editingId === item.id ? (
                          <>
                            <button
                              onClick={() => commitEdit(item)}
                              className="btn-ghost p-1.5 text-green-600"
                              aria-label="Save"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="btn-ghost p-1.5 text-on-surface-variant"
                              aria-label="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(item)}
                              className="btn-ghost p-1.5 text-primary"
                              aria-label="Edit"
                              disabled={item.is_locked}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => openSources(item.id)}
                              className="btn-ghost p-1.5 text-on-surface-variant"
                              aria-label="View sources"
                              title="Source traceability"
                            >
                              <Link2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="btn-ghost p-1.5 text-error"
                              aria-label="Delete"
                              disabled={item.is_locked}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="text-right font-bold text-on-surface uppercase text-xs tracking-wide">
                    Total
                  </td>
                  <td className="num text-accent font-bold text-base">
                    {formatCurrency(grandTotal, "ETB")}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="card text-center py-16 text-on-surface-variant">
            <Zap size={32} className="mx-auto mb-3 text-outline" />
            <p className="font-medium">No BOQ items yet.</p>
            <p className="text-sm mt-1">
              Add items manually or click &quot;Generate from Approved&quot; to auto-populate from
              approved quantities.
            </p>
          </div>
        )}
      </div>

      {/* ── Sources slide-out panel ── */}
      {(sourcesPanel || loadingSources) && (
        <div
          className="w-96 border-l border-outline-variant flex flex-col"
          style={{ background: "var(--surface)" }}
        >
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                Source Traceability
              </p>
              {sourcesPanel && (
                <p className="text-sm font-semibold text-on-surface">
                  {sourcesPanel.boq_item.item_no} — {sourcesPanel.boq_item.description}
                </p>
              )}
            </div>
            <button
              onClick={() => setSourcesPanel(null)}
              className="btn-ghost p-1.5"
              aria-label="Close sources panel"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-5">
            {loadingSources && (
              <p className="text-sm text-on-surface-variant animate-pulse">Loading sources…</p>
            )}

            {sourcesPanel && (
              <>
                {/* BOQ item summary */}
                <div
                  className="rounded-lg p-3 mb-4 text-sm"
                  style={{ background: "var(--surface-variant)" }}
                >
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Quantity</span>
                    <span className="font-semibold text-on-surface">
                      {sourcesPanel.boq_item.quantity} {sourcesPanel.boq_item.unit}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-on-surface-variant">Rate</span>
                    <span className="font-semibold text-on-surface">
                      {sourcesPanel.boq_item.rate.toLocaleString()} ETB
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-on-surface-variant">Amount</span>
                    <span className="font-bold text-accent">
                      {formatCurrency(sourcesPanel.boq_item.amount, "ETB")}
                    </span>
                  </div>
                </div>

                {/* Sources list */}
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-3">
                  {sourcesPanel.source_count} Source{sourcesPanel.source_count !== 1 ? "s" : ""}
                </p>

                {sourcesPanel.sources.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No sources linked yet.</p>
                ) : (
                  <div className="space-y-3">
                    {sourcesPanel.sources.map((src) => (
                      <div
                        key={src.id}
                        className="rounded-lg p-3 text-sm border"
                        style={{
                          borderColor: "var(--outline-variant)",
                          background: "var(--surface)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {src.source_label && (
                              <p className="font-semibold text-on-surface truncate">
                                {src.source_label}
                              </p>
                            )}
                            {src.source_drawing && (
                              <p className="text-xs text-on-surface-variant mt-0.5">
                                Drawing: {src.source_drawing.slice(0, 8)}…
                                {src.source_page != null && ` · Page ${src.source_page}`}
                              </p>
                            )}
                            {src.measurement_id && !src.source_label && (
                              <p className="text-xs text-on-surface-variant">
                                Measurement: {src.measurement_id.slice(0, 8)}…
                              </p>
                            )}
                            {src.notes && (
                              <p className="text-xs text-on-surface-variant mt-1">{src.notes}</p>
                            )}
                          </div>
                          <span className="font-semibold text-accent whitespace-nowrap">
                            {src.contribution_quantity} {src.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
