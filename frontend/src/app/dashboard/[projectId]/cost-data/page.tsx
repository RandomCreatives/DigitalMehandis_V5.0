"use client";
import { useState } from "react";
import { Database, Search, Plus, ChevronDown, ChevronRight, BookOpen, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// Placeholder categories — will be replaced with live government rate data
const CATEGORIES = [
  {
    code: "01",
    title: "Substructure Works",
    items: [
      { code: "01.01", description: "Site clearance and removal of topsoil (200mm depth)", unit: "m²", rate: 45.00 },
      { code: "01.02", description: "Bulk excavation in ordinary soil, depth ≤ 1.5m", unit: "m³", rate: 120.00 },
      { code: "01.03", description: "Excavation in hard rock, depth ≤ 1.5m", unit: "m³", rate: 380.00 },
      { code: "01.04", description: "Backfilling with selected material, compacted", unit: "m³", rate: 95.00 },
    ],
  },
  {
    code: "02",
    title: "Concrete Works",
    items: [
      { code: "02.01", description: "Grade C-5 Lean Concrete bed, 50mm thickness", unit: "m²", rate: 850.00 },
      { code: "02.02", description: "Grade C-25 Concrete in foundation footing incl. formwork", unit: "m³", rate: 14200.00 },
      { code: "02.03", description: "Grade C-25 Concrete in columns incl. formwork", unit: "m³", rate: 15800.00 },
      { code: "02.04", description: "Grade C-25 Concrete in beams incl. formwork", unit: "m³", rate: 15200.00 },
      { code: "02.05", description: "Grade C-25 Concrete in suspended slabs incl. formwork", unit: "m³", rate: 14900.00 },
    ],
  },
  {
    code: "03",
    title: "Reinforcement Works",
    items: [
      { code: "03.01", description: "High yield deformed bar Ø8mm (ASTM A615 / ES)", unit: "kg", rate: 85.00 },
      { code: "03.02", description: "High yield deformed bar Ø10mm", unit: "kg", rate: 83.00 },
      { code: "03.03", description: "High yield deformed bar Ø12mm", unit: "kg", rate: 82.00 },
      { code: "03.04", description: "High yield deformed bar Ø16mm", unit: "kg", rate: 80.00 },
      { code: "03.05", description: "High yield deformed bar Ø20mm", unit: "kg", rate: 79.00 },
    ],
  },
  {
    code: "04",
    title: "Masonry Works",
    items: [
      { code: "04.01", description: "200mm hollow concrete block wall incl. mortar", unit: "m²", rate: 1250.00 },
      { code: "04.02", description: "150mm solid concrete block wall incl. mortar", unit: "m²", rate: 980.00 },
      { code: "04.03", description: "Stone masonry in foundation, class A", unit: "m³", rate: 3200.00 },
    ],
  },
  {
    code: "05",
    title: "Finishing Works",
    items: [
      { code: "05.01", description: "Cement and sand plaster 20mm thick (1:3)", unit: "m²", rate: 320.00 },
      { code: "05.02", description: "Ceramic floor tile 300×300mm incl. bedding", unit: "m²", rate: 850.00 },
      { code: "05.03", description: "Emulsion paint two coats on plastered wall", unit: "m²", rate: 180.00 },
    ],
  },
];

export default function CostDataPage() {
  const [search, setSearch]         = useState("");
  const [expanded, setExpanded]     = useState<Set<string>>(new Set(["01"]));
  const [activeRegion, setRegion]   = useState("Addis Ababa");

  const REGIONS = ["Addis Ababa", "Dire Dawa", "Mekelle", "Hawassa", "Bahir Dar", "Adama"];

  function toggleCategory(code: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  const filtered = CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.code.includes(search)
    ),
  })).filter((cat) => search === "" || cat.items.length > 0);

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database size={20} className="text-accent" />
            <h2 className="text-title-sm text-on-surface">Cost Data</h2>
            <span className="chip chip-draft">MoUDC 2023</span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            Government-released direct cost rates for Ethiopian construction works.
            Select items to use as unit rates in your BOQ.
          </p>
        </div>
        <button className="btn-secondary flex items-center gap-2 opacity-50 cursor-not-allowed" disabled>
          <RefreshCw size={14} /> Sync Latest Rates
        </button>
      </div>

      {/* Notice banner */}
      <div className="bg-secondary-container border border-secondary/20 rounded-xl px-4 py-3 flex items-start gap-3">
        <BookOpen size={16} className="text-secondary mt-0.5 shrink-0" />
        <div className="text-sm text-on-surface">
          <span className="font-semibold">Placeholder data</span> — Full integration with the Ethiopian MoUDC Schedule of Rates is coming soon.
          Rates shown are indicative only. The &quot;Sync Latest Rates&quot; button will pull live government data once connected.
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            className="input pl-9"
            placeholder="Search by description or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-label-caps text-on-surface-variant">Region:</label>
          <select className="input w-40" value={activeRegion} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <button className="btn-ghost flex items-center gap-1.5 text-sm opacity-50 cursor-not-allowed" disabled>
          <Plus size={14} /> Add Custom Rate
        </button>
      </div>

      {/* Rate table by category */}
      <div className="space-y-2">
        {filtered.map((cat) => (
          <div key={cat.code} className="panel overflow-hidden">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(cat.code)}
              className="w-full px-5 py-3 flex items-center gap-3 hover:bg-surface-low transition-colors text-left"
            >
              {expanded.has(cat.code)
                ? <ChevronDown size={16} className="text-accent shrink-0" />
                : <ChevronRight size={16} className="text-outline shrink-0" />}
              <span className="font-mono text-xs text-on-surface-variant w-8">{cat.code}</span>
              <span className="font-semibold text-on-surface">{cat.title}</span>
              <span className="ml-auto text-xs text-on-surface-variant">{cat.items.length} items</span>
            </button>

            {/* Items */}
            {expanded.has(cat.code) && (
              <table className="data-table border-t border-outline-variant">
                <thead>
                  <tr>
                    <th className="w-24">Code</th>
                    <th>Description</th>
                    <th className="w-20">Unit</th>
                    <th className="num w-36">Rate (ETB)</th>
                    <th className="w-24 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.items.map((item) => (
                    <tr key={item.code}>
                      <td className="font-mono text-xs text-on-surface-variant">{item.code}</td>
                      <td className="text-on-surface">{item.description}</td>
                      <td className="text-on-surface-variant">{item.unit}</td>
                      <td className="num font-semibold text-on-surface">
                        {item.rate.toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-center">
                        <button
                          className="text-xs font-semibold text-accent hover:underline"
                          title="Use this rate in BOQ"
                        >
                          Use Rate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="card text-center py-12 text-on-surface-variant">
            No rates found for &quot;{search}&quot;
          </div>
        )}
      </div>

      {/* Footer note */}
      <p className="text-xs text-on-surface-variant text-center pb-2">
        Source: Ethiopian Ministry of Urban Development and Construction (MoUDC) · Schedule of Rates · {activeRegion} · 2023 Edition
      </p>
    </div>
  );
}
