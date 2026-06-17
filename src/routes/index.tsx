import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Home,
  ListChecks,
  BarChart3,
  Folder,
  Star,
  Settings,
  Search,
  Filter,
  Target,
  Plus,
  Trash2,
  Sparkles,
} from "lucide-react";
import { useWorkspaces } from "@/lib/study-store";
import { workspaceProgress, countTopics, type Workspace } from "@/lib/study-types";
import { Uploader } from "@/components/study/Uploader";
import { CategoryCard } from "@/components/study/CategoryCard";
import { MentorChat } from "@/components/study/MentorChat";
import { ConfirmDialog, PromptDialog } from "@/components/study/InAppDialogs";
import type { CategoryColor, CategoryIcon } from "@/lib/study-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Study OS — Turn anything into a learning workspace" },
      {
        name: "description",
        content:
          "Upload notes, PDFs, slides, or images and let AI transform them into an organized study dashboard with checklists, progress, and an AI mentor.",
      },
      { property: "og:title", content: "Study OS — AI-powered learning workspaces" },
      {
        property: "og:description",
        content:
          "Messy learning materials become clean interactive dashboards automatically.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const {
    workspaces,
    active,
    addWorkspace,
    updateWorkspace,
    removeWorkspace,
    selectWorkspace,
  } = useWorkspaces();
  const [search, setSearch] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [showFolder, setShowFolder] = useState(true);
  const [showInsights, setShowInsights] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const [addCatOpen, setAddCatOpen] = useState(false);

  const catColors: CategoryColor[] = ["amber", "sky", "peach", "mint", "rose", "violet"];
  const catIcons: CategoryIcon[] = ["book", "brain", "target", "chart", "flask", "code", "pen", "globe"];

  function addCategory(name: string) {
    if (!active) return;
    const idx = active.categories.length;
    updateWorkspace(active.id, (w) => ({
      ...w,
      categories: [
        ...w.categories,
        {
          id: Math.random().toString(36).slice(2, 10),
          name,
          color: catColors[idx % catColors.length],
          icon: catIcons[idx % catIcons.length],
          topics: [],
        },
      ],
    }));
  }

  const progress = useMemo(() => (active ? workspaceProgress(active) : null), [active]);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-16 shrink-0 border-r border-border bg-card flex flex-col items-center py-5 gap-2">
        <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center mb-3">
          <ListChecks className="size-5" />
        </div>
        <SideIcon
          icon={Home}
          active={(!active || showUploader) && !showFolder && !showInsights}
          onClick={() => {
            setShowUploader(true);
            setShowFolder(false);
            setShowInsights(false);
          }}
        />
        <SideIcon
          icon={ListChecks}
          active={!!active && !showUploader && !showFolder && !showInsights}
          onClick={() => {
            setShowUploader(false);
            setShowFolder(false);
            setShowInsights(false);
          }}
        />
        <SideIcon
          icon={BarChart3}
          active={showInsights}
          onClick={() => {
            setShowInsights(true);
            setShowFolder(false);
            setShowUploader(false);
          }}
        />
        <SideIcon
          icon={Folder}
          active={showFolder}
          onClick={() => {
            setShowFolder(true);
            setShowInsights(false);
          }}
        />
        <div className="flex-1" />
        <SideIcon icon={Settings} />
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        {showInsights ? (
          <InsightsView workspaces={workspaces} />
        ) : showFolder ? (
          <FolderView
            workspaces={workspaces}
            activeId={active?.id}
            onOpen={(id) => {
              selectWorkspace(id);
              setShowFolder(false);
              setShowUploader(false);
            }}
            onDelete={(id, title) => setPendingDelete({ id, title })}
            onNew={() => {
              setShowFolder(false);
              setShowUploader(true);
            }}
          />
        ) : !active || showUploader ? (
          <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-full px-3 py-1 mb-4">
                <Sparkles className="size-3.5 text-primary" /> AI-powered Study Operating System
              </div>
              <h1 className="text-5xl font-bold tracking-tight text-foreground">
                From messy notes to a clean dashboard
              </h1>
              <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
                Drop any syllabus, PDF, slide deck, screenshot or notebook. We'll turn it into an
                interactive learning workspace in seconds.
              </p>
            </motion.div>
            <Uploader
              onWorkspace={(w) => {
                addWorkspace(w);
                setShowUploader(false);
              }}
            />
            {workspaces.length > 0 && (
              <div className="mt-10 w-full max-w-3xl">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                  Your workspaces
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {workspaces.map((w) => {
                    const p = workspaceProgress(w);
                    return (
                      <div
                        key={w.id}
                        className="group bg-card border border-border rounded-2xl p-4 flex items-center gap-3"
                      >
                        <button
                          onClick={() => {
                            selectWorkspace(w.id);
                            setShowUploader(false);
                          }}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="font-semibold truncate">{w.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {w.categories.length} categories · {p.pct}% complete
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setPendingDelete({ id: w.id, title: w.title });
                          }}
                          className="opacity-0 group-hover:opacity-100 size-8 rounded-lg grid place-items-center text-muted-foreground hover:bg-muted hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
              <div className="min-w-0">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground flex items-center gap-3">
                  {active.title}
                  <Target className="size-7 text-primary" />
                </h1>
                <p className="text-muted-foreground mt-2">{active.subtitle || "Your AI-organized study workspace"}</p>
              </div>
              <div className="flex items-center gap-3">
                {progress && (
                  <div className="bg-card border border-border rounded-2xl px-5 py-3 min-w-[260px]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground font-medium">Overall Progress</span>
                      <span className="font-bold">{progress.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-[oklch(0.7_0.2_165)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.pct}%` }}
                      />
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setShowUploader(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90"
                >
                  <Plus className="size-4" /> New
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 mb-6">
              <div className="relative flex-1 max-w-md ml-auto">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search topics…"
                  className="w-full bg-card border border-border rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 ring-primary"
                />
              </div>
              <button
                onClick={() => setFavOnly((f) => !f)}
                className={`size-11 rounded-xl border grid place-items-center transition-colors ${
                  favOnly
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                }`}
                title="Favorites only"
              >
                <Star className="size-4" fill={favOnly ? "currentColor" : "none"} />
              </button>
              <button className="size-11 rounded-xl border border-border bg-card grid place-items-center text-muted-foreground hover:text-foreground">
                <Filter className="size-4" />
              </button>
            </div>

            {/* Categories grid */}
            <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {active.categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  search={search}
                  favoritesOnly={favOnly}
                  onChange={(next) =>
                    updateWorkspace(active.id, (w) => ({
                      ...w,
                      categories: w.categories.map((c) => (c.id === next.id ? next : c)),
                    }))
                  }
                />
              ))}
              <button
                onClick={() => setAddCatOpen(true)}
                className="rounded-2xl border-2 border-dashed border-border bg-card/50 hover:bg-card hover:border-primary transition-colors p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary min-h-[180px]"
              >
                <div className="size-12 rounded-xl bg-muted grid place-items-center">
                  <Plus className="size-6" />
                </div>
                <div className="font-semibold text-sm">Add Category</div>
                <div className="text-xs">Create a new section for this subject</div>
              </button>
            </div>

            {/* How it works */}
            <div className="mt-8 rounded-2xl border border-border bg-accent/40 p-5 flex items-start gap-4">
              <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                <Sparkles className="size-5" />
              </div>
              <div className="text-sm">
                <div className="font-semibold text-foreground">How it works</div>
                <div className="text-muted-foreground mt-0.5">
                  Use <strong>+</strong> to add subtopics, check the box when completed, hit{" "}
                  <strong>★</strong> to favorite, and use the pencil icon to edit any topic.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <MentorChat workspace={active} />

      <ConfirmDialog
        open={!!pendingDelete}
        title={pendingDelete ? `Delete "${pendingDelete.title}"?` : ""}
        description="This workspace and all its progress will be permanently removed."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) removeWorkspace(pendingDelete.id);
          setPendingDelete(null);
        }}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
      />

      <PromptDialog
        open={addCatOpen}
        title="Add category"
        placeholder="Category name"
        confirmLabel="Create"
        onSubmit={(name) => addCategory(name)}
        onOpenChange={setAddCatOpen}
      />
    </div>
  );
}

function SideIcon({
  icon: Icon,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`size-10 rounded-xl grid place-items-center transition-colors ${
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="size-5" />
    </button>
  );
}

function FolderView({
  workspaces,
  activeId,
  onOpen,
  onDelete,
  onNew,
}: {
  workspaces: Workspace[];
  activeId?: string;
  onOpen: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  onNew: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = workspaces.filter((w) =>
    w.title.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
        <div className="min-w-0">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Folder className="size-8 text-primary" /> All Subjects
          </h1>
          <p className="text-muted-foreground mt-2">
            {workspaces.length} {workspaces.length === 1 ? "workspace" : "workspaces"} in your folder
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search subjects…"
              className="w-64 bg-card border border-border rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 ring-primary"
            />
          </div>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90"
          >
            <Plus className="size-4" /> New
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Folder className="size-10 text-muted-foreground mx-auto mb-3" />
          <div className="font-semibold text-foreground">
            {workspaces.length === 0 ? "No subjects yet" : "No matches"}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {workspaces.length === 0
              ? "Upload your first file to create a subject."
              : "Try a different search."}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((w) => {
            const p = workspaceProgress(w);
            const isActive = w.id === activeId;
            return (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group bg-card border rounded-2xl p-5 flex flex-col gap-3 ${
                  isActive ? "border-primary" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => onOpen(w.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="font-semibold truncate text-foreground">{w.title}</div>
                    {w.subtitle && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {w.subtitle}
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => onDelete(w.id, w.title)}
                    className="opacity-0 group-hover:opacity-100 size-8 rounded-lg grid place-items-center text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="text-xs text-muted-foreground">
                  {w.categories.length} categories · {p.done}/{p.total} topics
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-[oklch(0.7_0.2_165)]"
                    style={{ width: `${p.pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{p.pct}% complete</span>
                  <button
                    onClick={() => onOpen(w.id)}
                    className="font-semibold text-primary hover:underline"
                  >
                    Open →
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InsightsView({ workspaces }: { workspaces: Workspace[] }) {
  const stats = workspaces.map((w) => {
    const p = workspaceProgress(w);
    return { w, ...p };
  });
  const totalTopics = stats.reduce((a, s) => a + s.total, 0);
  const totalDone = stats.reduce((a, s) => a + s.done, 0);
  const overallPct = totalTopics ? Math.round((totalDone / totalTopics) * 100) : 0;
  const totalCats = workspaces.reduce((a, w) => a + w.categories.length, 0);
  const completed = stats.filter((s) => s.total > 0 && s.done === s.total).length;
  const sorted = [...stats].sort((a, b) => b.pct - a.pct);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <BarChart3 className="size-8 text-primary" /> Progress Insights
        </h1>
        <p className="text-muted-foreground mt-2">
          A bird's-eye view of every workspace and how far you've come.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Workspaces" value={workspaces.length} />
        <StatCard label="Categories" value={totalCats} />
        <StatCard label="Topics done" value={`${totalDone}/${totalTopics}`} />
        <StatCard label="Completed" value={completed} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Overall progress</div>
          <div className="text-sm font-bold">{overallPct}%</div>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-[oklch(0.7_0.2_165)]"
            initial={{ width: 0 }}
            animate={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="font-semibold mb-4">Per-workspace progress</div>
        {sorted.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No workspaces yet. Upload a file to start tracking progress.
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map(({ w, pct, done, total }) => (
              <div key={w.id}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium truncate">{w.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {done}/{total} · {pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-[oklch(0.7_0.2_165)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {w.categories.map((c) => {
                    const r = countTopics(c);
                    const cp = r.total ? Math.round((r.done / r.total) * 100) : 0;
                    return (
                      <span
                        key={c.id}
                        className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-muted text-muted-foreground"
                      >
                        {c.name} {cp}%
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}