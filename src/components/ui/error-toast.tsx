import * as React from "react";
import { ChevronDown, ChevronUp, Maximize2 } from "lucide-react";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

interface ErrorToastProps {
  title?: string;
  message: string;
}

export function ErrorToast({ title = "Error", message }: ErrorToastProps) {
  const [expanded, setExpanded] = React.useState(false);

  // Helper to extract JSON if present
  const parseJSON = (str: string) => {
    try {
      const match = str.match(/({[\s\S]*}|\[[\s\S]*\])/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          prefix: str.substring(0, match.index).trim(),
          json: JSON.stringify(parsed, null, 2),
        };
      }
    } catch {
      // ignore
    }
    return null;
  };

  // Helper to extract HTML if present
  const parseHTML = (str: string) => {
    const htmlMatch = str.match(/(<!DOCTYPE html>|<html[\s>])[\s\S]*/i);
    if (htmlMatch) {
      return {
        prefix: str.substring(0, htmlMatch.index).trim(),
        html: htmlMatch[0],
      };
    }
    return null;
  };

  const jsonResult = parseJSON(message);
  const htmlResult = parseHTML(message);

  const isLong = message.length > 150;

  const renderContent = (isModal = false) => {
    const containerClasses = isModal
      ? "flex-1 overflow-y-auto rounded-md border bg-muted/50 p-4 text-sm max-h-[80vh]"
      : "mt-2 flex flex-col gap-2 max-h-[300px] overflow-y-auto rounded-md border bg-muted/50 p-2 text-xs";
    
    const iframeHeight = isModal ? "h-[60vh]" : "h-[200px]";

    return (
      <div className={containerClasses}>
        {htmlResult ? (
          <div className="h-full flex flex-col">
            {htmlResult.prefix && <div className="font-semibold mb-2">{htmlResult.prefix}</div>}
            <iframe 
              srcDoc={htmlResult.html} 
              className={`w-full ${iframeHeight} border bg-white rounded flex-1`}
              title="Error Output"
            />
          </div>
        ) : jsonResult ? (
          <div className="h-full flex flex-col">
            {jsonResult.prefix && <div className="font-semibold mb-2">{jsonResult.prefix}</div>}
            <pre className="overflow-x-auto p-4 bg-black/80 text-green-400 rounded flex-1">
              <code>{jsonResult.json}</code>
            </pre>
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words">{message}</div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-[400px]">
      {title && <div className="font-semibold">{title}</div>}
      
      {!expanded && isLong && (
        <div className="text-sm text-muted-foreground line-clamp-3 break-words">
          {htmlResult ? htmlResult.prefix + " [HTML Error Response]" : (jsonResult ? jsonResult.prefix + " [JSON Error Response]" : message)}
        </div>
      )}

      {(!isLong || expanded) && renderContent(false)}

      {isLong && (
        <div className="flex items-center gap-2 mt-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 flex-1 text-xs" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <><ChevronUp className="h-3 w-3 mr-1" /> Hide</>
            ) : (
              <><ChevronDown className="h-3 w-3 mr-1" /> Details</>
            )}
          </Button>

          <Dialog>
            <DialogTrigger render={<Button variant="outline" size="sm" className="h-6 px-2 text-xs" />}>
              <Maximize2 className="h-3 w-3 mr-1" /> Expand
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl w-[90vw]">
              <DialogHeader>
                <DialogTitle>{title || "Error Details"}</DialogTitle>
              </DialogHeader>
              {renderContent(true)}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
