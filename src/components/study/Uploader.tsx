import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Image as ImageIcon, Sparkles, Loader2 } from "lucide-react";
import { fromRaw, type RawAnalysis } from "@/lib/study-types";
import type { Workspace } from "@/lib/study-types";

interface Props {
  onWorkspace: (w: Workspace) => void;
}

const ACCEPTED = [
  "image/*",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/plain",
  "text/markdown",
].join(",");

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function Uploader({ onWorkspace }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          dataUrl,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Analysis failed");
      }
      const raw = (await res.json()) as RawAnalysis;
      if (!raw.categories || raw.categories.length === 0) {
        throw new Error("AI could not detect structure. Try a clearer document.");
      }
      onWorkspace(fromRaw(raw));
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
        className={`relative rounded-3xl border-2 border-dashed p-12 text-center transition-colors bg-card ${
          dragging ? "border-primary bg-accent" : "border-border"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="size-16 rounded-2xl bg-primary/10 grid place-items-center text-primary">
            {loading ? <Loader2 className="size-7 animate-spin" /> : <Sparkles className="size-7" />}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {loading ? "Building your study workspace…" : "Drop your study material"}
            </h2>
            <p className="text-muted-foreground mt-1">
              Images, PDFs, Word, PowerPoint, Excel or notes — AI turns it into a dashboard.
            </p>
          </div>
          <button
            disabled={loading}
            onClick={() => ref.current?.click()}
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Upload className="size-4" />
            Choose file
          </button>
          <input
            ref={ref}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground mt-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
              <ImageIcon className="size-3" /> Images
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
              <FileText className="size-3" /> PDF · DOCX · PPTX · XLSX
            </span>
          </div>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2 mt-2">
              {error}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}