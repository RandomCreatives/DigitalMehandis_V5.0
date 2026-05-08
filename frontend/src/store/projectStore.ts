import { create } from "zustand";
import { api } from "@/lib/api";
import type { Project, ProjectCreate } from "@/types";

interface ProjectState {
  projects: Project[];
  current: Project | null;
  loading: boolean;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (data: ProjectCreate) => Promise<Project>;
  updateProject: (id: string, data: Partial<ProjectCreate>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  current: null,
  loading: false,

  fetchProjects: async () => {
    set({ loading: true });
    const { data } = await api.get("/projects");
    set({ projects: data, loading: false });
  },

  fetchProject: async (id) => {
    const { data } = await api.get(`/projects/${id}`);
    set({ current: data });
  },

  createProject: async (payload) => {
    const { data } = await api.post("/projects", payload);
    set((s) => ({ projects: [data, ...s.projects] }));
    return data;
  },

  updateProject: async (id, payload) => {
    const { data } = await api.put(`/projects/${id}`, payload);
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? data : p)),
      current: s.current?.id === id ? data : s.current,
    }));
  },

  deleteProject: async (id) => {
    await api.delete(`/projects/${id}`);
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
  },
}));
