"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try { await login(email, password); router.push("/dashboard"); }
    catch { setError("Invalid email or password."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex bg-surface">
      <div className="hidden md:flex w-1/2 bg-primary flex-col items-center justify-center p-12 text-white">
        <h1 className="text-3xl font-bold">Ethio-QS Engine</h1>
        <p className="text-white/60 mt-2 text-sm">Quantity Surveying Pro</p>
      </div>
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h2 className="text-headline-md text-on-surface">Sign in</h2>
            <p className="text-sm text-on-surface-variant mt-1">Welcome back to EthioQS</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-label-caps text-on-surface-variant mb-1">Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="block text-label-caps text-on-surface-variant mb-1">Password</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            {error && <p className="text-error text-sm">{error}</p>}
            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
          <p className="text-sm text-center text-on-surface-variant">
            No account?{" "}
            <Link href="/auth/register" className="text-accent font-semibold hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
