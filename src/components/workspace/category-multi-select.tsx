"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Filter } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CategoryOption } from "@/types"

interface CategoryMultiSelectProps {
  categories: CategoryOption[];
  showUnmapped: boolean;
  selectedValues: string[];
  onSelectedValuesChange: (values: string[]) => void;
}

export function CategoryMultiSelect({
  categories,
  showUnmapped,
  selectedValues,
  onSelectedValuesChange,
}: CategoryMultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const toggleCategory = (value: string) => {
    if (selectedValues.includes(value)) {
      onSelectedValuesChange(selectedValues.filter((v) => v !== value))
    } else {
      onSelectedValuesChange([...selectedValues, value])
    }
  }

  const allOptions = [
    ...(showUnmapped ? [{ id: "unmapped", name: "Belum Dipetakan" }] : []),
    ...categories
  ];

  const activeSelectedCount = allOptions.filter(opt => selectedValues.includes(opt.id)).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger 
        className="inline-flex items-center justify-between whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 py-2 w-full max-w-[200px]"
        role="combobox"
        aria-expanded={open}
      >
        <div className="flex items-center truncate">
          <Filter className="mr-2 h-3.5 w-3.5 opacity-50 shrink-0" />
          <span className="truncate text-xs font-normal">
            {activeSelectedCount === allOptions.length
              ? "Semua Kategori" 
              : activeSelectedCount === 0
              ? "Tidak ada Kategori"
              : `${activeSelectedCount} Kategori Dipilih`}
          </span>
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 flex flex-col" align="start">
        <div className="flex items-center justify-between px-3 py-2 border-b text-xs bg-muted/20">
          <div className="flex gap-2">
            <button 
              className="text-primary hover:underline font-medium"
              onClick={() => onSelectedValuesChange(allOptions.map(o => o.id))}
            >
              Select all
            </button>
            <span className="text-muted-foreground">-</span>
            <button 
              className="text-primary hover:underline font-medium"
              onClick={() => onSelectedValuesChange([])}
            >
              Clear
            </button>
          </div>
        </div>
        <Command>
          <CommandInput placeholder="Cari kategori..." className="h-9 text-xs" />
          <CommandList>
            <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">Tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {allOptions.map((category) => {
                const isSelected = selectedValues.includes(category.id);
                return (
                  <CommandItem
                    key={category.id}
                    value={category.name}
                    onSelect={() => toggleCategory(category.id)}
                    className="text-xs cursor-pointer"
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-primary transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className={cn("h-3 w-3")} />
                    </div>
                    <span>{category.name}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
