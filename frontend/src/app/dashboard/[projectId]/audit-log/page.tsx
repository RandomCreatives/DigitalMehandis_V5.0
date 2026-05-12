"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import { api } from "@/lib/api";
import {
  Upload,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Ruler,
  SlidersHorizontal,
  BarChart3,
  Pencil,
  Plus,
  Activity,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  project_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  created_at: string;
}

// ── Action metadata ───────────────────────────────────────────────────────────

type ActionCategory = "upload" | "approval" | "rejection" | "export" | "measurement" | "element" | "boq" | "other";

interface ActionMeta {
  category: ActionCategory;
  label: string;
  icon: React.ElementType;
}

const ACTION_META: Record<string, ActionMeta> = {
  DRAWING_UPLOADED: { category: "upload", label: "Drawing Uploaded", icon: Upload },
  DRAWING_CALIBRATED: { category: "measurement", label: "Drawing Calibrated", icon: SlidersHorizontal },
  MEASUREMENT_CREATED: { category: "measurement", label: "Measurement Created", icon: Ruler },
  QUANTITY_APPROVED: { category: "approval", label: "Quantity Approved", icon: CheckCircle2 },
  QUANTITY_REJECTED: { category: "rejection", label: "Quantity Rejected", icon: XCircle },
  QUANTITY_CREATED_FROM_MEASUREMENT: { category: "measurement", label: "Quantity from Measurement", icon: Ruler },
  BOQ_GENERATED: { category: "boq", label: "BOQ Generated", icon: BarChart3 },
  BOQ_ITEM_CREATED: { category: "boq", label: "BOQ Item Created", icon: Plus },
  RATE_CHANGED: { category: "boq", label: "Rate Changed", icon: Pencil },
  BBS_ITEM_CREATED: { category: "boq", label: "BBS Item Created", icon: BarChart3 },
  EXPORT_GENERATED: { category: "export", label: "Export Generated", icon: FileSpreadsheet },
  ELEMENT_CREATED: { category: "element", label: "Element Created", icon: Plus },
  ELEMENT_LINKED: { category: "element", label: "Element Linked", icon: Plus },
};

const CATEGORY_COLORS: Record<ActionCategory, { bg: string; text: string; border: string; dot: string }> = {
  upload:      { bg: "rgba(59,130,246,0.08)",  text: "#1d4ed8", border: "rgba(59,130,246,0.25)",  dot: "#3b82f6" },
  approval:    { bg: "rgba(34,197,94,0.08)",   text: "#15803d", border: "rgba(34,197,94,0.25)",   dot: "#22c55e" },
  rejection:   { bg: "rgba(239,68,68,0.08)",   text: "#b91c1c", border: "rgba(239,68,68,0.25)",   dot: "#ef4444" },
  export:      { bg: "rgba(249,115,22,0.08)",  text: "#c2410c", border: "rgba(249,115,22,0.25)",  dot: "#f97316" },
  measurement: { bg: "rgba(168,85,247,0.08)",  text: "#7e22ce", border: "rgba(168,85,247,0.25)",  dot: "#a855f7" },
  element:     { bg: "rgba(20,184,166,0.08)",  text: "#0f766e", border: "rgba(20,184,166,0.25)",  dot: "#14b8a6" },
  boq:         { bg: "rgba(234,179,8,0.08)",   text: "#a16207", border: "rgba(234,179,8,0.25)",   dot: "#eab308" },
  other:       { bg: "rgba(107,114,128,0.08)", text: "#374151", border: "rgba(107,114,128,0.25)", dot: "#6b7280" },
};

