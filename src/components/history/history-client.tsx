"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSessionsPaginated, getSessionById, updateSessionName, deleteSession } from "@/actions/sessions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ArrowLeft, Search, ArrowUpDown, ArrowUp, ArrowDown, X,
  ChevronLeft, ChevronRight, Trash2, Edit2, Loader2,
  MessageSquare, ScanLine, FileText, ImageIcon, ExternalLink,
  ZoomIn, ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import type { TransactionRow, SessionImage, SessionMetadata } from "@/types";

type SessionSummary = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  rowCount: number;
  imageCount: number;
  sources: string[];
};

type SortBy = "name" | "createdAt" | "updatedAt";
type SortOrder = "asc" | "desc";

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof MessageSquare; color: string }> = {
  chat: { label: "Chat", icon: MessageSquare, color: "text-green-600 bg-green-50" },
  scan: { label: "Scan", icon: ScanLine, color: "text-blue-600 bg-blue-50" },
  manual: { label: "Manual", icon: FileText, color: "text-purple-600 bg-purple-50" },
  "manual-input": { label: "Input", icon: FileText, color: "text-orange-600 bg-orange-50" },
};

const MySwal = withReactContent(Swal);

export function HistoryClient() {
  const router = useRouter();

  // List state
  const [sessionList, setSessionList] = useState<SessionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("updatedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Detail state
  const [detail, setDetail] = useState<{
    id: string;
    name: string;
    data: TransactionRow[];
    images: SessionImage[];
    metadata: SessionMetadata;
    createdAt: Date;
    updatedAt: Date;
  } | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Rename state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");

  // Image viewer state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  };

  const fetchList = useCallback(async () => {
    setIsLoadingList(true);
    const result = await getSessionsPaginated({
      page,
      search: debouncedSearch,
      sortBy,
      sortOrder,
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      setSessionList(result.data ?? []);
      setTotal(result.total ?? 0);
      setPageSize(result.pageSize ?? 10);
    }
    setIsLoadingList(false);
  }, [page, debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Auto-select first session on initial load
  useEffect(() => {
    if (!selectedId && sessionList.length > 0) {
      setSelectedId(sessionList[0]?.id ?? null);
    }
  }, [sessionList, selectedId]);

  // Fetch detail when selection changes
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    const fetchDetail = async () => {
      setIsLoadingDetail(true);
      const session = await getSessionById(selectedId);
      if (session) {
        setDetail({
          id: session.id,
          name: session.name,
          data: (session.data as TransactionRow[]) || [],
          images: (session.images as SessionImage[]) || [],
          metadata: (session.metadata as SessionMetadata) || {},
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        });
      }
      setIsLoadingDetail(false);
    };
    fetchDetail();
  }, [selectedId]);

  const totalPages = Math.ceil(total / pageSize);

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder(column === "name" ? "asc" : "desc");
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

  const handleRename = async () => {
    if (!selectedId || !editName.trim()) {
      setIsEditing(false);
      return;
    }
    setIsEditing(false);
    const result = await updateSessionName(selectedId, editName);
    if (result.error) {
      toast.error(result.error);
    } else {
      setDetail(prev => prev ? { ...prev, name: editName.trim() } : null);
      setSessionList(prev => prev.map(s => s.id === selectedId ? { ...s, name: editName.trim() } : s));
      toast.success("Session renamed");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const result = await MySwal.fire({
      title: "Hapus Sesi?",
      text: `Anda yakin ingin menghapus sesi "${name}"? Data yang dihapus tidak bisa dikembalikan.`,
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

    if (!result.isConfirmed) return;

    const success = await deleteSession(id);
    if (success) {
      toast.success("Session deleted");
      if (selectedId === id) {
        setSelectedId(null);
        setDetail(null);
      }
      fetchList();
    } else {
      toast.error("Failed to delete session");
    }
  };

  const handleLoad = (id: string) => {
    router.push(`/?session=${id}`);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" title="Back to Home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Session History</h1>
        </div>
      </header>

      {/* Main content: list + detail */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Session list */}
        <div className="w-80 border-r flex flex-col shrink-0">
          {/* Search + sort bar */}
          <div className="p-3 border-b space-y-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Search sessions..."
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
            <div className="flex items-center gap-1 text-xs">
              <button
                className={`px-2 py-1 rounded-md flex items-center gap-0.5 hover:bg-muted ${sortBy === "updatedAt" ? "bg-muted font-medium" : "text-muted-foreground"}`}
                onClick={() => handleSort("updatedAt")}
              >
                Updated {renderSortIcon("updatedAt")}
              </button>
              <button
                className={`px-2 py-1 rounded-md flex items-center gap-0.5 hover:bg-muted ${sortBy === "name" ? "bg-muted font-medium" : "text-muted-foreground"}`}
                onClick={() => handleSort("name")}
              >
                Name {renderSortIcon("name")}
              </button>
              <button
                className={`px-2 py-1 rounded-md flex items-center gap-0.5 hover:bg-muted ${sortBy === "createdAt" ? "bg-muted font-medium" : "text-muted-foreground"}`}
                onClick={() => handleSort("createdAt")}
              >
                Created {renderSortIcon("createdAt")}
              </button>
            </div>
          </div>

          {/* Session list */}
          <div className="relative flex-1 min-h-0">
            {isLoadingList && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 overflow-y-auto h-full">
              {sessionList.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {debouncedSearch ? `No sessions found for "${debouncedSearch}"` : "No sessions yet."}
                </div>
              ) : (
                sessionList.map((s) => (
                  <div
                    key={s.id}
                    className={`p-3 border-b cursor-pointer transition-colors ${
                      selectedId === s.id ? "bg-accent" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedId(s.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(s.updatedAt), "dd MMM yyyy HH:mm")}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-muted-foreground">
                            {s.rowCount} {s.rowCount === 1 ? "row" : "rows"}
                          </span>
                          {s.imageCount > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <ImageIcon className="h-3 w-3" />
                              {s.imageCount}
                            </span>
                          )}
                          {s.sources.filter(Boolean).map((src) => {
                            const cfg = SOURCE_CONFIG[src];
                            if (!cfg) return null;
                            const Icon = cfg.icon;
                            return (
                              <span
                                key={src}
                                className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${cfg.color}`}
                              >
                                <Icon className="h-2.5 w-2.5" />
                                {cfg.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <button
                        className="text-muted-foreground hover:text-destructive shrink-0 p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(s.id, s.name);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/10 shrink-0">
              <span className="text-xs text-muted-foreground">
                {total} sessions
              </span>
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
                <span className="text-xs text-muted-foreground px-1">
                  {page}/{totalPages}
                </span>
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
            </div>
          )}
        </div>

        {/* Right: Session detail */}
        <div className="relative flex-1 min-h-0">
          {isLoadingDetail && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 overflow-y-auto h-full">
            {!selectedId || !detail ? (
              <div className="flex items-center justify-center h-full">
                {isLoadingDetail ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {sessionList.length > 0 ? "Select a session to view details" : "No sessions to display"}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-6 space-y-6 max-w-4xl">
              {/* Detail header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <Input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={handleRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename();
                        else if (e.key === "Escape") setIsEditing(false);
                      }}
                      className="text-lg font-medium h-9"
                    />
                  ) : (
                    <h2 className="text-lg font-medium flex items-center gap-2">
                      {detail.name}
                      <button
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditName(detail.name);
                          setIsEditing(true);
                        }}
                        title="Rename"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </h2>
                  )}
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Created: {format(new Date(detail.createdAt), "dd MMM yyyy HH:mm")}</span>
                    <span>Updated: {format(new Date(detail.updatedAt), "dd MMM yyyy HH:mm")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleLoad(detail.id)}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Load
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(detail.id, detail.name)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>

              {/* Input section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Input</h3>

                {/* WhatsApp text */}
                {detail.metadata.whatsappText && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">WhatsApp Text</span>
                    </div>
                    <pre className="text-xs bg-muted/50 rounded-md border p-3 whitespace-pre-wrap break-words max-h-48 overflow-y-auto font-mono">
                      {detail.metadata.whatsappText}
                    </pre>
                  </div>
                )}

                {/* WhatsApp parse batches */}
                {detail.metadata.chatParseBatches && detail.metadata.chatParseBatches.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">WhatsApp Parsing ({detail.metadata.chatParseBatches.length})</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {detail.metadata.chatParseBatches.map((batch) => (
                        <div key={batch.id} className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{batch.name}</span>
                              <span className="text-[10px] text-muted-foreground">{batch.lineCount} baris</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-line">
                              {batch.textPreview}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual text */}
                {detail.metadata.manualText && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Manual JSON</span>
                    </div>
                    <pre className="text-xs bg-muted/50 rounded-md border p-3 whitespace-pre-wrap break-words max-h-48 overflow-y-auto font-mono">
                      {detail.metadata.manualText}
                    </pre>
                  </div>
                )}

                {/* JSON parse batches */}
                {detail.metadata.jsonParseBatches && detail.metadata.jsonParseBatches.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">JSON Input ({detail.metadata.jsonParseBatches.length})</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {detail.metadata.jsonParseBatches.map((batch) => (
                        <div key={batch.id} className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{batch.name}</span>
                              <span className="text-[10px] text-muted-foreground">{batch.lineCount} items</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-line font-mono">
                              {batch.textPreview}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Receipt images */}
                {detail.images.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <ImageIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Receipt Images ({detail.images.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detail.images.map((img, idx) => {
                        const url = typeof img === "string" ? img : img.url;
                        const name = typeof img === "string" ? `Image ${idx + 1}` : img.name;
                        return (
                          <div
                            key={idx}
                            className="relative group rounded-md overflow-hidden border bg-muted w-16 h-20 cursor-pointer shrink-0"
                            onClick={() => setSelectedImage(url)}
                            title={name}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={name}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-2 py-1 truncate">
                              {name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!detail.metadata.whatsappText && !detail.metadata.manualText && detail.images.length === 0 && (
                  <p className="text-sm text-muted-foreground">No input data recorded.</p>
                )}
              </div>

              {/* Output section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Output ({detail.data.length} {detail.data.length === 1 ? "row" : "rows"})
                </h3>

                {detail.data.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No transaction data.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 font-medium w-10 text-center">#</th>
                          <th className="px-3 py-2 font-medium">Date</th>
                          <th className="px-3 py-2 font-medium">Item</th>
                          <th className="px-3 py-2 font-medium text-right">Amount</th>
                          <th className="px-3 py-2 font-medium">Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {detail.data.map((row, idx) => {
                          const srcCfg = row.source ? SOURCE_CONFIG[row.source] : null;
                          const SrcIcon = srcCfg?.icon;
                          return (
                            <tr key={row.id || idx} className="hover:bg-muted/30">
                              <td className="px-3 py-1.5 text-center text-muted-foreground text-xs">
                                {idx + 1}
                              </td>
                              <td className="px-3 py-1.5 text-xs whitespace-nowrap">
                                {row.date || "-"}
                              </td>
                              <td className="px-3 py-1.5 text-xs">
                                {row.item || "-"}
                              </td>
                              <td className="px-3 py-1.5 text-xs text-right font-mono">
                                {row.amount != null ? row.amount.toLocaleString("id-ID") : "-"}
                              </td>
                              <td className="px-3 py-1.5 text-xs">
                                {srcCfg && SrcIcon ? (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 w-fit ${srcCfg.color}`}>
                                    <SrcIcon className="h-2.5 w-2.5" />
                                    {srcCfg.label}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedImage(null);
            setZoomLevel(1);
            setPanOffset({ x: 0, y: 0 });
          }
        }}
      >
        <DialogContent showCloseButton={false} className="max-w-[95vw] sm:max-w-5xl h-[90vh] p-1 bg-transparent border-none shadow-none flex flex-col justify-center items-center">
          <div
            className="relative w-full h-full flex justify-center items-center overflow-hidden"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsPanning(true);
              setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
            }}
            onMouseMove={(e) => {
              if (isPanning) {
                setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
              }
            }}
            onMouseUp={() => setIsPanning(false)}
            onMouseLeave={() => setIsPanning(false)}
          >
            {selectedImage && (
              <div
                className="origin-center cursor-grab active:cursor-grabbing"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                  transition: isPanning ? 'none' : 'transform 0.2s ease-out'
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage}
                  alt="Enlarged receipt"
                  className="max-w-full max-h-full object-contain rounded-md"
                  draggable={false}
                />
              </div>
            )}

            {/* Zoom Controls */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm text-white p-2 rounded-full z-50">
              <button
                onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium w-12 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
            </div>

            <button
              onClick={() => {
                setSelectedImage(null);
                setZoomLevel(1);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors z-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
