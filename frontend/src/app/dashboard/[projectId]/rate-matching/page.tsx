"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  Zap,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ElementRateMatch {
  id: string;
  project_id: string;
  project_element_id: string;
  rate_item_id: string | null;
  match_confidence: number;
  match_reason: string | null;
  status: string;
  applied_direct_cost: number | null;
  applied_final_rate: number | null;
  override_reason: string | null;
  created_at: string;
}

interface ProjectElement {
  id: string;
  element_code: string;
  element_type: string;
  discipline: string;
  section: string;
  material: string | null;
}

interface RateItem {
  id: string;
  description: string;
  unit: string;
  direct_cost: number;
  work_category: string | null;
}

interface EnrichedMatch extends ElementRateMatch {
  element?: ProjectElement;
  rateItem?: RateItem;
  quantity: number;
  amount: number;
}

interface PricingSettings {
  overhead_percent: number;
  profit_percent: number;
  tax_percent: number;
  pricing_mode: string;
}

type FilterTab = "ALL" | "SUGGESTED" | "APPROVED" | "REJECTED" | "MANUAL";

const FILTER_TABS: FilterTab[] = ["ALL", "SUGGESTED", "APPROVED", "REJECTED", "MANUAL"];

// ── Confidence Badge ──────────────────────────────────────────────────────────

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  if (value >= 0.85) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <CheckCircle2 size={11} />
        {pct}%
      </span>
    );
  }
  if (value >= 0.6) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
        <Clock size={11} />
        {pct}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
      <AlertTriangle size={11} />
      {pct}%
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RateMatchingPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [running, setRunning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [autoMatchResult, setAutoMatchResult] = useState<{
    matched: number;
    total_elements: number;
    unmatched: number;
  } | null>(null);

  useEffect(() => {
    loadAll();
  }, [projectId]);

  async function loadAll() {
    const [matchesRes, settingsRes] = await Promise.all([
      api.get<ElementRateMatch[]>(`/projects/${projectId}/rate-matches`),
      api.get<PricingSettings>(`/projects/${projectId}/pricing-settings`),
    ]);
    setPricingSettings(settingsRes.data);

    // Enrich matches with element + rate item data
    const enriched = await enrichMatches(matchesRes.data);
    setMatches(enriched);
  }

  async function enrichMatches(rawMatches: ElementRateMatch[]): Promise<EnrichedMatch[]> {
    if (rawMatches.length === 0) return [];

    // Load elements
    const elemRes = await api.get<ProjectElement[]>(`/projects/${projectId}/elements`);
    const elemMap: Record<string, ProjectElement> = {};
    for (const e of elemRes.data) elemMap[e.id] = e;

    // Load rate items for matched ones
    const rateItemIds = [...new Set(rawMatches.map((m) => m.rate_item_id).filter(Boolean))];
    const rateItemMap: Record<string, RateItem> = {};
    if (rateItemIds.length > 0) {
      // Fetch in batches via search (simplified: fetch all and filter)
      try {
        const riRes = await api.get<RateItem[]>("/rates/items?limit=500");
        for (const ri of riRes.data) rateItemMap[ri.id] = ri;
      } catch {
        // ignore
      }
    }

    return rawMatches.map((m) => ({
      ...m,
      element: elemMap[m.project_element_id],
      rateItem: m.rate_item_id ? rateItemMap[m.rate_item_id] : undefined,
      quantity: 1.0, // placeholder — real quantity from measurements
      amount: m.applied_final_rate ?? 0,
    }));
  }

  async function handleAutoMatch() {
    setRunning(true);
    setAutoMatchResult(null);
    try {
      const { data } = await api.post(`/projects/${projectId}/rates/auto-match`, {});
      setAutoMatchResult(data);
      await loadAll();
    } finally {
      setRunning(false);
    }
  }

  async function handleApprove(matchId: string) {
    await api.patch(`/projects/${projectId}/rate-matches/${matchId}/approve`, {});
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, status: "APPROVED" } : m))
    );
  }

  async function handleReject(matchId: string) {
    await api.patch(`/projects/${projectId}/rate-matches/${matchId}/reject`, {});
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, status: "REJECTED" } : m))
    );
  }

  async function handleGenerateBOQ() {
    setGenerating(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/boq/generate-v2`, {});
      // Show summary alert
      const total = data.grand_total?.toLocaleString() ?? "0";
      const warnings = data.warnings?.length ?? 0;
      alert(
        `BOQ v2 generated!\nGrand Total: ${total} ETB\n${
          warnings > 0 ? `⚠ ${warnings} element(s) without rate match` : "All elements matched"
        }`
      );
    } finally {
      setGenerating(false);
    }
  }

  const filtered =
    activeTab === "ALL" ? matches : matches.filter((m) => m.status === activeTab);

  const stats = {
    total: matches.length,
    approved: matches.filter((m) => m.status === "APPROVED" || m.status === "MANUAL").length,
    suggested: matches.filter((m) => m.status === "SUGGESTED").length,
    rejected: matches.filter((m) => m.status === "REJECTED").length,
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-title-sm text-on-surface">Rate Matching</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Match project elements to government rate library items.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleAutoMatch}
            disabled={running}
            className="btn-primary flex items-center gap-2"
          >
            <Zap size={15} className={running ? "animate-pulse" : ""} />
            {running ? "Matching…" : "Run Auto-Match"}
          </button>
          <button
            onClick={handleGenerateBOQ}
            disabled={generating || stats.approved === 0}
            className="btn-secondary flex items-center gap-2 disabled:opacity-40"
          >
            <FileSpreadsheet size={15} />
            {generating ? "Generating…" : "Generate BOQ v2"}
          </button>
        </div>
      </div>

      {/* Auto-match result banner */}
      {autoMatchResult && (
        <div className="rounded-lg p-4 bg-green-50 border border-green-200 text-sm text-green-800">
          <p className="font-semibold">Auto-match complete</p>
          <p>
            {autoMatchResult.matched} of {autoMatchResult.total_elements} elements matched
            {autoMatchResult.unmatched > 0 && ` · ${autoMatchResult.unmatched} unmatched`}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Matches", value: stats.total, color: "text-on-surface" },
          { label: "Approved", value: stats.approved, color: "text-green-600" },
          { label: "Need Review", value: stats.suggested, color: "text-yellow-600" },
          { label: "Rejected", value: stats.rejected, color: "text-red-600" },
        ].map((stat) => (
          <div key={stat.label} className="card text-center py-4">
            <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
            <p className="text-xs text-on-surface-variant mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-semibold transition-colors",
              activeTab === tab
                ? "bg-accent text-white"
                : "bg-surface-variant text-on-surface-variant hover:text-on-surface"
            )}
          >
            {tab === "ALL" ? `All (${matches.length})` : tab}
          </button>
        ))}
      </div>

      {/* Matches table */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16 text-on-surface-variant">
          <Zap size={32} className="mx-auto mb-3 text-outline" />
          <p className="font-medium">No matches yet.</p>
          <p className="text-sm mt-1">
            Click &quot;Run Auto-Match&quot; to automatically match elements to rate items.
          </p>
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Element</th>
                <th>Matched Rate</th>
                <th>Confidence</th>
                <th className="num">Direct Cost</th>
                <th className="num">Final Rate</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((match) => (
                <tr key={match.id}>
                  <td>
                    <div className="font-medium text-on-surface">
                      {match.element?.element_code ?? match.project_element_id.slice(0, 8)}
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {match.element?.element_type}
                      {match.element?.section ? ` · ${match.element.section}` : ""}
                    </div>
                  </td>
                  <td>
                    {match.rateItem ? (
                      <>
                        <div className="font-medium text-on-surface text-sm line-clamp-2">
                          {match.rateItem.description}
                        </div>
                        <div className="text-xs text-on-surface-variant">
                          {match.rateItem.unit}
                          {match.rateItem.work_category
                            ? ` · ${match.rateItem.work_category}`
                            : ""}
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-on-surface-variant italic">
                        {match.match_reason ?? "No rate item"}
                      </span>
                    )}
                  </td>
                  <td>
                    <ConfidenceBadge value={match.match_confidence} />
                    {match.match_reason && (
                      <div className="text-xs text-on-surface-variant mt-0.5">
                        {match.match_reason}
                      </div>
                    )}
                  </td>
                  <td className="num text-on-surface">
                    {match.applied_direct_cost != null
                      ? match.applied_direct_cost.toLocaleString()
                      : "—"}
                  </td>
                  <td className="num font-semibold text-accent">
                    {match.applied_final_rate != null
                      ? formatCurrency(match.applied_final_rate, "ETB")
                      : "—"}
                  </td>
                  <td>
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded-full text-xs font-semibold",
                        match.status === "APPROVED" || match.status === "MANUAL"
                          ? "bg-green-100 text-green-700"
                          : match.status === "SUGGESTED"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {match.status}
                    </span>
                  </td>
                  <td>
                    {match.status === "SUGGESTED" && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleApprove(match.id)}
                          className="btn-ghost p-1.5 text-green-600"
                          title="Approve"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => handleReject(match.id)}
                          className="btn-ghost p-1.5 text-red-500"
                          title="Reject"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    {match.status === "APPROVED" && (
                      <button
                        onClick={() => handleReject(match.id)}
                        className="btn-ghost p-1.5 text-on-surface-variant"
                        title="Reject"
                      >
                        <X size={14} />
                      </button>
                    )}
                    {match.status === "REJECTED" && (
                      <button
                        onClick={() => handleApprove(match.id)}
                        className="btn-ghost p-1.5 text-green-600"
                        title="Re-approve"
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pricing settings summary */}
      {pricingSettings && (
        <div className="card bg-surface-variant text-sm">
          <p className="font-semibold text-on-surface mb-2">Active Pricing Settings</p>
          <div className="flex flex-wrap gap-4 text-on-surface-variant">
            <span>
              Mode: <span className="font-semibold text-on-surface">{pricingSettings.pricing_mode}</span>
            </span>
            <span>
              Overhead: <span className="font-semibold text-on-surface">{pricingSettings.overhead_percent}%</span>
            </span>
            <span>
              Profit: <span className="font-semibold text-on-surface">{pricingSettings.profit_percent}%</span>
            </span>
            <span>
              Tax: <span className="font-semibold text-on-surface">{pricingSettings.tax_percent}%</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
