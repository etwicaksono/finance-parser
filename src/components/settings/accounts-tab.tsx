"use client";

import { useState, useEffect } from "react";
import { getAccounts, addAccount, deleteAccount, updateAccount } from "@/actions/accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Account = {
  id: string;
  name: string;
  createdAt: Date;
};

export function AccountsTab() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setIsLoading(true);
    const result = await getAccounts();
    if (result.data) {
      setAccounts(result.data as Account[]);
    }
    setIsLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    const result = await addAccount(newName);
    if (result.data) {
      setNewName("");
      setAccounts((prev) => [...prev, result.data as Account]);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const previous = [...accounts];
    setAccounts((prev) => prev.filter((a) => a.id !== id));

    const result = await deleteAccount(id);
    if (result.error) {
      setAccounts(previous);
      toast.error(result.error);
    } else {
      toast.success("Account deleted");
    }
  };

  const handleUpdate = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    
    setAccounts((prev) => 
      prev.map((a) => (a.id === id ? { ...a, name: newName } : a))
    );

    const result = await updateAccount(id, newName);
    if (result.error) {
      toast.error(result.error);
      fetchAccounts();
    } else {
      toast.success("Account updated");
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
        <h3 className="text-lg font-medium">Accounts</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Manage payment accounts used to track which source funds each transaction.
        </p>
      </div>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <Input
          placeholder="New account name..."
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
        {accounts.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No accounts found. Create one to get started.
          </div>
        ) : (
          accounts.map((acc, index) => (
            <div key={acc.id} className="flex items-center p-1 hover:bg-muted/50 transition-colors group gap-2">
              <span className="w-6 text-center text-xs text-muted-foreground shrink-0">
                {index + 1}
              </span>
              <Input
                defaultValue={acc.name}
                className="flex-1 font-medium h-8 border-transparent hover:border-input focus:border-input bg-transparent shadow-none"
                onBlur={(e) => {
                  if (e.target.value !== acc.name) {
                    handleUpdate(acc.id, e.target.value);
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
                onClick={() => handleDelete(acc.id)}
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
