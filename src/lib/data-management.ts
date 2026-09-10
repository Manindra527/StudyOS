import * as XLSX from "xlsx";
import { normalizeSection, workspaceProgress, type Category, type Topic, type Workspace } from "./study-types";

export interface StudyExportBundle {
  format: "study-os";
  version: 1;
  exportedAt: string;
  activeWorkspaceId: string | null;
  workspaces: Workspace[];
  progress: Record<string, ReturnType<typeof workspaceProgress>>;
}

export type ImportedData = Pick<StudyExportBundle, "workspaces" | "activeWorkspaceId">;

const categoryIcons = new Set(["timer", "calculator", "chart", "book", "flask", "globe", "code", "brain", "target", "pen"]);
const categoryColors = new Set(["amber", "sky", "peach", "mint", "rose", "violet"]);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTopic(value: unknown): value is Topic {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.done === "boolean" &&
    (value.favorite === undefined || typeof value.favorite === "boolean") &&
    Array.isArray(value.subtopics) &&
    value.subtopics.every(isTopic)
  );
}

function isCategory(value: unknown): value is Category {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.icon === "string" &&
    categoryIcons.has(value.icon) &&
    typeof value.color === "string" &&
    categoryColors.has(value.color) &&
    Array.isArray(value.topics) &&
    value.topics.every(isTopic)
  );
}

function isWorkspace(value: unknown): value is Workspace {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.section === "string" &&
    typeof value.title === "string" &&
    typeof value.subtitle === "string" &&
    typeof value.createdAt === "number" &&
    Array.isArray(value.categories) &&
    value.categories.every(isCategory)
  );
}

function validateWorkspaces(value: unknown): Workspace[] | null {
  if (!Array.isArray(value) || !value.every(isWorkspace)) return null;
  const workspaces = clone(value).map((workspace) => ({
    ...workspace,
    section: normalizeSection(workspace.section),
  }));
  const ids = new Set<string>();
  if (workspaces.some((workspace) => ids.has(workspace.id) || (ids.add(workspace.id), false))) return null;
  return workspaces;
}

export function createExportBundle(workspaces: Workspace[], activeWorkspaceId: string | null): StudyExportBundle {
  return {
    format: "study-os",
    version: 1,
    exportedAt: new Date().toISOString(),
    activeWorkspaceId,
    workspaces: clone(workspaces),
    progress: Object.fromEntries(workspaces.map((workspace) => [workspace.id, workspaceProgress(workspace)])),
  };
}

export function parseJsonImport(text: string): ImportedData | null {
  try {
    const parsed: unknown = JSON.parse(text);
    const value = Array.isArray(parsed) ? { workspaces: parsed, activeWorkspaceId: null } : parsed;
    if (!isRecord(value)) return null;
    const workspaces = validateWorkspaces(value.workspaces);
    if (!workspaces) return null;
    const activeWorkspaceId = typeof value.activeWorkspaceId === "string" && workspaces.some((w) => w.id === value.activeWorkspaceId)
      ? value.activeWorkspaceId
      : null;
    return { workspaces, activeWorkspaceId };
  } catch (error) {
    console.error("Study OS JSON import failed", error);
    return null;
  }
}

function flattenTopics(workspace: Workspace) {
  const rows: Array<Record<string, string | boolean | number>> = [];
  const visit = (topics: Topic[], categoryId: string, parentTopicId: string | null) => {
    topics.forEach((topic, index) => {
      rows.push({
        workspaceId: workspace.id,
        categoryId,
        id: topic.id,
        parentTopicId: parentTopicId || "",
        name: topic.name,
        done: topic.done,
        favorite: Boolean(topic.favorite),
        order: index,
      });
      visit(topic.subtopics, categoryId, topic.id);
    });
  };
  workspace.categories.forEach((category) => visit(category.topics, category.id, null));
  return rows;
}

