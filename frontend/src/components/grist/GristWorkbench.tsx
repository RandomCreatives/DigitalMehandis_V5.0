"use client";

import React from "react";
import { ExternalLink, AlertCircle } from "lucide-react";

interface GristWorkbenchProps {
  docId: string | null;
}

export function GristWorkbench({ docId }: GristWorkbenchProps) {
  if (!docId) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-surface-low rounded-2xl border border-dashed border-outline-variant">
        <AlertCircle size={40} className="text-outline mb-4" />
        <h3 className="text-title-sm">Grist Workbench Not Initialized</h3>
        <p className="text-xs text-on-surface-variant max-w-xs text-center mt-2">
          This project does not have an associated Grist document.
          Please contact support or try recreating the project.
        </p>
      </div>
    );
  }

  const gristUrl = `http://localhost:8484/doc/${docId}`;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-outline-variant shadow-sm">
      <div className="bg-surface-low px-4 py-2 border-b border-outline-variant flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Live Spreadsheet Sync</span>
        </div>
        <a
          href={gristUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-bold text-accent flex items-center gap-1 hover:underline"
        >
          Open in New Tab <ExternalLink size={10} />
        </a>
      </div>

      <div className="flex-1 min-h-[700px] relative">
        <iframe
          src={gristUrl}
          className="absolute inset-0 w-full h-full border-none"
          allow="clipboard-read; clipboard-write"
          title="Grist Workbench"
        />
      </div>
    </div>
  );
}
