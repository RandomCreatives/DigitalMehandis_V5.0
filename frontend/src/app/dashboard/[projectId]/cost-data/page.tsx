"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  ChevronDown, ChevronRight, Search,
  Plus, Trash2, CheckCircle, Loader2, ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TaskItem {
  id: string;          // composite: "file:index"
  item_no: string | null;
  description: string;
  unit: string | null;
  cost: number | null; // direct cost ETB
  section: string;     // header label above this item
  is_header: boolean;  // section header row (no cost)
}

interface TaskGroup {
  name: string;        // e.g. "Concrete Work"
  items: TaskItem[];
}

// ── Load JSON task files ──────────────────────────────────────────────────────
// Files are served from /attachments/ (public folder) or fetched via API.
// We embed the known file list; more can be added later.

const TASK_FILES: { label: string; file: string }[] = [
  { label: "Excavation & Earth Work",         file: "Task_Excavation_and_Earth_Work.json" },
  { label: "Excavation & Earth Work (Manual)", file: "Task_Excavation_and_Earth_Work_Mechanized.json" },
  { label: "Concrete Work",                   file: "Task_Concrete_Work.json" },
  { label: "Masonry & Block Work",            file: "Task_Masonary_and_Block_Work.json" },
  { label: "Demolishing",                     file: "Task_Demolishing.json" },
];

