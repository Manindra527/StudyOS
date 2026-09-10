import { useEffect, useState, useCallback } from "react";
import { normalizeSection, type Workspace, type Topic } from "./study-types";

const KEY = "study-os:workspaces";
const ACTIVE_KEY = "study-os:active";

function load(): Workspace[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((workspace) => ({
      ...workspace,
      section: normalizeSection(workspace?.section),
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
}
function save(ws: Workspace[]) {
  localStorage.setItem(KEY, JSON.stringify(ws));
}

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    try {
      const ws = load();
      setWorkspaces(ws);
      const a = localStorage.getItem(ACTIVE_KEY);
      setActiveId(a || ws[0]?.id || null);
    } catch (error) {
      console.error(error);
      setStorageError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const persist = useCallback((next: Workspace[]) => {
    try {
      save(next);
      setWorkspaces(next);
      setStorageError(false);
    } catch (error) {
      console.error(error);
      setStorageError(true);
    }
  }, []);

  const addWorkspace = useCallback(
    (w: Workspace) => {
      const next = [w, ...workspaces];
      persist(next);
      setActiveId(w.id);
      try {
        localStorage.setItem(ACTIVE_KEY, w.id);
      } catch (error) {
        console.error(error);
        setStorageError(true);
      }
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

  const renameSection = useCallback(
    (section: string, nextSection: string) => {
      const next = workspaces.map((workspace) =>
        workspace.section === section ? { ...workspace, section: nextSection } : workspace,
      );
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
        try {
          if (newActive) localStorage.setItem(ACTIVE_KEY, newActive);
          else localStorage.removeItem(ACTIVE_KEY);
        } catch (error) {
          console.error(error);
          setStorageError(true);
        }
      }
    },
    [workspaces, persist, activeId],
  );

  const selectWorkspace = useCallback((id: string) => {
    setActiveId(id);
    try {
      localStorage.setItem(ACTIVE_KEY, id);
    } catch (error) {
      console.error(error);
      setStorageError(true);
    }
  }, []);

  const restoreWorkspaces = useCallback((next: Workspace[], nextActiveId: string | null) => {
    try {
      save(next);
      if (nextActiveId) localStorage.setItem(ACTIVE_KEY, nextActiveId);
      else localStorage.removeItem(ACTIVE_KEY);
      setWorkspaces(next);
      setActiveId(nextActiveId);
      setStorageError(false);
      return true;
    } catch (error) {
      console.error(error);
      setStorageError(true);
      return false;
    }
  }, []);

  const active = workspaces.find((w) => w.id === activeId) || null;

  return {
    workspaces,
    active,
    activeId,
    loading,
    storageError,
    retryStorage: () => window.location.reload(),
    addWorkspace,
    updateWorkspace,
    renameSection,
    removeWorkspace,
    selectWorkspace,
    restoreWorkspaces,
  };
}

export function mapTopics(topics: Topic[], fn: (t: Topic) => Topic): Topic[] {
  return topics.map((t) => {
    const next = fn(t);
    return { ...next, subtopics: mapTopics(next.subtopics, fn) };
  });
}