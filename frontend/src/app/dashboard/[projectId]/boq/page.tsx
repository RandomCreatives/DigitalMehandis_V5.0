"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import { api } from "@/lib/api";
import type { BOQResult, BOQLine } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type SectionType = "COMBINED" | "SUBSTRUCTURE" | "SUPERSTRUCTURE";

export default function BOQPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { current } = useProjectStore();
  const [section, setSection] = useState<SectionType>("COMBINED");
  const [boq, setBoq]         = useState<BOQResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  async function generate() {
    setLoading(true);
    const { data } = await api.post(`/projects/${projectId}/boq/generate?section=${section}`);
    setBoq(data);
    setSelected(new Set());
    setLoading(false);
  }

  async function exportExcel() {
    const res = await api.post(`/projects/${projectId}/boq/export-excel?section=${section}`, {}, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a"); a.href = url; a.download = "BOQ.xlsx"; a.click();
  }

  async function exportPdf() {
    const res = await api.post(`/projects/${projectId}/boq/export-pdf?section=${section}`, {}, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a"); a.href = url; a.download = "BOQ.pdf"; a.click();
  }

  function toggleSelect(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  const selectedLines = boq ? Array.from(selected).map((i) => boq.lines[i]).filter(Boolean) : [];
  const selectedSubtotal = selectedLines.reduce((s, l) => s + l.amount, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 space-y-5 max-w-6xl mx-auto w-full overflow-auto">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-title-sm text-on-surface">Summary of Quantities</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Professional BoQ and BBS generation following Ethiopian Ministry of Urban Development and Construction (MoUDC) standards.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={exportExcel} disabled={!boq}
              className="btn-secondary flex items-center gap-2 disabled:opacity-40">
              <FileSpreadsheet size={15} /> Export to Excel
            </button>
            <button onClick={exportPdf} disabled={!boq}
              className="btn-primary flex items-center gap-2 disabled:opacity-40">
              <FileText size={15} /> Export PDF
            </button>
          </div>
        </div>

        {/* Section + generate */}
        <div className="flex items-center gap-3 flex-wrap">
          {(["COMBINED", "SUBSTRUCTURE", "SUPERSTRUCTURE"] as SectionType[]).map((s) => (
            <button key={s} onClick={() => setSection(s)}
              className={cn("section-tab", section === s ? "active" : "inactive")}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
          <button onClick={generate} disabled={loading}
            className="btn-primary flex items-center gap-2 ml-auto">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            {loading ? "Generating…" : "Generate BOQ"}
          </button>
        </div>

        {/* BOQ Table */}
        {boq ? (
          <div className="panel overflow-x-auto">
            <div className="px-6 py-3 border-b border-outline-variant flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-on-surface">Detailed Bill of Quantities (BoQ)</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="chip chip-revision text-xs">REVISED OCT 2023</span>
                  <span className="text-xs text-on-surface-variant">CURRENCY: {boq.currency}</span>
                </div>
              </div>
              <span className="text-xs text-on-surface-variant">{boq.lines.length} items</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-8"></th>
                  <th>Item</th>
                  <th>Description</th>
                  <th>Unit</th>
                  <th className="num">Quantity</th>
                  <th className="num">Rate (ETB)</th>
                  <th className="num">Amount (ETB)</th>
                </tr>
              </thead>
              <tbody>
                {boq.lines.map((line: BOQLine, i: number) => (
                  <tr key={line.item_number}
                    className={cn(selected.has(i) && "!bg-orange-50 ring-1 ring-inset ring-accent/30")}>
                    <td>
                      <input type="checkbox" checked={selected.has(i)} onChange={() => toggleSelect(i)}
                        className="accent-accent" />
                    </td>
                    <td className="font-mono text-xs text-on-surface-variant">{line.item_number}</td>
                    <td className="font-medium text-on-surface">{line.description}</td>
                    <td className="text-on-surface-variant">{line.unit}</td>
                    <td className="num">{line.quantity.toFixed(3)}</td>
                    <td className="num">{line.rate.toLocaleString()}</td>
                    <td className="num font-semibold">{line.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} className="text-right font-bold text-on-surface uppercase text-xs tracking-wide">
                    Total Carried to Summary
                  </td>
                  <td className="num text-accent font-bold text-base">
                    {formatCurrency(boq.total_amount, boq.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="card text-center py-16 text-on-surface-variant">
            <RefreshCw size={32} className="mx-auto mb-3 text-outline" />
            <p className="font-medium">Click &quot;Generate BOQ&quot; to calculate your Bill of Quantities.</p>
            <p className="text-sm mt-1">Make sure you have take-off items and rates configured.</p>
          </div>
        )}
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="sticky bottom-0 bg-primary text-white px-6 py-3 flex items-center gap-4">
          <span className="text-accent font-bold text-sm">ℹ ITEM SELECTION ACTIVE</span>
          <span className="text-sm text-white/80 flex-1">
            Selected: <strong>{selected.size} Items</strong> | Subtotal: <strong className="text-accent">{formatCurrency(selectedSubtotal, boq?.currency ?? "ETB")}</strong>
          </span>
          <button onClick={() => setSelected(new Set())} className="btn-ghost text-white/70 hover:text-white text-sm">Clear</button>
          <button className="btn-primary text-sm">Move to Superstructure</button>
        </div>
      )}
    </div>
  );
}
