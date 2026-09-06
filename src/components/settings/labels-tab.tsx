"use client";

import { useEffect, useState } from "react";
import { createLabel, deleteLabel, getLabels, updateLabel } from "@/actions/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import {
  hasCustomLabelColors,
  normalizeHexColor,
  resolveLabelChipColors,
  suggestBackgroundColorFor,
  suggestTextColorFor,
} from "@/features/labels/label-colors";

const MySwal = withReactContent(Swal);

type Label = {
  id: string;
  name: string;
  textColor: string | null;
  bgColor: string | null;
  createdAt: Date;
};

type LabelPatch = {
  name: string;
  textColor: string | null;
  bgColor: string | null;
};

/** Chip preview honoring the label's colors (falls back to the neutral style). */
function LabelPreviewChip({ label }: { label: Label }) {
  const style = resolveLabelChipColors(label);
  return (
    <span
      className="inline-flex max-w-[160px] shrink-0 items-center rounded-sm bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium leading-4 text-primary"
      style={style.backgroundColor || style.color ? style : undefined}
    >
      <span className="truncate">{label.name}</span>
    </span>
  );
}

interface LabelRowProps {
  label: Label;
  index: number;
  /** Optimistically stores the patch; returns false (and reloads) on error. */
  onSave: (id: string, patch: LabelPatch) => Promise<boolean>;
  onDelete: (label: Label) => void;
}

function LabelRow({ label, index, onSave, onDelete }: LabelRowProps) {
  const [name, setName] = useState(label.name);
  const [textColor, setTextColor] = useState(label.textColor ?? "");
  const [bgColor, setBgColor] = useState(label.bgColor ?? "");
  const [isSaving, setIsSaving] = useState(false);

  // Keep the local drafts in sync when the parent reloads (e.g. after an
  // error) without clobbering an in-flight optimistic edit.
  useEffect(() => {
    if (!isSaving) {
      setName(label.name);
      setTextColor(label.textColor ?? "");
      setBgColor(label.bgColor ?? "");
    }
  }, [label.id, label.name, label.textColor, label.bgColor, isSaving]);

  const commit = async (patch: LabelPatch) => {
    if (isSaving) return;
    setIsSaving(true);
    const ok = await onSave(label.id, patch);
    setIsSaving(false);
    return ok;
  };

  const patchWith = (fields: { name?: string; textColor?: string | null; bgColor?: string | null }) => ({
    name: fields.name ?? name,
    textColor: fields.textColor !== undefined ? fields.textColor : textColor || null,
    bgColor: fields.bgColor !== undefined ? fields.bgColor : bgColor || null,
  });

  const handleNameBlur = () => {
    if (name.trim() && name !== label.name) {
      commit(patchWith({ name: name.trim() })).then((ok) => {
        if (ok) toast.success("Label updated");
      });
    }
  };

  // "Auto" next to the background: suggest a text color that contrasts with
  // the chosen background.
  const handleAutoTextColor = async () => {
    const bg = normalizeHexColor(bgColor);
    if (!bg) return;
    const suggested = suggestTextColorFor(bg);
    setTextColor(suggested);
    await commit(patchWith({ textColor: suggested, bgColor: bg }));
  };

  // "Auto" next to the text: suggest a background color that contrasts with
  // the chosen text.
  const handleAutoBackground = async () => {
    const text = normalizeHexColor(textColor);
    if (!text) return;
    const suggested = suggestBackgroundColorFor(text);
    setBgColor(suggested);
    await commit(patchWith({ textColor: text, bgColor: suggested }));
  };

  const handleResetColors = () => {
    setTextColor("");
    setBgColor("");
    commit(patchWith({ textColor: null, bgColor: null }));
  };

  const bgHex = normalizeHexColor(bgColor);
  const textHex = normalizeHexColor(textColor);

  return (
    <div className="flex flex-col gap-1.5 px-2 py-2 hover:bg-muted/30 transition-colors group">
      <div className="flex items-center gap-2">
        <span className="w-5 text-center text-xs text-muted-foreground shrink-0">{index + 1}</span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          aria-label="Label name"
          className="flex-1 min-w-0 font-medium h-8 border-transparent hover:border-input focus:border-input bg-transparent shadow-none"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-muted-foreground"
          title="Reset to default colors"
          onClick={handleResetColors}
          disabled={!hasCustomLabelColors(label)}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(label)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-7">
        <LabelPreviewChip label={{ ...label, name }} />

        <div className="flex items-center gap-1.5">
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span aria-hidden className="sr-only">Background color</span>
            Bg
            <input
              type="color"
              value={bgColor || "#000000"}
              onChange={(e) => setBgColor(e.target.value)}
              onBlur={() => commit(patchWith({ bgColor: bgColor || null }))}
              className="h-6 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
              title="Background color"
            />
          </label>
          <span className="w-14 font-mono text-[10px] text-muted-foreground">{bgHex ?? "default"}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-1.5 text-[10px]"
            title="Auto: suggest a text color that contrasts with the background"
            disabled={!bgHex}
            onClick={handleAutoTextColor}
          >
            Auto text
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span aria-hidden className="sr-only">Text color</span>
            Text
            <input
              type="color"
              value={textColor || "#000000"}
              onChange={(e) => setTextColor(e.target.value)}
              onBlur={() => commit(patchWith({ textColor: textColor || null }))}
              className="h-6 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
              title="Text color"
            />
          </label>
          <span className="w-14 font-mono text-[10px] text-muted-foreground">{textHex ?? "default"}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-1.5 text-[10px]"
            title="Auto: suggest a background color that contrasts with the text"
            disabled={!textHex}
            onClick={handleAutoBackground}
          >
            Auto bg
          </Button>
        </div>
      </div>
    </div>
  );
}

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

  const handleSave = async (id: string, patch: LabelPatch): Promise<boolean> => {
    // Optimistic update so chips and previews feel instant.
    setLabels((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              name: patch.name,
              textColor: patch.textColor,
              bgColor: patch.bgColor,
            }
          : l,
      ),
    );

    const result = await updateLabel(id, patch.name, {
      textColor: patch.textColor,
      bgColor: patch.bgColor,
    });
    if (result.error) {
      toast.error(result.error);
      fetchLabels();
      return false;
    }
    return true;
  };

  const handleDelete = async (label: Label) => {
    const resultAlert = await MySwal.fire({
      title: `Hapus label "${label.name}"?`,
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
    setLabels((prev) => prev.filter((l) => l.id !== label.id));

    const result = await deleteLabel(label.id);
    if (result.error) {
      setLabels(previous);
      toast.error(result.error);
    } else {
      toast.success("Label deleted");
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
          values for a multiple-selection dropdown cell. Each label can carry
          its own text and background color; use the Auto buttons to pick a
          contrasting partner color.
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
            <LabelRow
              key={label.id}
              label={label}
              index={index}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
