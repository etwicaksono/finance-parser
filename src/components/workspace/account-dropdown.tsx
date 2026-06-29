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
  CommandSeparator,
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

interface AccountDropdownProps {
  options: Option[];
  recentIds?: string[];
  value: string | null;
  initialSearch?: string;
  onSelect: (value: string | null) => void;
  onClose: () => void;
  onTab?: (value: string | null) => void;
}

export function AccountDropdown({
  options,
  recentIds = [],
  value,
  initialSearch = "",
  onSelect,
  onClose,
  onTab,
}: AccountDropdownProps) {
  const [open, setOpen] = React.useState(true);
  const [search, setSearch] = React.useState(initialSearch);
  const commandRef = React.useRef<HTMLDivElement>(null);

  // Derive recent vs all options
  const recentOptions = options.filter((o) => recentIds.includes(o.id));
  const otherOptions = options.filter((o) => !recentIds.includes(o.id));

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
            placeholder="Search accounts..."
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
            <CommandEmpty>No account found.</CommandEmpty>
            
            {recentOptions.length > 0 && (
              <>
                <CommandGroup heading="Recent Accounts">
                  {recentOptions.map((option) => (
                    <CommandItem
                      key={`recent-${option.id}`}
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
                <CommandSeparator />
              </>
            )}

            <CommandGroup heading={recentOptions.length > 0 ? "All Accounts" : undefined}>
              {otherOptions.map((option) => (
                <CommandItem
                  key={`all-${option.id}`}
                  value={option.name}
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
