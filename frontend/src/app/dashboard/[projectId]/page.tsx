"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useProjectStore } from "@/store/projectStore";
import { FileText, Table2, BarChart3, Layers, Sparkles } from "lucide-react";

const TABS = [
  { label: "Drawings", href: "drawings", icon: FileText, desc: "Upload & view PDF drawings" },
  { label: "Suggestions", href: "suggestions", icon: Sparkles, desc: "Review auto-extracted quantities" },
  { label: "Take-off", href: "takeoff", icon: Table2, desc: "Manual quantity take-off sheet" },
  { label: "BOQ", href: "boq", icon: Layers, desc: "Bill of Quantities" },
  { label: "BBS", href: "bbs", icon: BarChart3, desc: "Bar Bending Schedule" },
];

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { current, fetchProject } = useProjectStore();

  useEffect(() => { fetchProject(projectId); }, [projectId, fetchProject]);

  if (!current) return <div className="p-8 text-gray-400">Loading…</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{current.name}</h1>
        <p className="text-gray-500 text-sm mt-1">{current.location} · {current.code_of_practice} · {current.currency}</p>
        {current.description && <p className="text-gray-600 text-sm mt-2">{current.description}</p>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {TABS.map(({ label, href, icon: Icon, desc }) => (
          <Link key={href} href={`/dashboard/${projectId}/${href}`} className="card hover:shadow-md transition-shadow flex items-start gap-4 cursor-pointer">
            <div className="bg-[#1F4E79]/10 p-3 rounded-lg">
              <Icon size={20} className="text-[#1F4E79]" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{label}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
