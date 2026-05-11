"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import { api } from "@/lib/api";
import { CheckCircle, XCircle, Edit2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "EDITED";

interface Suggestion {
  id: string; discipline: string; element_category: string; description: string;
  quantity_value: number; quantity_unit: string; section: string;
  source_layer: string | null; confidence: number; notes: string | null; status: Status;
}

const DISC_CHIP: Record<string, string> = {
  ARCHITECTURAL: "bg-blue-100 text-blue-800",
  STRUCTURAL:    "bg-orange-100 text-orange-800",
  ELECTRICAL:    "bg-yellow-100 text-yellow-800",
  SANITARY:      "bg-green-100 text-green-800",
};

export default function SuggestionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { current, fetchProject } = useProjectStore();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [filter, setFilter]           = useState<Status>("PENDING");
  const [loading, setLoading]         = useState(false);
  const [editId, setEditId]           = useState<string | null>(null);
  const [editValue, setEditValue]     = useState(0);
  const [editDesc, setEditDesc]       = useState("");

  useEffect(() => { fetchProject(projectId); }, [projectId, fetchProject]);

  async function load(status: Status = filter) {
    setLoading(true);
    const { data } = await api.get(`/projects/${projectId}/suggestions?status=${status}`);
    setSuggestions(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, [projectId, filter]);

  async function review(id: string, status: "APPROVED" | "REJECTED" | "EDITED", overrides?: object) {
    await api.post(`/projects/${projectId}/suggestions/${id}/review`, { status, ...overrides });
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
    setEditId(null);
  }

  async function approveAll() {
    for (const s of suggestions) {
      await api.post(`/projects/${projectId}/suggestions/${s.id}/review`, { status: "APPROVED" });
    }
    setSuggestions([]);
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto w-full">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-title-sm text-on-surface">Suggested Quantities</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Auto-extracted from uploaded drawings. Review each suggestion before it enters the BOQ.
            </p>
          </div>
          <div className="flex gap-2">
            {(["PENDING", "APPROVED", "REJECTED"] as Status[]).map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className={cn("section-tab", filter === s ? "active" : "inactive")}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {filter === "PENDING" && suggestions.length > 0 && (
          <div className="flex items-center justify-between bg-secondary-container border border-secondary/20 rounded-xl px-4 py-3">
            <p className="text-sm text-on-surface">
              <strong>{suggestions.length}</strong> pending suggestion{suggestions.length !== 1 ? "s" : ""} — review individually or approve all.
            </p>
            <button onClick={approveAll} className="btn-primary text-sm flex items-center gap-1.5">
              <CheckCircle size={14} /> Approve All
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-on-surface-variant">
            <RefreshCw size={24} className="mx-auto animate-spin mb-2" /> Loading…
          </div>
        ) : suggestions.length === 0 ? (
          <div className="card text-center py-16 text-on-surface-variant">
            {filter === "PENDING"
              ? "No pending suggestions. Upload a drawing to generate suggestions."
              : `No ${filter.toLowerCase()} suggestions.`}
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s) => (
              <div key={s.id} className="card">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("chip text-xs", DISC_CHIP[s.discipline] ?? "bg-surface-highest text-on-surface-variant")}>
                        {s.discipline}
                      </span>
                      <span className="chip chip-draft">{s.element_category}</span>
                      <span className="chip chip-draft">{s.section}</span>
                      <span className={cn("text-xs font-semibold",
                        s.confidence >= 0.85 ? "text-green-600" : s.confidence >= 0.7 ? "text-yellow-600" : "text-error")}>
                        {s.confidence >= 0.85 ? "High" : s.confidence >= 0.7 ? "Medium" : "Low"} confidence ({Math.round(s.confidence * 100)}%)
                      </span>
                    </div>
                    <p className="font-medium text-on-surface">{s.description}</p>
                    {s.source_layer && <p className="text-xs text-on-surface-variant">Layer: {s.source_layer}</p>}
                  </div>

                  <div className="flex items-center gap-4">
                    {editId === s.id ? (
                      <div className="flex items-center gap-2">
                        <input type="number" step="0.001" className="input w-24 py-1 text-sm text-right"
                          value={editValue} onChange={(e) => setEditValue(parseFloat(e.target.value))} />
                        <span className="text-sm text-on-surface-variant">{s.quantity_unit}</span>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="text-xl font-bold text-primary">{Number(s.quantity_value).toFixed(3)}</span>
                        <span className="text-sm text-on-surface-variant ml-1">{s.quantity_unit}</span>
                      </div>
                    )}

                    {filter === "PENDING" && (
                      <div className="flex items-center gap-1">
                        {editId === s.id ? (
                          <>
                            <button onClick={() => review(s.id, "EDITED", { quantity_value: editValue, description: editDesc || s.description })}
                              className="text-green-600 hover:text-green-700 p-1.5" title="Save">
                              <CheckCircle size={18} />
                            </button>
                            <button onClick={() => setEditId(null)} className="text-outline hover:text-on-surface p-1.5" title="Cancel">
                              <XCircle size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => review(s.id, "APPROVED")}
                              className="text-green-600 hover:text-green-700 p-1.5" title="Approve">
                              <CheckCircle size={18} />
                            </button>
                            <button onClick={() => { setEditId(s.id); setEditValue(s.quantity_value); setEditDesc(s.description); }}
                              className="text-primary hover:text-accent p-1.5" title="Edit">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => review(s.id, "REJECTED")}
                              className="text-error hover:text-red-700 p-1.5" title="Reject">
                              <XCircle size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {editId === s.id && (
                  <div className="mt-3">
                    <input className="input text-sm" value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)} placeholder="Edit description…" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
  );
}
