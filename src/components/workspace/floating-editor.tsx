import { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";

interface FloatingEditorProps {
  initialValue: string;
  targetCellId: string;
  onSave: (val: string) => void;
  onCancel: () => void;
  onNextRow: (val: string) => void;
  onNextCol?: (val: string) => void;
}

export function FloatingEditor({
  initialValue,
  targetCellId,
  onSave,
  onCancel,
  onNextRow,
  onNextCol,
}: FloatingEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Position recalculation
  const updatePosition = useCallback(() => {
    const el = document.getElementById(targetCellId);
    if (el) {
      setRect(el.getBoundingClientRect());
    }
  }, [targetCellId]);

  useEffect(() => {
    updatePosition();
    // Re-calculate on resize or scroll
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true); // true to catch all scrolls
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [updatePosition]);

  // Handle auto-grow and shifting upwards
  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el || !rect) return;
    
    // Reset height to measure accurate scrollHeight
    el.style.height = "auto";
    
    let newHeight = el.scrollHeight;
    
    // Check if it hits the bottom of the viewport
    const bottomEdge = rect.top + newHeight;
    const viewportHeight = window.innerHeight;
    
    const margin = 100; // 100px margin from top/bottom
    if (bottomEdge > viewportHeight - margin) {
      // It exceeds the bottom. Can we grow upwards?
      const shiftUp = bottomEdge - (viewportHeight - margin);
      const newTop = Math.max(margin, rect.top - shiftUp); // Don't go above viewport top margin
      
      const maxPossibleHeight = viewportHeight - (margin * 2);
      
      if (newHeight > maxPossibleHeight) {
        newHeight = maxPossibleHeight;
        el.style.overflowY = "auto";
      } else {
        el.style.overflowY = "hidden";
      }
      
      el.parentElement!.style.top = `${newTop}px`;
      el.style.height = `${newHeight}px`;
    } else {
      // Normal downward growth
      el.parentElement!.style.top = `${rect.top}px`;
      el.style.height = `${newHeight}px`;
      el.style.overflowY = "hidden";
    }
  }, [rect]);

  useEffect(() => {
    handleInput();
  }, [value, rect, handleInput]);


  if (!rect) return null;

  return document.body ? ReactDOM.createPortal(
    <div
      className="fixed z-50 bg-background border shadow-xl ring-1 ring-primary overflow-hidden"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        minHeight: rect.height,
      }}
    >
      <textarea
        ref={(el) => {
          textareaRef.current = el;
          if (el && !el.dataset.cursorFixed) {
            el.dataset.cursorFixed = "true";
            el.focus();
            const len = el.value.length;
            el.setSelectionRange(len, len);
          }
        }}
        className="w-full h-full resize-none bg-transparent px-2 py-2 outline-none whitespace-pre-wrap"
        style={{ minHeight: rect.height }}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onSave(value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.stopPropagation();
            if (e.altKey) {
              e.preventDefault();
              const target = e.target as HTMLTextAreaElement;
              const start = target.selectionStart;
              const end = target.selectionEnd;
              const newValue = value.substring(0, start) + "\n" + value.substring(end);
              setValue(newValue);
              setTimeout(() => {
                target.selectionStart = target.selectionEnd = start + 1;
                handleInput();
              }, 0);
            } else {
              e.preventDefault();
              onNextRow(value);
            }
          } else if (e.key === "Tab") {
            e.preventDefault();
            if (onNextCol) {
              onNextCol(value);
            } else {
              onSave(value);
            }
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
      />
    </div>,
    document.body
  ) : null;
}
