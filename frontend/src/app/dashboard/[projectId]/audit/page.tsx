"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { History, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AuditLogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [logs, setLogs] = useState<any[]>([]);
  const [category, setCategory] = useState<string | null>(null);

  async function load() {
    const url = `/projects/${projectId}/audit${category ? `?category=${category}` : ""}`;
    const { data } = await api.get(url);
    setLogs(data);
  }

  useEffect(() => { load(); }, [projectId, category]);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title-sm text-on-surface flex items-center gap-2">
            <History size={20} /> Project Audit Log
          </h2>
          <p className="text-sm text-on-surface-variant">Traceability and change history for all project data.</p>
        </div>
        <div className="flex items-center gap-2">
           <Filter size={15} className="text-on-surface-variant" />
           <select className="input text-xs w-32" onChange={(e) => setCategory(e.target.value || null)}>
              <option value="">All Categories</option>
              <option value="DRAWING">Drawing</option>
              <option value="MEASUREMENT">Measurement</option>
              <option value="BOQ">BOQ</option>
              <option value="BBS">BBS</option>
           </select>
        </div>
      </div>

      <div className="space-y-4">
        {logs.map((log) => (
          <div key={log.id} className="panel p-4 flex gap-4 items-start">
            <div className={cn(
              "w-2 h-12 rounded-full shrink-0",
              log.action_category === "DRAWING" ? "bg-blue-400" :
              log.action_category === "BOQ" ? "bg-green-400" :
              log.action_category === "MEASUREMENT" ? "bg-orange-400" : "bg-purple-400"
            )} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                   {log.action_category} • {log.action_type}
                </span>
                <span className="text-xs text-on-surface-variant">
                   {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-sm font-medium text-on-surface mt-1">{log.description}</p>
              {log.payload && (
                <details className="mt-2">
                  <summary className="text-xs text-primary cursor-pointer hover:underline">View Details</summary>
                  <pre className="mt-2 p-2 bg-surface-variant rounded text-[10px] overflow-auto">
                    {JSON.stringify(JSON.parse(log.payload), null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-center py-20 text-on-surface-variant italic">No audit logs found.</div>
        )}
      </div>
    </div>
  );
}
