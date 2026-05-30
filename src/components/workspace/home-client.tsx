"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MainWorkspace } from "@/components/layout/main-workspace";
import { WhatsAppInput } from "@/components/workspace/whatsapp-input";
import { SpreadsheetTable } from "@/components/workspace/spreadsheet-table";
import { TransactionRow, CategoryOption, AccountOption } from "@/types";
import { parseChat } from "@/features/parser/chat-parser";
import { suggestCategory } from "@/features/suggestions/category-suggester";
import { detectDuplicates } from "@/features/validation/duplicate-detector";
import { getCategorySign } from "@/features/validation/category-sign";
import { format } from "date-fns";
import { KeywordMapping } from "@/features/suggestions/types";
import { batchClassifyTransactions } from "@/actions/classify";
import { addMapping, batchAddMappings } from "@/actions/mappings";
import { cleanKeyword } from "@/lib/keyword-utils";
import * as React from "react";
import { ReceiptScanInput } from "@/components/workspace/receipt-scan-input";
import { GroupedItemsModal } from "./grouped-items-modal";
import { ManualJsonInput } from "@/components/workspace/manual-json-input";
import { scanReceiptImages } from "@/actions/scan-receipt";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorToast } from "@/components/ui/error-toast";
import { AiModelSelector } from "@/components/ui/ai-model-selector";
import { AiSettingsConfig } from "@/actions/ai-settings";
import { WorkspaceSettingsDropdown } from "@/components/workspace/workspace-settings";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { playNotification } from "@/features/audio/notification-sounds";
import { SessionSwitcher } from "./session-switcher";
import { CategoryMultiSelect } from "./category-multi-select";

interface HomeClientProps {
  initialCategories: CategoryOption[];
  initialAccounts: AccountOption[];
  initialMappings: KeywordMapping[];
  defaultAiSettings: AiSettingsConfig;
  geminiModels: string[];
  swiftrouterModels: string[];
}

