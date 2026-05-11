"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { useProjectStore } from "@/store/projectStore";
import { api } from "@/lib/api";
import type { Drawing, DrawingCategory } from "@/types";
import { Upload, Trash2, Eye, FileText, X } from "lucide-react";

const CATEGORIES: DrawingCategory[] = ["ARCHITECTURAL", "STRUCTURAL", "ELECTRICAL", "SANITARY"];

export default function DrawingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { current, fetchProject } = useProjectStore();
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<DrawingCategory>("ARCHITECTURAL");
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewName, setViewName] = useState("");

  useEffect(() => { fetchProject(projectId); }, [projectId, fetchProject]);

  async function load() {
    const { data } = await api.get(`/projects/${projectId}/drawings`);
    setDrawings(data);
  }
  useEffect(() => { load(); }, [projectId]);

  const onDrop = useCallback(async (files: File[]) => {
    setUploading(true);
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      await api.post(`/projects/${projectId}/drawings/upload?category=${category}&discipline=${category}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
    await load();
    setUploading(false);
  }, [projectId, category]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "application/pdf": [".pdf"] },
  });

  async function handleDelete(id: string) {
    if (!confirm("Delete this drawing?")) return;
    await api.delete(`/projects/${projectId}/drawings/${id}`);
    setDrawings((d) => d.filter((x) => x.id !== id));
  }

  async function handleView(drawing: Drawing) {
    const { data } = await api.get(`/projects/${projectId}/drawings/${drawing.id}/file`, { responseType: "blob" });
    const url = URL.createObjectURL(data);
    setViewUrl(url);
    setViewName(drawing.filename);
  }

  function closeViewer() {
    if (viewUrl) URL.revokeObjectURL(viewUrl);
    setViewUrl(null);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex min-h-0">
        {/* Main content */}
        <div className="flex-1 p-6 space-y-5 overflow-auto">
          <h2 className="text-title-sm text-on-surface">Drawings</h2>

          {/* Upload */}
          <div className="card space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Category</label>
              <select className="input w-44" value={category} onChange={(e) => setCategory(e.target.value as DrawingCategory)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                ${isDragActive ? "border-accent bg-orange-50" : "border-outline-variant hover:border-primary"}`}
            >
              <input {...getInputProps()} />
              <Upload size={32} className="mx-auto text-outline mb-3" />
              <p className="text-on-surface font-medium">
                {isDragActive ? "Drop files here" : "Drag & drop PDF files, or click to browse"}
              </p>
              <p className="text-on-surface-variant text-sm mt-1">Max 100MB per file · PDF only</p>
            </div>
            {uploading && (
              <p className="text-sm text-accent animate-pulse flex items-center gap-2">
                <Upload size={14} /> Uploading and processing…
              </p>
            )}
          </div>

          {/* Drawing list */}
          {drawings.length > 0 && (
            <div className="panel overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Category</th>
                    <th className="num">Size</th>
                    <th className="num">Pages</th>
                    <th>Uploaded</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {drawings.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <span className="flex items-center gap-2 font-medium text-on-surface">
                          <FileText size={14} className="text-accent shrink-0" /> {d.filename}
                        </span>
                      </td>
                      <td><span className="chip chip-draft">{d.category}</span></td>
                      <td className="num text-on-surface-variant">{d.file_size_mb?.toFixed(1)} MB</td>
                      <td className="num text-on-surface-variant">{d.page_count ?? "—"}</td>
                      <td className="text-on-surface-variant">{new Date(d.uploaded_at).toLocaleDateString()}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleView(d)} className="btn-ghost py-1 px-2 flex items-center gap-1 text-primary" aria-label="View">
                            <Eye size={14} /> View
                          </button>
                          <button onClick={() => handleDelete(d.id)} className="btn-ghost py-1 px-2 text-error" aria-label="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PDF Viewer panel */}
        {viewUrl && (
          <div className="w-[55%] border-l border-outline-variant flex flex-col bg-white">
            <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Drawing Viewer</p>
                <p className="text-sm font-medium text-on-surface">{viewName}</p>
              </div>
              <button onClick={closeViewer} className="btn-ghost p-1.5" aria-label="Close viewer">
                <X size={16} />
              </button>
            </div>
            <iframe src={viewUrl} className="flex-1 w-full" title="PDF Viewer" />
          </div>
        )}
      </div>
    </div>
  );
}
