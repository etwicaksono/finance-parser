"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getKeywordCleaningRulesRaw,
  getKeywordCleaningRules,
  addKeywordCleaningRule,
  deleteKeywordCleaningRule,
  updateKeywordCleaningRule,
  seedDefaultKeywordCleaningRules,
} from "@/actions/keyword-cleaning-rules";
import type { KeywordCleaningRuleType } from "@/lib/keyword-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type Rule = {
  id: string;
  type: string;
  value: string;
  createdAt: Date;
};

type SortBy = "value" | "createdAt";
type SortOrder = "asc" | "desc";

function RuleSection({
  title,
  description,
  type,
}: {
  title: string;
  description: string;
  type: KeywordCleaningRuleType;
}) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("value");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [isLoading, setIsLoading] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  };

  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    const result = await getKeywordCleaningRulesRaw({
      page,
      search: debouncedSearch,
      sortBy,
      sortOrder,
      type,
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      setRules((result.data ?? []) as Rule[]);
      setTotal(result.total ?? 0);
      setPageSize(result.pageSize ?? 50);
    }
    setIsLoading(false);
  }, [page, debouncedSearch, sortBy, sortOrder, type]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const totalPages = Math.ceil(total / pageSize);

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const renderSortIcon = (column: SortBy) => {
    if (sortBy !== column)
      return <ArrowUpDown className="ml-1 h-3 w-3 inline text-muted-foreground/50" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    );
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;
    setIsSubmitting(true);
    const result = await addKeywordCleaningRule(type, newValue);
    if (result.error) {
      toast.error(result.error);
    } else {
      setNewValue("");
      fetchRules();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteKeywordCleaningRule(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      fetchRules();
    }
  };

  const handleUpdate = async (id: string, value: string) => {
    const result = await updateKeywordCleaningRule(id, value);
    if (result.error) {
      toast.error(result.error);
      fetchRules();
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-medium">{title}</h4>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-8 pr-8 h-9"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
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
        <form onSubmit={handleAdd} className="flex gap-2 w-full sm:w-auto">
          <Input
            placeholder={`Add ${title.toLowerCase()}...`}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="h-9 w-full sm:w-48"
          />
          <Button type="submit" size="sm" disabled={!newValue.trim() || isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>
      </div>

      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-muted-foreground uppercase bg-muted sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 font-medium w-12 text-center">#</th>
                <th
                  className="px-4 py-2.5 font-medium cursor-pointer hover:bg-muted-foreground/10 select-none"
                  onClick={() => handleSort("value")}
                >
                  Value {renderSortIcon("value")}
                </th>
                <th
                  className="px-4 py-2.5 font-medium cursor-pointer hover:bg-muted-foreground/10 select-none w-40"
                  onClick={() => handleSort("createdAt")}
                >
                  Added Date {renderSortIcon("createdAt")}
                </th>
                <th className="px-4 py-2.5 font-medium text-center w-16">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    {debouncedSearch ? `No entries found for "${debouncedSearch}"` : "No entries found."}
                  </td>
                </tr>
              ) : (
                rules.map((r, index) => (
                  <tr key={r.id} className="hover:bg-muted/30 group">
                    <td className="px-4 py-1 text-center text-muted-foreground text-xs">
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    <td className="px-4 py-1">
                      <Input
                        defaultValue={r.value}
                        key={r.value}
                        className="h-7 border-transparent hover:border-input focus:border-input bg-transparent text-sm"
                        onBlur={(e) => {
                          if (e.target.value !== r.value) {
                            handleUpdate(r.id, e.target.value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                      />
                    </td>
                    <td className="px-4 py-1 text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-1 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                        onClick={() => handleDelete(r.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {isLoading ? "Loading..." : `${total} ${total === 1 ? "entry" : "entries"}`}
        </span>
        {totalPages > 1 && (
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
        )}
      </div>
    </div>
  );
}

export function KeywordCleaningRulesTab() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data } = await getKeywordCleaningRules();
      if (!data || (data.quantityUnits.length === 0 && data.discountPrefixes.length === 0)) {
        await seedDefaultKeywordCleaningRules();
      }
      setIsReady(true);
    };
    init();
  }, []);

  if (!isReady) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium">Keyword Cleaning Rules</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Manage patterns used by the keyword cleaner to strip quantity prefixes and discount
          annotations from item names before auto-mapping.
        </p>
      </div>

      <RuleSection
        title="Quantity Units"
        description="Unit strings stripped from the beginning of item names (e.g. &quot;2 kg&quot; → &quot;&quot;)."
        type="quantity_unit"
      />

      <div className="border-t" />

      <RuleSection
        title="Discount Prefixes"
        description="Prefixes for trailing parenthetical annotations stripped from item names (e.g. &quot;Item (Disc 6k)&quot; → &quot;Item&quot;)."
        type="discount_prefix"
      />
    </div>
  );
}
