import { motion } from "framer-motion";
import { useState } from "react";
import { Plus, Pencil, MoreVertical, Star, Check, Clock, Trash2, X } from "lucide-react";
import type { Category, Topic } from "@/lib/study-types";
import { countTopics } from "@/lib/study-types";
import { colorMap, iconMap } from "./CategoryStyles";
import { PromptDialog } from "./InAppDialogs";

interface Props {
  category: Category;
  search: string;
  favoritesOnly: boolean;
  onChange: (next: Category) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

function matches(t: Topic, q: string): boolean {
  if (!q) return true;
  if (t.name.toLowerCase().includes(q)) return true;
  return t.subtopics.some((s) => matches(s, q));
}

export function CategoryCard({ category, search, favoritesOnly, onChange }: Props) {
  const c = colorMap[category.color];
  const Icon = iconMap[category.icon];
  const { total, done } = countTopics(category);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const [promptParent, setPromptParent] = useState<string | null | undefined>(undefined);

  const q = search.trim().toLowerCase();
  const visible = category.topics.filter((t) => {
    if (favoritesOnly && !t.favorite && !t.subtopics.some((s) => s.favorite)) return false;
    return matches(t, q);
  });

  function updateTopic(id: string, updater: (t: Topic) => Topic) {
    const walk = (ts: Topic[]): Topic[] =>
      ts.map((t) => {
        if (t.id === id) return updater(t);
        return { ...t, subtopics: walk(t.subtopics) };
      });
    onChange({ ...category, topics: walk(category.topics) });
  }

  function deleteTopic(id: string) {
    const walk = (ts: Topic[]): Topic[] =>
      ts.filter((t) => t.id !== id).map((t) => ({ ...t, subtopics: walk(t.subtopics) }));
    onChange({ ...category, topics: walk(category.topics) });
  }

  function addSubtopic(parentId: string | null) {
    setPromptParent(parentId);
  }

  function commitNewTopic(name: string) {
    const parentId = promptParent;
    const newTopic: Topic = { id: uid(), name, done: false, favorite: false, subtopics: [] };
    if (!parentId) {
      onChange({ ...category, topics: [...category.topics, newTopic] });
      return;
    }
    const walk = (ts: Topic[]): Topic[] =>
      ts.map((t) => {
        if (t.id === parentId) return { ...t, subtopics: [...t.subtopics, newTopic] };
        return { ...t, subtopics: walk(t.subtopics) };
      });
    onChange({ ...category, topics: walk(category.topics) });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden flex flex-col"
    >
      {/* header */}
      <div className={`flex items-center justify-between px-5 py-4 ${c.bg}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`size-10 rounded-xl grid place-items-center ${c.iconBg} ${c.iconText}`}>
            <Icon className="size-5" />
          </div>
          <h3 className="font-bold tracking-wide uppercase text-sm text-foreground truncate">
            {category.name}
          </h3>
        </div>
        <div className={`text-xs font-semibold rounded-full px-2.5 py-1 ${c.chipBg} ${c.chipText}`}>
          {done}/{total}
        </div>
      </div>

      {/* topics */}
      <div className="px-3 py-2 flex-1 space-y-1">
        {visible.length === 0 && (
          <div className="text-xs text-muted-foreground p-4 text-center">No topics match.</div>
        )}
        {visible.map((t, i) => (
          <TopicRow
            key={t.id}
            topic={t}
            index={i + 1}
            onToggle={() => updateTopic(t.id, (x) => ({ ...x, done: !x.done }))}
            onFav={() => updateTopic(t.id, (x) => ({ ...x, favorite: !x.favorite }))}
            onEdit={(name) => updateTopic(t.id, (x) => ({ ...x, name }))}
            onDelete={() => deleteTopic(t.id)}
            onAddSub={() => addSubtopic(t.id)}
            onToggleSub={(sid) => updateTopic(sid, (x) => ({ ...x, done: !x.done }))}
            onDeleteSub={(sid) => deleteTopic(sid)}
          />
        ))}
      </div>

      {/* footer */}
      <div className="border-t border-border px-5 py-3 flex items-center gap-3">
        <button
          onClick={() => addSubtopic(null)}
          className="text-xs font-medium inline-flex items-center gap-1 text-primary hover:underline"
        >
          <Plus className="size-3.5" /> Add
        </button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
          <Clock className="size-3.5" />
          {total} Topics
        </div>
        <div className="flex-1 max-w-[40%] h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className={`h-full ${c.bar}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 18 }}
          />
        </div>
        <span className="text-xs font-semibold text-muted-foreground w-9 text-right">{pct}%</span>
      </div>
      <PromptDialog
        open={promptParent !== undefined}
        title={promptParent ? "Add subtopic" : "Add topic"}
        placeholder="Topic name"
        onSubmit={commitNewTopic}
        onOpenChange={(o) => {
          if (!o) setPromptParent(undefined);
        }}
      />
    </motion.div>
  );
}

