"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MainWorkspace } from "@/components/layout/main-workspace";
import { WhatsAppInput } from "@/components/workspace/whatsapp-input";
import { SpreadsheetTable } from "@/components/workspace/spreadsheet";
import { TransactionRow, CategoryOption, AccountOption, SessionImage } from "@/types";
import { parseChat } from "@/features/parser/chat-parser";
import { suggestCategory } from "@/features/suggestions/category-suggester";
import { detectDuplicates } from "@/features/validation/duplicate-detector";
import { getCategorySign } from "@/features/validation/category-sign";
import { format } from "date-fns";
import { KeywordMapping } from "@/features/suggestions/types";
import { batchClassifyTransactions } from "@/actions/classify";
import { addMapping, batchAddMappings } from "@/actions/mappings";
import { cleanKeyword, type KeywordCleaningRules } from "@/lib/keyword-utils";
import { isIsoDateAmbiguous } from "@/features/parser/date-parser";
import * as React from "react";
import { ReceiptScanInput } from "@/components/workspace/receipt-scan-input";
import { GroupedItemsModal } from "./grouped-items-modal";
import { ManualJsonInput } from "@/components/workspace/manual-json-input";
import { scanReceiptImages } from "@/actions/scan-receipt";
import { toast } from "sonner";
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
  initialContraKeywords?: string[];
  initialCleaningRules?: KeywordCleaningRules;
  defaultAiSettings: AiSettingsConfig;
  geminiModels: string[];
  swiftrouterModels: string[];
  initialSessionId?: string | null;
}

