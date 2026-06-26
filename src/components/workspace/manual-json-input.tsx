"use client";

import { useState } from "react";
import { Play, Copy, Check, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import PROMPTS from "@/data/ai-prompts.json";

interface ManualJsonInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onParse?: (rows: { date: string | null; item: string; amount: number }[]) => void;
  onClearOutput?: () => void;
}

export function ManualJsonInput({ value, onChange, onParse, onClearOutput }: ManualJsonInputProps) {
  const [internalJsonText, setInternalJsonText] = useState("");
  const jsonText = value !== undefined ? value : internalJsonText;

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
      // Strip markdown code blocks if the user copied them from ChatGPT
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
      onParse(parsed);
    } catch (e: unknown) {
      alert("Invalid JSON: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex flex-col gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <FileJson className="h-4 w-4 text-primary" />
          <span>JSON Input</span>
        </div>
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
            onClick={onClearOutput}
            className="h-8 text-xs px-2.5 text-destructive hover:text-destructive border-destructive/20"
            title="Hapus baris tabel dari sumber manual"
          >
            Clear Output
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-6">
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
      </div>
    </div>
  );
}
