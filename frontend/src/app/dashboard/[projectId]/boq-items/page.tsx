"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { ClipboardList, RefreshCw, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function BOQItemsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    const { data } = await api.get(`/projects/${projectId}/boq-v2/items`);
    setItems(data);
  }

  useEffect(() => { load(); }, [projectId]);

  async function generate() {
    setLoading(true);
    await api.post(`/projects/${projectId}/boq-v2/generate-from-approved`);
    await load();
    setLoading(false);
  }

  const total = items.reduce((sum, it) => sum + it.amount, 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title-sm text-on-surface flex items-center gap-2">
            <ClipboardList size={20} /> Bill of Quantities (Items)
          </h2>
          <p className="text-sm text-on-surface-variant">Manage final BOQ items linked to drawing measurements.</p>
        </div>
        <button onClick={generate} disabled={loading} className="btn-primary flex items-center gap-2">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Generate from Approved
        </button>
      </div>

      <div className="panel overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Unit</th>
              <th className="num">Quantity</th>
              <th className="num">Rate</th>
              <th className="num">Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="font-medium text-on-surface">{item.description}</td>
                <td className="text-on-surface-variant">{item.unit}</td>
                <td className="num">{item.quantity.toFixed(3)}</td>
                <td className="num">{item.rate.toFixed(2)}</td>
                <td className="num font-bold">{item.amount.toFixed(2)}</td>
                <td>
                   <button className="btn-ghost p-1 text-primary" title="Traceability">
                      <Info size={14} />
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="text-right font-bold uppercase text-xs">Total Amount</td>
              <td className="num font-bold text-accent text-base">{formatCurrency(total, "ETB")}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
        {items.length === 0 && (
          <div className="text-center py-20 text-on-surface-variant italic">No BOQ items yet.</div>
        )}
      </div>
    </div>
  );
}
