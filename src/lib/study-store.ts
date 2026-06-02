import { useEffect, useState, useCallback } from "react";
import type { Workspace, Topic } from "./study-types";

const KEY = "study-os:workspaces";
const ACTIVE_KEY = "study-os:active";

function load(): Workspace[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function save(ws: Workspace[]) {
  localStorage.setItem(KEY, JSON.stringify(ws));
}

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const ws = load();
    setWorkspaces(ws);
    const a = localStorage.getItem(ACTIVE_KEY);
    setActiveId(a || ws[0]?.id || null);
  }, []);

  const persist = useCallback((next: Workspace[]) => {
    setWorkspaces(next);
    save(next);
  }, []);

  const addWorkspace = useCallback(
    (w: Workspace) => {
      const next = [w, ...workspaces];
      persist(next);
      setActiveId(w.id);
      localStorage.setItem(ACTIVE_KEY, w.id);
    },
    [workspaces, persist],
  );

  const updateWorkspace = useCallback(
    (id: string, updater: (w: Workspace) => Workspace) => {
      const next = workspaces.map((w) => (w.id === id ? updater(w) : w));
      persist(next);
    },
    [workspaces, persist],
  );

  const removeWorkspace = useCallback(
    (id: string) => {
      const next = workspaces.filter((w) => w.id !== id);
      persist(next);
      if (activeId === id) {
        const newActive = next[0]?.id || null;
        setActiveId(newActive);
        if (newActive) localStorage.setItem(ACTIVE_KEY, newActive);
        else localStorage.removeItem(ACTIVE_KEY);
      }
    },
    [workspaces, persist, activeId],
  );

  const selectWorkspace = useCallback((id: string) => {
    setActiveId(id);
    localStorage.setItem(ACTIVE_KEY, id);
  }, []);

  const active = workspaces.find((w) => w.id === activeId) || null;

  return {
    workspaces,
    active,
    activeId,
    addWorkspace,
    updateWorkspace,
    removeWorkspace,
    selectWorkspace,
  };
}

export function mapTopics(topics: Topic[], fn: (t: Topic) => Topic): Topic[] {
  return topics.map((t) => {
    const next = fn(t);
    return { ...next, subtopics: mapTopics(next.subtopics, fn) };
  });
}