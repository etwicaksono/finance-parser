"use client";

import { useState, useEffect } from "react";
import { getMappings, addMapping, deleteMapping } from "@/actions/mappings";
import { getCategories } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2 } from "lucide-react";

type Category = {
  id: string;
  name: string;
};

type Mapping = {
  id: string;
  keyword: string;
  categoryId: string;
  createdAt: Date;
};

export function MappingsTab() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newKeyword, setNewKeyword] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [mapRes, catRes] = await Promise.all([
      getMappings(),
      getCategories(),
    ]);
    
    if (mapRes.data) setMappings(mapRes.data as Mapping[]);
    if (catRes.data) setCategories(catRes.data as Category[]);
    
    setIsLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim() || !newCategoryId) return;

    setIsSubmitting(true);
    const result = await addMapping(newKeyword, newCategoryId);
    if (result.error) {
      alert(result.error);
    } else if (result.data) {
      setNewKeyword("");
      setNewCategoryId("");
      setMappings((prev) => [...prev, result.data as Mapping]);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const previous = [...mappings];
    setMappings((prev) => prev.filter((m) => m.id !== id));

    const result = await deleteMapping(id);
    if (result.error) {
      setMappings(previous);
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
          placeholder="Keyword..."
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          disabled={isSubmitting}
          className="flex-1"
        />
        <select
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={newCategoryId}
          onChange={(e) => setNewCategoryId(e.target.value)}
          disabled={isSubmitting}
          required
        >
          <option value="" disabled>Select category...</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <Button type="submit" disabled={isSubmitting || !newKeyword.trim() || !newCategoryId}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Add
        </Button>
      </form>

      <div className="flex-1 overflow-y-auto border rounded-md divide-y">
        {mappings.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No mappings found. Create one to get started.
          </div>
        ) : (
          mappings.map((mapping) => {
            const cat = categories.find(c => c.id === mapping.categoryId);
            return (
              <div key={mapping.id} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{mapping.keyword}</span>
                  <span className="text-xs text-muted-foreground">Category: {cat?.name || "Unknown"}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(mapping.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