export function HomeClient({ 
  initialCategories, 
  initialAccounts, 
  initialMappings,
  defaultAiSettings,
  geminiModels,
  swiftrouterModels
}: HomeClientProps) {
  const [rawTransactions, setRawTransactions] = useState<TransactionRow[]>([]);
  const [sessionImages, setSessionImages] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"raw" | "grouped">("raw");
  const [groupAmountOverrides, setGroupAmountOverrides] = useState<Record<string, number>>({});
  const [editingGroupRow, setEditingGroupRow] = useState<TransactionRow | null>(null);

  const [processingText, setProcessingText] = useState<string | null>(null);
  const [localAiConfig, setLocalAiConfig] = useState<AiSettingsConfig>(defaultAiSettings);
  const [activeTab, setActiveTab] = useState<string>("chat");
  const { settings: workspaceSettings } = useWorkspaceSettings();

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionMetadata, setSessionMetadata] = useState<import("@/types").SessionMetadata>({});
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string[]>(() => ["unmapped", ...initialCategories.map(c => c.id)]);

  React.useEffect(() => {
    import("@/actions/sessions").then(async ({ getSessions, getSessionById }) => {
      const sessions = await getSessions();
      if (sessions.length > 0 && sessions[0]?.id) {
        const sess = await getSessionById(sessions[0].id);
        if (sess) {
          setCurrentSessionId(sess.id);
          setRawTransactions((sess.data as TransactionRow[]) || []);
          setSessionImages((sess.images as string[]) || []);
          setSessionMetadata((sess.metadata as import("@/types").SessionMetadata) || {});
        }
      }
    }).catch(console.error);
  }, []);

  const handleNewSession = async () => {
    setCurrentSessionId(null);
    setRawTransactions([]);
    setSessionImages([]);
    setSessionMetadata({});
    setGroupAmountOverrides({});
  };

  React.useEffect(() => {
    if (!currentSessionId) {
      if (rawTransactions.length > 0 || sessionImages.length > 0) {
        // Auto-create session on first data
        import("@/actions/sessions").then(async ({ createSession }) => {
          const { format } = await import("date-fns");
          const name = `Parsing - ${format(new Date(), "dd MMM yyyy HH:mm")}`;
          const sess = await createSession(name, rawTransactions, sessionImages, sessionMetadata);
          if (sess) {
            setCurrentSessionId(sess.id);
          }
        }).catch(console.error);
      }
      return;
    }
    
    const timer = setTimeout(() => {
      import("@/actions/sessions").then(({ updateSession }) => {
        updateSession(currentSessionId, { data: rawTransactions, images: sessionImages, metadata: sessionMetadata }).catch(console.error);
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [rawTransactions, sessionImages, sessionMetadata, currentSessionId]);



  const processRawRows = async (rawRows: TransactionRow[]) => {
    setProcessingText("Mapping local data...");
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      if (rawRows.length === 0) {
        toast.warning("Tidak ada item yang berhasil dibaca.");
        return;
      }

      const itemsToClassify: string[] = [];
      const enrichedRows: TransactionRow[] = rawRows.map((row) => {
        const cleaned = cleanKeyword(row.item);
        const suggestion = suggestCategory(cleaned, initialMappings, []);
        if (suggestion?.categoryId) {
          row.categoryId = suggestion.categoryId;
          const catName = initialCategories.find(c => c.id === row.categoryId)?.name;
          if (catName) {
            const sign = getCategorySign(catName);
            if (sign === "income") row.amount = row.amount ? Math.abs(row.amount) : row.amount;
            else if (sign === "expense") row.amount = row.amount ? -Math.abs(row.amount) : row.amount;
          }
        } else {
          itemsToClassify.push(cleanKeyword(row.item));
        }
        return row;
      });

      if (itemsToClassify.length > 0) {
        setProcessingText("Auto-categorizing via AI...");
        try {
          const aiResults = await batchClassifyTransactions(itemsToClassify, localAiConfig);
          for (const row of enrichedRows) {
            if (!row.categoryId) {
              const cleaned = cleanKeyword(row.item);
              const aiCat = aiResults.get(cleaned.toLowerCase());
              if (aiCat) {
                const matchedCategory = initialCategories.find(
                  (c) => c.name.toLowerCase() === aiCat.category.toLowerCase()
                );
                if (matchedCategory) {
                  row.categoryId = matchedCategory.id;
                  const sign = getCategorySign(matchedCategory.name);
                  if (row.amount) {
                    if (sign === "income") row.amount = Math.abs(row.amount);
                    else if (sign === "expense") row.amount = -Math.abs(row.amount);
                  }
                  
                  const finalKeyword = aiCat.normalized_item_name || cleaned;
                  const createdBy = `AI (${localAiConfig.activeModel})`;
                  addMapping(finalKeyword, matchedCategory.id, createdBy).catch(console.error);
                }
              }
            }
          }
        } catch (aiError: any) {
          console.warn("AI Classification failed, ignoring:", aiError);
          toast.error(<ErrorToast title="Auto-categorization Failed" message={aiError.message || "Unknown AI error"} />);
        }
      }

      const formatItemWithPrice = (item: string, amount: number | null | undefined) => {
        if (!amount) return item;
        if (item.includes("=>")) return item;
        const kVal = Math.abs(amount) / 1000;
        const kStr = Number.isInteger(kVal) ? `${kVal}k` : `${parseFloat(kVal.toFixed(1))}k`;
        return `${item} => ${kStr}`;
      };

      enrichedRows.forEach(row => {
        row.item = formatItemWithPrice(row.item, row.amount);
      });

      setRawTransactions((prev) => {
        return detectDuplicates([...prev, ...enrichedRows], []);
      });
      setViewMode("raw");
      if (workspaceSettings.audioEnabled) {
        playNotification(workspaceSettings.audioTone);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(<ErrorToast title="Failed to Process Rows" message={error.message || "Failed to process data"} />);
      if (workspaceSettings.audioEnabled) {
        playNotification("error");
      }
    } finally {
      setProcessingText(null);
    }
  };

  const computeGroupedTransactions = React.useCallback((raw: TransactionRow[], overrides: Record<string, number>) => {
    const formatItemWithPrice = (item: string, amount: number | null | undefined) => {
      if (!amount) return item;
      if (item.includes("=>")) return item;
      const kVal = Math.abs(amount) / 1000;
      const kStr = Number.isInteger(kVal) ? `${kVal}k` : `${parseFloat(kVal.toFixed(1))}k`;
      return `${item} => ${kStr}`;
    };

    const map = new Map<string, TransactionRow & { subItems: Map<string, { amount: number, count: number }> }>();
    
    for (const rawRow of raw) {
      if (rawRow.isDuplicate) continue;

      let catForGrouping = "Unknown";
      if (rawRow.categoryId) {
        catForGrouping = initialCategories.find(c => c.id === rawRow.categoryId)?.name || rawRow.categoryId;
      }

      const key = `${rawRow.date}::${catForGrouping}`;
      const existing = map.get(key);
      const baseName = (rawRow.item || "").split("=>")[0]?.trim() || "";
      const amount = rawRow.amount ?? 0;

      if (existing) {
        existing.amount = (existing.amount ?? 0) + amount;
        
        const sub = existing.subItems.get(baseName);
        if (sub) {
          existing.subItems.set(baseName, { amount: sub.amount + amount, count: sub.count + 1 });
        } else {
          existing.subItems.set(baseName, { amount, count: 1 });
        }
        
        if (rawRow.notes && !existing.notes.includes(rawRow.notes)) {
           existing.notes = [existing.notes, rawRow.notes].filter(Boolean).join(" | ");
        }
        existing.rawItemIds!.push(rawRow.id);
      } else {
        const subItems = new Map<string, { amount: number, count: number }>();
        subItems.set(baseName, { amount, count: 1 });
        map.set(key, { ...rawRow, id: key, rawItemIds: [rawRow.id], subItems, amount });
      }
    }
    
    return Array.from(map.values()).map(row => {
      if (overrides[row.id] !== undefined) {
        row.amount = overrides[row.id] ?? null;
      }
      
      const itemLines: string[] = [];
      for (const [baseName, sub] of row.subItems.entries()) {
        const displayName = sub.count > 1 ? `${sub.count} ${baseName}` : baseName;
        itemLines.push(formatItemWithPrice(displayName, sub.amount));
      }
      row.item = itemLines.join("\n");
      
      return row as TransactionRow;
    });
  }, [initialCategories]);

  const availableCategoryIds = React.useMemo(() => {
    const ids = new Set<string>();
    let baseData = rawTransactions;
    if (sourceFilter !== "all") {
      baseData = baseData.filter(r => r.source === sourceFilter);
    }
    for (const row of baseData) {
      ids.add(row.categoryId ?? "unmapped");
    }
    return ids;
  }, [rawTransactions, sourceFilter]);

  const activeCategories = React.useMemo(() => {
    return initialCategories.filter(c => availableCategoryIds.has(c.id));
  }, [initialCategories, availableCategoryIds]);

  const displayTransactions = React.useMemo(() => {
    let result = rawTransactions;
    if (sourceFilter !== "all") {
      result = result.filter(r => r.source === sourceFilter);
    }
    result = result.filter(r => categoryFilter.includes(r.categoryId ?? "unmapped"));
    
    if (viewMode === "raw") return result;
    return computeGroupedTransactions(result, groupAmountOverrides);
  }, [rawTransactions, viewMode, groupAmountOverrides, computeGroupedTransactions, sourceFilter, categoryFilter]);

  const handleDataChange = (newData: TransactionRow[]) => {
    if (viewMode === "raw") {
      setRawTransactions(prev => {
        // Find what was currently displayed before this change
        let currentVisible = prev;
        if (sourceFilter !== "all") {
          currentVisible = currentVisible.filter(r => r.source === sourceFilter);
        }
        currentVisible = currentVisible.filter(r => categoryFilter.includes(r.categoryId ?? "unmapped"));
        
        const currentVisibleIds = new Set(currentVisible.map(r => r.id));
        const newIds = new Set(newData.map(r => r.id));
        
        // Find deleted rows
        const deletedIds = new Set<string>();
        for (const id of currentVisibleIds) {
          if (!newIds.has(id)) deletedIds.add(id);
        }
        
        const newDataMap = new Map(newData.map(r => [r.id, r]));
        
        // 1. Remove deleted rows
        let updatedRaw = prev.filter(r => !deletedIds.has(r.id));
        
        // 2. Update existing rows
        updatedRaw = updatedRaw.map(r => newDataMap.has(r.id) ? newDataMap.get(r.id)! : r);
        
        // 3. Append newly inserted rows
        const existingIds = new Set(updatedRaw.map(r => r.id));
        const newItems = newData.filter(r => !existingIds.has(r.id));
        
        return [...updatedRaw, ...newItems];
      });
    } else {
      const currentDisplay = computeGroupedTransactions(rawTransactions, groupAmountOverrides);
      let updatedRaw = [...rawTransactions];
      let updatedOverrides = { ...groupAmountOverrides };
      
      newData.forEach(newRow => {
        const oldRow = currentDisplay.find(r => r.id === newRow.id);
        if (oldRow) {
          if (oldRow.amount !== newRow.amount && newRow.amount !== null) {
            updatedOverrides[newRow.id] = newRow.amount;
          }
          const categoryChanged = oldRow.categoryId !== newRow.categoryId;
          const accountChanged = oldRow.accountId !== newRow.accountId;
          const dateChanged = oldRow.date !== newRow.date;
          
          if (categoryChanged || accountChanged || dateChanged) {
            updatedRaw = updatedRaw.map(rawRow => {
              if (newRow.rawItemIds?.includes(rawRow.id)) {
                return {
                  ...rawRow,
                  ...(categoryChanged && { categoryId: newRow.categoryId }),
                  ...(accountChanged && { accountId: newRow.accountId }),
                  ...(dateChanged && { date: newRow.date }),
                };
              }
              return rawRow;
            });
          }
        }
      });
      setGroupAmountOverrides(updatedOverrides);
      setRawTransactions(updatedRaw);
    }
  };

  const handleParse = async (text: string) => {
    try {
      const result = parseChat(text);
      const rawRows: TransactionRow[] = result.transactions.map(t => ({
        id: crypto.randomUUID(),
        date: t.date || format(new Date(), "yyyy-MM-dd"),
        item: t.item,
        amount: t.amount,
        categoryId: null,
        accountId: null,
        notes: t.sender ? `Sender: ${t.sender}` : "",
        source: "chat",
      }));
      await processRawRows(rawRows);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to parse text");
      if (workspaceSettings.audioEnabled) {
        playNotification("error");
      }
    }
  };

  const handleCategoryChange = (rowId: string, itemString: string, newCategoryId: string) => {
    const rawItems = itemString.split("\n").map(s => cleanKeyword(s)).filter(Boolean);

    for (const rawItem of rawItems) {
      if (rawItem) {
        addMapping(rawItem, newCategoryId).then(() => {
          toast.success(`Mapped "${rawItem}" to new category`);
        }).catch(err => {
          console.error(err);
          toast.error(`Failed to map "${rawItem}"`);
        });
      }
    }
  };

  const handleCopyRows = async (copiedRows: TransactionRow[]) => {
    // Extract keyword & category pairs to bump their usage score
    const mappingsToBump = copiedRows
      .filter((r) => r.item && r.categoryId)
      .map((r) => ({ keyword: cleanKeyword(r.item), categoryId: r.categoryId! }));
      
    if (mappingsToBump.length > 0) {
      batchAddMappings(mappingsToBump).catch(console.error);
    }
  };

  const handleScan = async (images: { base64: string; mimeType: string }[], translateNames: boolean) => {
    setProcessingText("Scanning receipt via AI...");
    try {
      const response = await scanReceiptImages(images, translateNames, localAiConfig);
      if (!response.success) {
        toast.error(<ErrorToast title="Failed to scan a receipt image" message={response.error || "Unknown error"} />);
        if (workspaceSettings.audioEnabled) {
          playNotification("error");
        }
        return;
      }
      const rawRows = (response.data || []).map(r => ({ ...r, source: "scan" as const }));
      await processRawRows(rawRows);
    } catch (error: any) {
      console.error(error);
      toast.error(<ErrorToast title="Failed to scan receipt" message={error.message || "Failed to scan receipt"} />);
      if (workspaceSettings.audioEnabled) {
        playNotification("error");
      }
    } finally {
      setProcessingText(null);
    }
  };

  const handleManualJson = async (rawInput: any[]) => {
    try {
      const rawRows: TransactionRow[] = rawInput.map(r => ({
        id: crypto.randomUUID(),
        date: r.date || new Date().toISOString().split("T")[0],
        item: String(r.item || "Unknown Item"),
        amount: Number(r.amount) || null,
        categoryId: null,
        accountId: null,
        notes: "",
        source: "manual",
      }));
      await processRawRows(rawRows);
    } catch (error: any) {
      console.error(error);
      toast.error("Format JSON tidak sesuai.");
      if (workspaceSettings.audioEnabled) {
        playNotification("error");
      }
    }
  };

  const handleAiConfigChange = (newConfig: AiSettingsConfig) => {
    setLocalAiConfig(newConfig);
    import("@/actions/ai-settings").then(({ saveAiSettings }) => {
      saveAiSettings(newConfig).catch(console.error);
    });
  };

  return (
    <AppShell>
      <MainWorkspace
        inputPanel={
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <div className="flex flex-col gap-4 mx-4 mt-3 mb-2">
              <div className="flex items-center justify-between w-full">
                <TabsList className="w-fit self-start">
                  <TabsTrigger value="chat">WhatsApp Chat</TabsTrigger>
                  <TabsTrigger value="scan">Scan Nota</TabsTrigger>
                  <TabsTrigger value="manual">Manual AI</TabsTrigger>
                </TabsList>
                <WorkspaceSettingsDropdown />
              </div>
              {activeTab !== "manual" && (
                <div className="bg-muted/30 rounded-lg p-3 border w-full">
                  <AiModelSelector
                    compact
                    config={localAiConfig}
                    onChange={handleAiConfigChange}
                    geminiModels={geminiModels}
                    swiftrouterModels={swiftrouterModels}
                  />
                </div>
              )}
            </div>
            <TabsContent value="chat" className="flex-1 min-h-0 m-0" keepMounted={true}>
              <WhatsAppInput 
                value={sessionMetadata.whatsappText || ""}
                onChange={(whatsappText) => setSessionMetadata(prev => ({ ...prev, whatsappText }))}
                onParse={handleParse} 
                onClearOutput={() => setRawTransactions(prev => prev.filter(r => r.source !== "chat"))}
              />
            </TabsContent>
            <TabsContent value="scan" className="flex-1 min-h-0 m-0" keepMounted={true}>
              <ReceiptScanInput 
                key={currentSessionId || "new"} 
                translateNames={sessionMetadata.translateNames ?? true}
                onTranslateNamesChange={(translateNames) => setSessionMetadata(prev => ({ ...prev, translateNames }))}
                onScan={handleScan} 
                sessionImages={sessionImages}
                onImagesChange={setSessionImages}
                onClearOutput={() => setRawTransactions(prev => prev.filter(r => r.source !== "scan"))}
              />
            </TabsContent>
            <TabsContent value="manual" className="flex-1 min-h-0 m-0" keepMounted={true}>
              <ManualJsonInput 
                value={sessionMetadata.manualText || ""}
                onChange={(manualText) => setSessionMetadata(prev => ({ ...prev, manualText }))}
                onParse={handleManualJson} 
                onClearOutput={() => setRawTransactions(prev => prev.filter(r => r.source !== "manual"))}
              />
            </TabsContent>
          </Tabs>
        }
        spreadsheetPanel={
          <div className="relative flex-1 min-h-0 flex flex-col">
            {processingText && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm font-medium">{processingText}</p>
              </div>
            )}
            <div className="flex items-center justify-between mb-2 mx-4 mt-2">
              <div className="flex bg-muted rounded-md p-1 shrink-0">
                <button
                  className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-all ${viewMode === "raw" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setViewMode("raw")}
                >
                  Raw View
                </button>
                <button
                  className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-all ${viewMode === "grouped" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setViewMode("grouped")}
                >
                  Grouped View
                </button>
              </div>
              
              <div className="flex gap-2 items-center flex-1 ml-4 overflow-x-auto no-scrollbar">
                <select 
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                >
                  <option value="all" className="bg-background">Semua Sumber</option>
                  <option value="chat" className="bg-background">WhatsApp Chat</option>
                  <option value="scan" className="bg-background">Scan Nota</option>
                  <option value="manual" className="bg-background">Manual AI</option>
                </select>

                <CategoryMultiSelect
                  categories={activeCategories}
                  showUnmapped={availableCategoryIds.has("unmapped")}
                  selectedValues={categoryFilter}
                  onSelectedValuesChange={setCategoryFilter}
                />
              </div>
              
              <div className="shrink-0">
                <SessionSwitcher 
                  currentSessionId={currentSessionId}
                  onSessionChange={(id, data, images, metadata) => {
                    setCurrentSessionId(id);
                    setRawTransactions(data);
                    setSessionImages(images || []);
                    setSessionMetadata(metadata || {});
                    setGroupAmountOverrides({});
                  }}
                  onNewSession={handleNewSession}
                  rawTransactions={rawTransactions}
                />
              </div>
            </div>
            <SpreadsheetTable 
              data={displayTransactions} 
              viewMode={viewMode}
              onDataChange={handleDataChange} 
              onEditGroupedItems={(row) => setEditingGroupRow(row)}
              onCategoryChange={handleCategoryChange}
              onCopyRows={handleCopyRows}
              onResolveDuplicate={(rowIndex, action) => {
                setRawTransactions(prev => {
                  const next = [...prev];
                  if (action === "keep") {
                    next[rowIndex] = { ...next[rowIndex], isDuplicate: false } as TransactionRow;
                  } else if (action === "remove") {
                    next.splice(rowIndex, 1);
                  }
                  return next;
                });
              }}
              categories={initialCategories}
              accounts={initialAccounts}
              emptyMessage={
                activeTab === "chat" ? "Tidak ada data. Paste riwayat WhatsApp Chat di samping untuk memulai." :
                activeTab === "scan" ? "Tidak ada data. Scan/unggah foto nota belanja Anda di panel kiri." :
                "Tidak ada data. Ketik input JSON secara manual di samping."
              }
            />
            
            <GroupedItemsModal
              isOpen={!!editingGroupRow}
              onClose={() => setEditingGroupRow(null)}
              groupRow={editingGroupRow}
              rawTransactions={rawTransactions}
              categories={initialCategories}
              accounts={initialAccounts}
              onRawTransactionsChange={setRawTransactions}
              onCategoryChange={handleCategoryChange}
            />
          </div>
        }
      />
    </AppShell>
  );
}
