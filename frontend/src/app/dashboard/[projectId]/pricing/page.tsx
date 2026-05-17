"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Settings2, Info, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RateSource {
  id: string;
  title: string;
  region: string | null;
  fiscal_year: string | null;
  cost_type: string;
  is_active: boolean;
  item_count: number;
}

interface PricingSettings {
  id: string;
  project_id: string;
  selected_rate_source_id: string | null;
  contractor_grade: string | null;
  overhead_percent: number;
  profit_percent: number;
  tax_percent: number;
  pricing_mode: string;
}

interface PricingDefaults {
  suggested_overhead_percent: number;
  suggested_profit_percent: number;
  formula_preview: string;
}

const GRADES = ["GRADE_1", "GRADE_2", "GRADE_3", "GRADE_4", "GRADE_5", "GRADE_6"];
const GRADE_LABELS: Record<string, string> = {
  GRADE_1: "Grade 1 (Large)",
  GRADE_2: "Grade 2",
  GRADE_3: "Grade 3",
  GRADE_4: "Grade 4",
  GRADE_5: "Grade 5",
  GRADE_6: "Grade 6 (Small)",
};

const PRICING_MODES = [
  {
    value: "DIRECT_COST_ONLY",
    label: "Direct Cost Only",
    formula: "Final Rate = Direct Cost",
  },
  {
    value: "ADDITIVE",
    label: "Additive",
    formula: "Final Rate = Direct Cost × (1 + Overhead% + Profit%)",
  },
  {
    value: "COMPOUNDED",
    label: "Compounded",
    formula: "Final Rate = Direct Cost × (1 + Overhead%) × (1 + Profit%)",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [settings, setSettings] = useState<PricingSettings | null>(null);
  const [sources, setSources] = useState<RateSource[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [estimatedValue, setEstimatedValue] = useState("");
  const [defaults, setDefaults] = useState<PricingDefaults | null>(null);

  // Form state (mirrors settings)
  const [form, setForm] = useState({
    selected_rate_source_id: "" as string,
    contractor_grade: "" as string,
    overhead_percent: "8.0",
    profit_percent: "10.0",
    tax_percent: "0.0",
    pricing_mode: "ADDITIVE",
  });

  useEffect(() => {
    loadAll();
  }, [projectId]);

  async function loadAll() {
    const [settingsRes, sourcesRes] = await Promise.all([
      api.get<PricingSettings>(`/projects/${projectId}/pricing-settings`),
      api.get<RateSource[]>("/rates/sources?is_active=true"),
    ]);
    const s = settingsRes.data;
    setSettings(s);
    setSources(sourcesRes.data);
    setForm({
      selected_rate_source_id: s.selected_rate_source_id ?? "",
      contractor_grade: s.contractor_grade ?? "",
      overhead_percent: String(s.overhead_percent),
      profit_percent: String(s.profit_percent),
      tax_percent: String(s.tax_percent),
      pricing_mode: s.pricing_mode,
    });
  }

  async function fetchDefaults() {
    const params = new URLSearchParams();
    if (form.contractor_grade) params.set("contractor_grade", form.contractor_grade);
    if (estimatedValue) params.set("estimated_value", estimatedValue);
    const { data } = await api.get<PricingDefaults>(
      `/projects/${projectId}/pricing-settings/defaults?${params}`
    );
    setDefaults(data);
    setForm((f) => ({
      ...f,
      overhead_percent: String(data.suggested_overhead_percent),
      profit_percent: String(data.suggested_profit_percent),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await api.patch(`/projects/${projectId}/pricing-settings`, {
        selected_rate_source_id: form.selected_rate_source_id || null,
        contractor_grade: form.contractor_grade || null,
        overhead_percent: parseFloat(form.overhead_percent) || 8.0,
        profit_percent: parseFloat(form.profit_percent) || 10.0,
        tax_percent: parseFloat(form.tax_percent) || 0.0,
        pricing_mode: form.pricing_mode,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  // Compute example final rate
  const exampleDirect = 14200;
  const overhead = parseFloat(form.overhead_percent) / 100 || 0;
  const profit = parseFloat(form.profit_percent) / 100 || 0;
  const tax = parseFloat(form.tax_percent) / 100 || 0;
  let exampleFinal = exampleDirect;
  if (form.pricing_mode === "ADDITIVE") {
    exampleFinal = exampleDirect * (1 + overhead + profit) * (1 + tax);
  } else if (form.pricing_mode === "COMPOUNDED") {
    exampleFinal = exampleDirect * (1 + overhead) * (1 + profit) * (1 + tax);
  }
  exampleFinal = Math.round(exampleFinal * 100) / 100;

  const activeMode = PRICING_MODES.find((m) => m.value === form.pricing_mode);

  return (
    <div className="p-6 max-w-3xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-orange-50 text-accent">
          <Settings2 size={20} />
        </div>
        <div>
          <h2 className="text-title-sm text-on-surface">Pricing Settings</h2>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Configure overhead, profit, and tax for BOQ rate calculations.
          </p>
        </div>
      </div>

      {/* Rate Source */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-on-surface">Government Rate Source</h3>
        <div>
          <label className="block text-label-caps text-on-surface-variant mb-1">
            Rate Source
          </label>
          <select
            className="input w-full"
            value={form.selected_rate_source_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, selected_rate_source_id: e.target.value }))
            }
          >
            <option value="">— None selected (use all sources) —</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
                {s.region ? ` · ${s.region}` : ""}
                {s.fiscal_year ? ` · ${s.fiscal_year}` : ""}
                {` (${s.item_count} items)`}
              </option>
            ))}
          </select>
          <p className="text-xs text-on-surface-variant mt-1">
            Selecting a source restricts rate matching to that source only.
          </p>
        </div>
      </div>

      {/* Contractor Grade + Defaults */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-on-surface">Contractor Grade & Defaults</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-label-caps text-on-surface-variant mb-1">
              Contractor Grade
            </label>
            <select
              className="input w-full"
              value={form.contractor_grade}
              onChange={(e) =>
                setForm((f) => ({ ...f, contractor_grade: e.target.value }))
              }
            >
              <option value="">— Not specified —</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {GRADE_LABELS[g]}
                </option>
              ))}
            </select>
            {form.contractor_grade && (
              <p className="text-xs text-on-surface-variant mt-1">
                Suggested overhead:{" "}
                <span className="font-semibold text-accent">
                  {form.contractor_grade.startsWith("GRADE_1") ||
                  form.contractor_grade.startsWith("GRADE_2") ||
                  form.contractor_grade.startsWith("GRADE_3")
                    ? "10%"
                    : form.contractor_grade.startsWith("GRADE_6")
                    ? "6%"
                    : "8%"}
                </span>
              </p>
            )}
          </div>
          <div>
            <label className="block text-label-caps text-on-surface-variant mb-1">
              Estimated Project Value (ETB)
            </label>
            <input
              type="number"
              className="input w-full"
              placeholder="e.g. 5000000"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
            />
            <p className="text-xs text-on-surface-variant mt-1">
              Used to suggest profit % per MoUDC guidelines.
            </p>
          </div>
        </div>
        <button
          onClick={fetchDefaults}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw size={14} />
          Apply Government Defaults
        </button>
        {defaults && (
          <div className="rounded-lg p-3 bg-orange-50 text-sm text-on-surface">
            <p className="font-semibold text-accent mb-1">Suggested defaults applied</p>
            <p>{defaults.formula_preview}</p>
          </div>
        )}
      </div>

      {/* Percentages */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-on-surface">Markup Percentages</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-label-caps text-on-surface-variant mb-1">
              Overhead %
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="100"
              className="input w-full"
              value={form.overhead_percent}
              onChange={(e) =>
                setForm((f) => ({ ...f, overhead_percent: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-label-caps text-on-surface-variant mb-1">
              Profit %
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="100"
              className="input w-full"
              value={form.profit_percent}
              onChange={(e) =>
                setForm((f) => ({ ...f, profit_percent: e.target.value }))
              }
            />
            <p className="text-xs text-on-surface-variant mt-1">
              Gov. defaults: 13% (&lt;5M), 11% (&lt;15M), 10% (&lt;50M), 7% (50M+)
            </p>
          </div>
          <div>
            <label className="block text-label-caps text-on-surface-variant mb-1">
              Tax %
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="100"
              className="input w-full"
              value={form.tax_percent}
              onChange={(e) =>
                setForm((f) => ({ ...f, tax_percent: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      {/* Pricing Mode */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-on-surface">Pricing Mode</h3>
        <div className="space-y-2">
          {PRICING_MODES.map((mode) => (
            <label
              key={mode.value}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                form.pricing_mode === mode.value
                  ? "border-accent bg-orange-50"
                  : "border-outline-variant hover:border-outline"
              )}
            >
              <input
                type="radio"
                name="pricing_mode"
                value={mode.value}
                checked={form.pricing_mode === mode.value}
                onChange={() => setForm((f) => ({ ...f, pricing_mode: mode.value }))}
                className="mt-0.5"
              />
              <div>
                <p className="font-semibold text-on-surface text-sm">{mode.label}</p>
                <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                  {mode.formula}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Live Example */}
      <div className="card bg-surface-variant">
        <div className="flex items-center gap-2 mb-3">
          <Info size={15} className="text-on-surface-variant" />
          <h3 className="font-semibold text-on-surface text-sm">Live Example</h3>
        </div>
        <div className="flex items-center gap-3 flex-wrap text-sm">
          <span className="text-on-surface-variant">Direct Cost:</span>
          <span className="font-semibold text-on-surface">
            {exampleDirect.toLocaleString()} ETB
          </span>
          <span className="text-on-surface-variant">→</span>
          <span className="text-on-surface-variant">Final Rate:</span>
          <span className="font-bold text-accent text-base">
            {exampleFinal.toLocaleString()} ETB
          </span>
        </div>
        {activeMode && (
          <p className="text-xs text-on-surface-variant mt-2 font-mono">
            {activeMode.formula
              .replace("Overhead%", `${form.overhead_percent}%`)
              .replace("Profit%", `${form.profit_percent}%`)}
          </p>
        )}
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "btn-primary min-w-32 transition-all",
            saved && "bg-green-600 hover:bg-green-700"
          )}
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
