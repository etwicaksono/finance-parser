"use client";

import { useState, useEffect } from "react";
import { getLabels, createLabel, deleteLabel, updateLabel } from "@/actions/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

type Label = {
  id: string;
  name: string;
  createdAt: Date;
};

export function LabelsTab() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchLabels();
  }, []);

  const fetchLabels = async () => {
    setIsLoading(true);
    const result = await getLabels();
    if (result.data) {
      setLabels(result.data as Label[]);
    }
    setIsLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    const result = await createLabel(newName.trim());
    if (result.data) {
      setNewName("");
      setLabels((prev) => [...prev, result.data as Label]);
    } else if (result.error) {
      toast.error(result.error);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const resultAlert = await MySwal.fire({
      title: `Hapus label "${name}"?`,
      text: "Label akan dilepas dari semua keyword mapping yang menggunakannya.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "var(--destructive)",
      cancelButtonColor: "var(--muted-foreground)",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
      background: "var(--background)",
      color: "var(--foreground)",
      customClass: {
        popup: "border border-border rounded-lg",
      },
    });

    if (!resultAlert.isConfirmed) return;

    const previous = [...labels];
    setLabels((prev) => prev.filter((l) => l.id !== id));

    const result = await deleteLabel(id);
    if (result.error) {
      setLabels(previous);
      toast.error(result.error);
    } else {
      toast.success("Label deleted");
    }
  };

  const handleUpdate = async (id: string, newName: string) => {
    if (!newName.trim()) return;

    setLabels((prev) => prev.map((l) => (l.id === id ? { ...l, name: newName } : l)));

    const result = await updateLabel(id, newName);
    if (result.error) {
      toast.error(result.error);
      fetchLabels();
    } else {
      toast.success("Label updated");
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
        <h3 className="text-lg font-medium">Labels</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Manage the label list used by keyword mappings and the spreadsheet
          Labels column. Labels paste into Google Sheets as comma-separated
          values for a multiple-selection dropdown cell.
        </p>
      </div>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <Input
          placeholder="New label name..."
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
        {labels.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No labels found. Create one to get started.
          </div>
        ) : (
          labels.map((label, index) => (
            <div key={label.id} className="flex items-center p-1 hover:bg-muted/50 transition-colors group gap-2">
              <span className="w-6 text-center text-xs text-muted-foreground shrink-0">
                {index + 1}
              </span>
              <Input
                defaultValue={label.name}
                className="flex-1 font-medium h-8 border-transparent hover:border-input focus:border-input bg-transparent shadow-none"
                onBlur={(e) => {
                  if (e.target.value !== label.name) {
                    handleUpdate(label.id, e.target.value);
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
                onClick={() => handleDelete(label.id, label.name)}
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
