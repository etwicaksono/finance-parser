"use client";

import { useState, useEffect } from "react";
import { getContraKeywords, addContraKeyword, deleteContraKeyword, seedDefaultContraKeywords } from "@/actions/contra-keywords";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2, Search } from "lucide-react";

type ContraKeyword = {
  id: string;
  keyword: string;
  createdAt: Date;
};

export function ContraKeywordsTab() {
  const [keywords, setKeywords] = useState<ContraKeyword[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newKeyword, setNewKeyword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    const { data } = await getContraKeywords();
    if (data) {
      if (data.length === 0) {
        // Auto seed
        await seedDefaultContraKeywords();
        const seeded = await getContraKeywords();
        if (seeded.data) setKeywords(seeded.data);
      } else {
        setKeywords(data);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    
    setIsSubmitting(true);
    const res = await addContraKeyword(newKeyword);
    if (res.data) {
      setNewKeyword(""); // Clear input
      await loadData();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await deleteContraKeyword(id);
    setKeywords(keywords.filter(k => k.id !== id));
  };

  const filteredKeywords = keywords.filter(k => k.keyword.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Contra Keywords</h3>
        <p className="text-sm text-muted-foreground">
          Manage keywords that represent discounts, vouchers, or refunds. Items containing these keywords will bypass the automatic negative sign conversion in expense categories, allowing them to accurately reduce your total expenses.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search keywords..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <form onSubmit={handleAdd} className="flex gap-2 w-full sm:w-auto">
          <Input
            placeholder="New keyword (e.g. diskon)"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            className="w-full sm:w-64"
          />
          <Button type="submit" disabled={isSubmitting || !newKeyword.trim()}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Add
          </Button>
        </form>
      </div>

      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Keyword</th>
                <th className="px-4 py-3 font-medium">Added Date</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredKeywords.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    No keywords found.
                  </td>
                </tr>
              ) : (
                filteredKeywords.map((k) => (
                  <tr key={k.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{k.keyword}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(k.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
