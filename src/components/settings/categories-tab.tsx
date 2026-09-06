"use client";

import { useState, useEffect } from "react";
import {
  getCategories,
  addCategory,
  deleteCategory,
  updateCategory,
} from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { CategorySign } from "@/types";

type Category = {
  id: string;
  name: string;
  signType?: CategorySign;
  createdAt: Date;
};

const SIGN_OPTIONS: { value: CategorySign; label: string }[] = [
  { value: "income", label: "Income (+)" },
  { value: "expense", label: "Expense (−)" },
  { value: "both", label: "Both (±)" },
];

export function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newSign, setNewSign] = useState<CategorySign>("expense");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    const result = await getCategories();
    if (result.data) {
      setCategories(result.data as Category[]);
    }
    setIsLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    const result = await addCategory(newName, newSign);
    if (result.data) {
      setNewName("");
      // Append optimistically or refetch
      setCategories((prev) => [...prev, result.data as Category]);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    // Optimistic delete
    const previous = [...categories];
    setCategories((prev) => prev.filter((c) => c.id !== id));

    const result = await deleteCategory(id);
    if (result.error) {
      // Revert if error
      setCategories(previous);
      toast.error(result.error);
    } else {
      toast.success("Category deleted");
    }
  };

  const handleUpdate = async (
    id: string,
    patch: { name?: string; signType?: CategorySign }
  ) => {
    if (patch.name !== undefined && !patch.name.trim()) return;

    // Optimistic update
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              ...(patch.name !== undefined && { name: patch.name }),
              ...(patch.signType !== undefined && { signType: patch.signType }),
            }
          : c
      )
    );

    const result = await updateCategory(
      id,
      patch.name ?? categories.find((c) => c.id === id)?.name ?? "",
      patch.signType
    );
    if (result.error) {
      toast.error(result.error);
      fetchCategories(); // Revert on error
    } else {
      toast.success(
        patch.signType !== undefined
          ? "Category sign updated"
          : "Category updated"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-medium">Categories</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage transaction categories. The sign type decides whether amounts
          are forced positive (income), negative (expense), or left untouched
          (both).
        </p>
      </div>
      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <Input
          placeholder="New category name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={isSubmitting}
          className="flex-1"
        />
        <select
          aria-label="Sign type"
          value={newSign}
          onChange={(e) => setNewSign(e.target.value as CategorySign)}
          disabled={isSubmitting}
          className="border-input bg-background h-9 rounded-md border px-2 text-sm"
        >
          {SIGN_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={isSubmitting || !newName.trim()}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Add
        </Button>
      </form>

      <div className="flex-1 divide-y overflow-y-auto rounded-md border">
        {categories.length === 0 ? (
          <div className="text-muted-foreground p-4 text-center text-sm">
            No categories found. Create one to get started.
          </div>
        ) : (
          categories.map((cat, index) => (
            <div
              key={cat.id}
              className="hover:bg-muted/50 group flex items-center gap-2 p-1 transition-colors"
            >
              <span className="text-muted-foreground w-6 shrink-0 text-center text-xs">
                {index + 1}
              </span>
              <Input
                defaultValue={cat.name}
                className="hover:border-input focus:border-input h-8 flex-1 border-transparent bg-transparent font-medium shadow-none"
                onBlur={(e) => {
                  if (e.target.value !== cat.name) {
                    handleUpdate(cat.id, { name: e.target.value });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
              />
              <select
                aria-label={`Sign type for ${cat.name}`}
                value={cat.signType ?? "expense"}
                onChange={(e) => {
                  handleUpdate(cat.id, {
                    signType: e.target.value as CategorySign,
                  });
                }}
                className="border-input bg-background h-8 rounded-md border px-2 text-xs"
              >
                {SIGN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => handleDelete(cat.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
