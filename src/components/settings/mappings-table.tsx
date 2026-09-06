"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getMappings, addMapping, deleteMapping, updateMapping, updateMappingLabels, cleanupMappings } from "@/actions/mappings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2, ChevronLeft, ChevronRight, Search, Check, ChevronsUpDown, Sparkles, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CategoryOption, LabelOption } from "@/types";
import { joinLabelNames } from "@/features/labels/label-utils";
import {
  hasCustomLabelColors,
  resolveLabelChipColors,
} from "@/features/labels/label-colors";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

type Mapping = {
  id: string;
  keyword: string;
  categoryId: string | null;
  labelIds: string[];
  usageCount: number;
  updatedAt: Date | string | null;
  createdBy: string;
  updatedBy: string;
};

interface MappingsTableProps {
  categories: CategoryOption[];
  labels: LabelOption[];
}

export function MappingsTable({ categories, labels }: MappingsTableProps) {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"keyword" | "usageCount" | "updatedAt">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [newKeyword, setNewKeyword] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  };

  const fetchMappings = useCallback(async () => {
    setIsLoading(true);
    const result = await getMappings({ 
      page, 
      search: debouncedSearch,
      categoryId: filterCategory,
      sortBy,
      sortOrder
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      setMappings((result.data ?? []) as Mapping[]);
      setTotal(result.total ?? 0);
      setPageSize(result.pageSize ?? 50);
    }
    setIsLoading(false);
  }, [page, debouncedSearch, filterCategory, sortBy, sortOrder]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterCategory, sortBy, sortOrder]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const totalPages = Math.ceil(total / pageSize);

  const handleAdd = async (e?: React.FormEvent, closeModal: boolean = true) => {
    if (e) e.preventDefault();
    if (!newKeyword.trim() || !newCategoryId) return;

    setIsSubmitting(true);
    const result = await addMapping(newKeyword, newCategoryId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Mapping added");
      setNewKeyword("");
      // not clearing categoryId makes it easier to add multiple keywords to the same category
      fetchMappings();
      if (closeModal) {
        setIsAddModalOpen(false);
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const resultAlert = await MySwal.fire({
      title: 'Hapus Mapping?',
      text: "Anda yakin ingin menghapus mapping ini?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--destructive)',
      cancelButtonColor: 'var(--muted-foreground)',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      background: 'var(--background)',
      color: 'var(--foreground)',
      customClass: {
        popup: 'border border-border rounded-lg',
      }
    });

    if (!resultAlert.isConfirmed) return;

    const previous = [...mappings];
    setMappings((prev) => prev.filter((m) => m.id !== id));
    setTotal((t) => t - 1);

    const result = await deleteMapping(id);
    if (result.error) {
      setMappings(previous);
      setTotal((t) => t + 1);
      toast.error(result.error);
    } else {
      toast.success("Mapping deleted");
    }
  };

  const handleUpdate = async (id: string, keyword: string, categoryId: string) => {
    if (!keyword.trim() || !categoryId) return;

    const previous = [...mappings];
    setMappings((prev) => prev.map(m => m.id === id ? { ...m, keyword, categoryId } : m));

    const result = await updateMapping(id, keyword, categoryId);
    if (result.error) {
      setMappings(previous);
      toast.error(result.error);
    } else {
      toast.success("Mapping updated");
    }
  };

  const handleLabelsUpdate = async (id: string, labelIds: string[]) => {
    const previous = [...mappings];
    setMappings((prev) => prev.map(m => m.id === id ? { ...m, labelIds } : m));

    const result = await updateMappingLabels(id, labelIds, "user");
    if (result.error) {
      setMappings(previous);
      toast.error(result.error);
    } else {
      toast.success("Labels updated");
    }
  };

  const handleCleanup = async () => {
    const resultAlert = await MySwal.fire({
      title: 'Clean Up Mappings?',
      text: 'Proses ini akan membersihkan semua keyword dan menggabungkan duplikat secara permanen. Lanjutkan?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--primary)',
      cancelButtonColor: 'var(--muted-foreground)',
      confirmButtonText: 'Ya, Bersihkan!',
      cancelButtonText: 'Batal',
      background: 'var(--background)',
      color: 'var(--foreground)',
      customClass: {
        popup: 'border border-border rounded-lg',
      }
    });

    if (!resultAlert.isConfirmed) return;

    setIsCleaning(true);
    const result = await cleanupMappings();
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Cleaned up ${result.count} mappings. Removed ${result.deleted} duplicates.`);
      fetchMappings();
    }
    setIsCleaning(false);
  };

  const handleSort = (column: "keyword" | "usageCount" | "updatedAt") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder(column === "keyword" ? "asc" : "desc");
    }
  };

  const renderSortIcon = (column: "keyword" | "usageCount" | "updatedAt") => {
    if (sortBy !== column) return <ArrowUpDown className="ml-1 h-3 w-3 inline text-muted-foreground/50" />;
    return sortOrder === "asc" ? <ArrowUp className="ml-1 h-3 w-3 inline" /> : <ArrowDown className="ml-1 h-3 w-3 inline" />;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <div className="px-4 py-3 border-b bg-muted/20 shrink-0 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Mappings</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage keyword-to-category mappings for automatic classification.
            </p>
          </div>
          <DialogTrigger render={<Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Mapping</Button>} />
        </div>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Mapping</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Keyword</label>
              <Input
                placeholder="Keyword..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                disabled={isSubmitting}
                className="bg-background"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Category</label>
              <CategoryCombobox
                categories={categories}
                value={newCategoryId}
                onChange={setNewCategoryId}
                disabled={isSubmitting}
                className="w-full bg-background"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 sm:justify-end flex-wrap sm:space-x-0">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => handleAdd(undefined, false)} 
              disabled={isSubmitting || !newKeyword.trim() || !newCategoryId}
            >
              Add More
            </Button>
            <Button 
              onClick={() => handleAdd(undefined, true)} 
              disabled={isSubmitting || !newKeyword.trim() || !newCategoryId}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search + stats */}
      <div className="px-4 py-2 border-b bg-muted/10 flex items-center gap-3 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search keyword..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 pr-8 h-8 text-sm w-full bg-background"
          />
          {search && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground focus:outline-none flex items-center justify-center"
              onClick={() => handleSearchChange("")}
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <CategoryCombobox
          categories={[{ id: "all", name: "All Categories" }, ...categories]}
          value={filterCategory}
          onChange={(val) => setFilterCategory(val)}
          className="h-8 w-[160px] bg-background"
        />
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8" 
          onClick={handleCleanup}
          disabled={isCleaning}
        >
          {isCleaning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2 text-blue-500" />}
          Clean Up Mappings
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {isLoading ? "Loading..." : `${total.toLocaleString()} mappings`}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-muted-foreground uppercase bg-muted sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 font-medium w-12 text-center">#</th>
                <th className="px-4 py-2 font-medium cursor-pointer hover:bg-muted-foreground/10 select-none" onClick={() => handleSort("keyword")}>
                  Keyword {renderSortIcon("keyword")}
                </th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Labels</th>
                <th className="px-4 py-2 font-medium cursor-pointer hover:bg-muted-foreground/10 select-none w-20 text-center" onClick={() => handleSort("usageCount")}>
                  Usage {renderSortIcon("usageCount")}
                </th>
                <th className="px-4 py-2 font-medium cursor-pointer hover:bg-muted-foreground/10 select-none w-24" onClick={() => handleSort("updatedAt")}>
                  Last Updated {renderSortIcon("updatedAt")}
                </th>
                <th className="px-4 py-2 font-medium text-center w-16">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mappings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    {debouncedSearch ? `No mappings found for "${debouncedSearch}"` : "No mappings found."}
                  </td>
                </tr>
              ) : (
                mappings.map((mapping, index) => (
                  <tr key={mapping.id} className="hover:bg-muted/30 group">
                    <td className="px-4 py-1 text-center text-muted-foreground text-xs">
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    <td className="px-4 py-1">
                      <Input
                        defaultValue={mapping.keyword}
                        key={mapping.keyword}
                        className="h-7 border-transparent hover:border-input focus:border-input bg-transparent text-sm"
                        onBlur={(e) => {
                          if (e.target.value !== mapping.keyword && mapping.categoryId) {
                            handleUpdate(mapping.id, e.target.value, mapping.categoryId);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                      />
                    </td>
                    <td className="px-4 py-1">
                      <CategoryCombobox
                        categories={categories}
                        value={mapping.categoryId || ""}
                        onChange={(val) => handleUpdate(mapping.id, mapping.keyword, val)}
                        className="h-7 w-full border-transparent hover:border-input focus:border-input bg-transparent px-2 text-sm"
                      />
                    </td>
                    <td className="px-4 py-1">
                      <LabelMultiCombobox
                        labels={labels}
                        value={mapping.labelIds ?? []}
                        onChange={(ids) => handleLabelsUpdate(mapping.id, ids)}
                        className="h-7 w-full border-transparent hover:border-input focus:border-input bg-transparent px-2 text-sm"
                      />
                    </td>
                    <td className="px-4 py-1 text-center text-muted-foreground">
                      <span className="inline-flex items-center justify-center bg-muted px-2 py-0.5 rounded text-xs">
                        {mapping.usageCount}
                      </span>
                    </td>
                    <td className="px-4 py-1 text-xs text-muted-foreground">
                      <div className="flex flex-col">
                        <span 
                          className="truncate max-w-[120px]" 
                          title={`Created by: ${mapping.createdBy}\nUpdated by: ${mapping.updatedBy}`}
                        >
                          {mapping.createdBy === mapping.updatedBy 
                            ? mapping.updatedBy 
                            : `${mapping.createdBy} → ${mapping.updatedBy}`}
                        </span>
                        {mapping.updatedAt && (
                          <span className="text-[10px] opacity-70">
                            {new Date(mapping.updatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-1 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                        onClick={() => handleDelete(mapping.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/10 shrink-0">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryCombobox({
  categories,
  value,
  onChange,
  disabled = false,
  className = ""
}: {
  categories: CategoryOption[];
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn("justify-between font-normal", className)}
          />
        }
      >
        <span className="truncate">
          {value ? categories.find((c) => c.id === value)?.name : "Select category..."}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search category..." />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup>
              {categories.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.name}
                  onSelect={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === c.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function LabelMultiCombobox({
  labels,
  value,
  onChange,
  disabled = false,
  className = ""
}: {
  labels: LabelOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string[]>(value);

  // Keep the local draft in sync when the row mapping changes externally.
  useEffect(() => {
    setPending(value);
  }, [value]);

  const toggle = (id: string) => {
    setPending((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const commit = () => {
    const normalized = pending.filter((id, i) => pending.indexOf(id) === i);
    if (normalized.join("|") !== value.join("|")) {
      onChange(normalized);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) commit();
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn("justify-between font-normal", className)}
          />
        }
      >
        <span className="truncate text-left w-full">
          {value.length > 0 ? joinLabelNames(value, labels) : "No labels"}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search labels..." />
          <CommandList>
            <CommandEmpty>No label found.</CommandEmpty>
            <CommandGroup>
              {labels.map((label) => {
                const isSelected = pending.includes(label.id);
                const chipStyle = resolveLabelChipColors(label);
                const hasColors = hasCustomLabelColors(label);
                return (
                  <CommandItem
                    key={label.id}
                    value={label.name}
                    onSelect={() => toggle(label.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
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
                    <span className="truncate">{label.name}</span>
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

