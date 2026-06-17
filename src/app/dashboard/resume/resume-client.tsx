"use client";

import { useRef, useState, useTransition, type DragEvent } from "react";
import { Upload, Trash2, Check, X, Pencil, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ResumeFileMeta } from "@/lib/types";
import { deleteResumeFile, updateResumeLabel } from "./actions";

/**
 * Format a byte count as a short human-readable size.
 * @param bytes The size in bytes.
 * @returns A string like "412 KB" or "1.2 MB".
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Resume manager: drag/drop or click to upload PDF versions, label and delete
 * them, and preview the selected version inline. Files are stored in MongoDB
 * and streamed from /api/resume/[id].
 * @param props The server-loaded initial file metadata list.
 * @returns The rendered client UI.
 */
export function ResumeClient({
  initialFiles,
}: {
  initialFiles: ResumeFileMeta[];
}): React.JSX.Element {
  const [files, setFiles] = useState<ResumeFileMeta[]>(initialFiles);
  const [activeId, setActiveId] = useState<string | null>(
    initialFiles[0]?.id ?? null,
  );
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Upload a PDF file to the server and prepend it to the list.
   * @param file The file to upload.
   * @returns Nothing.
   */
  async function uploadFile(file: File): Promise<void> {
    setError(null);
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("label", file.name.replace(/\.[^/.]+$/, ""));
      const res = await fetch("/api/resume", { method: "POST", body });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Upload failed.");
        return;
      }
      const created = (await res.json()) as ResumeFileMeta;
      setFiles((prev) => [created, ...prev]);
      setActiveId(created.id);
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  /**
   * Handle a dropped file.
   * @param e The drag event.
   * @returns Nothing.
   */
  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(file);
  }

  /**
   * Delete a resume file and adjust the active selection.
   * @param id The file id.
   * @returns Nothing.
   */
  function handleDelete(id: string): void {
    startTransition(async () => {
      try {
        await deleteResumeFile(id);
        setFiles((prev) => {
          const next = prev.filter((f) => f.id !== id);
          if (activeId === id) setActiveId(next[0]?.id ?? null);
          return next;
        });
      } catch {
        setError("Could not delete file.");
      }
    });
  }

  /**
   * Persist a renamed label.
   * @param id The file id.
   * @returns Nothing.
   */
  function saveLabel(id: string): void {
    const label = editLabel;
    startTransition(async () => {
      try {
        const updated = await updateResumeLabel(id, label);
        if (updated) setFiles((prev) => prev.map((f) => (f.id === id ? updated : f)));
        setEditingId(null);
      } catch {
        setError("Could not rename file.");
      }
    });
  }

  const active = files.find((f) => f.id === activeId) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Left: upload + version list */}
      <div className="flex flex-col gap-3">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-6 text-center transition-colors ${
            dragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-accent/30"
          }`}
        >
          <Upload className={`h-5 w-5 ${dragging ? "text-primary" : "text-muted-foreground"}`} />
          <p className="text-xs font-medium">{uploading ? "Uploading…" : "Drop PDF or click"}</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        {files.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">No files yet.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {files.map((rf) => (
              <div
                key={rf.id}
                onClick={() => setActiveId(rf.id)}
                className={`group cursor-pointer rounded-lg border px-3 py-2 transition-colors ${
                  activeId === rf.id ? "border-primary/40 bg-primary/10" : "border-border bg-card hover:bg-accent/40"
                }`}
              >
                {editingId === rf.id ? (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Input
                      autoFocus
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveLabel(rf.id); }}
                      className="h-6 text-xs"
                    />
                    <Button size="icon-xs" disabled={isPending} onClick={() => saveLabel(rf.id)}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="icon-xs" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-xs">{rf.label || rf.originalName}</span>
                    <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); setEditingId(rf.id); setEditLabel(rf.label ?? ""); }}
                        aria-label="Rename"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(rf.id); }}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
                <p className="mt-0.5 pl-5 text-[10px] text-muted-foreground/70">
                  {new Date(rf.createdAt).toLocaleDateString()} · {formatSize(rf.size)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: preview */}
      <div className="flex flex-col gap-2">
        {active ? (
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{active.label || active.originalName}</p>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/resume/${active.id}`} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" />
                Open
              </a>
            </Button>
          </div>
        ) : null}
        <div className="h-[calc(100vh-220px)] min-h-[500px] overflow-hidden rounded-lg border bg-card">
          {active ? (
            <iframe
              key={active.id}
              src={`/api/resume/${active.id}`}
              title={active.label || "Resume"}
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <FileText className="h-12 w-12 opacity-30" />
              <p className="text-sm">Upload a PDF to view it here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
