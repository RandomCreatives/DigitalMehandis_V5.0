"use client";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import {
  Ruler, SlidersHorizontal,
  Table2, Layers, BarChart3, ClipboardList,
  DollarSign, Database,
  Sparkles, ScrollText,
  ChevronLeft, ChevronRight, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Tab groups ────────────────────────────────────────────────────────────────

const GROUPS = [
  {
    label: "Drawings",
    icon: Ruler,
    items: [
      { label: "Drawings",    slug: "drawings",    icon: Ruler },
      { label: "Calibration", slug: "calibration", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Quantities",
    icon: Table2,
    items: [
      { label: "Take-off",     slug: "takeoff",   icon: Table2 },
      { label: "BOQ",          slug: "boq",       icon: Layers },
      { label: "BOQ Items",    slug: "boq-items", icon: ClipboardList },
      { label: "Bar Schedule", slug: "bbs",       icon: BarChart3 },
    ],
  },
  {
    label: "Rates",
    icon: DollarSign,
    items: [
      { label: "Rate Library", slug: "rates",     icon: DollarSign },
      { label: "Cost Data",    slug: "cost-data", icon: Database },
    ],
  },
];

// Flat list for prev/next navigation (all slugs in logical order)
const ALL_SLUGS = GROUPS.flatMap((g) => g.items.map((i) => i.slug));

// ── Dropdown tab component ────────────────────────────────────────────────────

function GroupTab({
  group,
  projectId,
  activeSlug,
}: {
  group: typeof GROUPS[0];
  projectId: string;
  activeSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isGroupActive = group.items.some((i) => i.slug === activeSlug);
  const activeItem = group.items.find((i) => i.slug === activeSlug);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors select-none",
          isGroupActive
            ? "border-accent text-accent"
            : "border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant"
        )}
      >
        {activeItem ? (
          <>
            <activeItem.icon size={14} />
            {activeItem.label}
          </>
        ) : (
          <>
            <group.icon size={14} />
            {group.label}
          </>
        )}
        <ChevronDown
          size={12}
          className={cn("transition-transform opacity-60", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-outline-variant rounded-xl shadow-lg py-1 min-w-[160px]"
          style={{ boxShadow: "0 8px 24px rgba(9,20,38,0.12)" }}>
          {group.items.map((item) => (
            <Link
              key={item.slug}
              href={`/dashboard/${projectId}/${item.slug}`}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                item.slug === activeSlug
                  ? "text-accent font-semibold bg-orange-50"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-low"
              )}
            >
              <item.icon size={14} />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { projectId } = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router   = useRouter();
  const { current, fetchProject } = useProjectStore();

  useEffect(() => { fetchProject(projectId); }, [projectId, fetchProject]);

  // Active slug from pathname
  const activeSlug = ALL_SLUGS.find((s) => pathname.endsWith(`/${s}`)) ?? "";
  const activeIdx  = ALL_SLUGS.indexOf(activeSlug);
  const prevSlug   = activeIdx > 0 ? ALL_SLUGS[activeIdx - 1] : null;
  const nextSlug   = activeIdx < ALL_SLUGS.length - 1 ? ALL_SLUGS[activeIdx + 1] : null;

  // Find label for prev/next
  const allItems = GROUPS.flatMap((g) => g.items);
  const prevItem = allItems.find((i) => i.slug === prevSlug);
  const nextItem = allItems.find((i) => i.slug === nextSlug);

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Project top bar ── */}
      <header className="bg-white border-b border-outline-variant px-5 py-2.5 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded"
          aria-label="Back to projects"
        >
          <ChevronLeft size={17} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-on-surface text-sm truncate">
            {current ? `${current.name}` : "Loading…"}
          </h1>
          {current && (
            <p className="text-xs text-on-surface-variant truncate">{current.location}</p>
          )}
        </div>
        <span className="text-xs text-on-surface-variant shrink-0 hidden sm:block">
          {current?.scale ?? "1:100"}
        </span>
        <span className="chip chip-draft text-xs shrink-0">Draft</span>
      </header>

      {/* ── Tab bar ── */}
      <nav className="bg-white border-b border-outline-variant px-4 flex items-center shrink-0">

        {/* Left: grouped dropdown tabs */}
        <div className="flex items-center gap-0.5 flex-1">
          {GROUPS.map((group) => (
            <GroupTab
              key={group.label}
              group={group}
              projectId={projectId}
              activeSlug={activeSlug}
            />
          ))}
        </div>

        {/* Right: utility tabs (smaller) */}
        <div className="flex items-center gap-0.5 border-l border-outline-variant pl-3 ml-2">
          {[
            { label: "Suggestions", slug: "suggestions", icon: Sparkles },
            { label: "Audit",       slug: "audit-log",   icon: ScrollText },
          ].map((tab) => (
            <Link
              key={tab.slug}
              href={`/dashboard/${projectId}/${tab.slug}`}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors",
                activeSlug === tab.slug
                  ? "border-accent text-accent"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              )}
            >
              <tab.icon size={12} />
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Page content ── */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>

      {/* ── Prev / Next ── */}
      {activeSlug && (
        <div className="bg-white border-t border-outline-variant px-5 py-2.5 flex items-center justify-between shrink-0">
          {prevItem ? (
            <button
              onClick={() => router.push(`/dashboard/${projectId}/${prevItem.slug}`)}
              className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <ChevronLeft size={14} />
              <prevItem.icon size={13} />
              {prevItem.label}
            </button>
          ) : <div />}

          {/* Step dots */}
          <div className="flex items-center gap-1">
            {ALL_SLUGS.map((s, i) => (
              <button
                key={s}
                onClick={() => router.push(`/dashboard/${projectId}/${s}`)}
                className={cn(
                  "rounded-full transition-all",
                  s === activeSlug ? "w-5 h-1.5 bg-accent" : "w-1.5 h-1.5 bg-outline-variant hover:bg-outline"
                )}
                aria-label={s}
              />
            ))}
          </div>

          {nextItem ? (
            <button
              onClick={() => router.push(`/dashboard/${projectId}/${nextItem.slug}`)}
              className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors"
            >
              {nextItem.label}
              <nextItem.icon size={13} />
              <ChevronRight size={14} />
            </button>
          ) : <div />}
        </div>
      )}
    </div>
  );
}
