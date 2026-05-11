"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useTheme } from "@/components/ThemeProvider";

export default function LoginPage() {
  const router = useRouter();
  const login  = useAuthStore((s) => s.login);
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try { await login(email, password); router.push("/dashboard"); }
    catch { setError("Invalid email or password."); }
    finally { setLoading(false); }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border p-8 space-y-6"
        style={{ background: glassBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderColor: glassBdr, boxShadow: dark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(9,20,38,0.10)" }}>

        <div>
          <h2 className="text-2xl font-bold" style={{ color: textPri }}>Sign in</h2>
          <p className="text-sm mt-1" style={{ color: textMuted }}>Welcome back to EthioQS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: "Email",    type: "email",    value: email,    setter: setEmail,    auto: "email" },
            { label: "Password", type: "password", value: password, setter: setPassword, auto: "current-password" },
          ].map(({ label, type, value, setter, auto }) => (
            <div key={label}>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: textFaint }}>{label}</label>
              <input
                type={type}
                autoComplete={auto}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
                style={{ background: inputBg, border: `1px solid ${inputBdr}`, color: inputTxt }}
                value={value}
                onChange={(e) => setter(e.target.value)}
                required
              />
            </div>
          ))}

          {error && <p className="text-sm" style={{ color: "#eb6905" }}>{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full font-semibold py-3 rounded-lg text-white transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: "#eb6905", boxShadow: "0 4px 20px rgba(235,105,5,0.35)" }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-sm text-center" style={{ color: textMuted }}>
          No account?{" "}
          <Link href="/auth/register" className="font-semibold hover:underline" style={{ color: "#eb6905" }}>Register</Link>
        </p>
      </div>
    </div>
  );
}
