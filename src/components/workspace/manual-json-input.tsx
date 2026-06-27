"use client";

import { useState, useCallback } from "react";
import { Play, Copy, Check, FileJson, X, CheckCircle, Eye, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Swal from "sweetalert2";
import PROMPTS from "@/data/ai-prompts.json";
import { ChatParseBatch } from "@/types";

interface ManualJsonInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onParse?: (rows: { date: string | null; item: string; amount: number }[], batchName: string) => void;
  onClearOutput?: () => void;
  onRemoveBatch?: (batchName: string) => void;
  parseBatches?: ChatParseBatch[];
  onParseBatchesChange?: (batches: ChatParseBatch[]) => void;
}

export function ManualJsonInput({ value, onChange, onParse, onClearOutput, onRemoveBatch, parseBatches: externalBatches, onParseBatchesChange }: ManualJsonInputProps) {
  const [internalJsonText, setInternalJsonText] = useState("");
  const [internalBatches, setInternalBatches] = useState<ChatParseBatch[]>([]);
  const [reviewingBatchId, setReviewingBatchId] = useState<string | null>(null);

  const jsonText = value !== undefined ? value : internalJsonText;
  const batches = externalBatches ?? internalBatches;
  const reviewingBatch = reviewingBatchId ? batches.find(b => b.id === reviewingBatchId) : null;

  const setBatches = useCallback((updater: ChatParseBatch[] | ((prev: ChatParseBatch[]) => ChatParseBatch[])) => {
    if (onParseBatchesChange) {
      const newVal = typeof updater === "function" ? updater(externalBatches ?? []) : updater;
      onParseBatchesChange(newVal);
    } else {
      setInternalBatches(updater as ChatParseBatch[] | ((prev: ChatParseBatch[]) => ChatParseBatch[]));
    }
  }, [externalBatches, onParseBatchesChange]);

  const setJsonText = (text: string) => {
    setInternalJsonText(text);
    if (onChange) onChange(text);
  };

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("chat");

  const selectedPrompt = PROMPTS.find(p => p.id === selectedPromptId)!;

  const handleCopy = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleParse = () => {
    if (!onParse || !jsonText.trim()) return;

    try {
      let cleanJson = jsonText.trim();
      if (cleanJson.startsWith("```json")) {
        cleanJson = cleanJson.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```/, "").replace(/```$/, "").trim();
      }

      const parsed = JSON.parse(cleanJson);
      if (!Array.isArray(parsed)) {
        throw new Error("JSON harus berupa array []");
      }

      const currentHighest = batches.reduce((max, b) => {
        const match = b.name.match(/^JSON (\d+)$/);
        return match?.[1] ? Math.max(max, parseInt(match[1])) : max;
      }, 0);

      const batchName = `JSON ${currentHighest + 1}`;
      const lines = jsonText.split("\n").filter(l => l.trim());

      const newBatch: ChatParseBatch = {
        id: crypto.randomUUID(),
        name: batchName,
        textPreview: lines.slice(0, 3).join("\n"),
        fullText: jsonText,
        lineCount: parsed.length,
        isParsed: true,
      };

      setBatches(prev => [...prev, newBatch]);
      onParse(parsed, batchName);
      setJsonText("");
    } catch (e: unknown) {
      alert("Invalid JSON: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleRemoveBatch = async (batch: ChatParseBatch) => {
    const result = await Swal.fire({
      title: "Hapus JSON Input?",
      text: `"${batch.name}" akan dihapus beserta hasil parsingnya dari tabel.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "var(--destructive)",
      cancelButtonColor: "var(--muted-foreground)",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
      background: "var(--background)",
      color: "var(--foreground)",
      customClass: { popup: "border border-border rounded-lg" },
    });
    if (!result.isConfirmed) return;
    if (reviewingBatchId === batch.id) setReviewingBatchId(null);
    setBatches(prev => prev.filter(b => b.id !== batch.id));
    if (onRemoveBatch) onRemoveBatch(batch.name);
  };

  const handleClearAll = () => {
    setBatches([]);
    if (onClearOutput) onClearOutput();
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex flex-col gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <FileJson className="h-4 w-4 text-primary" />
          <span>JSON Input</span>
        </div>

        {reviewingBatch ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReviewingBatchId(null)}
              className="h-8 text-xs px-2.5"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Kembali
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              {reviewingBatch.name} — Review
            </span>
            <span className="text-[10px] text-muted-foreground">
              ({reviewingBatch.lineCount} items)
            </span>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleParse}
              disabled={!jsonText.trim()}
              className="h-8"
            >
              <Play className="mr-2 h-3.5 w-3.5" />
              Parse JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setJsonText("")}
              disabled={!jsonText}
              className="h-8 text-xs px-2.5"
              title="Hapus teks JSON"
            >
              Clear Input
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={batches.length === 0}
              className="h-8 text-xs px-2.5 text-destructive hover:text-destructive border-destructive/20"
              title="Hapus semua hasil parsing dari tabel"
            >
              Clear Output
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-6">
        {reviewingBatch ? (
          <Textarea
            readOnly
            value={reviewingBatch.fullText || reviewingBatch.textPreview || ""}
            className="flex-1 min-h-[200px] resize-none border-0 bg-muted/30 p-3 shadow-none focus-visible:ring-0 font-mono text-xs"
          />
        ) : (
          <>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Gunakan fitur ini jika API limit habis. Copy prompt di bawah, paste ke ChatGPT / Claude, lalu paste hasil JSON-nya ke form di bawah.
              </p>

              <div className="flex flex-col gap-2">
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedPromptId}
                  onChange={(e) => setSelectedPromptId(e.target.value)}
                >
                  {PROMPTS.map((prompt) => (
                    <option key={prompt.id} value={prompt.id} className="bg-background">
                      {prompt.label}
                    </option>
                  ))}
                </select>
                
                <div className="border rounded-md p-3 relative bg-muted/30">
                  <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono max-h-[150px] overflow-y-auto pr-16">
                    {selectedPrompt.text}
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2 h-6 text-[10px] px-2"
                    onClick={() => handleCopy(selectedPrompt.text, setCopiedPrompt)}
                  >
                    {copiedPrompt ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copiedPrompt ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-[200px] flex flex-col">
              <span className="text-sm font-medium mb-2 block">Paste JSON dari AI:</span>
              <Textarea
                placeholder='[&#10;  { "date": "2024-05-20", "item": "Makan Siang", "amount": -25000 }&#10;]'
                className="flex-1 font-mono text-xs resize-none"
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
              />
            </div>

            {batches.length > 0 && (
              <div className="flex flex-col gap-2 border-t pt-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Riwayat JSON</span>
                <div className="flex flex-col gap-2">
                  {batches.map((batch) => (
                    <div
                      key={batch.id}
                      className="group relative flex items-start gap-3 rounded-lg border bg-muted/30 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="mt-0.5 shrink-0">
                        <FileJson className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{batch.name}</span>
                          {batch.isParsed && (
                            <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {batch.lineCount} items
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-line font-mono">
                          {batch.textPreview}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setReviewingBatchId(batch.id)}
                          className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Lihat detail JSON"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveBatch(batch)}
                          className="bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Hapus batch ini dan datanya dari tabel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