export function createExcelWorkbook(workspaces: Workspace[], activeWorkspaceId: string | null): Blob {
  const workbook = XLSX.utils.book_new();
  const workspaceRows = workspaces.map((workspace) => {
    const progress = workspaceProgress(workspace);
    return {
      id: workspace.id,
      section: workspace.section,
      title: workspace.title,
      subtitle: workspace.subtitle,
      createdAt: new Date(workspace.createdAt).toISOString(),
      totalTopics: progress.total,
      completedTopics: progress.done,
      progressPercent: progress.pct,
      active: workspace.id === activeWorkspaceId,
    };
  });
  const categoryRows = workspaces.flatMap((workspace) =>
    workspace.categories.map((category, order) => ({
      workspaceId: workspace.id,
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      order,
    })),
  );
  const topicRows = workspaces.flatMap(flattenTopics);
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(workspaceRows), "Workspaces");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(categoryRows), "Categories");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(topicRows), "Topics");
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function textCell(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function parseExcelRows(workbook: XLSX.WorkBook): ImportedData | null {
  const workspaceSheet = workbook.Sheets.Workspaces;
  const categorySheet = workbook.Sheets.Categories;
  const topicSheet = workbook.Sheets.Topics;
  if (!workspaceSheet || !categorySheet || !topicSheet) return null;
  const workspaceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workspaceSheet, { defval: "" });
  const categoryRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(categorySheet, { defval: "" });
  const topicRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(topicSheet, { defval: "" });
  if (workspaceRows.length === 0) return { workspaces: [], activeWorkspaceId: null };

  const topicsByCategory = new Map<string, Array<Record<string, unknown>>>();
  for (const row of topicRows) {
    const categoryId = textCell(row.categoryId);
    if (!categoryId || !textCell(row.id) || !textCell(row.name)) return null;
    const rows = topicsByCategory.get(categoryId) || [];
    rows.push(row);
    topicsByCategory.set(categoryId, rows);
  }

  const buildTopics = (rows: Array<Record<string, unknown>>): Topic[] | null => {
    const nodes = new Map<string, Topic & { parentTopicId: string }>();
    rows.forEach((row) => {
      const id = textCell(row.id);
      if (nodes.has(id)) return;
      nodes.set(id, {
        id,
        name: textCell(row.name),
        done: row.done === true || textCell(row.done).toLowerCase() === "true",
        favorite: row.favorite === true || textCell(row.favorite).toLowerCase() === "true",
        subtopics: [],
        parentTopicId: textCell(row.parentTopicId),
      });
    });
    if (nodes.size !== rows.length) return null;
    const roots: Array<Topic & { parentTopicId: string }> = [];
    for (const node of nodes.values()) {
      if (!node.parentTopicId) roots.push(node);
      else {
        const parent = nodes.get(node.parentTopicId);
        if (!parent || parent.id === node.id) return null;
        parent.subtopics.push(node);
      }
    }
    return roots.map(({ parentTopicId: _parentTopicId, ...topic }) => ({
      ...topic,
      subtopics: topic.subtopics.map((child) => child),
    }));
  };

  const workspaces: Workspace[] = [];
  const workspaceIds = new Set<string>();
  for (const row of workspaceRows) {
    const id = textCell(row.id);
    if (!id || workspaceIds.has(id)) return null;
    workspaceIds.add(id);
    const categories = categoryRows
      .filter((category) => textCell(category.workspaceId) === id)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((category) => {
        const icon = textCell(category.icon);
        const color = textCell(category.color);
        const topics = buildTopics(topicsByCategory.get(textCell(category.id)) || []);
        if (!textCell(category.id) || !textCell(category.name) || !categoryIcons.has(icon) || !categoryColors.has(color) || !topics) return null;
        return { id: textCell(category.id), name: textCell(category.name), icon: icon as Category["icon"], color: color as Category["color"], topics };
      });
    if (categories.some((category) => category === null)) return null;
    workspaces.push({
      id,
      section: normalizeSection(textCell(row.section)),
      title: textCell(row.title),
      subtitle: textCell(row.subtitle),
      createdAt: Date.parse(textCell(row.createdAt)) || Date.now(),
      categories: categories as Category[],
    });
  }
  const activeWorkspaceId = workspaces.some((workspace) => workspace.id === workspaceRows.find((row) => row.active === true || textCell(row.active).toLowerCase() === "true")?.id)
    ? textCell(workspaceRows.find((row) => row.active === true || textCell(row.active).toLowerCase() === "true")?.id)
    : null;
  return { workspaces, activeWorkspaceId };
}

export async function parseExcelImport(file: File): Promise<ImportedData | null> {
  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    return parseExcelRows(workbook);
  } catch (error) {
    console.error("Study OS Excel import failed", error);
    return null;
  }
}

export function downloadFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(workspaces: Workspace[], activeWorkspaceId: string | null) {
  const bundle = createExportBundle(workspaces, activeWorkspaceId);
  downloadFile(new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }), "study-os-data.json");
}