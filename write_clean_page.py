import os

content = """\"use client\";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  Database, Search, ChevronDown, ChevronRight,
  BookOpen, Plus, Info, CheckCircle, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RateItemOut, RateSourceOut } from "@/types";

interface RateRowProps {
  item: RateItemOut;
  depth?: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onAdd: (item: RateItemOut) => void;
  adding: string | null;
  added: boolean;
}

const RateRow = ({
  item,
  depth = 0,
  expanded,
  onToggle,
  onAdd,
  adding,
  added
}: RateRowProps) => {
  const isExpanded = expanded.has(item.id);
  const hasChildren = item.children && item.children.length > 0;
  const isActionable = item.direct_cost > 0;

  return (
    <div key={item.id}>
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 hover:bg-surface-low border-b border-outline-variant/50 transition-colors",
          depth === 0 ? "bg-white font-semibold" : "bg-white/50"
        )}
        style={{ paddingLeft: (depth * 1.5 + 1) + "rem" }}
      >
        <div className="w-6 flex items-center justify-center">
          {hasChildren && (
            <button onClick={() => onToggle(item.id)} className="p-1 hover:bg-surface-container rounded">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </div>

        <span className="font-mono text-[10px] text-outline w-16 shrink-0">{item.item_no}</span>

        <div className="flex-1 flex flex-col min-w-0">
          <span className="text-sm truncate" title={item.description}>{item.description}</span>
          {item.source_page && (
            <span className="text-[10px] text-outline flex items-center gap-1">
              Source: Page {item.source_page} <ExternalLink size={8} />
            </span>
          )}
        </div>

        {isActionable ? (
          <>
            <span className="text-xs text-on-surface-variant w-12 text-center">{item.unit}</span>
            <span className="text-sm font-mono font-semibold w-24 text-right">
              {item.direct_cost.toLocaleString("en-ET", { minimumFractionDigits: 2 })}
            </span>
            <div className="w-24 flex justify-end">
              {added ? (
                <span className="flex items-center gap-1 text-[10px] text-green-600 font-bold uppercase">
                  <CheckCircle size={12} /> Template
                </span>
              ) : (
                <button
                  onClick={() => onAdd(item)}
                  disabled={adding === item.id}
                  className="flex items-center gap-1 text-[10px] bg-accent/10 text-accent px-2 py-1 rounded hover:bg-accent hover:text-white transition-all font-bold uppercase"
                >
                  <Plus size={10} /> {adding === item.id ? "..." : "Takeoff"}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="w-60" />
        )}
      </div>
      {isExpanded && item.children?.map(child => (
        <RateRow
          key={child.id}
          item={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          onAdd={onAdd}
          adding={adding}
          added={added}
        />
      ))}
    </div>
  );
};

export default function CostDataPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();

  const [sources, setSources] = useState<RateSourceOut[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [items, setItems] = useState<RateItemOut[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<RateItemOut[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadSources() {
      try {
        const res = await api.get("/cost-library/sources");
        setSources(res.data);
        if (res.data.length > 0) {
          setSelectedSource(res.data[0].id);
        }
      } catch (err) {
        console.error("Failed to load cost sources", err);
      } finally {
        setLoading(false);
      }
    }
    loadSources();
  }, []);

  useEffect(() => {
    if (!selectedSource || search) return;
    async function loadTree() {
      setLoading(true);
      try {
        const res = await api.get("/cost-library/sources/" + selectedSource + "/tree");
        setItems(res.data);
      } catch (err) {
        console.error("Failed to load rate tree", err);
      } finally {
        setLoading(false);
      }
    }
    loadTree();
  }, [selectedSource, search]);

  useEffect(() => {
    if (!search || search.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const url = "/cost-library/search?q=" + search + (selectedSource ? "&source_id=" + selectedSource : "");
        const res = await api.get(url);
        setSearchResults(res.data);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedSource]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  async function addToProject(item: RateItemOut) {
    setAdding(item.id);
    try {
      const isSub = item.item_no && item.item_no.startsWith("2");
      await api.post("/cost-library/add-to-project", {
        project_id: projectId,
        rate_item_id: item.id,
        section: isSub ? "SUBSTRUCTURE" : "SUPERSTRUCTURE",
      });
      setAddedIds(prev => new Set(prev).add(item.id));
    } catch (err) {
      console.error("Failed to add to project", err);
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="bg-white border-b border-outline-variant px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Database size={18} className="text-accent" />
            <h1 className="text-title-sm">Cost Data Library</h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">Reference MoWUD rates & generate takeoff templates</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Dataset:</span>
            <select
              className="bg-surface-container border-none text-xs rounded-md px-2 py-1.5 focus:ring-1 focus:ring-accent outline-none"
              value={selectedSource || ""}
              onChange={(e) => setSelectedSource(e.target.value)}
            >
              {sources.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <button
            onClick={() => router.push("/dashboard/" + projectId + "/elements")}
            className="btn-secondary py-1.5 px-3 flex items-center gap-2"
          >
            Manage Elements →
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 bg-white/50 border-b border-outline-variant/30">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
            <input
              className="input pl-10 h-10 text-sm bg-white"
              placeholder="Search across 3,000+ items (e.g. 'Excavation', 'C-25', '2.7.1')..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto py-6 px-4">
            <div className="bg-secondary-container/30 rounded-lg p-4 mb-6 flex gap-3 border border-secondary/10">
              <Info size={18} className="text-secondary shrink-0" />
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Items marked with <span className="font-bold text-accent">TAKEOFF</span> create a Project Element template.
                Once created, you can link them to drawings in the <strong>Takeoff</strong> tab to calculate final quantities.
              </p>
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-outline font-medium">Indexing library...</span>
              </div>
            )}

            {!loading && (
              <div className="rounded-xl border border-outline-variant overflow-hidden shadow-sm">
                <div className="bg-primary text-white flex items-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider">
                  <div className="w-6" />
                  <span className="w-16">Item No</span>
                  <span className="flex-1">Description</span>
                  <span className="w-12 text-center">Unit</span>
                  <span className="w-24 text-right">Direct Cost (ETB)</span>
                  <div className="w-24" />
                </div>

                {search ? (
                  searchResults.length > 0 ? (
                    searchResults.map(item => (
                      <RateRow
                        key={item.id}
                        item={item}
                        expanded={expanded}
                        onToggle={toggleExpand}
                        onAdd={addToProject}
                        adding={adding}
                        added={addedIds.has(item.id)}
                      />
                    ))
                  ) : (
                    <div className="p-12 text-center text-sm text-outline bg-white">No items matching &quot;{search}&quot;</div>
                  )
                ) : (
                  items.length > 0 ? (
                    items.map(item => (
                      <RateRow
                        key={item.id}
                        item={item}
                        expanded={expanded}
                        onToggle={toggleExpand}
                        onAdd={addToProject}
                        adding={adding}
                        added={addedIds.has(item.id)}
                      />
                    ))
                  ) : (
                    <div className="p-12 text-center text-sm text-outline bg-white">Select a dataset to begin.</div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-2 bg-white border-t border-outline-variant flex items-center justify-between text-[10px] text-outline font-medium">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-accent rounded-full" /> Verified Source</span>
          <span className="flex items-center gap-1"><BookOpen size={10} /> Official MoWUD Documentation</span>
        </div>
        <span>Last Updated: MoWUD 2018 3rd Qtr</span>
      </div>
    </div>
  );
}
"""

with open("frontend/src/app/dashboard/[projectId]/cost-data/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
