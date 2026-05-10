"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

const ROLES = ["STUDENT", "QS_PROFESSIONAL", "CONTRACTOR"];

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const login    = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", organization: "", role: "STUDENT" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen flex bg-surface">
      <div className="hidden md:flex w-1/2 bg-primary flex-col items-center justify-center p-12 text-white">
        <h1 className="text-3xl font-bold">Ethio-QS Engine</h1>
        <p className="text-white/60 mt-2 text-sm">Quantity Surveying Pro</p>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h2 className="text-headline-md text-on-surface">Create Account</h2>
            <p className="text-sm text-on-surface-variant mt-1">Join EthioQS — it&apos;s free</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: "Full Name", field: "full_name", type: "text", required: true },
              { label: "Email", field: "email", type: "email", required: true },
              { label: "Organization (optional)", field: "organization", type: "text", required: false },
            ].map(({ label, field, type, required }) => (
              <div key={field}>
                <label className="block text-label-caps text-on-surface-variant mb-1">{label}</label>
                <input type={type} className="input" value={form[field as keyof typeof form]}
                  onChange={(e) => update(field, e.target.value)} required={required} />
              </div>
            ))}
            <div>
              <label className="block text-label-caps text-on-surface-variant mb-1">Role</label>
              <select className="input" value={form.role} onChange={(e) => update("role", e.target.value)}>
                {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-label-caps text-on-surface-variant mb-1">Password</label>
              <input type="password" className="input" value={form.password}
                onChange={(e) => update("password", e.target.value)} required autoComplete="new-password" />
              <p className="text-xs text-on-surface-variant mt-1">Min 8 chars, 1 uppercase, 1 number, 1 special character</p>
            </div>
            {error && <p className="text-error text-sm">{error}</p>}
            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
          <p className="text-sm text-center text-on-surface-variant">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-accent font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
