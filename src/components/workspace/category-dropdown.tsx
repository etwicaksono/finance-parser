"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
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

interface Option {
  id: string;
  name: string;
}

interface CategoryDropdownProps {
  options: Option[];
  value: string | null;
  initialSearch?: string;
  onSelect: (value: string | null) => void;
  onClose: () => void;
  onTab?: (value: string | null) => void;
}

export function CategoryDropdown({
  options,
  value,
  initialSearch = "",
  onSelect,
  onClose,
  onTab,
}: CategoryDropdownProps) {
  const [open, setOpen] = React.useState(true);
  const [search, setSearch] = React.useState(initialSearch);
  const commandRef = React.useRef<HTMLDivElement>(null);

  // Focus the popover trigger on mount? No, shadcn popover auto-focuses the input inside.

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          onClose();
        }
      }}
    >
      {/* We use an invisible trigger so it anchors perfectly to the parent table cell */}
      <PopoverTrigger className="h-full w-full bg-transparent absolute inset-0 z-0 opacity-0" />
      <PopoverContent className="w-[200px] p-0" align="start" sideOffset={0}>
        <Command ref={commandRef}>
          <CommandInput
            placeholder="Search..."
            autoFocus
            value={search}
            onValueChange={(val) => {
              setSearch(val);
              requestAnimationFrame(() => {
                commandRef.current?.querySelector("[data-slot=command-list]")?.scrollTo(0, 0);
              });
            }}
            onKeyDown={(e) => {
              if (e.key === "Tab" && onTab) {
                e.preventDefault();
                const highlighted = commandRef.current?.querySelector("[data-selected=true]");
                const selectedValue = highlighted?.getAttribute("data-value");
                const match = selectedValue ? options.find(o => o.name.toLowerCase() === selectedValue.toLowerCase()) : null;
                onTab(match ? match.id : value);
                setOpen(false);
              }
            }}
          />
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name} // Used for filtering
                  onSelect={() => {
                    onSelect(option.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
