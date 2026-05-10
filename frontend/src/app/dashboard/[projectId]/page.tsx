"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/dashboard/${projectId}/drawings`);
  }, [projectId, router]);

  return null;
}
