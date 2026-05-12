"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Target, FileText, CheckCircle, XCircle, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CalibrationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [drawings, setDrawings] = useState<any[]>([]);

  async function load() {
    const { data } = await api.get(`/projects/${projectId}/drawings`);
    setDrawings(data);
  }

  useEffect(() => { load(); }, [projectId]);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto w-full">
      <div>
        <h2 className="text-title-sm text-on-surface flex items-center gap-2">
          <Target size={20} /> Drawing Calibration
        </h2>
        <p className="text-sm text-on-surface-variant">Calibrate your PDF drawings to enable accurate on-canvas measurements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {drawings.map((d) => (
          <div key={d.id} className="panel p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-surface-variant flex items-center justify-center text-on-surface-variant">
                <FileText size={20} />
              </div>
              <div>
                <p className="font-bold text-on-surface truncate max-w-[200px]">{d.filename}</p>
                <div className="flex items-center gap-2 mt-1">
                   {d.scale ? (
                     <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase">
                       <CheckCircle size={10} /> Calibrated ({d.scale})
                     </span>
                   ) : (
                     <span className="flex items-center gap-1 text-[10px] font-bold text-orange-500 uppercase">
                       <XCircle size={10} /> Not Calibrated
                     </span>
                   )}
                </div>
              </div>
            </div>
            <button className="btn-secondary py-2 px-3 flex items-center gap-2 text-xs">
              <Settings2 size={14} /> Configure
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
