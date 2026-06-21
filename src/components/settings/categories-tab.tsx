"use client";

import { useState, useEffect } from "react";
import { getCategories, addCategory, deleteCategory, updateCategory } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  createdAt: Date;
};

export function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
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
    const result = await addCategory(newName);
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

  const handleUpdate = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    
    // Optimistic update
    setCategories((prev) => 
      prev.map((c) => (c.id === id ? { ...c, name: newName } : c))
    );

    const result = await updateCategory(id, newName);
    if (result.error) {
      toast.error(result.error);
      fetchCategories(); // Revert on error
    } else {
      toast.success("Category updated");
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-lg font-medium">Categories</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Manage transaction categories used to classify and group your expenses.
        </p>
      </div>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <Input
          placeholder="New category name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={isSubmitting}
        />
        <Button type="submit" disabled={isSubmitting || !newName.trim()}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Add
        </Button>
      </form>

      <div className="flex-1 overflow-y-auto border rounded-md divide-y">
        {categories.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No categories found. Create one to get started.
          </div>
        ) : (
          categories.map((cat, index) => (
            <div key={cat.id} className="flex items-center p-1 hover:bg-muted/50 transition-colors group gap-2">
              <span className="w-6 text-center text-xs text-muted-foreground shrink-0">
                {index + 1}
              </span>
              <Input
                defaultValue={cat.name}
                className="flex-1 font-medium h-8 border-transparent hover:border-input focus:border-input bg-transparent shadow-none"
                onBlur={(e) => {
                  if (e.target.value !== cat.name) {
                    handleUpdate(cat.id, e.target.value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10"
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
