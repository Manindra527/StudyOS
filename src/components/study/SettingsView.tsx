import { useRef, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Database, Download, FileJson, FileSpreadsheet, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { createExcelWorkbook, downloadFile, downloadJson, parseExcelImport, parseJsonImport, type ImportedData } from "@/lib/data-management";
import type { Workspace } from "@/lib/study-types";

export function SettingsView({ workspaces, activeWorkspaceId, onRestore, onExport }: { workspaces: Workspace[]; activeWorkspaceId: string | null; onRestore: (workspaces: Workspace[], activeWorkspaceId: string | null, mode?: "replace" | "merge") => Promise<boolean>; onExport: () => Promise<{ workspaces: Workspace[]; activeWorkspaceId: string | null }> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<ImportedData | null>(null);
  const [fileName, setFileName] = useState("");
  const [reading, setReading] = useState(false);

  async function exportExcel() {
    try {
      const data = await onExport();
      downloadFile(createExcelWorkbook(data.workspaces, data.activeWorkspaceId), "study-os-data.xlsx");
      toast.success("Your study data was exported as Excel.");
    } catch (error) {
      console.error(error);
      toast.error("Export failed. Please try again.");
    }
  }

  async function exportJson() {
    try { const data = await onExport(); downloadJson(data.workspaces, data.activeWorkspaceId); toast.success("Your study data was exported as JSON."); }
    catch { toast.error("Export failed. Please try again."); }
  }

  async function handleImport(file: File) {
    setReading(true);
    setFileName(file.name);
    try {
      const data = file.name.toLowerCase().endsWith(".xlsx")
        ? await parseExcelImport(file)
        : file.name.toLowerCase().endsWith(".json")
          ? parseJsonImport(await file.text())
          : null;
      if (!data) {
        toast.error("This file couldn't be imported. Choose a valid Study OS JSON or Excel file.");
      } else {
        setPending(data);
      }
    } catch (error) {
      console.error(error);
      toast.error("This file couldn't be imported. Please try another file.");
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function applyImport(mode: "replace" | "merge") {
    if (!pending) return;
    const next = pending.workspaces;
    const nextActive = pending.activeWorkspaceId && next.some((workspace) => workspace.id === pending.activeWorkspaceId)
      ? pending.activeWorkspaceId
      : next[0]?.id || null;
    if (await onRestore(next, nextActive, mode)) {
      toast.success(mode === "replace" ? "Your study data was replaced with the imported backup." : "Your study data was merged with the imported backup.");
      setPending(null);
    } else {
      toast.error("Your data couldn't be saved. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-4xl font-bold tracking-tight text-foreground"><ShieldCheck className="size-8 text-primary" /> Settings</h1>
        <p className="mt-2 text-muted-foreground">Manage your Study OS preferences and saved learning data.</p>
      </div>
      <section className="mb-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Preferences</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your workspace is securely stored in the Study OS database.</p>
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-muted/50 p-4">
          <Database className="size-5 text-primary" />
          <div><div className="text-sm font-medium text-foreground">MongoDB workspace storage</div><div className="text-xs text-muted-foreground">{workspaces.length} saved {workspaces.length === 1 ? "subject" : "subjects"}</div></div>
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-foreground">Data Management</h2><p className="mt-1 text-sm text-muted-foreground">Back up or restore your subjects, progress, favorites, and card order.</p></div><Database className="size-6 text-primary" /></div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border p-5"><h3 className="font-semibold text-foreground">Export Data</h3><p className="mt-1 text-sm text-muted-foreground">Download a complete copy of your study data.</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => void exportJson()}><FileJson className="size-4" /> Export JSON</Button><Button variant="outline" onClick={() => void exportExcel()}><FileSpreadsheet className="size-4" /> Export Excel</Button></div></div>
          <div className="rounded-xl border border-border p-5"><h3 className="font-semibold text-foreground">Import Data</h3><p className="mt-1 text-sm text-muted-foreground">Restore from a Study OS JSON or Excel backup.</p><Button className="mt-4" variant="outline" disabled={reading} onClick={() => inputRef.current?.click()}><Upload className="size-4" /> {reading ? "Reading file…" : "Import backup"}</Button><input ref={inputRef} type="file" accept=".json,.xlsx,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleImport(file); }} />{fileName && !reading && <p className="mt-3 text-xs text-muted-foreground">Selected: {fileName}</p>}</div>
        </div>
        <div className="mt-6 flex items-start gap-3 rounded-xl bg-accent/50 p-4 text-sm text-muted-foreground"><Download className="mt-0.5 size-4 shrink-0 text-primary" /><span>JSON preserves the full nested structure. Excel uses separate Workspaces, Categories, and Topics sheets for easy reading.</span></div>
      </section>
      <AlertDialog open={!!pending} onOpenChange={(open) => { if (!open) setPending(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Import study data</AlertDialogTitle><AlertDialogDescription>This backup contains {pending?.workspaces.length || 0} subjects. Replace removes current database data first; Merge keeps current subjects and updates matching IDs.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><Button variant="outline" onClick={() => void applyImport("merge")}>Merge data</Button><AlertDialogAction onClick={() => void applyImport("replace")}>Replace my data</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