function parseCost(raw: string | null | undefined): number | null {
  if (!raw) return null;
  // Remove commas, spaces, OCR artifacts like 'l' instead of '1'
  const cleaned = String(raw).replace(/,/g, "").replace(/\s/g, "").replace(/l/g, "1");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

async function loadTaskGroup(label: string, file: string): Promise<TaskGroup> {
  try {
    const res = await fetch(`/attachments/${file}`);
    const raw: { ID: string | null; Description: string; Unit: string | null; Cost: string | null }[] = await res.json();
    let currentSection = label;
    const items: TaskItem[] = raw.map((row, idx) => {
      const cost = parseCost(row.Cost);
      const isHeader = !row.Unit && cost === null;
      if (isHeader && row.Description) currentSection = row.Description;
      return {
        id: `${file}:${idx}`,
        item_no: row.ID ?? null,
        description: row.Description,
        unit: row.Unit ?? null,
        cost,
        section: currentSection,
        is_header: isHeader,
      };
    });
    return { name: label, items };
  } catch {
    return { name: label, items: [] };
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CostDataPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set()); // item ids
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  // Load all task files on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      const loaded = await Promise.all(
        TASK_FILES.map((f) => loadTaskGroup(f.label, f.file))
      );
      setGroups(loaded);
      // Expand first group by default
      if (loaded.length > 0) setExpandedGroups(new Set([loaded[0].name]));
      setLoading(false);
    }
    load();
  }, []);

  // Filtered items across all groups
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.map((g) => ({
      ...g,
      items: g.items.filter(
        (i) =>
          i.description.toLowerCase().includes(q) ||
          (i.item_no ?? "").toLowerCase().includes(q)
      ),
    })).filter((g) => g.items.length > 0);
  }, [groups, search]);

  function toggleGroup(name: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function toggleItem(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleGroupItems(group: TaskGroup) {
    const actionable = group.items.filter((i) => !i.is_header && i.cost !== null);
    const allSelected = actionable.every((i) => selected.has(i.id));
    setSelected((prev) => {
      const next = new Set(prev);
      actionable.forEach((i) => allSelected ? next.delete(i.id) : next.add(i.id));
      return next;
    });
  }

  // Collect selected item objects
  const selectedItems = useMemo(() => {
    const all = groups.flatMap((g) => g.items);
    return all.filter((i) => selected.has(i.id));
  }, [groups, selected]);

  async function addSelectedToBOQ() {
    if (selectedItems.length === 0) return;
    setAdding(true);
    try {
      // Add each selected item as a BOQ item (quantity=0, waiting for takeoff)
      await Promise.all(
        selectedItems.map((item) =>
          api.post(`/projects/${projectId}/boq-items`, {
            item_no: item.item_no ?? "",
            section: item.section.toUpperCase().includes("SUB") ? "SUBSTRUCTURE" : "SUPERSTRUCTURE",
            description: item.description,
            unit: item.unit ?? "m³",
            quantity: 0,
            rate: item.cost ?? 0,
            amount: 0,
          })
        )
      );
      setAddedIds((prev) => {
        const next = new Set(prev);
        selectedItems.forEach((i) => next.add(i.id));
        return next;
      });
      setSelected(new Set());
    } catch (err) {
      console.error("Failed to add to BOQ", err);
    } finally {
      setAdding(false);
    }
  }

  const totalSelectedCost = selectedItems.reduce((s, i) => s + (i.cost ?? 0), 0);

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="bg-white border-b border-outline-variant px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-title-sm text-on-surface">Cost Data</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              MoWUD 2018 Q3 · Select items to add to your BOQ
            </p>
          </div>
          {/* Search */}
          <div className="relative w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              className="input pl-9 text-sm"
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Task list ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-on-surface-variant">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading cost data…</span>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="card text-center py-12 text-on-surface-variant">
            <p className="text-sm">No items match &quot;{search}&quot;</p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isOpen = search.trim() ? true : expandedGroups.has(group.name);
            const actionable = group.items.filter((i) => !i.is_header && i.cost !== null);
            const groupSelectedCount = actionable.filter((i) => selected.has(i.id)).length;
            const allGroupSelected = actionable.length > 0 && groupSelectedCount === actionable.length;

            return (
              <div key={group.name} className="panel overflow-hidden">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.name)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  <span className="font-semibold text-sm flex-1 text-left">{group.name}</span>
                  <span className="text-xs text-white/60">{actionable.length} items</span>
                  {groupSelectedCount > 0 && (
                    <span className="text-xs bg-accent text-white px-2 py-0.5 rounded-full font-bold">
                      {groupSelectedCount} selected
                    </span>
                  )}
                  {/* Select all in group */}
                  {isOpen && actionable.length > 0 && (
                    <span
                      role="checkbox"
                      aria-checked={allGroupSelected}
                      onClick={(e) => { e.stopPropagation(); toggleGroupItems(group); }}
                      className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                        allGroupSelected
                          ? "bg-accent border-accent"
                          : "border-white/50 hover:border-white"
                      )}
                    >
                      {allGroupSelected && <CheckCircle size={10} className="text-white" />}
                    </span>
                  )}
                </button>

                {/* Items */}
                {isOpen && (
                  <div>
                    {/* Column headers */}
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-surface-low border-b border-outline-variant text-label-caps text-on-surface-variant">
                      <div className="w-5" />
                      <span className="w-16">Item No</span>
                      <span className="flex-1">Description</span>
                      <span className="w-14 text-center">Unit</span>
                      <span className="w-28 text-right">Direct Cost (ETB)</span>
                      <div className="w-5" />
                    </div>

                    {group.items.map((item) => {
                      if (item.is_header) {
                        return (
                          <div key={item.id} className="px-4 py-1.5 bg-surface-highest border-b border-outline-variant">
                            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                              {item.description}
                            </span>
                          </div>
                        );
                      }

                      const isSelected = selected.has(item.id);
                      const isAdded = addedIds.has(item.id);
                      const hasPrice = item.cost !== null;

                      return (
                        <div
                          key={item.id}
                          onClick={() => hasPrice && toggleItem(item.id)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 border-b border-outline-variant transition-colors",
                            hasPrice ? "cursor-pointer hover:bg-surface-low" : "opacity-50 cursor-default",
                            isSelected && "bg-orange-50"
                          )}
                        >
                          {/* Checkbox */}
                          <div className={cn(
                            "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                            isSelected ? "bg-accent border-accent" : "border-outline-variant"
                          )}>
                            {isSelected && <CheckCircle size={10} className="text-white" />}
                          </div>

                          <span className="font-mono text-[10px] text-on-surface-variant w-16 shrink-0">
                            {item.item_no ?? "—"}
                          </span>

                          <span className="flex-1 text-sm text-on-surface leading-snug">
                            {item.description}
                            {isAdded && (
                              <span className="ml-2 text-[10px] text-green-600 font-bold uppercase">
                                ✓ In BOQ
                              </span>
                            )}
                          </span>

                          <span className="w-14 text-center text-xs text-on-surface-variant shrink-0">
                            {item.unit ?? "—"}
                          </span>

                          <span className="w-28 text-right text-sm font-mono font-semibold text-on-surface shrink-0">
                            {item.cost !== null
                              ? item.cost.toLocaleString("en-ET", { minimumFractionDigits: 2 })
                              : "—"}
                          </span>

                          {/* Quick add single item */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isAdded && hasPrice) {
                                setSelected(new Set([item.id]));
                              }
                            }}
                            className="w-5 flex items-center justify-center text-outline hover:text-accent transition-colors shrink-0"
                            title="Select"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Selection action bar ── */}
      {selected.size > 0 && (
        <div className="shrink-0 bg-primary text-white px-6 py-3 flex items-center gap-4 border-t border-primary">
          <ShoppingCart size={16} className="text-accent shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-semibold">
              {selected.size} item{selected.size !== 1 ? "s" : ""} selected
            </span>
            <span className="text-white/60 text-xs ml-3">
              Total direct cost: ETB {totalSelectedCost.toLocaleString("en-ET", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <button
            onClick={() => setSelected(new Set())}
            className="btn-ghost text-white/60 hover:text-white text-xs py-1"
          >
            <Trash2 size={13} className="inline mr-1" /> Clear
          </button>
          <button
            onClick={addSelectedToBOQ}
            disabled={adding}
            className="btn-primary flex items-center gap-2 py-1.5"
          >
            {adding
              ? <Loader2 size={13} className="animate-spin" />
              : <Plus size={13} />}
            {adding ? "Adding…" : "Add to BOQ"}
          </button>
        </div>
      )}
    </div>
  );
}
