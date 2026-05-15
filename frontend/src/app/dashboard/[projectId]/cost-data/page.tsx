"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Database, Search, Plus, ChevronDown, ChevronRight, BookOpen, RefreshCw, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

const CATEGORIES = [
  {
    code: "01", title: "Substructure Works", section: "SUBSTRUCTURE",
    items: [
      { code: "01.01", description: "Site clearance and removal of topsoil (200mm depth)", unit: "m²", rate: 45.00 },
      { code: "01.02", description: "Bulk excavation in ordinary soil, depth ≤ 1.5m", unit: "m³", rate: 120.00 },
      { code: "01.03", description: "Excavation in hard rock, depth ≤ 1.5m", unit: "m³", rate: 380.00 },
      { code: "01.04", description: "Backfilling with selected material, compacted", unit: "m³", rate: 95.00 },
    ],
  },
  {
    code: "02", title: "Concrete Works", section: "SUBSTRUCTURE",
    items: [
      { code: "02.01", description: "Grade C-5 Lean Concrete bed, 50mm thickness", unit: "m²", rate: 850.00 },
      { code: "02.02", description: "Grade C-25 Concrete in foundation footing incl. formwork", unit: "m³", rate: 14200.00 },
      { code: "02.03", description: "Grade C-25 Concrete in columns incl. formwork", unit: "m³", rate: 15800.00 },
      { code: "02.04", description: "Grade C-25 Concrete in beams incl. formwork", unit: "m³", rate: 15200.00 },
      { code: "02.05", description: "Grade C-25 Concrete in suspended slabs incl. formwork", unit: "m³", rate: 14900.00 },
    ],
  },
  {
    code: "03", title: "Reinforcement Works", section: "SUBSTRUCTURE",
    items: [
      { code: "03.01", description: "High yield deformed bar Ø8mm (ASTM A615 / ES)", unit: "kg", rate: 85.00 },
      { code: "03.02", description: "High yield deformed bar Ø10mm", unit: "kg", rate: 83.00 },
      { code: "03.03", description: "High yield deformed bar Ø12mm", unit: "kg", rate: 82.00 },
      { code: "03.04", description: "High yield deformed bar Ø16mm", unit: "kg", rate: 80.00 },
      { code: "03.05", description: "High yield deformed bar Ø20mm", unit: "kg", rate: 79.00 },
    ],
  },
  {
    code: "04", title: "Masonry Works", section: "SUPERSTRUCTURE",
    items: [
      { code: "04.01", description: "200mm hollow concrete block wall incl. mortar", unit: "m²", rate: 1250.00 },
      { code: "04.02", description: "150mm solid concrete block wall incl. mortar", unit: "m²", rate: 980.00 },
      { code: "04.03", description: "Stone masonry in foundation, class A", unit: "m³", rate: 3200.00 },
    ],
  },
  {
    code: "05", title: "Finishing Works", section: "SUPERSTRUCTURE",
    items: [
      { code: "05.01", description: "Cement and sand plaster 20mm thick (1:3)", unit: "m²", rate: 320.00 },
      { code: "05.02", description: "Ceramic floor tile 300×300mm incl. bedding", unit: "m²", rate: 850.00 },
      { code: "05.03", description: "Emulsion paint two coats on plastered wall", unit: "m²", rate: 180.00 },
    ],
  },
];

interface UsedRate { code: string; description: string; }

export default function CostDataPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();

  const [search, setSearch]       = useState("");
  const [expanded, setExpanded]   = useState<Set<string>>(new Set(["01"]));
  const [activeRegion, setRegion] = useState("Addis Ababa");
  const [usedRates, setUsedRates] = useState<Set<string>>(new Set());
  const [adding, setAdding]       = useState<string | null>(null);

  const REGIONS = ["Addis Ababa", "Dire Dawa", "Mekelle", "Hawassa", "Bahir Dar", "Adama"];

  function toggleCategory(code: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  async function useRate(item: { code: string; description: string; unit: string; rate: number }, section: string) {
    setAdding(item.code);
    try {
      // Create a BOQ item directly from this rate
      await api.post(`/projects/${projectId}/boq-items`, {
        item_no: item.code,
        section: section,
        trade: CATEGORIES.find(c => c.items.some(i => i.code === item.code))?.title ?? "",
        description: item.description,
        unit: item.unit,
        quantity: 1.0,
        rate: item.rate,
        waste_factor: 0,
        notes: `From Cost Data — MoUDC 2023 · ${activeRegion}`,
        sort_order: 0,
      });
      setUsedRates((prev) => {
        const next = new Set(prev);
        next.add(item.code);
        return next;
      });
    } catch {
      // ignore — user can retry
    } finally {
      setAdding(null);
    }
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
            Government-released direct cost rates. Click <strong>Use Rate</strong> to add an item to your BOQ Items.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/dashboard/${projectId}/boq-items`)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            View BOQ Items →
          </button>
          <button className="btn-secondary flex items-center gap-2 opacity-50 cursor-not-allowed" disabled>
            <RefreshCw size={14} /> Sync Latest Rates
          </button>
        </div>
      </div>

      {/* Notice */}
      <div className="bg-secondary-container border border-secondary/20 rounded-xl px-4 py-3 flex items-start gap-3">
        <BookOpen size={16} className="text-secondary mt-0.5 shrink-0" />
        <div className="text-sm text-on-surface">
          <span className="font-semibold">Placeholder data</span> — Indicative rates only.
          &quot;Use Rate&quot; adds the item to your BOQ Items tab with quantity = 1 (edit there).
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
      </div>

      {/* Rate table */}
      <div className="space-y-2">
        {filtered.map((cat) => (
          <div key={cat.code} className="panel overflow-hidden">
            <button
              onClick={() => toggleCategory(cat.code)}
              className="w-full px-5 py-3 flex items-center gap-3 hover:bg-surface-low transition-colors text-left"
            >
              {expanded.has(cat.code)
                ? <ChevronDown size={16} className="text-accent shrink-0" />
                : <ChevronRight size={16} className="text-outline shrink-0" />}
              <span className="font-mono text-xs text-on-surface-variant w-8">{cat.code}</span>
              <span className="font-semibold text-on-surface">{cat.title}</span>
              <span className="chip chip-draft text-xs ml-2">{cat.section}</span>
              <span className="ml-auto text-xs text-on-surface-variant">{cat.items.length} items</span>
            </button>

            {expanded.has(cat.code) && (
              <table className="data-table border-t border-outline-variant">
                <thead>
                  <tr>
                    <th className="w-24">Code</th>
                    <th>Description</th>
                    <th className="w-20">Unit</th>
                    <th className="num w-36">Rate (ETB)</th>
                    <th className="w-28 text-center">Action</th>
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
                        {usedRates.has(item.code) ? (
                          <span className="flex items-center justify-center gap-1 text-xs text-green-600 font-semibold">
                            <CheckCircle size={13} /> Added
                          </span>
                        ) : (
                          <button
                            onClick={() => useRate(item, cat.section)}
                            disabled={adding === item.code}
                            className="text-xs font-semibold text-accent hover:underline disabled:opacity-50"
                          >
                            {adding === item.code ? "Adding…" : "Use Rate"}
                          </button>
                        )}
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

      <p className="text-xs text-on-surface-variant text-center pb-2">
        Source: Ethiopian Ministry of Urban Development and Construction (MoUDC) · Schedule of Rates · {activeRegion} · 2023 Edition
      </p>
    </div>
  );
}