interface RowProps {
  topic: Topic;
  index: number;
  onToggle: () => void;
  onFav: () => void;
  onEdit: (name: string) => void;
  onDelete: () => void;
  onAddSub: () => void;
  onToggleSub: (id: string) => void;
  onDeleteSub: (id: string) => void;
}

function TopicRow({
  topic,
  index,
  onToggle,
  onFav,
  onEdit,
  onDelete,
  onAddSub,
  onToggleSub,
  onDeleteSub,
}: RowProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(topic.name);
  const [open, setOpen] = useState(topic.subtopics.length > 0);
  const [menu, setMenu] = useState(false);

  return (
    <div className="rounded-xl hover:bg-muted/60 transition-colors">
      <div className="flex items-center gap-1.5 px-2 py-2">
        <button
          onClick={() => {
            setEditing(true);
            setMenu(false);
          }}
          className="size-7 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Edit"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          onClick={onAddSub}
          className="size-7 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Add subtopic"
        >
          <Plus className="size-3.5" />
        </button>
        <button
          onClick={onToggle}
          className={`size-5 rounded-md border-2 grid place-items-center transition-colors ${
            topic.done ? "bg-primary border-primary text-primary-foreground" : "border-border bg-card"
          }`}
        >
          {topic.done && <Check className="size-3" strokeWidth={3} />}
        </button>
        {editing ? (
          <input
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => {
              if (val.trim()) onEdit(val.trim());
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setVal(topic.name);
                setEditing(false);
              }
            }}
            className="flex-1 text-sm bg-card border border-border rounded px-2 py-1 outline-none focus:border-primary"
          />
        ) : (
          <button
            onClick={() => topic.subtopics.length && setOpen((o) => !o)}
            className={`flex-1 text-left text-sm truncate ${
              topic.done ? "line-through text-muted-foreground" : "text-foreground"
            }`}
          >
            <span className="text-muted-foreground mr-1">{index}.</span>
            {topic.name}
          </button>
        )}
        <button
          onClick={onFav}
          className={`size-7 rounded-md grid place-items-center hover:bg-muted ${
            topic.favorite ? "text-amber-500" : "text-muted-foreground"
          }`}
        >
          <Star className="size-3.5" fill={topic.favorite ? "currentColor" : "none"} />
        </button>
        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            className="size-7 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <MoreVertical className="size-3.5" />
          </button>
          {menu && (
            <div
              className="absolute right-0 top-8 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
              onMouseLeave={() => setMenu(false)}
            >
              <button
                onClick={() => {
                  onAddSub();
                  setMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted"
              >
                Add subtopic
              </button>
              <button
                onClick={() => {
                  onDelete();
                  setMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-destructive hover:bg-muted inline-flex items-center gap-1.5"
              >
                <Trash2 className="size-3" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
      {open && topic.subtopics.length > 0 && (
        <div className="pl-10 pr-3 pb-2 space-y-1">
          {topic.subtopics.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-xs py-1 group">
              <button
                onClick={() => onToggleSub(s.id)}
                className={`size-4 rounded border-2 grid place-items-center ${
                  s.done ? "bg-primary border-primary text-primary-foreground" : "border-border"
                }`}
              >
                {s.done && <Check className="size-2.5" strokeWidth={3} />}
              </button>
              <span className={s.done ? "line-through text-muted-foreground" : "text-foreground"}>
                {s.name}
              </span>
              <button
                onClick={() => onDeleteSub(s.id)}
                className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}