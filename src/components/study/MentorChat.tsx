import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import type { Workspace } from "@/lib/study-types";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function MentorChat({ workspace }: { workspace: Workspace | null }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm your AI study mentor. Ask me anything about your material." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim() || loading) return;
    const next: Msg[] = [...msgs, { role: "user", content: input.trim() }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const ctx = workspace
        ? `${workspace.title} — ${workspace.subtitle}\nCategories:\n` +
          workspace.categories
            .map(
              (c) =>
                `- ${c.name}: ${c.topics.map((t) => t.name).join(", ")}`,
            )
            .join("\n")
        : "No workspace loaded.";
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context: ctx }),
      });
      const j = await res.json();
      setMsgs([...next, { role: "assistant", content: j.text || "…" }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "Sorry, I couldn't reach the AI." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-primary text-primary-foreground shadow-lg px-5 py-3 inline-flex items-center gap-2 hover:opacity-90"
      >
        <Sparkles className="size-4" />
        <span className="font-medium text-sm">AI Mentor</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              transition={{ type: "spring", damping: 24, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-xl bg-primary/10 text-primary grid place-items-center">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">AI Mentor</div>
                    <div className="text-xs text-muted-foreground">Personal study coach</div>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="size-8 rounded-lg grid place-items-center hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgs.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
                {loading && (
                  <div className="bg-muted rounded-2xl px-4 py-2.5 inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Thinking…
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-border flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Ask anything…"
                  className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary"
                />
                <button
                  onClick={send}
                  disabled={loading}
                  className="size-10 rounded-full bg-primary text-primary-foreground grid place-items-center disabled:opacity-50"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}