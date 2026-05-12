"use client";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { useProjectStore } from "@/store/projectStore";
import { Ruler, Sparkles, Table2, Layers, BarChart3, Database, ChevronLeft, ChevronRight, SlidersHorizontal, ClipboardList, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Drawings",    slug: "drawings",    icon: Ruler },
  { label: "Calibration", slug: "calibration", icon: SlidersHorizontal },
  { label: "Suggestions", slug: "suggestions", icon: Sparkles },
  { label: "Take-off",    slug: "takeoff",     icon: Table2 },
  { label: "BOQ",         slug: "boq",         icon: Layers },
  { label: "BOQ Items",   slug: "boq-items",   icon: ClipboardList },
  { label: "Bar Schedule",slug: "bbs",         icon: BarChart3 },
  { label: "Audit Log",   slug: "audit-log",   icon: ScrollText },
  { label: "Cost Data",   slug: "cost-data",   icon: Database },
];

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { projectId } = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router   = useRouter();
  const { current, fetchProject } = useProjectStore();

  useEffect(() => { fetchProject(projectId); }, [projectId, fetchProject]);

  // Determine active tab index
  const activeIdx = TABS.findIndex((t) => pathname.endsWith(`/${t.slug}`));
  const prevTab   = activeIdx > 0 ? TABS[activeIdx - 1] : null;
  const nextTab   = activeIdx < TABS.length - 1 ? TABS[activeIdx + 1] : null;

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Project top bar ── */}
      <header className="bg-white border-b border-outline-variant px-6 py-3 flex items-center gap-4 shrink-0">
        <button onClick={() => router.push("/dashboard")}
          className="text-on-surface-variant hover:text-on-surface transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-on-surface truncate">
            {current ? `${current.name} | ${current.location}` : "Loading…"}
          </h1>
        </div>
        <span className="text-sm text-on-surface-variant shrink-0">{current?.scale ?? "1:100"} Scale</span>
        <span className="chip chip-draft shrink-0">Active Draft</span>
      </header>

      {/* ── Tab bar ── */}
      <nav className="bg-white border-b border-outline-variant px-6 flex items-center gap-1 shrink-0 overflow-x-auto">
        {TABS.map((tab, i) => {
          const isActive = activeIdx === i;
          return (
            <Link
              key={tab.slug}
              href={`/dashboard/${projectId}/${tab.slug}`}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors",
                isActive
                  ? "border-accent text-accent"
                  : "border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant"
              )}
            >
              <tab.icon size={15} />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* ── Page content ── */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>

      {/* ── Prev / Next navigation ── */}
      {activeIdx >= 0 && (
        <div className="bg-white border-t border-outline-variant px-6 py-3 flex items-center justify-between shrink-0">
          {prevTab ? (
            <button
              onClick={() => router.push(`/dashboard/${projectId}/${prevTab.slug}`)}
              className="flex items-center gap-2 btn-ghost text-sm font-semibold"
            >
              <ChevronLeft size={16} />
              <prevTab.icon size={14} />
              {prevTab.label}
            </button>
          ) : <div />}

          {/* Step indicator */}
          <div className="flex items-center gap-1.5">
            {TABS.map((_, i) => (
              <div key={i} className={cn(
                "h-1.5 rounded-full transition-all",
                i === activeIdx ? "w-6 bg-accent" : "w-1.5 bg-outline-variant"
              )} />
            ))}
          </div>

          {nextTab ? (
            <button
              onClick={() => router.push(`/dashboard/${projectId}/${nextTab.slug}`)}
              className="flex items-center gap-2 btn-ghost text-sm font-semibold"
            >
              {nextTab.label}
              <nextTab.icon size={14} />
              <ChevronRight size={16} />
            </button>
          ) : <div />}
        </div>
      )}
    </div>
  );
}
