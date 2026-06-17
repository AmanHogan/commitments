"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { Dialog } from "radix-ui";
import { X, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Shape of the parsed envelope every export file must contain. */
interface JsonEnvelope {
  type: string;
  version: number;
  exportedAt: string;
  records: unknown[];
}

/** A column definition for the preview table. */
export interface PreviewColumn {
  key: string;
  label: string;
}

interface JsonImportModalProps {
  /** The `type` string we expect in the JSON envelope (e.g. "bcomm1"). */
  expectedType: string;
  /** Human-readable name shown in the modal heading. */
  label: string;
  /** Columns to show in the preview table (pulled from each record). */
  previewColumns: PreviewColumn[];
  /** Called with the parsed records after the user clicks "Import". */
  onImport: (records: unknown[]) => Promise<void>;
  /** Whether the modal is open. */
  open: boolean;
  /** Called when the user closes the modal. */
  onClose: () => void;
}

/**
 * Safely read a string field from an unknown record for table preview.
 * @param record The raw parsed record object.
 * @param key The field key to read.
 * @returns The string value, or an em-dash if not found.
 */
function previewCell(record: unknown, key: string): string {
  if (record === null || typeof record !== "object") return "—";
  const val = (record as Record<string, unknown>)[key];
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  return String(val).slice(0, 80);
}

/**
 * Parse and validate the uploaded JSON file against the expected envelope schema.
 * @param text Raw file text.
 * @param expectedType The type string this page accepts.
 * @returns Either the parsed envelope or an error message string.
 */
function parseEnvelope(
  text: string,
  expectedType: string,
): JsonEnvelope | string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return "Invalid JSON — could not parse file.";
  }
  if (parsed === null || typeof parsed !== "object") {
    return "Expected a JSON object at the top level.";
  }
  const obj = parsed as Record<string, unknown>;
  if (obj["type"] !== expectedType) {
    return `Wrong file type. Expected "${expectedType}", got "${obj["type"] ?? "unknown"}".`;
  }
  if (!Array.isArray(obj["records"])) {
    return 'Missing "records" array in file.';
  }
  return {
    type: obj["type"] as string,
    version: typeof obj["version"] === "number" ? obj["version"] : 1,
    exportedAt: typeof obj["exportedAt"] === "string" ? obj["exportedAt"] : "",
    records: obj["records"] as unknown[],
  };
}

/**
 * Modal dialog for importing a JSON file into a commitment page.
 * Validates the file type, shows a preview table, then calls onImport.
 * @param props Modal configuration and callbacks.
 * @returns The rendered dialog element.
 */
export function JsonImportModal({
  expectedType,
  label,
  previewColumns,
  onImport,
  open,
  onClose,
}: JsonImportModalProps): React.JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<unknown[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [success, setSuccess] = useState<number | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /** Reset all local state back to the initial blank state. */
  function reset(): void {
    setRecords(null);
    setParseError(null);
    setFileName(null);
    setSuccess(null);
    setImportError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  /** Handle the close action — reset state first. */
  function handleClose(): void {
    reset();
    onClose();
  }

  /**
   * Parse the selected file and populate the preview table.
   * @param e The file input change event.
   * @returns Nothing.
   */
  function handleFile(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setSuccess(null);
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (ev): void => {
      const text = ev.target?.result;
      if (typeof text !== "string") {
        setParseError("Could not read file.");
        setRecords(null);
        return;
      }
      const result = parseEnvelope(text, expectedType);
      if (typeof result === "string") {
        setParseError(result);
        setRecords(null);
      } else {
        setParseError(null);
        setRecords(result.records);
      }
    };
    reader.readAsText(file);
  }

  /**
   * Submit the parsed records to the parent's import handler.
   * @returns Nothing.
   */
  function handleImport(): void {
    if (!records) return;
    setImportError(null);
    startTransition(async () => {
      try {
        await onImport(records);
        setSuccess(records.length);
        setRecords(null);
        setFileName(null);
        if (fileRef.current) fileRef.current.value = "";
      } catch {
        setImportError("Import failed — check the file and try again.");
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl focus:outline-none"
          aria-describedby="import-modal-desc"
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">
              Import {label}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-xs" onClick={handleClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <Dialog.Description id="import-modal-desc" className="mb-4 text-sm text-muted-foreground">
            Upload a <code className="rounded bg-muted px-1">.json</code> file
            exported from this app (type: <code className="rounded bg-muted px-1">{expectedType}</code>).
            Review the preview, then click Import.
          </Dialog.Description>

          {/* File upload zone */}
          <label
            htmlFor="import-file"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-6 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground"
          >
            <Upload className="h-6 w-6" />
            {fileName ? (
              <span className="font-medium text-foreground">{fileName}</span>
            ) : (
              <span>Click to choose a .json file</span>
            )}
            <input
              id="import-file"
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={handleFile}
            />
          </label>

          {/* Parse error */}
          {parseError ? (
            <Card className="mt-3 border-destructive bg-destructive/10">
              <CardContent className="flex items-start gap-2 pt-3 pb-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{parseError}</p>
              </CardContent>
            </Card>
          ) : null}

          {/* Success banner */}
          {success !== null ? (
            <Card className="mt-3 border-green-600 bg-green-950/40">
              <CardContent className="flex items-start gap-2 pt-3 pb-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                <p className="text-sm text-green-300">
                  Successfully imported {success} record{success !== 1 ? "s" : ""}.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* Import error */}
          {importError ? (
            <p className="mt-3 text-sm text-destructive">{importError}</p>
          ) : null}

          {/* Preview table */}
          {records && records.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">
                Preview — {records.length} record{records.length !== 1 ? "s" : ""}
              </p>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted text-left">
                    <tr>
                      <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">#</th>
                      {previewColumns.map((col) => (
                        <th
                          key={col.key}
                          className="px-3 py-2 text-xs font-semibold text-muted-foreground"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec, i) => (
                      <tr
                        key={i}
                        className="border-t border-border odd:bg-muted/20"
                      >
                        <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                        {previewColumns.map((col) => (
                          <td key={col.key} className="px-3 py-1.5">
                            {previewCell(rec, col.key)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* Footer actions */}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isPending}>
              {success !== null ? "Close" : "Cancel"}
            </Button>
            {records && records.length > 0 ? (
              <Button onClick={handleImport} disabled={isPending}>
                {isPending
                  ? "Importing…"
                  : `Import ${records.length} record${records.length !== 1 ? "s" : ""}`}
              </Button>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
