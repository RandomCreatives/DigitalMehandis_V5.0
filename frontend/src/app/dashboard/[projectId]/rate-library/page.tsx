"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  BookOpen,
  Plus,
  Search,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Pencil,
  BadgeCheck,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RateSource {
  id: string;
  title: string;
  issuing_authority: string | null;
  region: string | null;
  fiscal_year: string | null;
  quarter: string | null;
  cost_type: string;
  is_official: boolean;
  is_active: boolean;
  item_count: number;
}

interface RateItem {
  id: string;
  rate_source_id: string;
  item_no: string | null;
  work_category: string | null;
  description: string;
  unit: string;
  direct_cost: number;
  currency: string;
  is_verified: boolean;
  confidence: number;
}

interface RawRow {
  id: string;
  rate_source_id: string;
  source_page: number | null;
  raw_item_no: string | null;
  raw_description: string | null;
  raw_unit: string | null;
  raw_cost: string | null;
  parsed_item_no: string | null;
  parsed_description: string | null;
  parsed_unit: string | null;
  parsed_cost: number | null;
  confidence: number;
  status: string;
  review_notes: string | null;
}

interface AddSourceForm {
  title: string;
  issuing_authority: string;
  region: string;
  fiscal_year: string;
  quarter: string;
  cost_type: string;
}

interface AddItemForm {
  item_no: string;
  work_category: string;
  description: string;
  unit: string;
  direct_cost: string;
}

const DEFAULT_SOURCE_FORM: AddSourceForm = {
  title: "",
  issuing_authority: "",
  region: "Addis Ababa",
  fiscal_year: "",
  quarter: "",
  cost_type: "DIRECT_COST",
};

const DEFAULT_ITEM_FORM: AddItemForm = {
  item_no: "",
  work_category: "",
  description: "",
  unit: "m³",
  direct_cost: "",
};

const REGIONS = [
  "Addis Ababa",
  "Dire Dawa",
  "Mekelle",
  "Hawassa",
  "Bahir Dar",
  "Adama",
  "Jimma",
  "Dessie",
];

const COST_TYPES = ["DIRECT_COST", "MARKET_RATE", "USER_RATE"];
const UNITS = ["m³", "m²", "m", "pcs", "kg", "tonne", "set", "lump sum"];

type ActiveTab = "items" | "raw-rows";

// ── Component ─────────────────────────────────────────────────────────────────

