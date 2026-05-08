"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { api } from "@/lib/api";
import type { Drawing, DrawingCategory } from "@/types";
import { Upload, Trash2, Eye } from "lucide-react";

const CATEGORIES: DrawingCategory[] = ["ARCHITECTURAL", "STRUCTURAL", "ELECTRICAL", "SANITARY"];

export default function DrawingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<DrawingCategory>("ARCHITECTURAL");
  const [viewUrl, setViewUrl] = useState<string | null>(null);

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
      await api.post(`/projects/${projectId}/drawings?category=${category}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
    await load();
    setUploading(false);
  }, [projectId, category]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "application/pdf": [".pdf"] } });

  async function handleDelete(id: string) {
    if (!confirm("Delete this drawing?")) return;
    await api.delete(`/projects/${projectId}/drawings/${id}`);
    setDrawings((d) => d.filter((x) => x.id !== id));
  }

  function handleView(id: string) {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/projects/${projectId}/drawings/${id}/file`;
    setViewUrl(url);
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Drawings</h1>

      {/* Upload area */}
      <div className="card space-y-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Category:</label>
          <select className="input w-48" value={category} onChange={(e) => setCategory(e.target.value as DrawingCategory)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragActive ? "border-[#1F4E79] bg-blue-50" : "border-gray-300 hover:border-[#1F4E79]"}`}
        >
          <input {...getInputProps()} />
          <Upload size={32} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 font-medium">{isDragActive ? "Drop files here" : "Drag & drop PDF files, or click to browse"}</p>
          <p className="text-gray-400 text-sm mt-1">Max 100MB per file · PDF only (Phase 1)</p>
        </div>
        {uploading && <p className="text-sm text-[#1F4E79] animate-pulse">Uploading…</p>}
      </div>

      {/* Drawing list */}
      {drawings.length > 0 && (
        <div className="card">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Filename</th>
                <th className="pb-2">Category</th>
                <th className="pb-2">Size</th>
                <th className="pb-2">Pages</th>
                <th className="pb-2">Uploaded</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {drawings.map((d) => (
                <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 font-medium text-gray-800">{d.filename}</td>
                  <td className="py-2 text-gray-500">{d.category}</td>
                  <td className="py-2 text-gray-500">{d.file_size_mb?.toFixed(1)} MB</td>
                  <td className="py-2 text-gray-500">{d.page_count}</td>
                  <td className="py-2 text-gray-400">{new Date(d.uploaded_at).toLocaleDateString()}</td>
                  <td className="py-2 flex gap-2">
                    <button onClick={() => handleView(d.id)} className="text-[#1F4E79] hover:opacity-70" aria-label="View drawing"><Eye size={16} /></button>
                    <button onClick={() => handleDelete(d.id)} className="text-red-400 hover:text-red-600" aria-label="Delete drawing"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PDF Viewer */}
      {viewUrl && (
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-800">Drawing Viewer</h2>
            <button onClick={() => setViewUrl(null)} className="text-gray-400 hover:text-gray-600 text-sm">Close</button>
          </div>
          <iframe src={viewUrl} className="w-full h-[70vh] rounded-lg border" title="PDF Viewer" />
        </div>
      )}
    </div>
  );
}
