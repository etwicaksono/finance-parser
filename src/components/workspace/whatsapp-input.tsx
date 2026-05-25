"use client";

import { useState } from "react";
import { Play, Trash2, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function WhatsAppInput() {
  const [text, setText] = useState("");

  const handleParse = () => {
    // Placeholder for parsing logic (will be implemented in later tasks)
    // eslint-disable-next-line no-console
    console.log("Parsing text:", text);
  };

  const handleClear = () => {
    setText("");
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <MessageSquareText className="h-4 w-4 text-primary" />
          <span>WhatsApp Chat</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={!text}
            className="h-8"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Clear
          </Button>
          <Button
            size="sm"
            onClick={handleParse}
            disabled={!text}
            className="h-8"
          >
            <Play className="mr-2 h-3.5 w-3.5" />
            Parse
          </Button>
        </div>
      </div>
      
      <div className="flex-1 p-4">
        <Textarea
          placeholder="Paste your WhatsApp chat here...

Example:
[5/16, 11:38] Semangka 20k
[5/16, 11:38] Nasi Padang 25rb"
          className="h-full min-h-[300px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
    </div>
  );
}