function getMeta(action: string): ActionMeta {
  return ACTION_META[action] ?? { category: "other", label: action.replace(/_/g, " "), icon: Activity };
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

// ── Filter options ────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "DRAWING_UPLOADED", label: "Uploads" },
  { value: "DRAWING_CALIBRATED", label: "Calibrations" },
  { value: "MEASUREMENT_CREATED", label: "Measurements" },
  { value: "QUANTITY_APPROVED", label: "Approvals" },
  { value: "QUANTITY_REJECTED", label: "Rejections" },
  { value: "BOQ_GENERATED", label: "BOQ Generated" },
  { value: "BOQ_ITEM_CREATED", label: "BOQ Items" },
  { value: "EXPORT_GENERATED", label: "Exports" },
  { value: "ELEMENT_CREATED", label: "Elements" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { fetchProject } = useProjectStore();

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    fetchProject(projectId);
  }, [projectId]);

  useEffect(() => {
    loadLog();
  }, [projectId, actionFilter, limit]);

  async function loadLog() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (actionFilter) params.set("action", actionFilter);
      const { data } = await api.get<AuditLogEntry[]>(
        `/projects/${projectId}/audit-log?${params.toString()}`
      );
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }

  // Group entries by date
  const grouped: { date: string; entries: AuditLogEntry[] }[] = [];
  const seenDates = new Set<string>();
  for (const entry of entries) {
    const date = new Date(entry.created_at).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!seenDates.has(date)) {
      seenDates.add(date);
      grouped.push({ date, entries: [] });
    }
    grouped[grouped.length - 1].entries.push(entry);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 overflow-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-title-sm text-on-surface">Audit Log</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Professional accountability trail — every QS action recorded.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-on-surface-variant" />
          <select
            className="input text-sm"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            aria-label="Filter by action"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="text-sm text-on-surface-variant animate-pulse py-8 text-center">
          Loading audit log…
        </div>
      ) : entries.length === 0 ? (
        <div className="card text-center py-16 text-on-surface-variant">
          <Activity size={32} className="mx-auto mb-3 text-outline" />
          <p className="font-medium">No audit events yet.</p>
          <p className="text-sm mt-1">Actions will appear here as you work on the project.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1" style={{ background: "var(--outline-variant)" }} />
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide whitespace-nowrap">
                  {group.date}
                </span>
                <div className="h-px flex-1" style={{ background: "var(--outline-variant)" }} />
              </div>

              {/* Events */}
              <div className="relative space-y-3 pl-6">
                {/* Vertical timeline line */}
                <div
                  className="absolute left-2 top-2 bottom-2 w-px"
                  style={{ background: "var(--outline-variant)" }}
                />

                {group.entries.map((entry) => {
                  const meta = getMeta(entry.action);
                  const colors = CATEGORY_COLORS[meta.category];
                  const Icon = meta.icon;

                  return (
                    <div key={entry.id} className="relative flex gap-4">
                      {/* Timeline dot */}
                      <div
                        className="absolute -left-4 top-3 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{
                          background: colors.bg,
                          borderColor: colors.dot,
                        }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: colors.dot }}
                        />
                      </div>

                      {/* Event card */}
                      <div
                        className="flex-1 rounded-xl p-4 border"
                        style={{
                          background: colors.bg,
                          borderColor: colors.border,
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: colors.dot + "22" }}
                            >
                              <Icon size={14} style={{ color: colors.dot }} />
                            </div>
                            <div className="min-w-0">
                              <p
                                className="text-sm font-semibold"
                                style={{ color: colors.text }}
                              >
                                {meta.label}
                              </p>
                              {entry.entity_type && (
                                <p className="text-xs text-on-surface-variant">
                                  {entry.entity_type}
                                  {entry.entity_id && (
                                    <span className="font-mono ml-1 opacity-60">
                                      {entry.entity_id.slice(0, 8)}…
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-on-surface-variant whitespace-nowrap shrink-0">
                            {formatRelativeTime(entry.created_at)}
                          </span>
                        </div>

                        {entry.description && (
                          <p className="text-sm text-on-surface mt-2 leading-relaxed">
                            {entry.description}
                          </p>
                        )}

                        {entry.user_id && (
                          <p className="text-xs text-on-surface-variant mt-2 font-mono">
                            User: {entry.user_id.slice(0, 8)}…
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Load more */}
          {entries.length >= limit && (
            <div className="text-center">
              <button
                onClick={() => setLimit((l) => l + 50)}
                className="btn-secondary text-sm"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
