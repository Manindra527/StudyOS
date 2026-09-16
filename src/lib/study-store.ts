import { useCallback, useEffect, useState } from "react";
import { normalizeSection, type Workspace, type Topic } from "./study-types";
import { apiUrl } from "./api-client";

const LEGACY_KEY = "study-os:workspaces";
const LEGACY_ACTIVE_KEY = "study-os:active";
const MIGRATED_KEY = "study-os:mongo-migrated";
type Snapshot = { workspaces: Workspace[]; activeWorkspaceId: string | null };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), { headers: { "Content-Type": "application/json", ...(options?.headers || {}) }, ...options });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(typeof body.message === "string" ? body.message : "Unable to save your study data."); }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

function legacyData(): Snapshot | null {
  try { const workspaces = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]"); if (!Array.isArray(workspaces) || !workspaces.length) return null; return { workspaces: workspaces.map((workspace) => ({ ...workspace, section: normalizeSection(workspace?.section) })), activeWorkspaceId: localStorage.getItem(LEGACY_ACTIVE_KEY) }; } catch { return null; }
}

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      let snapshot = await request<Snapshot>("/api/workspaces");
      // Browser storage is read once only for migration; MongoDB is the source of truth afterwards.
      if (!snapshot.workspaces.length && !localStorage.getItem(MIGRATED_KEY)) { const legacy = legacyData(); if (legacy) snapshot = await request<Snapshot>("/api/migration", { method: "POST", body: JSON.stringify(legacy) }); localStorage.setItem(MIGRATED_KEY, "true"); }
      setWorkspaces(snapshot.workspaces); setActiveId(snapshot.activeWorkspaceId && snapshot.workspaces.some((workspace) => workspace.id === snapshot.activeWorkspaceId) ? snapshot.activeWorkspaceId : snapshot.workspaces[0]?.id || null); setStorageError(false);
    } catch (error) { console.error(error); setStorageError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const saveWorkspace = useCallback(async (next: Workspace, previous: Workspace[]) => {
    setWorkspaces(previous.map((workspace) => workspace.id === next.id ? next : workspace));
    try { const saved = await request<Workspace>(`/api/workspaces/${encodeURIComponent(next.id)}`, { method: "PUT", body: JSON.stringify(next) }); setWorkspaces((current) => current.map((workspace) => workspace.id === saved.id ? saved : workspace)); setStorageError(false); } catch (error) { console.error(error); setWorkspaces(previous); setStorageError(true); }
  }, []);
  const addWorkspace = useCallback((workspace: Workspace) => {
    setWorkspaces((current) => [workspace, ...current]); setActiveId(workspace.id);
    void request<Workspace>("/api/workspaces", { method: "POST", body: JSON.stringify(workspace) }).then((saved) => { setWorkspaces((current) => current.map((item) => item.id === saved.id ? saved : item)); setStorageError(false); }).catch((error) => { console.error(error); setWorkspaces((current) => current.filter((item) => item.id !== workspace.id)); setStorageError(true); });
  }, []);
  const updateWorkspace = useCallback((id: string, updater: (workspace: Workspace) => Workspace) => {
    setWorkspaces((current) => { const next = current.map((workspace) => workspace.id === id ? updater(workspace) : workspace); const changed = next.find((workspace) => workspace.id === id); if (changed) void saveWorkspace(changed, current); return next; });
  }, [saveWorkspace]);
  const renameSection = useCallback((section: string, nextSection: string) => {
    const normalized = normalizeSection(nextSection); const previous = workspaces; setWorkspaces(previous.map((workspace) => workspace.section === section ? { ...workspace, section: normalized } : workspace));
    void request<Snapshot>(`/api/sections/${encodeURIComponent(section)}`, { method: "PATCH", body: JSON.stringify({ name: normalized }) }).then((snapshot) => { setWorkspaces(snapshot.workspaces); setStorageError(false); }).catch((error) => { console.error(error); setWorkspaces(previous); setStorageError(true); });
  }, [workspaces]);
  const removeWorkspace = useCallback((id: string) => {
    const previous = workspaces; const next = previous.filter((workspace) => workspace.id !== id); const nextActive = activeId === id ? next[0]?.id || null : activeId; setWorkspaces(next); setActiveId(nextActive);
    void request<Snapshot>(`/api/workspaces/${encodeURIComponent(id)}`, { method: "DELETE" }).then((snapshot) => { setWorkspaces(snapshot.workspaces); setActiveId(snapshot.activeWorkspaceId); setStorageError(false); }).catch((error) => { console.error(error); setWorkspaces(previous); setActiveId(activeId); setStorageError(true); });
  }, [workspaces, activeId]);
  const selectWorkspace = useCallback((id: string) => { setActiveId(id); void request<void>("/api/profile/active-workspace", { method: "PATCH", body: JSON.stringify({ activeWorkspaceId: id }) }).then(() => setStorageError(false)).catch((error) => { console.error(error); setStorageError(true); }); }, []);
  const restoreWorkspaces = useCallback(async (next: Workspace[], nextActiveId: string | null, mode: "replace" | "merge" = "replace") => {
    try { const snapshot = await request<Snapshot>("/api/data/import", { method: "POST", body: JSON.stringify({ workspaces: next, activeWorkspaceId: nextActiveId, mode }) }); setWorkspaces(snapshot.workspaces); setActiveId(snapshot.activeWorkspaceId); setStorageError(false); return true; } catch (error) { console.error(error); setStorageError(true); return false; }
  }, []);
  const exportData = useCallback(() => request<Snapshot>("/api/data/export"), []);
  const active = workspaces.find((workspace) => workspace.id === activeId) || null;
  return { workspaces, active, activeId, loading, storageError, retryStorage: load, addWorkspace, updateWorkspace, renameSection, removeWorkspace, selectWorkspace, restoreWorkspaces, exportData };
}
export function mapTopics(topics: Topic[], fn: (topic: Topic) => Topic): Topic[] { return topics.map((topic) => { const next = fn(topic); return { ...next, subtopics: mapTopics(next.subtopics, fn) }; }); }