export default function RateLibraryPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [sources, setSources] = useState<RateSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<RateSource | null>(null);
  const [rateItems, setRateItems] = useState<RateItem[]>([]);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("items");
  const [search, setSearch] = useState("");
  const [itemOffset, setItemOffset] = useState(0);
  const ITEM_LIMIT = 50;

  const [showAddSource, setShowAddSource] = useState(false);
  const [sourceForm, setSourceForm] = useState<AddSourceForm>(DEFAULT_SOURCE_FORM);
  const [savingSource, setSavingSource] = useState(false);

  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState<AddItemForm>(DEFAULT_ITEM_FORM);
  const [savingItem, setSavingItem] = useState(false);

  useEffect(() => {
    loadSources();
  }, []);

  useEffect(() => {
    if (selectedSource) {
      loadItems();
      if (activeTab === "raw-rows") loadRawRows();
    }
  }, [selectedSource, search, itemOffset, activeTab]);

  async function loadSources() {
    const { data } = await api.get<RateSource[]>("/rates/sources");
    setSources(data);
  }

  async function loadItems() {
    if (!selectedSource) return;
    const params = new URLSearchParams({
      source_id: selectedSource.id,
      limit: String(ITEM_LIMIT),
      offset: String(itemOffset),
    });
    if (search) params.set("search", search);
    const { data } = await api.get<RateItem[]>(`/rates/items?${params}`);
    setRateItems(data);
  }

  async function loadRawRows() {
    if (!selectedSource) return;
    const { data } = await api.get<RawRow[]>(
      `/rates/sources/${selectedSource.id}/raw-rows?limit=100`
    );
    setRawRows(data);
  }

  async function handleAddSource() {
    setSavingSource(true);
    try {
      await api.post("/rates/sources", {
        title: sourceForm.title,
        issuing_authority: sourceForm.issuing_authority || null,
        region: sourceForm.region || null,
        fiscal_year: sourceForm.fiscal_year || null,
        quarter: sourceForm.quarter || null,
        cost_type: sourceForm.cost_type,
      });
      await loadSources();
      setShowAddSource(false);
      setSourceForm(DEFAULT_SOURCE_FORM);
    } finally {
      setSavingSource(false);
    }
  }

  async function handleAddItem() {
    if (!selectedSource) return;
    setSavingItem(true);
    try {
      await api.post("/rates/items", {
        rate_source_id: selectedSource.id,
        item_no: itemForm.item_no || null,
        work_category: itemForm.work_category || null,
        description: itemForm.description,
        unit: itemForm.unit,
        direct_cost: parseFloat(itemForm.direct_cost),
      });
      await loadItems();
      setShowAddItem(false);
      setItemForm(DEFAULT_ITEM_FORM);
    } finally {
      setSavingItem(false);
    }
  }

  async function handleApproveRow(rowId: string) {
    try {
      await api.post(`/rates/raw-rows/${rowId}/approve`, {});
      await loadRawRows();
      await loadItems();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
            "Failed to approve row";
      alert(msg);
    }
  }

  async function handleRejectRow(rowId: string) {
    await api.patch(`/rates/raw-rows/${rowId}`, { status: "REJECTED" });
    setRawRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, status: "REJECTED" } : r))
    );
  }

  return (
    <div className="flex h-full">
      {/* ── Source list sidebar ── */}
      <div className="w-72 border-r border-outline-variant flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-accent" />
            <h2 className="font-semibold text-on-surface text-sm">Rate Sources</h2>
          </div>
          <button
            onClick={() => setShowAddSource((v) => !v)}
            className="btn-ghost p-1.5 text-accent"
            title="Add rate source"
          >
            <Plus size={15} />
          </button>
        </div>

        {/* Add source form */}
        {showAddSource && (
          <div className="p-3 border-b border-outline-variant space-y-2 bg-surface-variant">
            <input
              className="input w-full text-sm"
              placeholder="Title *"
              value={sourceForm.title}
              onChange={(e) => setSourceForm((f) => ({ ...f, title: e.target.value }))}
            />
            <input
              className="input w-full text-sm"
              placeholder="Issuing Authority"
              value={sourceForm.issuing_authority}
              onChange={(e) =>
                setSourceForm((f) => ({ ...f, issuing_authority: e.target.value }))
              }
            />
            <select
              className="input w-full text-sm"
              value={sourceForm.region}
              onChange={(e) => setSourceForm((f) => ({ ...f, region: e.target.value }))}
            >
              {REGIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input text-sm"
                placeholder="Fiscal Year"
                value={sourceForm.fiscal_year}
                onChange={(e) =>
                  setSourceForm((f) => ({ ...f, fiscal_year: e.target.value }))
                }
              />
              <input
                className="input text-sm"
                placeholder="Quarter"
                value={sourceForm.quarter}
                onChange={(e) => setSourceForm((f) => ({ ...f, quarter: e.target.value }))}
              />
            </div>
            <select
              className="input w-full text-sm"
              value={sourceForm.cost_type}
              onChange={(e) => setSourceForm((f) => ({ ...f, cost_type: e.target.value }))}
            >
              {COST_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddSource(false)}
                className="btn-ghost text-xs flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSource}
                disabled={savingSource || !sourceForm.title}
                className="btn-primary text-xs flex-1 disabled:opacity-40"
              >
                {savingSource ? "Saving…" : "Add"}
              </button>
            </div>
          </div>
        )}

        {/* Source list */}
        <div className="flex-1 overflow-auto">
          {sources.length === 0 ? (
            <p className="p-4 text-sm text-on-surface-variant">No rate sources yet.</p>
          ) : (
            sources.map((source) => (
              <button
                key={source.id}
                onClick={() => {
                  setSelectedSource(source);
                  setItemOffset(0);
                  setSearch("");
                }}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-outline-variant transition-colors flex items-start justify-between gap-2",
                  selectedSource?.id === source.id
                    ? "bg-orange-50 border-l-2 border-l-accent"
                    : "hover:bg-surface-low"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-on-surface text-sm truncate">
                    {source.title}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {[source.region, source.fiscal_year].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {source.item_count} items
                  </p>
                </div>
                <ChevronRight size={14} className="text-outline shrink-0 mt-1" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedSource ? (
          <div className="flex-1 flex items-center justify-center text-on-surface-variant">
            <div className="text-center">
              <BookOpen size={40} className="mx-auto mb-3 text-outline" />
              <p className="font-medium">Select a rate source</p>
              <p className="text-sm mt-1">
                Or add a new one using the + button on the left.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Source header */}
            <div className="px-5 py-3 border-b border-outline-variant flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-on-surface">{selectedSource.title}</h3>
                <p className="text-xs text-on-surface-variant">
                  {[
                    selectedSource.issuing_authority,
                    selectedSource.region,
                    selectedSource.fiscal_year,
                    selectedSource.quarter,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedSource.is_official && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    <BadgeCheck size={11} />
                    Official
                  </span>
                )}
                <span className="text-xs text-on-surface-variant">
                  {selectedSource.item_count} items
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-0 border-b border-outline-variant px-5">
              {(["items", "raw-rows"] as ActiveTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors",
                    activeTab === tab
                      ? "border-accent text-accent"
                      : "border-transparent text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  {tab === "items" ? "Rate Items" : "Raw Import Rows"}
                </button>
              ))}
            </div>

            {/* Rate Items tab */}
            {activeTab === "items" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="px-5 py-3 flex items-center gap-3 border-b border-outline-variant">
                  <div className="relative flex-1 max-w-sm">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
                    />
                    <input
                      className="input pl-9 text-sm"
                      placeholder="Search descriptions…"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setItemOffset(0);
                      }}
                    />
                  </div>
                  <button
                    onClick={() => setShowAddItem((v) => !v)}
                    className="btn-primary flex items-center gap-1.5 text-sm"
                  >
                    <Plus size={14} /> Add Item
                  </button>
                </div>

                {/* Add item form */}
                {showAddItem && (
                  <div className="px-5 py-4 border-b border-outline-variant bg-surface-variant space-y-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div>
                        <label className="block text-label-caps text-on-surface-variant mb-1">
                          Item No
                        </label>
                        <input
                          className="input w-full text-sm"
                          placeholder="e.g. 3.2.1"
                          value={itemForm.item_no}
                          onChange={(e) =>
                            setItemForm((f) => ({ ...f, item_no: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-label-caps text-on-surface-variant mb-1">
                          Category
                        </label>
                        <input
                          className="input w-full text-sm"
                          placeholder="e.g. CONCRETE"
                          value={itemForm.work_category}
                          onChange={(e) =>
                            setItemForm((f) => ({ ...f, work_category: e.target.value }))
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-label-caps text-on-surface-variant mb-1">
                          Description *
                        </label>
                        <input
                          className="input w-full text-sm"
                          placeholder="e.g. Grade C-25 concrete in columns"
                          value={itemForm.description}
                          onChange={(e) =>
                            setItemForm((f) => ({ ...f, description: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-label-caps text-on-surface-variant mb-1">
                          Unit *
                        </label>
                        <select
                          className="input w-full text-sm"
                          value={itemForm.unit}
                          onChange={(e) =>
                            setItemForm((f) => ({ ...f, unit: e.target.value }))
                          }
                        >
                          {UNITS.map((u) => (
                            <option key={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-label-caps text-on-surface-variant mb-1">
                          Direct Cost (ETB) *
                        </label>
                        <input
                          type="number"
                          className="input w-full text-sm"
                          placeholder="0.00"
                          value={itemForm.direct_cost}
                          onChange={(e) =>
                            setItemForm((f) => ({ ...f, direct_cost: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setShowAddItem(false)}
                        className="btn-ghost text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddItem}
                        disabled={
                          savingItem || !itemForm.description || !itemForm.direct_cost
                        }
                        className="btn-primary text-sm disabled:opacity-40"
                      >
                        {savingItem ? "Saving…" : "Add Item"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Items table */}
                <div className="flex-1 overflow-auto">
                  {rateItems.length === 0 ? (
                    <p className="p-6 text-sm text-on-surface-variant">
                      No rate items found.
                    </p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Item No</th>
                          <th>Category</th>
                          <th>Description</th>
                          <th>Unit</th>
                          <th className="num">Direct Cost (ETB)</th>
                          <th>Verified</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rateItems.map((item) => (
                          <tr key={item.id}>
                            <td className="font-mono text-xs text-on-surface-variant">
                              {item.item_no ?? "—"}
                            </td>
                            <td className="text-xs text-on-surface-variant">
                              {item.work_category ?? "—"}
                            </td>
                            <td className="text-on-surface">{item.description}</td>
                            <td className="text-on-surface-variant">{item.unit}</td>
                            <td className="num font-semibold text-on-surface">
                              {item.direct_cost.toLocaleString()}
                            </td>
                            <td>
                              {item.is_verified ? (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                  <BadgeCheck size={13} /> Verified
                                </span>
                              ) : (
                                <span className="text-xs text-on-surface-variant">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination */}
                <div className="px-5 py-2.5 border-t border-outline-variant flex items-center justify-between text-sm text-on-surface-variant">
                  <button
                    onClick={() => setItemOffset((o) => Math.max(0, o - ITEM_LIMIT))}
                    disabled={itemOffset === 0}
                    className="btn-ghost flex items-center gap-1 disabled:opacity-40 text-xs"
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <span className="text-xs">
                    Showing {itemOffset + 1}–{itemOffset + rateItems.length}
                  </span>
                  <button
                    onClick={() => setItemOffset((o) => o + ITEM_LIMIT)}
                    disabled={rateItems.length < ITEM_LIMIT}
                    className="btn-ghost flex items-center gap-1 disabled:opacity-40 text-xs"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Raw Import Rows tab */}
            {activeTab === "raw-rows" && (
              <div className="flex-1 overflow-auto">
                {rawRows.length === 0 ? (
                  <p className="p-6 text-sm text-on-surface-variant">
                    No raw import rows for this source.
                  </p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Page</th>
                        <th>Raw Description</th>
                        <th>Parsed Description</th>
                        <th>Unit</th>
                        <th className="num">Cost</th>
                        <th>Confidence</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.map((row) => (
                        <tr key={row.id}>
                          <td className="text-xs text-on-surface-variant">
                            {row.source_page ?? "—"}
                          </td>
                          <td className="text-xs text-on-surface-variant max-w-xs truncate">
                            {row.raw_description ?? "—"}
                          </td>
                          <td className="text-sm text-on-surface max-w-xs truncate">
                            {row.parsed_description ?? (
                              <span className="italic text-on-surface-variant">
                                Not parsed
                              </span>
                            )}
                          </td>
                          <td className="text-on-surface-variant text-xs">
                            {row.parsed_unit ?? row.raw_unit ?? "—"}
                          </td>
                          <td className="num text-on-surface">
                            {row.parsed_cost != null
                              ? row.parsed_cost.toLocaleString()
                              : row.raw_cost ?? "—"}
                          </td>
                          <td>
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                row.confidence >= 0.8
                                  ? "text-green-600"
                                  : row.confidence >= 0.5
                                  ? "text-yellow-600"
                                  : "text-red-500"
                              )}
                            >
                              {Math.round(row.confidence * 100)}%
                            </span>
                          </td>
                          <td>
                            <span
                              className={cn(
                                "inline-block px-2 py-0.5 rounded-full text-xs font-semibold",
                                row.status === "APPROVED"
                                  ? "bg-green-100 text-green-700"
                                  : row.status === "REJECTED"
                                  ? "bg-red-100 text-red-700"
                                  : row.status === "NEEDS_REVIEW"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-surface-variant text-on-surface-variant"
                              )}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td>
                            {row.status === "PENDING" && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleApproveRow(row.id)}
                                  className="btn-ghost p-1.5 text-green-600"
                                  title="Approve → create rate item"
                                  disabled={
                                    !row.parsed_description ||
                                    !row.parsed_unit ||
                                    row.parsed_cost == null
                                  }
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={() => handleRejectRow(row.id)}
                                  className="btn-ghost p-1.5 text-red-500"
                                  title="Reject"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
