"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { CheckCircle, XCircle, Edit2, RefreshCw, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "EDITED";

interface Suggestion {
  id: string;
  discipline: string;
  element_category: string;
  description: string;
  quantity_value: number;
  quantity_unit: string;
  section: string;
  source_layer: string | null;
  confidence: number;
  notes: string | null;
  status: Status;
}

const DISCIPLINE_COLORS: Record<string, string> = {
  ARCHITECTURAL: "bg-blue-100 text-blue-800",
  STRUCTURAL:    "bg-orange-100 text-orange-800",
  ELECTRICAL:    "bg-yellow-100 text-yellow-800",
  SANITARY:      "bg-green-100 text-green-800",
};

const CONFIDENCE_LABEL = (c: number) =>
  c >= 0.85 ? "High" : c >= 0.7 ? "Medium" : "Low";

const CONFIDENCE_COLOR = (c: number) =>
  c >= 0.85 ? "text-green-600" : c >= 0.7 ? "text-yellow-600" : "text-red-500";

export default function SuggestionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [filter, setFilter] = useState<Status>("PENDING");
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [editDesc, setEditDesc] = useState<string>("");

  async function load(status: Status = filter) {
    setLoading(true);
    const { data } = await api.get(`/projects/${projectId}/suggestions?status=${status}`);
    setSuggestions(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [projectId, filter]);

  async function review(id: string, status: "APPROVED" | "REJECTED" | "EDITED", overrides?: { quantity_value?: number; description?: string }) {
    await api.post(`/projects/${projectId}/suggestions/${id}/review`, {
      status,
      ...overrides,
    });
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
    setEditId(null);
  }

  async function approveAll() {
    for (const s of suggestions) {
      await api.post(`/projects/${projectId}/suggestions/${s.id}/review`, { status: "APPROVED" });
    }
    setSuggestions([]);
  }

  const pending = suggestions.filter((s) => s.status === "PENDING");

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Suggested Quantities</h1>
          <p className="text-sm text-gray-500 mt-1">
            Auto-extracted from uploaded drawings. Review each suggestion before it enters the BOQ.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["PENDING", "APPROVED", "REJECTED"] as Status[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                filter === s ? "bg-[#1F4E79] text-white" : "bg-white border text-gray-600 hover:bg-gray-50"
              )}
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk approve */}
      {filter === "PENDING" && pending.length > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-sm text-blue-800">
            <strong>{pending.length}</strong> pending suggestion{pending.length !== 1 ? "s" : ""} — review individually or approve all at once.
          </p>
          <button onClick={approveAll} className="btn-primary text-sm py-1.5 flex items-center gap-1">
            <CheckCircle size={14} /> Approve All
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw size={24} className="mx-auto animate-spin mb-2" />
          Loading…
        </div>
      ) : suggestions.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          {filter === "PENDING"
            ? "No pending suggestions. Upload a drawing to generate suggestions."
            : `No ${filter.toLowerCase()} suggestions.`}
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                {/* Left: info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", DISCIPLINE_COLORS[s.discipline] ?? "bg-gray-100 text-gray-700")}>
                      {s.discipline}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {s.element_category}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {s.section}
                    </span>
                    <span className={cn("text-xs font-medium", CONFIDENCE_COLOR(s.confidence))}>
                      {CONFIDENCE_LABEL(s.confidence)} confidence ({Math.round(s.confidence * 100)}%)
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{s.description}</p>
                  {s.source_layer && (
                    <p className="text-xs text-gray-400">Layer: {s.source_layer}</p>
                  )}
                </div>

                {/* Right: quantity + actions */}
                <div className="flex items-center gap-4">
                  {editId === s.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.001"
                        className="input w-24 py-1 text-sm"
                        value={editValue}
                        onChange={(e) => setEditValue(parseFloat(e.target.value))}
                      />
                      <span className="text-sm text-gray-500">{s.quantity_unit}</span>
                    </div>
                  ) : (
                    <div className="text-right">
                      <span className="text-lg font-bold text-[#1F4E79]">
                        {Number(s.quantity_value).toFixed(3)}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">{s.quantity_unit}</span>
                    </div>
                  )}

                  {filter === "PENDING" && (
                    <div className="flex items-center gap-1">
                      {editId === s.id ? (
                        <>
                          <button
                            onClick={() => review(s.id, "EDITED", { quantity_value: editValue, description: editDesc || s.description })}
                            className="text-green-600 hover:text-green-700 p-1"
                            title="Save edit"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 p-1" title="Cancel">
                            <XCircle size={18} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => review(s.id, "APPROVED")}
                            className="text-green-600 hover:text-green-700 p-1"
                            title="Approve"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => { setEditId(s.id); setEditValue(s.quantity_value); setEditDesc(s.description); }}
                            className="text-blue-500 hover:text-blue-700 p-1"
                            title="Edit value"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => review(s.id, "REJECTED")}
                            className="text-red-400 hover:text-red-600 p-1"
                            title="Reject"
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Edit description */}
              {editId === s.id && (
                <div className="mt-3">
                  <input
                    className="input text-sm"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Edit description…"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
