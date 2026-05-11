"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useTheme } from "@/components/ThemeProvider";

const ROLES = ["STUDENT", "QS_PROFESSIONAL", "CONTRACTOR"];

export default function RegisterPage() {
  const router   = useRouter();
  const register = useAuthStore((s) => s.register);
  const login    = useAuthStore((s) => s.login);
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [form, setForm] = useState({ email: "", password: "", full_name: "", organization: "", role: "STUDENT" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const glassBg  = dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.85)";
  const glassBdr = dark ? "rgba(255,255,255,0.10)" : "rgba(9,20,38,0.12)";
  const textPri  = dark ? "#ffffff"                : "#091426";
  const textMuted= dark ? "rgba(255,255,255,0.55)" : "rgba(9,20,38,0.60)";
  const textFaint= dark ? "rgba(255,255,255,0.35)" : "rgba(9,20,38,0.40)";
  const inputBg  = dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.95)";
  const inputBdr = dark ? "rgba(255,255,255,0.12)" : "rgba(9,20,38,0.15)";
  const inputTxt = dark ? "rgba(255,255,255,0.85)" : "#091426";

  function update(field: string, value: string) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await register(form);
      await login(form.email, form.password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      if (typeof detail === "string") setError(detail);
      else if (Array.isArray(detail)) setError(detail.map((e: { msg?: string }) => e.msg ?? String(e)).join(", "));
      else setError("Registration failed. Please try again.");
    } finally { setLoading(false); }
  }

  const inputStyle = { background: inputBg, border: `1px solid ${inputBdr}`, color: inputTxt };
  const labelStyle = { color: textFaint };

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border p-8 space-y-6"
        style={{ background: glassBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderColor: glassBdr, boxShadow: dark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(9,20,38,0.10)" }}>

        <div>
          <h2 className="text-2xl font-bold" style={{ color: textPri }}>Create Account</h2>
          <p className="text-sm mt-1" style={{ color: textMuted }}>Join EthioQS — it&apos;s free</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: "Full Name",              field: "full_name",    type: "text",  required: true },
            { label: "Email",                  field: "email",        type: "email", required: true },
            { label: "Organization (optional)",field: "organization", type: "text",  required: false },
          ].map(({ label, field, type, required }) => (
            <div key={field}>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={labelStyle}>{label}</label>
              <input type={type} required={required}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
                style={inputStyle}
                value={form[field as keyof typeof form]}
                onChange={(e) => update(field, e.target.value)}
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={labelStyle}>Role</label>
            <select className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
              style={inputStyle} value={form.role} onChange={(e) => update("role", e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={labelStyle}>Password</label>
            <input type="password" autoComplete="new-password" required
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
              style={inputStyle}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
            />
            <p className="text-xs mt-1" style={{ color: textFaint }}>Min 8 chars, 1 uppercase, 1 number, 1 special character</p>
          </div>

          {error && <p className="text-sm" style={{ color: "#eb6905" }}>{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full font-semibold py-3 rounded-lg text-white transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: "#eb6905", boxShadow: "0 4px 20px rgba(235,105,5,0.35)" }}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="text-sm text-center" style={{ color: textMuted }}>
          Already have an account?{" "}
          <Link href="/auth/login" className="font-semibold hover:underline" style={{ color: "#eb6905" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
