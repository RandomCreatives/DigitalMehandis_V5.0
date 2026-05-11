"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import {
  LayoutDashboard, LogOut, Download, Archive, Settings,
  FolderOpen, Home, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const IDLE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
const WARN_BEFORE_MS  = 30 * 1000;     // warn 30s before logout

const TOP_NAV = [
  { label: "Projects", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Work",  href: "/dashboard", icon: FolderOpen },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { accessToken, logout } = useAuthStore();

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const doLogout = useCallback(() => {
    logout();
    router.push("/auth/login");
  }, [logout, router]);

  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timerRef.current)  clearTimeout(timerRef.current);
    if (warnRef.current)   clearTimeout(warnRef.current);
    if (countRef.current)  clearInterval(countRef.current);
    setSecondsLeft(null);

    // Warn 30s before logout
    warnRef.current = setTimeout(() => {
      setSecondsLeft(30);
      countRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s === null || s <= 1) {
            if (countRef.current) clearInterval(countRef.current);
            return null;
          }
          return s - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT_MS - WARN_BEFORE_MS);

    // Auto-logout after full timeout
    timerRef.current = setTimeout(doLogout, IDLE_TIMEOUT_MS);
  }, [doLogout]);

  // Attach activity listeners
  useEffect(() => {
    if (!accessToken && !localStorage.getItem("access_token")) {
      router.push("/auth/login");
      return;
    }
    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current)  clearTimeout(timerRef.current);
      if (warnRef.current)   clearTimeout(warnRef.current);
      if (countRef.current)  clearInterval(countRef.current);
    };
  }, [accessToken, resetTimer, router]);

  function handleLogout() {
    doLogout();
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {/* ── Sidebar ── */}
      <aside className="w-56 bg-primary text-white flex flex-col shrink-0">
        {/* Brand */}
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-lg font-bold tracking-tight leading-none">Ethio-QS Engine</p>
          <p className="text-xs text-white/50 mt-0.5">Quantity Surveying Pro</p>
        </div>

        {/* Home button */}
        <div className="px-3 pt-3">
          <Link href="/"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-semibold text-white">
            <Home size={15} /> Home
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {TOP_NAV.map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href}
              className={cn("nav-item", pathname === href && "active")}>
              <Icon size={16} /> {label}
            </Link>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
          <Link href="/dashboard" className="nav-item"><Settings size={16} /> Project Settings</Link>
          <Link href="/dashboard" className="nav-item"><Archive size={16} /> Archived Data</Link>
          <button onClick={handleLogout}
            className="nav-item w-full text-left text-white/60 hover:text-white">
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        {/* Export BoQ CTA */}
        <div className="px-3 pb-4">
          <button className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-orange-600 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors">
            <Download size={15} /> Export BoQ
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {children}

        {/* ── Idle warning toast ── */}
        {secondsLeft !== null && (
          <div className="fixed bottom-6 right-6 z-50 bg-primary-container border border-outline-variant rounded-xl shadow-lg px-5 py-4 flex items-center gap-4 max-w-sm">
            <Clock size={20} className="text-accent shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-on-surface">Session expiring</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                You&apos;ll be signed out in <strong className="text-accent">{secondsLeft}s</strong> due to inactivity.
              </p>
            </div>
            <button onClick={resetTimer}
              className="btn-primary text-xs py-1.5 px-3 shrink-0">
              Stay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
