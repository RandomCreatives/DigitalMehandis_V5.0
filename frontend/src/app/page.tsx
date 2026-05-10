"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowRight, BarChart3, Layers, FileText, Database, Shield, Zap, Sun, Moon, Send, CheckCircle } from "lucide-react";
import { NavDropdown } from "@/components/NavDropdown";
import { useTheme } from "@/components/ThemeProvider";

const FEATURES = [
  { icon: Layers,    title: "Federated Data Design",     desc: "Unify drawings, quantities, and cost data into a single source of truth across all disciplines." },
  { icon: BarChart3, title: "Construction Analytics",    desc: "Real-time BOQ generation, BBS calculations, and cost breakdowns following MoUDC standards." },
  { icon: FileText,  title: "PDF Drawing Intelligence",  desc: "Upload PDF drawings and auto-extract quantity suggestions with confidence scoring." },
  { icon: Database,  title: "Government Rate Database",  desc: "Pre-loaded Ethiopian MoUDC Schedule of Rates with regional pricing for accurate estimates." },
  { icon: Shield,    title: "EBCS Compliant",            desc: "Bar bending schedules and structural calculations aligned with Ethiopian Building Code Standards." },
  { icon: Zap,       title: "Export Ready",              desc: "One-click export to Excel and PDF in the exact format required by Ethiopian contractors and consultants." },
];

const STATS = [
  { value: "100%", label: "Free & Open Source" },
  { value: "EBCS", label: "Code Compliant" },
  { value: "ETB",  label: "Local Currency" },
  { value: "MoUDC",label: "Standard Format" },
];

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

