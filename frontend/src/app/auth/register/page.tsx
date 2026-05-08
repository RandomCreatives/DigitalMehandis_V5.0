"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

const ROLES = ["STUDENT", "QS_PROFESSIONAL", "CONTRACTOR"];

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", organization: "", role: "STUDENT" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      await login(form.email, form.password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="card w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1F4E79]">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Join EthioQS — it&apos;s free</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: "Full Name", field: "full_name", type: "text" },
            { label: "Email", field: "email", type: "email" },
            { label: "Organization (optional)", field: "organization", type: "text" },
          ].map(({ label, field, type }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type={type} className="input" value={form[field as keyof typeof form]} onChange={(e) => update(field, e.target.value)} required={field !== "organization"} />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select className="input" value={form.role} onChange={(e) => update("role", e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" className="input" value={form.password} onChange={(e) => update("password", e.target.value)} required />
            <p className="text-xs text-gray-400 mt-1">Min 8 chars, 1 uppercase, 1 number, 1 special character</p>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>
        <p className="text-sm text-center text-gray-500">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-[#1F4E79] font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
