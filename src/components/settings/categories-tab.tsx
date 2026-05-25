"use client";

import { useState, useEffect } from "react";
import { getCategories, addCategory, deleteCategory } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2 } from "lucide-react";

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
      alert(result.error);
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
          categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
              <span className="font-medium">{cat.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
