"use client";
import { useState, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface NavItem  { label: string; badge?: string; }
interface NavGroup { heading: string; items: NavItem[]; }
interface NavDropdownProps { label: string; groups: NavGroup[]; }

export function NavDropdown({ label, groups }: NavDropdownProps) {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }
  function onLeave() {
    timeoutRef.current = setTimeout(() => setOpen(false), 120);
  }

  const dropBg     = dark ? "rgba(10, 18, 40, 0.95)"  : "rgba(255, 255, 255, 0.98)";
  const dropBorder = dark ? "rgba(255,255,255,0.10)"   : "rgba(9,20,38,0.12)";
  const dropArrow  = dark ? "rgba(10,18,40,0.95)"      : "rgba(255,255,255,0.98)";
  const itemColor  = dark ? "rgba(255,255,255,0.70)"   : "rgba(9,20,38,0.75)";
  const itemHover  = dark ? "#ffffff"                  : "#091426";
  const labelColor = dark ? "rgba(255,255,255,0.55)"   : "rgba(9,20,38,0.55)";
  const labelHover = dark ? "#ffffff"                  : "#091426";

  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        className="flex items-center gap-1 text-sm font-medium py-2 transition-colors"
        style={{ color: labelColor }}
        onMouseEnter={(e) => (e.currentTarget.style.color = labelHover)}
        onMouseLeave={(e) => (e.currentTarget.style.color = labelColor)}
      >
        {label}
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 rounded-2xl border p-6 z-50 min-w-max"
          style={{
            background: dropBg,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderColor: dropBorder,
            boxShadow: dark
              ? "0 16px 48px rgba(0,0,0,0.6)"
              : "0 16px 48px rgba(9,20,38,0.15)",
          }}
        >
          {/* Arrow */}
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 rounded-sm border-l border-t"
            style={{ background: dropArrow, borderColor: dropBorder }}
          />

          <div
            className="grid gap-8"
            style={{ gridTemplateColumns: `repeat(${groups.length}, minmax(160px, 1fr))` }}
          >
            {groups.map((group) => (
              <div key={group.heading}>
                <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#eb6905" }}>
                  {group.heading}
                </p>
                <ul className="space-y-3">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <a
                        href="#"
                        className="flex items-center gap-2 text-sm transition-colors"
                        style={{ color: itemColor }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = itemHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = itemColor)}
                      >
                        {item.label}
                        {item.badge && (
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                            style={{ color: "#eb6905", borderColor: "rgba(235,105,5,0.4)", fontSize: "10px" }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
