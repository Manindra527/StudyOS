export type CategoryColor = "amber" | "sky" | "peach" | "mint" | "rose" | "violet";
export type CategoryIcon =
  | "timer"
  | "calculator"
  | "chart"
  | "book"
  | "flask"
  | "globe"
  | "code"
  | "brain"
  | "target"
  | "pen";

export interface Topic {
  id: string;
  name: string;
  done: boolean;
  favorite?: boolean;
  subtopics: Topic[];
}

export interface Category {
  id: string;
  name: string;
  icon: CategoryIcon;
  color: CategoryColor;
  topics: Topic[];
}

export interface Workspace {
  id: string;
  title: string;
  subtitle: string;
  createdAt: number;
  categories: Category[];
}

export interface RawAnalysis {
  title: string;
  subtitle: string;
  categories: {
    name: string;
    icon: CategoryIcon;
    color: CategoryColor;
    topics: { name: string; subtopics?: string[] }[];
  }[];
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function fromRaw(raw: RawAnalysis): Workspace {
  return {
    id: uid(),
    title: raw.title || "Untitled",
    subtitle: raw.subtitle || "",
    createdAt: Date.now(),
    categories: (raw.categories || []).map((c) => ({
      id: uid(),
      name: c.name,
      icon: c.icon || "book",
      color: c.color || "violet",
      topics: (c.topics || []).map((t) => ({
        id: uid(),
        name: t.name,
        done: false,
        favorite: false,
        subtopics: (t.subtopics || []).map((s) => ({
          id: uid(),
          name: s,
          done: false,
          favorite: false,
          subtopics: [],
        })),
      })),
    })),
  };
}

export function countTopics(cat: Category) {
  let total = 0;
  let done = 0;
  const walk = (ts: Topic[]) => {
    for (const t of ts) {
      total++;
      if (t.done) done++;
      if (t.subtopics.length) walk(t.subtopics);
    }
  };
  walk(cat.topics);
  return { total, done };
}

export function workspaceProgress(w: Workspace) {
  let total = 0;
  let done = 0;
  for (const c of w.categories) {
    const r = countTopics(c);
    total += r.total;
    done += r.done;
  }
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}