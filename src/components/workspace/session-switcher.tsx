"use client";

import * as React from "react";
import { format } from "date-fns";
import { Check, ChevronsUpDown, Edit2, Plus, Trash2 } from "lucide-react";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TransactionRow, SessionImage } from "@/types";
import { getSessions, createSession, updateSession, deleteSession } from "@/actions/sessions";
import { toast } from "sonner";

export interface SessionData {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionSwitcherProps {
  currentSessionId: string | null;
  onSessionChange: (sessionId: string, data: TransactionRow[], images?: SessionImage[], metadata?: any) => void;
  onNewSession: () => void;
  rawTransactions: TransactionRow[];
}

export function SessionSwitcher({ currentSessionId, onSessionChange, onNewSession, rawTransactions }: SessionSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const [sessions, setSessions] = React.useState<SessionData[]>([]);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState("");

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  React.useEffect(() => {
    loadSessions();
  }, [currentSessionId]);

  const loadSessions = async () => {
    const data = await getSessions();
    setSessions(data);
  };

  const handleSelectSession = async (id: string) => {
    setOpen(false);
    if (id === currentSessionId) return;
    
    // fetch session data
    try {
      const { getSessionById } = await import("@/actions/sessions");
      const session = await getSessionById(id);
      if (session) {
        onSessionChange(session.id, (session.data as TransactionRow[]) || [], (session.images as SessionImage[]) || [], session.metadata);
      }
    } catch (error) {
      console.error(error);
      toast.error("Gagal memuat sesi");
    }
  };

  const handleRename = async () => {
    if (!currentSessionId || !editName.trim()) {
      setIsEditing(false);
      return;
    }
    
    const newName = editName.trim();
    setIsEditing(false);
    
    if (newName === currentSession?.name) return;
    
    // Optimistic update
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, name: newName } : s));
    
    try {
      await updateSession(currentSessionId, { name: newName });
      toast.success("Nama sesi diperbarui");
    } catch (error) {
      console.error(error);
      toast.error("Gagal memperbarui nama sesi");
      loadSessions(); // revert
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, sessionName: string) => {
    e.stopPropagation();
    setOpen(false); // close popover to show alert cleanly
    
    const result = await MySwal.fire({
      title: 'Hapus Sesi?',
      text: `Anda yakin ingin menghapus sesi "${sessionName}"? Data yang dihapus tidak bisa dikembalikan.`,
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

    if (!result.isConfirmed) {
      setOpen(true); // reopen popover if cancelled
      return;
    }
    
    try {
      await deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (id === currentSessionId) {
        onNewSession();
      }
      toast.success("Sesi dihapus");
    } catch (error) {
      console.error(error);
      toast.error("Gagal menghapus sesi");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  if (!currentSession && sessions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {isEditing ? (
        <Input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          className="h-9 w-[250px]"
        />
      ) : (
        <div className="flex items-center">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={`w-[250px] justify-between ${currentSession ? 'rounded-r-none border-r-0' : ''}`}
                />
              }
            >
              <span className="truncate">{currentSession ? currentSession.name : "Pilih Sesi..."}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <div className="max-h-[300px] overflow-auto py-1">
                {sessions.length === 0 ? (
                  <p className="p-4 text-sm text-center text-muted-foreground">Tidak ada sesi ditemukan.</p>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                      onClick={() => handleSelectSession(session.id)}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Check
                          className={`h-4 w-4 shrink-0 ${
                            currentSessionId === session.id ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <div className="flex flex-col overflow-hidden">
                          <span className="truncate">{session.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(session.updatedAt), "dd MMM yyyy HH:mm")}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={(e) => handleDelete(e, session.id, session.name)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
          {currentSession && (
            <Button 
              variant="outline" 
              size="icon"
              className="rounded-l-none border-l-0 px-2 h-9 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setEditName(currentSession.name);
                setIsEditing(true);
              }}
              title="Edit Session Name"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      <Button variant="default" size="sm" onClick={onNewSession} className="gap-1 h-9">
        <Plus className="h-4 w-4" />
        New
      </Button>
    </div>
  );
}
