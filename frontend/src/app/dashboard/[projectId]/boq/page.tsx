"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { BOQResult, BOQLine } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { FileSpreadsheet, FileText, RefreshCw } from "lucide-react";

type SectionType = "COMBINED" | "SUBSTRUCTURE" | "SUPERSTRUCTURE";

export default function BOQPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [section, setSection] = useState<SectionType>("COMBINED");
  const [boq, setBoq] = useState<BOQResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const { data } = await api.post(`/projects/${projectId}/boq/generate?section=${section}`);
    setBoq(data);
    setLoading(false);
  }

  async function exportExcel() {
    const res = await api.post(`/projects/${projectId}/boq/export-excel?section=${section}`, {}, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a"); a.href = url; a.download = `BOQ.xlsx`; a.click();
  }

  async function exportPdf() {
    const res = await api.post(`/projects/${projectId}/boq/export-pdf?section=${section}`, {}, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a"); a.href = url; a.download = `BOQ.pdf`; a.click();
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-bold text-gray-900">Bill of Quantities</h1>
        <div className="flex gap-2 flex-wrap">
          {(["COMBINED", "SUBSTRUCTURE", "SUPERSTRUCTURE"] as SectionType[]).map((s) => (
            <button key={s} onClick={() => setSection(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${section === s ? "bg-[#1F4E79] text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button onClick={generate} disabled={loading} className="btn-primary flex items-center gap-2">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {loading ? "Generating…" : "Generate BOQ"}
        </button>
        {boq && (
          <>
            <button onClick={exportExcel} className="btn-secondary flex items-center gap-2"><FileSpreadsheet size={16} /> Export Excel</button>
            <button onClick={exportPdf} className="btn-secondary flex items-center gap-2"><FileText size={16} /> Export PDF</button>
          </>
        )}
      </div>

      {boq && (
        <div className="card overflow-x-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-800">BOQ — {boq.section}</h2>
            <span className="text-sm text-gray-500">{boq.lines.length} items</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1F4E79] text-white">
                {["#", "Description", "Unit", "Quantity", "Unit Rate (ETB)", "Amount (ETB)"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {boq.lines.map((line: BOQLine, i: number) => (
                <tr key={line.item_number} className={i % 2 === 0 ? "bg-white" : "bg-blue-50"}>
                  <td className="px-3 py-2 text-gray-500">{line.item_number}</td>
                  <td className="px-3 py-2 font-medium text-gray-800">{line.description}</td>
                  <td className="px-3 py-2 text-gray-500">{line.unit}</td>
                  <td className="px-3 py-2 text-right">{line.quantity.toFixed(3)}</td>
                  <td className="px-3 py-2 text-right">{line.rate.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-medium">{line.amount.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-[#1F4E79]/10 font-bold">
                <td colSpan={5} className="px-3 py-3 text-right text-gray-800">TOTAL</td>
                <td className="px-3 py-3 text-right text-[#1F4E79] text-base">{formatCurrency(boq.total_amount, boq.currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!boq && !loading && (
        <div className="card text-center py-12 text-gray-400">
          <p>Click &quot;Generate BOQ&quot; to calculate your Bill of Quantities from the take-off sheet.</p>
        </div>
      )}
    </div>
  );
}
