"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import {
  LayoutDashboard, LogOut, Download, Archive, Settings,
  Ruler, Table2, Layers, BarChart3, FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TOP_NAV = [
  { label: "Projects",  href: "/dashboard",  icon: LayoutDashboard },
  { label: "My Work",   href: "/dashboard",  icon: FolderOpen },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { accessToken, logout } = useAuthStore();

  useEffect(() => {
    if (!accessToken && !localStorage.getItem("access_token")) {
      router.push("/auth/login");
    }
  }, [accessToken, router]);

  function handleLogout() {
    logout();
    router.push("/auth/login");
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

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
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
          <button
            onClick={handleLogout}
            className="nav-item w-full text-left text-white/60 hover:text-white"
          >
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
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}