export function HomeClient({ 
  initialCategories,
  initialAccounts,
  initialMappings,
  initialContraKeywords = [],
  initialCleaningRules,
  defaultAiSettings,
  geminiModels,
  swiftrouterModels,
  initialSessionId = null,
}: HomeClientProps) {
  const [rawTransactions, setRawTransactions] = useState<TransactionRow[]>([{
    id: crypto.randomUUID(),
    date: new Date().toISOString().split("T")[0] as string,
    item: "",
    amount: null,
    categoryId: null,
    accountId: null,
    notes: "",
    source: "manual-input",
  }]);
  const [sessionImages, setSessionImages] = useState<SessionImage[]>([]);
  const [viewMode, setViewMode] = useState<"raw" | "grouped">("raw");
  const [groupAmountOverrides, setGroupAmountOverrides] = useState<Record<string, number>>({});
  const [editingGroupRow, setEditingGroupRow] = useState<TransactionRow | null>(null);
  const [localMappings, setLocalMappings] = useState<KeywordMapping[]>(initialMappings);
  const cleaningRules = initialCleaningRules;

  const [processingText, setProcessingText] = useState<string | null>(null);
  const [localAiConfig, setLocalAiConfig] = useState<AiSettingsConfig>(defaultAiSettings);
  const [activeTab, setActiveTab] = useState<string>("chat");
  const { settings: workspaceSettings } = useWorkspaceSettings();

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionMetadata, setSessionMetadata] = useState<import("@/types").SessionMetadata>({});
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  // Ref to skip the first debounce update after loading a session
  const justLoadedRef = React.useRef(false);
  // Ref-based lock to prevent concurrent session creation
  const isCreatingSessionRef = React.useRef(false);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [receiptFilter, setReceiptFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string[]>(() => ["unmapped", ...initialCategories.map(c => c.id)]);

  // Refs to hold latest filter values so callbacks can be stable (useCallback with [])
  const sourceFilterRef = React.useRef(sourceFilter);
  const receiptFilterRef = React.useRef(receiptFilter);
  const categoryFilterRef = React.useRef(categoryFilter);
  const viewModeRef = React.useRef(viewMode);
  const categoryFilterSetRef = React.useRef<Set<string>>(new Set(categoryFilter));

  React.useEffect(() => { sourceFilterRef.current = sourceFilter; }, [sourceFilter]);
  React.useEffect(() => { receiptFilterRef.current = receiptFilter; }, [receiptFilter]);
  React.useEffect(() => { categoryFilterRef.current = categoryFilter; categoryFilterSetRef.current = new Set(categoryFilter); }, [categoryFilter]);
  React.useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);

  // Refs for state values used inside stable useCallback (handleDataChange)
  const rawTransactionsRef = React.useRef(rawTransactions);
  const groupAmountOverridesRef = React.useRef(groupAmountOverrides);
  const computeGroupedTransactionsRef = React.useRef<((raw: TransactionRow[], overrides: Record<string, number>) => TransactionRow[]) | null>(null);
  React.useEffect(() => { rawTransactionsRef.current = rawTransactions; }, [rawTransactions]);
  React.useEffect(() => { groupAmountOverridesRef.current = groupAmountOverrides; }, [groupAmountOverrides]);

  React.useEffect(() => {
    setIsLoadingSession(true);
    import("@/actions/sessions").then(async ({ getSessions, getSessionById }) => {
      // If a specific session was requested via ?session=uuid, load it
      if (initialSessionId) {
        const sess = await getSessionById(initialSessionId);
        if (sess) {
          setCurrentSessionId(sess.id);
          setRawTransactions((sess.data as TransactionRow[]) || []);
          setSessionImages((sess.images as SessionImage[]) || []);
          setSessionMetadata((sess.metadata as import("@/types").SessionMetadata) || {});
          justLoadedRef.current = true;
          setIsLoadingSession(false);
          return;
        }
      }
      // Otherwise auto-load the most recent session
      const sessions = await getSessions();
      if (sessions.length > 0 && sessions[0]?.id) {
        const sess = await getSessionById(sessions[0].id);
        if (sess) {
          setCurrentSessionId(sess.id);
          setRawTransactions((sess.data as TransactionRow[]) || []);
          setSessionImages((sess.images as SessionImage[]) || []);
          setSessionMetadata((sess.metadata as import("@/types").SessionMetadata) || {});
          justLoadedRef.current = true;
        }
      }
      setIsLoadingSession(false);
    }).catch((err) => {
      console.error(err);
      setIsLoadingSession(false);
    });
  }, []);

  const handleNewSession = React.useCallback(async () => {
    setCurrentSessionId(null);
    setRawTransactions([{
      id: crypto.randomUUID(),
      date: new Date().toISOString().split("T")[0] as string,
      item: "",
      amount: null,
      categoryId: null,
      accountId: null,
      notes: "",
      source: "manual-input",
    }]);
    setSessionImages([]);
    setSessionMetadata({});
    setGroupAmountOverrides({});
  }, []);

  const ensureSession = React.useCallback(async (): Promise<string | null> => {
    if (currentSessionId) return currentSessionId;
    if (isCreatingSessionRef.current) return null;
    isCreatingSessionRef.current = true;
    try {
      const { createSession, getSessions, getSessionById, updateSession } = await import("@/actions/sessions");
      const { format } = await import("date-fns");
      const name = `Parsing - ${format(new Date(), "dd MMM yyyy HH:mm")}`;

      const allSessions = await getSessions();
      if (allSessions.length > 0 && allSessions[0]?.id) {
        const recent = await getSessionById(allSessions[0].id);
        if (recent) {
          const recentData = (recent.data as TransactionRow[]) || [];
          const recentImages = (recent.images as SessionImage[]) || [];
          const isEmpty = (recentData.length === 0 && recentImages.length === 0) ||
            (recentData.length === 1 && recentImages.length === 0 &&
              (!recentData[0]?.item || recentData[0].item.trim() === "") &&
              recentData[0]?.amount == null
            );
          if (isEmpty) {
            await updateSession(recent.id, { name });
            setCurrentSessionId(recent.id);
            return recent.id;
          }
        }
      }

      const sess = await createSession(name);
      if (sess) {
        setCurrentSessionId(sess.id);
        return sess.id;
      }
      return null;
    } catch (err) {
      console.error("Failed to ensure session:", err);
      return null;
    } finally {
      isCreatingSessionRef.current = false;
    }
  }, [currentSessionId]);

  // Auto-save existing sessions (debounced)
  React.useEffect(() => {
    if (isLoadingSession) return;
    if (!currentSessionId) return;

    if (justLoadedRef.current) {
      justLoadedRef.current = false;
      return;
    }
    
    const timer = setTimeout(() => {
      import("@/actions/sessions").then(({ updateSession }) => {
        updateSession(currentSessionId, { data: rawTransactions, images: sessionImages, metadata: sessionMetadata as Record<string, unknown> }).catch(console.error);
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [rawTransactions, sessionImages, sessionMetadata, currentSessionId, isLoadingSession]);



  const processRawRows = async (rawRows: TransactionRow[]) => {
    await ensureSession();
    setProcessingText("Mapping local data...");
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      if (rawRows.length === 0) {
        toast.warning("Tidak ada item yang berhasil dibaca.");
        return;
      }

      const itemsToClassify: string[] = [];
      const enrichedRows: TransactionRow[] = rawRows.map((row) => {
        if (row.isDateAmbiguous === undefined) {
          row.isDateAmbiguous = isIsoDateAmbiguous(row.date);
        }
        
        const cleaned = cleanKeyword(row.item, cleaningRules);
        const suggestion = suggestCategory(cleaned, localMappings, []);
        if (suggestion?.categoryId) {
          row.categoryId = suggestion.categoryId;
          const catName = initialCategories.find(c => c.id === row.categoryId)?.name;
          if (catName) {
            const sign = getCategorySign(catName);
            const isContraItem = initialContraKeywords.some(kw => row.item.toLowerCase().includes(kw.toLowerCase()));
            
            if (sign === "income") row.amount = row.amount ? Math.abs(row.amount) : row.amount;
            else if (sign === "expense") {
               if (isContraItem && row.amount && row.amount > 0) {
                 // Do not force to negative if it's a contra item and already positive
               } else {
                 row.amount = row.amount ? -Math.abs(row.amount) : row.amount;
               }
            }
          }
        } else {
          itemsToClassify.push(cleanKeyword(row.item, cleaningRules));
        }
        return row;
      });

      if (itemsToClassify.length > 0) {
        setProcessingText("Auto-categorizing via AI...");
        try {
          const aiResults = await batchClassifyTransactions(itemsToClassify, localAiConfig);
          for (const row of enrichedRows) {
            if (!row.categoryId) {
              const cleaned = cleanKeyword(row.item, cleaningRules);
              const aiCat = aiResults.get(cleaned.toLowerCase());
              if (aiCat) {
                const matchedCategory = initialCategories.find(
                  (c) => c.name.toLowerCase() === aiCat.category.toLowerCase()
                );
                if (matchedCategory) {
                  row.categoryId = matchedCategory.id;
                  const sign = getCategorySign(matchedCategory.name);
                  const isContraItem = initialContraKeywords.some(kw => row.item.toLowerCase().includes(kw.toLowerCase()));

                  if (row.amount) {
                    if (sign === "income") row.amount = Math.abs(row.amount);
                    else if (sign === "expense") {
                      if (!(isContraItem && row.amount > 0)) {
                         row.amount = -Math.abs(row.amount);
                      }
                    }
                  }
                  
                  const finalKeyword = aiCat.normalized_item_name || cleaned;
                  const createdBy = `AI (${localAiConfig.activeModel})`;
                  addMapping(finalKeyword, matchedCategory.id, createdBy).then((newMapping) => {
                    if (newMapping && Array.isArray(newMapping) && newMapping.length > 0) {
                      setLocalMappings(prev => [...prev, newMapping[0]]);
                    }
                  }).catch(console.error);
                }
              }
            }
          }
        } catch (aiError: unknown) {
          console.warn("AI Classification failed, ignoring:", aiError);
          toast.error(<ErrorToast title="Auto-categorization Failed" message={aiError instanceof Error ? aiError.message : "Unknown AI error"} />);
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
    } catch (error: unknown) {
      console.error(error);
      toast.error(<ErrorToast title="Failed to Process Rows" message={error instanceof Error ? error.message : "Failed to process data"} />);
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
  React.useEffect(() => { computeGroupedTransactionsRef.current = computeGroupedTransactions; }, [computeGroupedTransactions]);

  const uniqueReceipts = React.useMemo(() => {
    const set = new Set<string>();
    rawTransactions.forEach(r => { if (r.receiptName) set.add(r.receiptName); });
    return Array.from(set).sort();
  }, [rawTransactions]);

  const availableCategoryIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const r of rawTransactions) {
      if (sourceFilter !== "all" && r.source !== sourceFilter) continue;
      if (receiptFilter !== "all" && r.receiptName !== receiptFilter) continue;
      ids.add(r.categoryId ?? "unmapped");
    }
    return ids;
  }, [rawTransactions, sourceFilter, receiptFilter]);

  const activeCategories = React.useMemo(() => {
    return initialCategories.filter(c => availableCategoryIds.has(c.id));
  }, [initialCategories, availableCategoryIds]);

  const displayTransactions = React.useMemo(() => {
    // Single-pass filter — avoids creating intermediate arrays for 2000+ rows
    const result = rawTransactions.filter(r => {
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      if (receiptFilter !== "all" && r.receiptName !== receiptFilter) return false;
      if (!categoryFilter.includes(r.categoryId ?? "unmapped")) return false;
      return true;
    });

    if (viewMode === "raw") return result;
    return computeGroupedTransactions(result, groupAmountOverrides);
  }, [rawTransactions, viewMode, groupAmountOverrides, computeGroupedTransactions, sourceFilter, receiptFilter, categoryFilter]);

  const handleAutoMapRows = async (rowIndices: number[], useAI: boolean) => {
    const rowsToMap = rowIndices.map(idx => displayTransactions[idx]).filter(Boolean);
    if (rowsToMap.length === 0) return;

    let updatedRaw = [...rawTransactions];
    let aiItemsToClassify: string[] = [];
    const rowsToProcessWithAI: string[] = [];

    for (const row of rowsToMap) {
      if (!row) continue;
      if (row.categoryId) continue;
      
      const lowerItem = (row.item || "").toLowerCase().trim();
      if (!lowerItem) continue;

      const match = localMappings.find(m => lowerItem.includes(m.keyword.toLowerCase()));
      if (match) {
        const rawIdx = updatedRaw.findIndex(r => r.id === row.id);
        if (rawIdx !== -1) {
           const newRow = { ...updatedRaw[rawIdx] } as TransactionRow;
           newRow.categoryId = match.categoryId;
           newRow.isUnmappedItem = false;

           const catName = initialCategories.find(c => c.id === match.categoryId)?.name;
           if (catName && typeof newRow.amount === "number") {
             const sign = getCategorySign(catName);
             const isContraItem = initialContraKeywords.some(kw => lowerItem.includes(kw.toLowerCase()));
             if (sign === "income") newRow.amount = Math.abs(newRow.amount);
             else if (sign === "expense") {
               if (!(isContraItem && newRow.amount > 0)) {
                 newRow.amount = -Math.abs(newRow.amount);
               }
             }
           }
           updatedRaw[rawIdx] = newRow;
        }
      } else if (useAI) {
        aiItemsToClassify.push(cleanKeyword(row.item, cleaningRules));
        rowsToProcessWithAI.push(row.id);
      }
    }

    setRawTransactions(updatedRaw);

    if (useAI && aiItemsToClassify.length > 0) {
       setProcessingText("Auto-categorizing via AI...");
       try {
          const aiResults = await batchClassifyTransactions(aiItemsToClassify, localAiConfig);
          let finalRaw = [...updatedRaw]; // use the most recent state
          for (const rowId of rowsToProcessWithAI) {
            const rawIdx = finalRaw.findIndex(r => r.id === rowId);
            if (rawIdx === -1) continue;
            const newRow = { ...finalRaw[rawIdx] } as TransactionRow;
            if (newRow.categoryId) continue;

            const cleaned = cleanKeyword(newRow.item, cleaningRules);
            const aiCat = aiResults.get(cleaned.toLowerCase());
            if (aiCat) {
              const matchedCategory = initialCategories.find(
                (c) => c.name.toLowerCase() === aiCat.category.toLowerCase()
              );
              if (matchedCategory) {
                newRow.categoryId = matchedCategory.id;
                newRow.isUnmappedItem = false;
                
                const sign = getCategorySign(matchedCategory.name);
                const isContraItem = initialContraKeywords.some(kw => newRow.item.toLowerCase().includes(kw.toLowerCase()));

                if (typeof newRow.amount === "number") {
                  if (sign === "income") newRow.amount = Math.abs(newRow.amount);
                  else if (sign === "expense") {
                    if (!(isContraItem && newRow.amount > 0)) {
                        newRow.amount = -Math.abs(newRow.amount);
                    }
                  }
                }
                
                const finalKeyword = aiCat.normalized_item_name || cleaned;
                const createdBy = `AI (${localAiConfig.activeModel})`;
                addMapping(finalKeyword, matchedCategory.id, createdBy).then((newMapping) => {
                  if (newMapping && Array.isArray(newMapping) && newMapping.length > 0) {
                    setLocalMappings(prev => [...prev, newMapping[0]]);
                  }
                }).catch(console.error);
              }
            }
            finalRaw[rawIdx] = newRow;
          }
          setRawTransactions(finalRaw);
       } catch (aiError: unknown) {
          console.warn("AI Classification failed, ignoring:", aiError);
          toast.error(<ErrorToast title="Auto-categorization Failed" message={aiError instanceof Error ? aiError.message : "Unknown AI error"} />);
       } finally {
          setProcessingText(null);
       }
    }
  };

  const handleDataChange = React.useCallback((newData: TransactionRow[]) => {
    const vm = viewModeRef.current;
    const sf = sourceFilterRef.current;
    const rf = receiptFilterRef.current;
    const cfSet = categoryFilterSetRef.current;

    if (vm === "raw") {
      setRawTransactions(prev => {
        // Single-pass: build currentVisibleIds and check filters in one loop
        const currentVisibleIds = new Set<string>();
        for (const r of prev) {
          if (sf !== "all" && r.source !== sf) continue;
          if (rf !== "all" && r.receiptName !== rf) continue;
          if (!cfSet.has(r.categoryId ?? "unmapped")) continue;
          currentVisibleIds.add(r.id);
        }
        const newIds = new Set(newData.map(r => r.id));
        
        // Find deleted rows
        const deletedIds = new Set<string>();
        for (const id of currentVisibleIds) {
          if (!newIds.has(id)) deletedIds.add(id);
        }
        
        const newDataMap = new Map(newData.map(r => [r.id, r]));
        
        // 1. Remove deleted rows, 2. Update existing rows — single pass
        let updatedRaw = prev.filter(r => !deletedIds.has(r.id));
        updatedRaw = updatedRaw.map(r => newDataMap.has(r.id) ? newDataMap.get(r.id)! : r);
        
        // 3. Append newly inserted rows (only those matching current filters)
        const existingIds = new Set(updatedRaw.map(r => r.id));
        const visibleNewItems: TransactionRow[] = [];
        for (const r of newData) {
          if (existingIds.has(r.id)) continue;
          if (sf !== "all" && r.source !== sf) continue;
          if (rf !== "all" && r.receiptName !== rf) continue;
          if (!cfSet.has(r.categoryId ?? "unmapped")) continue;
          visibleNewItems.push(r);
        }

        // Return prev unchanged if nothing actually changed
        if (visibleNewItems.length === 0 && deletedIds.size === 0 && newDataMap.size === 0) {
          return prev;
        }

        return [...updatedRaw, ...visibleNewItems];
      });
    } else {
      const currentDisplay = computeGroupedTransactionsRef.current!(rawTransactionsRef.current, groupAmountOverridesRef.current);
      let updatedRaw = [...rawTransactionsRef.current];
      let updatedOverrides = { ...groupAmountOverridesRef.current };

      // Detect deleted grouped rows and remove their underlying raw transactions
      const currentIds = new Set(currentDisplay.map(r => r.id));
      const newIds = new Set(newData.map(r => r.id));
      const deletedIds: string[] = [];
      for (const id of currentIds) {
        if (!newIds.has(id)) deletedIds.push(id);
      }
      if (deletedIds.length > 0) {
        const rawIdsToDelete = new Set<string>();
        for (const id of deletedIds) {
          const groupedRow = currentDisplay.find(r => r.id === id);
          if (groupedRow?.rawItemIds) {
            for (const rawId of groupedRow.rawItemIds) {
              rawIdsToDelete.add(rawId);
            }
          }
        }
        updatedRaw = updatedRaw.filter(r => !rawIdsToDelete.has(r.id));
        for (const id of deletedIds) {
          delete updatedOverrides[id];
        }
      }

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
  }, []);

  const handleParse = async (text: string, batchName: string) => {
    try {
      const result = parseChat(text);
      const rawRows: TransactionRow[] = result.transactions.map(t => ({
        id: crypto.randomUUID(),
        date: t.date || format(new Date(), "yyyy-MM-dd"),
        isDateAmbiguous: t.isDateAmbiguous ?? false,
        item: t.item,
        amount: t.amount,
        categoryId: null,
        accountId: null,
        notes: t.sender ? `Sender: ${t.sender}` : "",
        source: "chat",
        receiptName: batchName,
      }));
      await processRawRows(rawRows);
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to parse text");
      if (workspaceSettings.audioEnabled) {
        playNotification("error");
      }
    }
  };

  const handleCategoryChange = React.useCallback((rowId: string, itemString: string, newCategoryId: string) => {
    const rawItems = itemString.split("\n").map(s => cleanKeyword(s, cleaningRules)).filter(Boolean);

    for (const rawItem of rawItems) {
      if (rawItem) {
        const isNew = !localMappings.some(m => m.keyword.toLowerCase() === rawItem.toLowerCase());
        if (isNew) {
          addMapping(rawItem, newCategoryId, "Manual").then((newMapping) => {
            if (newMapping && Array.isArray(newMapping) && newMapping.length > 0) {
              setLocalMappings(prev => [...prev, newMapping[0]]);
            }
          }).catch(console.error);
        }
      }
    }
  }, [localMappings]);

  const handleCopyRows = React.useCallback(async (copiedRows: TransactionRow[]) => {
    await ensureSession();
    // Extract keyword & category pairs to bump their usage score
    const mappingsToBump = copiedRows
      .filter((r) => r.item && r.categoryId)
      .map((r) => ({ keyword: cleanKeyword(r.item, cleaningRules), categoryId: r.categoryId! }));
      
    if (mappingsToBump.length > 0) {
      batchAddMappings(mappingsToBump).catch(console.error);
    }
  }, [ensureSession]);

  const handleScan = async (images: { id: string; name: string; base64: string; mimeType: string }[], translateNames: boolean) => {
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
      return response.parsedIds;
    } catch (error: unknown) {
      console.error(error);
      toast.error(<ErrorToast title="Failed to scan receipt" message={error instanceof Error ? error.message : "Failed to scan receipt"} />);
      if (workspaceSettings.audioEnabled) {
        playNotification("error");
      }
    } finally {
      setProcessingText(null);
    }
  };

  const handleManualJson = async (rawInput: { date?: string | null; item?: string; amount?: number }[], batchName: string) => {
    try {
      const rawRows: TransactionRow[] = rawInput.map(r => ({
        id: crypto.randomUUID(),
        date: r.date || new Date().toISOString().split("T")[0] || "",
        item: String(r.item || "Unknown Item"),
        amount: Number(r.amount) || null,
        categoryId: null,
        accountId: null,
        notes: "",
        source: "manual",
        receiptName: batchName,
      }));
      await processRawRows(rawRows);
    } catch (error: unknown) {
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
                  <TabsTrigger value="manual">JSON Input</TabsTrigger>
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
                onRemoveBatch={(batchName) => setRawTransactions(prev => prev.filter(r => r.receiptName !== batchName))}
                onClearOutput={() => setRawTransactions(prev => prev.filter(r => r.source !== "chat"))}
                parseBatches={sessionMetadata.chatParseBatches || []}
                onParseBatchesChange={(chatParseBatches) => setSessionMetadata(prev => ({ ...prev, chatParseBatches }))}
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
                onRemoveByReceiptName={(receiptName) => setRawTransactions(prev => prev.filter(r => r.receiptName !== receiptName))}
                onClearOutput={() => setRawTransactions(prev => prev.filter(r => r.source !== "scan"))}
              />
            </TabsContent>
            <TabsContent value="manual" className="flex-1 min-h-0 m-0" keepMounted={true}>
              <ManualJsonInput 
                value={sessionMetadata.manualText || ""}
                onChange={(manualText) => setSessionMetadata(prev => ({ ...prev, manualText }))}
                onParse={handleManualJson}
                onRemoveBatch={(batchName) => setRawTransactions(prev => prev.filter(r => r.receiptName !== batchName))}
                onClearOutput={() => setRawTransactions(prev => prev.filter(r => r.source !== "manual"))}
                parseBatches={sessionMetadata.jsonParseBatches || []}
                onParseBatchesChange={(jsonParseBatches) => setSessionMetadata(prev => ({ ...prev, jsonParseBatches }))}
              />
            </TabsContent>
          </Tabs>
        }
        spreadsheetPanel={
          <div className="relative flex-1 min-h-0 flex flex-col">
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
                  <option value="manual" className="bg-background">JSON Input</option>
                  <option value="manual-input" className="bg-background">Manual Input</option>
                </select>

                {uniqueReceipts.length > 0 && (
                  <select
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={receiptFilter}
                    onChange={(e) => setReceiptFilter(e.target.value)}
                  >
                    <option value="all" className="bg-background">{activeTab === "chat" ? "Semua Parsing" : "Semua Nota"}</option>
                    {uniqueReceipts.map(nota => (
                      <option key={nota} value={nota} className="bg-background">{nota}</option>
                    ))}
                  </select>
                )}

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
                                onSessionChange={React.useCallback((id, data, images, metadata) => {
                justLoadedRef.current = true;
                setCurrentSessionId(id);
                setRawTransactions(data);
                setSessionImages(images || []);
                setSessionMetadata(metadata || {});
                setGroupAmountOverrides({});
              }, [])}
                  onNewSession={handleNewSession}
                  onLoadingChange={setIsLoadingSession}
                  rawTransactions={rawTransactions}
                />
              </div>
            </div>
            <SpreadsheetTable
              data={displayTransactions}
              viewMode={viewMode}
              categories={initialCategories}
              accounts={initialAccounts}
              contraKeywords={initialContraKeywords}
              keywordMappings={localMappings}
              onDataChange={handleDataChange}
                            onEditGroupedItems={React.useCallback((row) => setEditingGroupRow(row), [])}
              onCategoryChange={handleCategoryChange}
              onCopyRows={handleCopyRows}
              onAutoMapRows={handleAutoMapRows}
                            onResolveDuplicate={React.useCallback((rowIndex: number, action: "keep" | "remove") => {
                setRawTransactions(prev => {
                  const next = [...prev];
                  if (action === "keep") {
                    next[rowIndex] = { ...next[rowIndex], isDuplicate: false } as TransactionRow;
                  } else if (action === "remove") {
                    next.splice(rowIndex, 1);
                  }
                  return next;
                });
              }, [])}
              emptyMessage={
                activeTab === "chat" ? "Tidak ada data. Paste riwayat WhatsApp Chat di samping untuk memulai." :
                activeTab === "scan" ? "Tidak ada data. Scan/unggah foto nota belanja Anda di panel kiri." :
                "Tidak ada data. Ketik input JSON secara manual di samping."
              }
              loading={!!processingText || isLoadingSession}
              loadingText={processingText || "Loading session..."}
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
