"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { LayoutDashboard, FolderOpen, LogOut } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-[#1F4E79] text-white flex flex-col">
        <div className="p-5 border-b border-white/10">
          <span className="text-xl font-bold">EthioQS</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-sm transition-colors">
            <LayoutDashboard size={16} /> Projects
          </Link>
          <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-sm transition-colors">
            <FolderOpen size={16} /> My Work
          </Link>
        </nav>
        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 overflow-auto">
        {children}
      </main>
    </div>
  );
}
