"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LabelOption } from "@/types";
import {
  hasCustomLabelColors,
  resolveLabelChipColors,
} from "@/features/labels/label-colors";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface LabelMultiSelectDropdownProps {
  options: LabelOption[];
  initialIds: string[];
  initialSearch?: string;
  /** Commit current selection and move to the row below. */
  onCommitDown: (ids: string[]) => void;
  /** Commit current selection and move to the column on the right. */
  onCommitRight: (ids: string[]) => void;
  /** Commit current selection without moving (used when closing the popover). */
  onCommitStay: (ids: string[]) => void;
  /** Discard changes. */
  onCancel: () => void;
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(b);
  return a.every((id) => set.has(id));
}

/**
 * Inline multi-select editor for the Labels spreadsheet column.
 *
 * Behavior mirrors the other spreadsheet dropdowns:
 * - Enter applies and moves down, Tab applies and moves right.
 * - Enter over a highlighted option (reached via arrow keys or by hovering
 *   it) toggles that label first, then applies and moves down.
 * - Escape discards changes.
 * - Clicking elsewhere applies the pending selection without moving focus.
 */
export function LabelMultiSelectDropdown({
  options,
  initialIds,
  initialSearch = "",
  onCommitDown,
  onCommitRight,
  onCommitStay,
  onCancel,
}: LabelMultiSelectDropdownProps) {
  const [open, setOpen] = React.useState(true);
  const [search, setSearch] = React.useState(initialSearch);
  const [pending, setPending] = React.useState<string[]>(initialIds);
  const commandRef = React.useRef<HTMLDivElement>(null);
  // True when the current highlight was reached by the user (arrow keys or
  // hovering an option). Plain Enter without navigation never toggles a label,
  // so the auto-highlighted first option cannot be picked by accident.
  const navIntentRef = React.useRef(false);

  const dirty = !sameIds(initialIds, pending);

  const toggle = (id: string) => {
    setPending((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const clearAll = () => {
    setPending([]);
  };

  // Enter pressed while a highlighted option exists: toggle that label and
  // apply & move down. Returns false when nothing should be picked (no
  // user navigation, no highlighted match) so callers keep the plain-Enter
  // "apply and move down" behaviour.
  const toggleAndCommitDown = () => {
    const highlighted = commandRef.current?.querySelector<HTMLElement>('[data-selected="true"]');
    const value = highlighted?.getAttribute("data-value");
    const match = value
      ? options.find((o) => o.name.toLowerCase() === value.toLowerCase())
      : undefined;
    if (!navIntentRef.current || !match) return false;

    navIntentRef.current = false;
    const next = pending.includes(match.id)
      ? pending.filter((id) => id !== match.id)
      : [...pending, match.id];
    setPending(next);
    setOpen(false);
    onCommitDown(next);
    return true;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      // Let cmdk move the highlight; the next Enter will pick that option.
      navIntentRef.current = true;
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      onCommitRight(pending);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      onCancel();
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (toggleAndCommitDown()) return;
      setOpen(false);
      onCommitDown(pending);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          // Clicking away behaves like an implicit "Apply".
          if (dirty) {
            onCommitStay(pending);
          } else {
            onCancel();
          }
        }
      }}
    >
      {/* Invisible trigger anchoring the editor to the spreadsheet cell. */}
      <PopoverTrigger className="h-full w-full bg-transparent absolute inset-0 z-0 opacity-0" />
      <PopoverContent className="w-[220px] p-0" align="start" sideOffset={0}>
        <Command
          ref={commandRef}
          onPointerMove={(e) => {
            if ((e.target as HTMLElement).closest("[cmdk-item]")) {
              navIntentRef.current = true;
            }
          }}
        >
          <div className="flex items-center justify-between px-2 pt-1.5 pb-1 border-b">
            <span className="text-xs text-muted-foreground">
              {pending.length > 0 ? `${pending.length} label(s)` : "No labels"}
            </span>
            {pending.length > 0 && (
              <button
                type="button"
                className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={clearAll}
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
          <CommandInput
            placeholder="Search labels..."
            autoFocus
            value={search}
            onValueChange={(val) => {
              setSearch(val);
              requestAnimationFrame(() => {
                commandRef.current?.querySelector("[data-slot=command-list]")?.scrollTo(0, 0);
              });
            }}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            <CommandEmpty>No label found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = pending.includes(option.id);
                const chipStyle = resolveLabelChipColors(option);
                const hasColors = hasCustomLabelColors(option);
                return (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    onSelect={() => {
                      navIntentRef.current = false;
                      toggle(option.id);
                    }}
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-primary transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                    {hasColors && (
                      <span
                        aria-hidden
                        className="relative mr-1.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm ring-1 ring-inset ring-black/10"
                        style={{ backgroundColor: chipStyle.backgroundColor }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: chipStyle.color }}
                        />
                      </span>
                    )}
                    <span className="truncate">{option.name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
