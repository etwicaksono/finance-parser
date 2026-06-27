"use client";

import { useState, useCallback } from "react";
import { Play, MessageSquareText, X, CheckCircle, FileText, Eye, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Swal from "sweetalert2";
import { ChatParseBatch } from "@/types";

interface WhatsAppInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onParse?: (text: string, batchName: string) => void;
  onClearInput?: () => void;
  onClearOutput?: () => void;
  onRemoveBatch?: (batchName: string) => void;
  parseBatches?: ChatParseBatch[];
  onParseBatchesChange?: (batches: ChatParseBatch[]) => void;
}

export function WhatsAppInput({ value, onChange, onParse, onClearInput, onClearOutput, onRemoveBatch, parseBatches: externalBatches, onParseBatchesChange }: WhatsAppInputProps) {
  const [internalText, setInternalText] = useState("");
  const [internalBatches, setInternalBatches] = useState<ChatParseBatch[]>([]);
  const [reviewingBatchId, setReviewingBatchId] = useState<string | null>(null);

  const text = value !== undefined ? value : internalText;
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

  const setText = (newText: string) => {
    setInternalText(newText);
    if (onChange) onChange(newText);
  };

  const handleParse = () => {
    if (!onParse || !text) return;

    const currentHighest = batches.reduce((max, b) => {
      const match = b.name.match(/^Parsing (\d+)$/);
      return match?.[1] ? Math.max(max, parseInt(match[1])) : max;
    }, 0);

    const batchName = `Parsing ${currentHighest + 1}`;
    const lines = text.split("\n").filter(l => l.trim());

    const newBatch: ChatParseBatch = {
      id: crypto.randomUUID(),
      name: batchName,
      textPreview: lines.slice(0, 3).join("\n"),
      fullText: text,
      lineCount: lines.length,
      isParsed: true,
    };

    setBatches(prev => [...prev, newBatch]);
    onParse(text, batchName);
    setText("");
  };

  const handleRemoveBatch = async (batch: ChatParseBatch) => {
    const result = await Swal.fire({
      title: "Hapus Parsing?",
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

  const handleClearInput = () => {
    setText("");
    if (onClearInput) onClearInput();
  };

  const handleClearAll = () => {
    setReviewingBatchId(null);
    setBatches([]);
    if (onClearOutput) onClearOutput();
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex flex-col gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <MessageSquareText className="h-4 w-4 text-primary" />
          <span>WhatsApp Chat</span>
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
              ({reviewingBatch.lineCount} baris)
            </span>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleParse}
              disabled={!text}
              className="h-8"
            >
              <Play className="mr-2 h-3.5 w-3.5" />
              Parse
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearInput}
              disabled={!text}
              className="h-8 text-xs px-2.5"
              title="Hapus teks chat"
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
      
      <div className="flex-1 p-4 min-h-0 overflow-y-auto flex flex-col gap-4">
        {reviewingBatch ? (
          <Textarea
            readOnly
            value={reviewingBatch.fullText || reviewingBatch.textPreview || ""}
            className="flex-1 min-h-[200px] resize-none border-0 bg-muted/30 p-3 shadow-none focus-visible:ring-0 font-mono text-xs"
          />
        ) : (
          <>
            <Textarea
              placeholder="Paste your WhatsApp chat here...

Example:
[5/16, 11:38] Semangka 20k
[5/16, 11:38] Nasi Padang 25rb"
              className="min-h-[200px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            {batches.length > 0 && (
              <div className="flex flex-col gap-2 border-t pt-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Riwayat Parsing</span>
                <div className="flex flex-col gap-2">
                  {batches.map((batch) => (
                    <div
                      key={batch.id}
                      className="group relative flex items-start gap-3 rounded-lg border bg-muted/30 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="mt-0.5 shrink-0">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{batch.name}</span>
                          {batch.isParsed && (
                            <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {batch.lineCount} baris
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-line">
                          {batch.textPreview}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setReviewingBatchId(batch.id)}
                          className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Lihat detail teks"
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
