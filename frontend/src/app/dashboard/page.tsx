"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import { useAuthStore } from "@/store/authStore";
import { Plus, Trash2, ArrowRight, MapPin, Calendar, Code2 } from "lucide-react";
import type { ProjectCreate } from "@/types";
import { cn } from "@/lib/utils";

const CITIES = ["Addis Ababa","Dire Dawa","Mekelle","Gondar","Hawassa","Bahir Dar","Adama","Jimma","Dessie","Jijiga"];
const CODES  = ["EBCS","IS_CODE","BS","EUROCODE"];

const STATUS_CHIP: Record<string, string> = {
  draft:       "chip chip-draft",
  in_progress: "chip chip-progress",
  approved:    "chip chip-approved",
  revision:    "chip chip-revision",
};

export default function DashboardPage() {
  const router = useRouter();
  const { projects, loading, fetchProjects, createProject, deleteProject } = useProjectStore();
  const user = useAuthStore((s) => s.user);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProjectCreate>({
    name: "", location: "Addis Ababa", code_of_practice: "EBCS", unit_system: "METRIC", currency: "ETB",
  });

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const project = await createProject(form);
    setShowForm(false);
    router.push(`/dashboard/${project.id}`);
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar */}
      <header className="bg-white border-b border-outline-variant px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-title-sm text-on-surface">Project Dashboard</h1>
          <p className="text-xs text-on-surface-variant">Enterprise Quantity Surveying &amp; Resource Tracking</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> New Project
        </button>
      </header>

      <div className="flex-1 p-6 space-y-6 max-w-6xl w-full mx-auto">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Projects", value: projects.length, sub: "+12% vs last month", subColor: "text-green-600" },
            { label: "Pending Reviews", value: "—", sub: "Avg. 2 days wait", subColor: "text-on-surface-variant" },
            { label: "Estimated Value", value: "—", sub: "Active Contracts", subColor: "text-on-surface-variant" },
          ].map(({ label, value, sub, subColor }) => (
            <div key={label} className="card py-4">
              <p className="text-label-caps text-on-surface-variant uppercase">{label}</p>
              <p className="text-3xl font-bold text-on-surface mt-1">{value}</p>
              <p className={cn("text-xs mt-1", subColor)}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Create form */}
        {showForm && (
          <div className="card border-l-4 border-l-accent">
            <h2 className="font-semibold text-on-surface mb-4">New Project</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Project Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Bole Road Expansion" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Location *</label>
                <select className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
                  {CITIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Code of Practice</label>
                <select className="input" value={form.code_of_practice} onChange={(e) => setForm({ ...form, code_of_practice: e.target.value })}>
                  {CODES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Description</label>
                <textarea className="input" rows={2} placeholder="Optional project description…" onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="col-span-2 flex gap-3 justify-end">
                <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Project</button>
              </div>
            </form>
          </div>
        )}

        {/* Projects table */}
        <div className="panel">
          <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
            <h2 className="font-semibold text-on-surface">Active Projects Portfolio</h2>
            <span className="text-xs text-on-surface-variant">Showing {projects.length} active project{projects.length !== 1 ? "s" : ""}</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-on-surface-variant text-sm">Loading…</div>
          ) : projects.length === 0 ? (
            <div className="py-16 text-center text-on-surface-variant">
              <p className="font-medium">No projects yet.</p>
              <p className="text-sm mt-1">Create your first project to get started.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Location</th>
                  <th>Date Created</th>
                  <th>BoQ Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <p className="font-semibold text-on-surface">{p.name}</p>
                      <p className="text-xs text-on-surface-variant">{p.code_of_practice}</p>
                    </td>
                    <td>
                      <span className="flex items-center gap-1 text-on-surface-variant">
                        <MapPin size={12} /> {p.location}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1 text-on-surface-variant">
                        <Calendar size={12} /> {new Date(p.created_at).toLocaleDateString("en-ET", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </td>
                    <td><span className="chip chip-draft">Draft</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => deleteProject(p.id)} className="text-outline hover:text-error transition-colors p-1" aria-label="Delete project">
                          <Trash2 size={14} />
                        </button>
                        <button onClick={() => router.push(`/dashboard/${p.id}`)}
                          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-accent transition-colors">
                          Open <ArrowRight size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Status bar */}
      <footer className="bg-primary text-white/60 text-xs px-6 py-2 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> SYSTEM ONLINE · SYNC: 100% COMPLETE
        </span>
        <span>LOCAL TIME: {new Date().toLocaleTimeString("en-ET", { hour: "2-digit", minute: "2-digit" })} EAT</span>
      </footer>
    </div>
  );
}
