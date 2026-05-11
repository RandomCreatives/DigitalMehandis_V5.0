"use client";
import Link from "next/link";
import { Layers, Sun, Moon, ArrowRight } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { NavDropdown } from "@/components/NavDropdown";

const PRODUCT_GROUPS = [
  { heading: "Features", items: [{ label: "Federated Data Design" }, { label: "BOQ Generation" }, { label: "Bar Bending Schedule" }, { label: "PDF Drawing Upload" }, { label: "Quantity Take-off" }] },
  { heading: "Editions", items: [{ label: "Community Edition" }, { label: "Enterprise Edition", badge: "Coming Soon" }] },
  { heading: "Standards", items: [{ label: "EBCS Compliance" }, { label: "MoUDC Rates" }, { label: "ASTM A615" }, { label: "Security & Data Privacy" }] },
];
const SOLUTIONS_GROUPS = [
  { heading: "Industries", items: [{ label: "Building Construction" }, { label: "Infrastructure & Roads" }, { label: "Public & Government" }, { label: "Universities & Research" }, { label: "Engineering Consultancies" }, { label: "NGOs & Foundations" }] },
  { heading: "Use Cases", items: [{ label: "Quantity Surveying" }, { label: "Cost Estimation & Budgeting" }, { label: "Structural Design Support" }, { label: "Project Cost Reporting" }, { label: "Tender Documentation" }, { label: "BOQ Verification" }] },
];
const RESOURCES_GROUPS = [
  { heading: "Support", items: [{ label: "Documentation & Help" }, { label: "FAQs" }, { label: "Glossary" }, { label: "Training & Consulting" }, { label: "Contact" }] },
  { heading: "Product Resources", items: [{ label: "Roadmap" }, { label: "Release Notes" }, { label: "User Guide" }] },
  { heading: "Company", items: [{ label: "About Us" }, { label: "GitHub Repository" }, { label: "Careers", badge: "We are hiring" }, { label: "Newsletter" }] },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  const pageBg    = dark ? "linear-gradient(135deg, #0a1628 0%, #0f2040 40%, #1a1a2e 100%)" : "linear-gradient(135deg, #f0f4f8 0%, #e2eaf4 40%, #dce6f0 100%)";
  const hdrBg     = dark ? "rgba(9,20,38,0.60)"     : "rgba(255,255,255,0.80)";
  const glassBdr  = dark ? "rgba(255,255,255,0.10)"  : "rgba(9,20,38,0.10)";
  const textPri   = dark ? "#ffffff"                 : "#091426";
  const textFaint = dark ? "rgba(255,255,255,0.35)"  : "rgba(9,20,38,0.40)";
  const textMuted = dark ? "rgba(255,255,255,0.55)"  : "rgba(9,20,38,0.60)";
  const divider   = dark ? "rgba(255,255,255,0.08)"  : "rgba(9,20,38,0.08)";

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: pageBg }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b"
        style={{ background: hdrBg, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: glassBdr }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(235,105,5,0.9)", boxShadow: "0 0 16px rgba(235,105,5,0.4)" }}>
              <Layers size={16} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-sm" style={{ color: textPri }}>Ethio-QS Engine</span>
              <span className="hidden sm:inline text-xs ml-2" style={{ color: textFaint }}>Federated Data Design</span>
            </div>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <NavDropdown label="Product"   groups={PRODUCT_GROUPS} />
            <NavDropdown label="Solutions" groups={SOLUTIONS_GROUPS} />
            <NavDropdown label="Resources" groups={RESOURCES_GROUPS} />
            <a href="/#contact" className="text-sm font-medium transition-colors"
              style={{ color: textMuted }}
              onMouseEnter={(e) => (e.currentTarget.style.color = textPri)}
              onMouseLeave={(e) => (e.currentTarget.style.color = textMuted)}>
              Contact Us
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button onClick={toggle} aria-label="Toggle theme"
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all border"
              style={{ background: dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.70)", borderColor: glassBdr, color: textMuted }}>
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <Link href="/auth/login" className="text-sm font-semibold px-3 py-2 transition-colors" style={{ color: textMuted }}>Sign In</Link>
            <Link href="/auth/register"
              className="text-sm font-semibold text-white px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all"
              style={{ background: "#eb6905", boxShadow: "0 0 20px rgba(235,105,5,0.3)" }}>
              Get Started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        {children}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t"
        style={{ background: dark ? "rgba(0,0,0,0.3)" : "rgba(9,20,38,0.06)", backdropFilter: "blur(8px)", borderColor: divider }}>
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: textFaint }}>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "rgba(235,105,5,0.8)" }}>
              <Layers size={11} className="text-white" />
            </div>
            <span style={{ color: textPri }} className="font-semibold">Ethio-QS Engine</span>
            <span>· Federated Data Design for Building Construction</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
            <a href="/#contact" className="hover:text-orange-400 transition-colors">Contact</a>
            <button onClick={toggle} className="flex items-center gap-1.5 hover:text-orange-400 transition-colors">
              {dark ? <Sun size={12} /> : <Moon size={12} />} {dark ? "Light" : "Dark"}
            </button>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> System Online
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
