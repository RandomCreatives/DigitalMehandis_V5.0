"use client";
import { useEffect, useState, useMemo } from "react";
import { BookOpen, Search, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Available datasets ────────────────────────────────────────────────────────
// Add more entries here as new year/quarter data becomes available.

interface Dataset {
  year: string;
  quarter: string;
  label: string;
  files: { name: string; file: string }[];
}

const DATASETS: Dataset[] = [
  {
    year: "2018",
    quarter: "Q3",
    label: "MoWUD 2018 — 3rd Quarter",
    files: [
      { name: "Excavation & Earth Work",          file: "Task_Excavation_and_Earth_Work.json" },
      { name: "Excavation & Earth Work (Manual)",  file: "Task_Excavation_and_Earth_Work_Mechanized.json" },
      { name: "Concrete Work",                    file: "Task_Concrete_Work.json" },
      { name: "Masonry & Block Work",             file: "Task_Masonary_and_Block_Work.json" },
      { name: "Demolishing",                      file: "Task_Demolishing.json" },
    ],
  },
  // Future datasets — uncomment and add files when available:
  // { year: "2019", quarter: "Q1", label: "MoWUD 2019 — 1st Quarter", files: [] },
  // { year: "2019", quarter: "Q3", label: "MoWUD 2019 — 3rd Quarter", files: [] },
];

interface RateRow {
  ID: string | null;
  Description: string;
  Unit: string | null;
  Cost: string | null;
}

function parseCost(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(/,/g, "").replace(/\s/g, "").replace(/l/g, "1");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

export default function GovRatesPage() {
  const [selectedDataset, setSelectedDataset] = useState<Dataset>(DATASETS[0]);
  const [selectedFile, setSelectedFile] = useState<{ name: string; file: string }>(DATASETS[0].files[0]);
  const [rows, setRows] = useState<RateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Load JSON when file selection changes
  useEffect(() => {
    if (!selectedFile) return;
    setLoading(true);
    fetch(`/attachments/${selectedFile.file}`)
      .then((r) => r.json())
      .then((data: RateRow[]) => { setRows(data); setLoading(false); })
      .catch(() => { setRows([]); setLoading(false); });
  }, [selectedFile]);

  // Filter rows
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.Description.toLowerCase().includes(q) ||
        (r.ID ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  // Group rows: section headers (no cost, no unit) vs data rows
  const years = [...new Set(DATASETS.map((d) => d.year))];

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="bg-white border-b border-outline-variant px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-accent" />
            <div>
              <h2 className="text-title-sm text-on-surface">Government Rates</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Official MoWUD direct cost reference — browse by year and quarter
              </p>
            </div>
          </div>

          {/* Year / Quarter / Section selectors */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Year */}
            <div className="flex items-center gap-2">
              <label className="text-label-caps text-on-surface-variant">Year</label>
              <div className="relative">
                <select
                  className="input appearance-none pr-7 text-sm"
                  value={selectedDataset.year}
                  onChange={(e) => {
                    const ds = DATASETS.find((d) => d.year === e.target.value) ?? DATASETS[0];
                    setSelectedDataset(ds);
                    setSelectedFile(ds.files[0]);
                    setSearch("");
                  }}
                >
                  {years.map((y) => <option key={y}>{y}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
              </div>
            </div>

            {/* Quarter */}
            <div className="flex items-center gap-2">
              <label className="text-label-caps text-on-surface-variant">Quarter</label>
              <div className="relative">
                <select
                  className="input appearance-none pr-7 text-sm"
                  value={selectedDataset.quarter}
                  onChange={(e) => {
                    const ds = DATASETS.find(
                      (d) => d.year === selectedDataset.year && d.quarter === e.target.value
                    ) ?? selectedDataset;
                    setSelectedDataset(ds);
                    setSelectedFile(ds.files[0]);
                    setSearch("");
                  }}
                >
                  {DATASETS.filter((d) => d.year === selectedDataset.year).map((d) => (
                    <option key={d.quarter} value={d.quarter}>{d.quarter}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
              </div>
            </div>

            {/* Work section */}
            <div className="flex items-center gap-2">
              <label className="text-label-caps text-on-surface-variant">Section</label>
              <div className="relative">
                <select
                  className="input appearance-none pr-7 text-sm"
                  value={selectedFile.file}
                  onChange={(e) => {
                    const f = selectedDataset.files.find((x) => x.file === e.target.value);
                    if (f) { setSelectedFile(f); setSearch(""); }
                  }}
                >
                  {selectedDataset.files.map((f) => (
                    <option key={f.file} value={f.file}>{f.name}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input
                className="input pl-8 text-sm w-52"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Dataset label ── */}
      <div className="px-6 py-2 bg-surface-low border-b border-outline-variant flex items-center justify-between">
        <span className="text-xs font-semibold text-on-surface-variant">
          {selectedDataset.label} · {selectedFile.name}
        </span>
        <span className="text-label-caps text-on-surface-variant">
          {filtered.length} rows
        </span>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-on-surface-variant">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-20">Item No</th>
                <th>Description</th>
                <th className="w-16 text-center">Unit</th>
                <th className="num w-36">Direct Cost (ETB)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const cost = parseCost(row.Cost);
                const isHeader = !row.Unit && cost === null;

                if (isHeader) {
                  return (
                    <tr key={i} className="!bg-surface-highest">
                      <td colSpan={4} className="py-2 px-4">
                        <span className="text-xs font-bold text-on-surface uppercase tracking-wide">
                          {row.Description}
                        </span>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={i}>
                    <td className="font-mono text-[10px] text-on-surface-variant">
                      {row.ID ?? "—"}
                    </td>
                    <td className="text-sm text-on-surface">{row.Description}</td>
                    <td className="text-center text-xs text-on-surface-variant">
                      {row.Unit ?? "—"}
                    </td>
                    <td className={cn(
                      "num text-sm font-mono font-semibold",
                      cost !== null ? "text-on-surface" : "text-outline"
                    )}>
                      {cost !== null
                        ? cost.toLocaleString("en-ET", { minimumFractionDigits: 2 })
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-6 py-2 bg-white border-t border-outline-variant flex items-center justify-between text-label-caps text-on-surface-variant shrink-0">
        <span>Source: Ministry of Works & Urban Development (MoWUD)</span>
        <span>{selectedDataset.label}</span>
      </div>
    </div>
  );
}
