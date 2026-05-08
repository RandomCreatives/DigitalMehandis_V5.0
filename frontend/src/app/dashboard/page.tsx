"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import type { ProjectCreate } from "@/types";

const CITIES = ["Addis Ababa", "Dire Dawa", "Mekelle", "Gondar", "Hawassa", "Bahir Dar", "Adama", "Jimma", "Dessie", "Jijiga"];
const CODES = ["EBCS", "IS_CODE", "BS", "EUROCODE"];

export default function DashboardPage() {
  const router = useRouter();
  const { projects, loading, fetchProjects, createProject, deleteProject } = useProjectStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProjectCreate>({ name: "", location: "Addis Ababa", code_of_practice: "EBCS", unit_system: "METRIC", currency: "ETB" });

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const project = await createProject(form);
    setShowForm(false);
    router.push(`/dashboard/${project.id}`);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 text-sm mt-1">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">New Project</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
              <select className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
                {CITIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code of Practice</label>
              <select className="input" value={form.code_of_practice} onChange={(e) => setForm({ ...form, code_of_practice: e.target.value })}>
                {CODES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea className="input" rows={2} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="col-span-2 flex gap-3 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Create Project</button>
            </div>
          </form>
        </div>
      )}

      {/* Project list */}
      {loading ? (
        <p className="text-gray-400 text-center py-12">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No projects yet.</p>
          <p className="text-sm mt-1">Create your first project to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((p) => (
            <div key={p.id} className="card flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                <p className="text-sm text-gray-500">{p.location} · {p.code_of_practice} · {p.currency}</p>
                <p className="text-xs text-gray-400 mt-1">Updated {new Date(p.updated_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => deleteProject(p.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2" aria-label="Delete project">
                  <Trash2 size={16} />
                </button>
                <button onClick={() => router.push(`/dashboard/${p.id}`)} className="btn-primary flex items-center gap-1 text-sm py-1.5">
                  Open <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
