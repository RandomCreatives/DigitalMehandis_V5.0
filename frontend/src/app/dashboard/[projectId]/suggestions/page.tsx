"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  CheckCircle2, XCircle, Edit3,
  Layers, Package, Info,
  CheckSquare, Square
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Suggestion {
  id: string;
  discipline: string;
  task_label: string;
  source_layer?: string;
  source_block?: string;
  entity_count: number;
  raw_value: number;
  final_value: number;
  unit: string;
  confidence: number;
  status: string;
}

export default function SuggestionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(`/projects/${projectId}/suggestions?status=PENDING`);
      setSuggestions(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [projectId]);

  async function handleReview(id: string, status: 'APPROVED' | 'REJECTED') {
    await api.post(`/projects/${projectId}/suggestions/${id}/review`, { status });
    setSuggestions(s => s.filter(x => x.id !== id));
    setSelected(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
    });
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === suggestions.length) setSelected(new Set());
    else setSelected(new Set(suggestions.map(s => s.id)));
  }

  async function bulkApprove() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!confirm(`Approve ${ids.length} items?`)) return;

    for (const id of ids) {
      await api.post(`/projects/${projectId}/suggestions/${id}/review`, { status: 'APPROVED' });
    }
    load();
    setSelected(new Set());
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title-sm text-on-surface">Auto-Extracted Suggestions</h2>
          <p className="text-sm text-on-surface-variant">Review and approve quantities detected from CAD drawings.</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={bulkApprove} className="btn-primary py-2">
              Approve Selected ({selected.size})
            </button>
          )}
          <button onClick={load} className="btn-ghost text-xs">Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-surface-low rounded-xl" />)}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="card p-12 text-center space-y-3 border-dashed">
          <Package size={40} className="mx-auto text-outline" />
          <p className="text-on-surface font-medium">No pending suggestions</p>
          <p className="text-sm text-on-surface-variant">Upload a DXF drawing to see automated quantities here.</p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">
                  <button onClick={toggleAll}>
                    {selected.size === suggestions.length ? <CheckSquare size={16} className="text-accent" /> : <Square size={16} />}
                  </button>
                </th>
                <th>Element / Task</th>
                <th>Source</th>
                <th className="num">Raw Qty</th>
                <th className="num">Final Qty</th>
                <th>Confidence</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s) => (
                <tr key={s.id} className={cn(selected.has(s.id) && "bg-orange-50/50")}>
                  <td>
                    <button onClick={() => toggleSelect(s.id)}>
                      {selected.has(s.id) ? <CheckSquare size={16} className="text-accent" /> : <Square size={16} />}
                    </button>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-on-surface flex items-center gap-1.5">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          s.discipline === 'ARCHITECTURAL' ? 'bg-blue-400' :
                          s.discipline === 'STRUCTURAL' ? 'bg-red-400' : 'bg-green-400'
                        )} />
                        {s.task_label}
                      </span>
                      <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">{s.discipline}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="text-sm text-on-surface">{s.source_layer || s.source_block}</span>
                      <span className="text-xs text-on-surface-variant">{s.entity_count} entities</span>
                    </div>
                  </td>
                  <td className="num font-mono">{s.raw_value.toFixed(2)}</td>
                  <td className="num font-mono font-bold text-accent">{s.final_value.toFixed(2)} {s.unit}</td>
                  <td>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      s.confidence > 0.8 ? "bg-green-100 text-green-700" :
                      s.confidence > 0.5 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                    )}>
                      {(s.confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleReview(s.id, 'APPROVED')} className="btn-ghost p-1.5 text-green-600 hover:bg-green-50">
                        <CheckCircle2 size={18} />
                      </button>
                      <button onClick={() => handleReview(s.id, 'REJECTED')} className="btn-ghost p-1.5 text-error hover:bg-red-50">
                        <XCircle size={18} />
                      </button>
                      <button className="btn-ghost p-1.5 text-on-surface-variant">
                        <Edit3 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
