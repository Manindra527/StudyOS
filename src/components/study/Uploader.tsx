import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Image as ImageIcon, Sparkles, Loader2 } from "lucide-react";
import { fromRaw, type RawAnalysis } from "@/lib/study-types";
import type { Workspace } from "@/lib/study-types";
import { readApiError } from "@/lib/user-facing-errors";

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

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const CREATE_NEW = "__create_new__";
const DEFAULT_SECTIONS = ["BANK", "CGL", "NTPC", "UPSC"];

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
  const [sectionChoice, setSectionChoice] = useState("");
  const [customSection, setCustomSection] = useState("");
  const [lastFile, setLastFile] = useState<File | null>(null);

  const section = (sectionChoice === CREATE_NEW ? customSection : sectionChoice).trim();
  const canUpload = section.length > 0;

  async function handleFile(file: File) {
    setError(null);
    const supported =
      file.type.startsWith("image/") ||
      [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/plain",
        "text/markdown",
      ].includes(file.type);
    if (!supported) {
      setError("This file type isn't supported. Please upload an image, PDF, Word, PowerPoint, or Excel file.");
      return;
    }
    if (!canUpload) {
      setError("Choose a section before uploading your study material.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("File too large. Maximum size is 10 MB.");
      return;
    }
    setLastFile(file);
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
        throw new Error(await readApiError(res, "We couldn't organize this file. Please try again."));
      }
      const raw = (await res.json()) as RawAnalysis;
      if (!raw.categories || raw.categories.length === 0) {
        throw new Error("We couldn't organize this file. Please try again.");
      }
      onWorkspace(fromRaw(raw, section));
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
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
        className={`relative rounded-3xl border-2 border-dashed p-8 md:p-12 text-center transition-colors bg-card ${
          dragging ? "border-primary bg-accent" : "border-border"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-full max-w-xl text-left rounded-2xl border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <label htmlFor="workspace-section" className="text-sm font-semibold text-foreground">
                Section <span className="text-destructive">*</span>
              </label>
              <span className="text-xs text-muted-foreground">Required for every subject</span>
            </div>
            <select
              id="workspace-section"
              value={sectionChoice}
              onChange={(e) => {
                setSectionChoice(e.target.value);
                setError(null);
              }}
              className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 ring-primary"
            >
              <option value="">Choose a section…</option>
              {DEFAULT_SECTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
              <option value={CREATE_NEW}>Other / Create New</option>
            </select>
            {sectionChoice === CREATE_NEW && (
              <input
                autoFocus
                value={customSection}
                onChange={(e) => {
                  setCustomSection(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="ENTER A SECTION NAME"
                className="mt-2 w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 ring-primary uppercase placeholder:normal-case"
              />
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Organize subjects under sections such as BANK, CGL, NTPC, or UPSC.
            </p>
          </div>
          <div className="size-16 rounded-2xl bg-primary/10 grid place-items-center text-primary">
            {loading ? <Loader2 className="size-7 animate-spin" /> : <Sparkles className="size-7" />}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {loading ? "Building your study workspace…" : canUpload ? "Drop your study material" : "Choose a section to continue"}
            </h2>
            <p className="text-muted-foreground mt-1">
              Images, PDFs, Word, PowerPoint, Excel or notes — AI turns it into a dashboard.
            </p>
          </div>
          <button
            disabled={loading || !canUpload}
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
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3 mt-2 flex flex-wrap items-center justify-center gap-3">
              <span>{error}</span>
              {lastFile && error !== "This file type isn't supported. Please upload an image, PDF, Word, PowerPoint, or Excel file." && (
                <button
                  type="button"
                  onClick={() => void handleFile(lastFile)}
                  className="font-semibold underline underline-offset-2"
                >
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}