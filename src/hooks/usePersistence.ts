import { useState, useEffect, useCallback, useRef } from 'react';
import { MindMapData } from '../types';
import { StorageService, HistoryItem } from '../services/storageService';

export function usePersistence(
  currentData: MindMapData | null,
  onRestore: (data: MindMapData) => void
) {
  const [hasDraft, setHasDraft] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [quotaError, setQuotaError] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial state
  useEffect(() => {
    const draft = StorageService.getDraft();
    if (draft && (!currentData || draft.title !== currentData.title)) {
      setHasDraft(true);
    }
    setHistory(StorageService.getHistory());
  }, []);

  // Auto-save draft with debounce
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (currentData) {
      saveTimeoutRef.current = setTimeout(() => {
        StorageService.saveDraft(currentData);
      }, 1000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentData]);

  const restoreDraft = useCallback(() => {
    const draft = StorageService.getDraft();
    if (draft) {
      onRestore(draft);
    }
    setHasDraft(false);
  }, [onRestore]);

  const discardDraft = useCallback(() => {
    StorageService.clearDraft();
    setHasDraft(false);
  }, []);

  const addToHistory = useCallback((data: MindMapData) => {
    try {
      StorageService.addToHistory(data);
      setHistory(StorageService.getHistory());
      setQuotaError(false);
    } catch (error: any) {
      if (error.message === 'QUOTA_EXCEEDED') {
        setQuotaError(true);
      }
    }
  }, []);

  const deleteHistoryItem = useCallback((id: string) => {
    StorageService.deleteFromHistory(id);
    setHistory(StorageService.getHistory());
  }, []);

  return {
    hasDraft,
    history,
    quotaError,
    restoreDraft,
    discardDraft,
    addToHistory,
    deleteHistoryItem,
    setQuotaError,
  };
}
