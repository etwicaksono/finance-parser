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
  onSelect: (value: string | null) => void;
  onClose: () => void;
}

export function CategoryDropdown({
  options,
  value,
  onSelect,
  onClose,
}: CategoryDropdownProps) {
  const [open, setOpen] = React.useState(true);

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
        <Command>
          <CommandInput placeholder="Search..." autoFocus />
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