export default function LandingPage() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  const HEADLINES = ["Federated Data Design", "Construction Data Analytics"];
  const [headlineIdx, setHeadlineIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setHeadlineIdx((i) => (i + 1) % HEADLINES.length);
        setFading(false);
      }, 500);
    }, 17000);
    return () => clearInterval(interval);
  }, []);

  const [contact, setContact] = useState({ name: "", email: "", type: "General", message: "" });
  const [submitted, setSubmitted] = useState(false);

  function handleContact(e: React.FormEvent) {
    e.preventDefault();
    // Placeholder — wire to backend later
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
    setContact({ name: "", email: "", type: "General", message: "" });
  }

  const pageBg    = dark ? "linear-gradient(135deg, #0a1628 0%, #0f2040 40%, #1a1a2e 100%)" : "linear-gradient(135deg, #f0f4f8 0%, #e2eaf4 40%, #dce6f0 100%)";
  const glassBg   = dark ? "rgba(255,255,255,0.05)"  : "rgba(255,255,255,0.70)";
  const glassBdr  = dark ? "rgba(255,255,255,0.10)"  : "rgba(9,20,38,0.10)";
  const hdrBg     = dark ? "rgba(9,20,38,0.60)"      : "rgba(255,255,255,0.80)";
  const textPri   = dark ? "#ffffff"                 : "#091426";
  const textMuted = dark ? "rgba(255,255,255,0.55)"  : "rgba(9,20,38,0.60)";
  const textFaint = dark ? "rgba(255,255,255,0.35)"  : "rgba(9,20,38,0.40)";
  const divider   = dark ? "rgba(255,255,255,0.08)"  : "rgba(9,20,38,0.08)";
  const inputBg   = dark ? "rgba(255,255,255,0.06)"  : "rgba(255,255,255,0.90)";
  const inputBdr  = dark ? "rgba(255,255,255,0.12)"  : "rgba(9,20,38,0.15)";
  const inputText = dark ? "rgba(255,255,255,0.85)"  : "#091426";

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: pageBg }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b" style={{ background: hdrBg, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: glassBdr }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(235,105,5,0.9)", boxShadow: "0 0 16px rgba(235,105,5,0.4)" }}>
              <Layers size={16} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-sm" style={{ color: textPri }}>Ethio-QS Engine</span>
              <span className="hidden sm:inline text-xs ml-2" style={{ color: textFaint }}>Federated Data Design</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <NavDropdown label="Product"   groups={PRODUCT_GROUPS} />
            <NavDropdown label="Solutions" groups={SOLUTIONS_GROUPS} />
            <NavDropdown label="Resources" groups={RESOURCES_GROUPS} />
            <a href="#contact" className="text-sm font-medium transition-colors" style={{ color: textMuted }} onMouseEnter={(e) => (e.currentTarget.style.color = textPri)} onMouseLeave={(e) => (e.currentTarget.style.color = textMuted)}>Contact Us</a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button onClick={toggle} aria-label="Toggle theme"
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all border"
              style={{ background: glassBg, borderColor: glassBdr, color: textMuted }}>
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <Link href="/auth/login" className="text-sm font-semibold px-3 py-2 transition-colors" style={{ color: textMuted }}>Sign In</Link>
            <Link href="/auth/register" className="text-sm font-semibold text-white px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all" style={{ background: "#eb6905", boxShadow: "0 0 20px rgba(235,105,5,0.3)" }}>
              Get Started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="flex-1 flex items-center py-24 md:py-32 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(235,105,5,0.12) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: dark ? "radial-gradient(circle, rgba(30,41,59,0.6) 0%, transparent 70%)" : "radial-gradient(circle, rgba(200,220,240,0.6) 0%, transparent 70%)", filter: "blur(40px)" }} />

        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center w-full">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border" style={{ background: glassBg, backdropFilter: "blur(8px)", borderColor: glassBdr, color: textMuted }}>
              <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block animate-pulse" />
              Open Source · Free Forever · MoUDC 2023
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight" style={{ color: textPri }}>
              <span
                style={{
                  display: "inline-block",
                  transition: "opacity 0.5s ease, transform 0.5s ease",
                  opacity: fading ? 0 : 1,
                  transform: fading ? "translateY(-8px)" : "translateY(0)",
                }}
              >
                {HEADLINES[headlineIdx]}
              </span>
              <br />
              <span style={{ color: "#eb6905" }}>for Building Construction</span>
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: textMuted }}>
              The professional quantity surveying platform built for Ethiopian construction.
              Connect your drawings, quantities, and cost data — from foundation to finish.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/auth/register" className="font-semibold px-6 py-3 rounded-lg text-white flex items-center gap-2 transition-all hover:scale-105" style={{ background: "#eb6905", boxShadow: "0 4px 24px rgba(235,105,5,0.4)" }}>
                Get Started Free <ArrowRight size={16} />
              </Link>
              <Link href="/auth/login" className="font-semibold px-6 py-3 rounded-lg transition-colors border" style={{ background: glassBg, borderColor: glassBdr, color: textMuted }}>
                Sign In
              </Link>
            </div>
          </div>

          {/* Hero card */}
          <div className="hidden md:block">
            <div className="rounded-2xl p-6 space-y-3 border" style={{ background: glassBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderColor: glassBdr, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: textFaint }}>Live BOQ Preview</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "rgba(235,105,5,0.2)", color: "#eb6905", border: "1px solid rgba(235,105,5,0.3)" }}>ACTIVE DRAFT</span>
              </div>
              {[
                { code: "01.02", desc: "Bulk excavation, ordinary soil", unit: "m³", qty: "840.50", amt: "100,860" },
                { code: "02.02", desc: "Grade C-25 Concrete, foundation", unit: "m³", qty: "320.00", amt: "4,544,000" },
                { code: "03.04", desc: "Rebar Ø16mm, high yield", unit: "kg", qty: "5,820", amt: "465,600" },
              ].map((row) => (
                <div key={row.code} className="rounded-lg px-4 py-2.5 grid grid-cols-5 gap-2 text-xs border" style={{ background: dark ? "rgba(255,255,255,0.04)" : "rgba(9,20,38,0.04)", borderColor: glassBdr }}>
                  <span className="font-mono" style={{ color: textFaint }}>{row.code}</span>
                  <span className="col-span-2 truncate" style={{ color: textMuted }}>{row.desc}</span>
                  <span className="text-right" style={{ color: textFaint }}>{row.qty} {row.unit}</span>
                  <span className="text-right font-bold" style={{ color: "#eb6905" }}>{row.amt}</span>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between text-xs" style={{ borderColor: divider }}>
                <span style={{ color: textFaint }} className="uppercase tracking-wide">Total Carried to Summary</span>
                <span className="font-bold text-sm" style={{ color: "#eb6905" }}>ETB 5,110,460</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y" style={{ background: glassBg, backdropFilter: "blur(8px)", borderColor: divider }}>
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold" style={{ color: textPri }}>{value}</p>
              <p className="text-xs mt-1 uppercase tracking-wide" style={{ color: textFaint }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Product ── */}
      <section id="product" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#eb6905" }}>Product</p>
            <h2 className="text-3xl font-bold" style={{ color: textPri }}>Everything a QS needs</h2>
            <p className="mt-3 max-w-xl mx-auto" style={{ color: textMuted }}>From drawing upload to final BOQ export — one platform, built for the Ethiopian construction industry.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl p-6 border transition-all group hover:scale-[1.02]" style={{ background: glassBg, backdropFilter: "blur(12px)", borderColor: glassBdr }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-all group-hover:scale-110" style={{ background: "rgba(235,105,5,0.15)", border: "1px solid rgba(235,105,5,0.2)" }}>
                  <Icon size={18} style={{ color: "#eb6905" }} />
                </div>
                <h3 className="font-semibold mb-2" style={{ color: textPri }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solutions ── */}
      <section id="solutions" className="py-20 border-t" style={{ borderColor: divider }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#eb6905" }}>Solutions</p>
            <h2 className="text-3xl font-bold" style={{ color: textPri }}>Built for every role</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { role: "Quantity Surveyors", desc: "Generate MoUDC-compliant BOQs in minutes. Manage take-off sheets, link rates, and export professional reports." },
              { role: "Civil Engineers", desc: "Produce EBCS-compliant bar bending schedules with automatic cutting length and weight calculations." },
              { role: "Contractors & Students", desc: "Access pre-loaded government rates, upload drawings, and estimate project costs — completely free." },
            ].map(({ role, desc }) => (
              <div key={role} className="rounded-xl p-6 border transition-all hover:border-orange-500/30" style={{ background: glassBg, borderColor: glassBdr }}>
                <div className="w-2 h-2 rounded-full mb-4" style={{ background: "#eb6905" }} />
                <h3 className="font-semibold mb-2" style={{ color: textPri }}>{role}</h3>
                <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Resources ── */}
      <section id="resources" className="py-20 border-t" style={{ borderColor: divider }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#eb6905" }}>Resources</p>
            <h2 className="text-3xl font-bold" style={{ color: textPri }}>Standards &amp; References</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { title: "EBCS",      sub: "Ethiopian Building Code Standard", tag: "Structural" },
              { title: "MoUDC",     sub: "Schedule of Rates 2023",           tag: "Cost Data" },
              { title: "ASTM A615", sub: "Deformed Steel Bar Standard",      tag: "Reinforcement" },
              { title: "GNU GPL v3",sub: "Open Source License",              tag: "Legal" },
            ].map(({ title, sub, tag }) => (
              <div key={title} className="rounded-xl p-5 border text-center" style={{ background: glassBg, borderColor: glassBdr }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: textFaint }}>{tag}</p>
                <p className="text-xl font-bold" style={{ color: textPri }}>{title}</p>
                <p className="text-xs mt-1" style={{ color: textFaint }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact Us ── */}
      <section id="contact" className="py-20 border-t" style={{ borderColor: divider }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#eb6905" }}>Contact Us</p>
            <h2 className="text-3xl font-bold" style={{ color: textPri }}>We&apos;d love to hear from you</h2>
            <p className="mt-3 max-w-lg mx-auto" style={{ color: textMuted }}>
              Report a bug, suggest a feature, ask a question, or just say hello. Every message is read by the team.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Info */}
            <div className="space-y-6">
              {[
                { label: "Bug Reports", desc: "Found something broken? Tell us exactly what happened and we'll fix it fast." },
                { label: "Feature Requests", desc: "Have an idea that would help Ethiopian QS professionals? We're listening." },
                { label: "Training & Consulting", desc: "Need help getting your team onboarded or customizing the platform?" },
                { label: "General Enquiries", desc: "Anything else — partnerships, press, or just feedback on the platform." },
              ].map(({ label, desc }) => (
                <div key={label} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: "#eb6905" }} />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: textPri }}>{label}</p>
                    <p className="text-sm mt-0.5" style={{ color: textMuted }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="rounded-2xl p-6 border" style={{ background: glassBg, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: glassBdr }}>
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <CheckCircle size={40} style={{ color: "#eb6905" }} />
                  <p className="font-semibold" style={{ color: textPri }}>Message sent!</p>
                  <p className="text-sm" style={{ color: textMuted }}>We&apos;ll get back to you as soon as possible.</p>
                </div>
              ) : (
                <form onSubmit={handleContact} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: textFaint }}>Name</label>
                      <input
                        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
                        style={{ background: inputBg, border: `1px solid ${inputBdr}`, color: inputText }}
                        placeholder="Your name"
                        value={contact.name}
                        onChange={(e) => setContact({ ...contact, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: textFaint }}>Email</label>
                      <input
                        type="email"
                        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
                        style={{ background: inputBg, border: `1px solid ${inputBdr}`, color: inputText }}
                        placeholder="you@example.com"
                        value={contact.email}
                        onChange={(e) => setContact({ ...contact, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: textFaint }}>Type</label>
                    <select
                      className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
                      style={{ background: inputBg, border: `1px solid ${inputBdr}`, color: inputText }}
                      value={contact.type}
                      onChange={(e) => setContact({ ...contact, type: e.target.value })}
                    >
                      {["General", "Bug Report", "Feature Request", "Training & Consulting", "Press / Partnership"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: textFaint }}>Message</label>
                    <textarea
                      rows={4}
                      className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/40 transition-all resize-none"
                      style={{ background: inputBg, border: `1px solid ${inputBdr}`, color: inputText }}
                      placeholder="Tell us what's on your mind…"
                      value={contact.message}
                      onChange={(e) => setContact({ ...contact, message: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit"
                    className="w-full font-semibold py-3 rounded-lg text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                    style={{ background: "#eb6905", boxShadow: "0 4px 20px rgba(235,105,5,0.35)" }}>
                    <Send size={15} /> Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 border-t" style={{ borderColor: divider }}>
        <div className="max-w-2xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl font-bold" style={{ color: textPri }}>Start your first project today</h2>
          <p style={{ color: textMuted }}>Free forever. No credit card. No setup. Just open the app and start surveying.</p>
          <Link href="/auth/register" className="inline-flex items-center gap-2 font-semibold px-8 py-3.5 rounded-lg text-white transition-all hover:scale-105" style={{ background: "#eb6905", boxShadow: "0 4px 32px rgba(235,105,5,0.4)" }}>
            Get Started Free <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t" style={{ background: dark ? "rgba(0,0,0,0.3)" : "rgba(9,20,38,0.06)", backdropFilter: "blur(8px)", borderColor: divider }}>
        <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(235,105,5,0.8)" }}>
                <Layers size={13} className="text-white" />
              </div>
              <span className="font-bold text-sm" style={{ color: textPri }}>Ethio-QS Engine</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: textFaint }}>Federated Data Design for building construction in Ethiopia.</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: textFaint }}>Platform</p>
            <ul className="space-y-2 text-xs" style={{ color: textFaint }}>
              {[["Get Started", "/auth/register"], ["Sign In", "/auth/login"]].map(([l, h]) => (
                <li key={l}><Link href={h} className="hover:text-orange-400 transition-colors">{l}</Link></li>
              ))}
              {[["Product", "#product"], ["Solutions", "#solutions"], ["Resources", "#resources"], ["Contact Us", "#contact"]].map(([l, h]) => (
                <li key={l}><a href={h} className="hover:text-orange-400 transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: textFaint }}>Standards</p>
            <ul className="space-y-2 text-xs" style={{ color: textFaint }}>
              {["Ethiopian Building Code Standard (EBCS)", "MoUDC Schedule of Rates", "ASTM A615 / ES Reinforcement", "GNU GPL v3 License"].map((s) => <li key={s}>{s}</li>)}
            </ul>
          </div>
        </div>
        <div className="border-t px-6 py-4 max-w-6xl mx-auto flex items-center justify-between text-xs" style={{ borderColor: divider, color: textFaint }}>
          <span>© {new Date().getFullYear()} EthioQS · Free forever, self-hostable</span>
          <div className="flex items-center gap-4">
            <button onClick={toggle} className="flex items-center gap-1.5 hover:text-orange-400 transition-colors">
              {dark ? <Sun size={13} /> : <Moon size={13} />} {dark ? "Light mode" : "Dark mode"}
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
