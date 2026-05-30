"use client";

import { useState } from "react";
import { Play, Trash2, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface WhatsAppInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onParse?: (text: string) => void;
  onClearInput?: () => void;
  onClearOutput?: () => void;
}

export function WhatsAppInput({ value, onChange, onParse, onClearInput, onClearOutput }: WhatsAppInputProps) {
  const [internalText, setInternalText] = useState("");
  const text = value !== undefined ? value : internalText;
  
  const setText = (newText: string) => {
    setInternalText(newText);
    if (onChange) onChange(newText);
  };

  const handleParse = () => {
    if (onParse && text) {
      onParse(text);
    }
  };

  const handleClearInput = () => {
    setText("");
    if (onClearInput) onClearInput();
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex flex-col gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <MessageSquareText className="h-4 w-4 text-primary" />
          <span>WhatsApp Chat</span>
        </div>
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
            onClick={onClearOutput}
            className="h-8 text-xs px-2.5 text-destructive hover:text-destructive border-destructive/20"
            title="Hapus baris tabel dari sumber chat"
          >
            Clear Output
          </Button>
        </div>
      </div>
      
      <div className="flex-1 p-4 min-h-0 overflow-y-auto">
        <Textarea
          placeholder="Paste your WhatsApp chat here...

Example:
[5/16, 11:38] Semangka 20k
[5/16, 11:38] Nasi Padang 25rb"
          className="min-h-[300px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
    </div>
  );
}
