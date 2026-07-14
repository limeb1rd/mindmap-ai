import { useState, useCallback, useRef, useEffect } from 'react';
import { MindMapData } from '../types';

const MAX_HISTORY_SIZE = 50;

export function useMindMapHistory(
  currentData: MindMapData | null,
  onRestore: (data: MindMapData) => void
) {
  const [history, setHistory] = useState<MindMapData[]>([]);
  const [redoStack, setRedoStack] = useState<MindMapData[]>([]);
  
  // Ref to track if the change was triggered by undo/redo to avoid circular pushes
  const isInternalUpdate = useRef(false);
  const lastDataRef = useRef<MindMapData | null>(null);

  // Sync lastDataRef with currentData
  useEffect(() => {
    if (currentData && !lastDataRef.current) {
      lastDataRef.current = currentData;
    }
  }, [currentData]);

  // Reset history if data changes externally (e.g. loading a new map from history)
  useEffect(() => {
    if (!currentData) return;

    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      lastDataRef.current = currentData;
      return;
    }
    
    // If the title changed, we assume it's a completely different map
    if (lastDataRef.current && currentData.title !== lastDataRef.current.title) {
      setHistory([]);
      setRedoStack([]);
    }
    
    lastDataRef.current = currentData;
  }, [currentData]);

  const pushState = useCallback((state: MindMapData) => {
    // We deep clone to ensure we have a snapshot that won't be mutated
    const snapshot = JSON.parse(JSON.stringify(state));
    setHistory(prev => {
      const newHistory = [...prev, snapshot];
      if (newHistory.length > MAX_HISTORY_SIZE) {
        return newHistory.slice(1);
      }
      return newHistory;
    });
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    if (history.length === 0 || !currentData) return;

    const prevState = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    
    setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(currentData))]);
    setHistory(newHistory);
    
    isInternalUpdate.current = true;
    onRestore(prevState);
  }, [history, currentData, onRestore]);

  const redo = useCallback(() => {
    if (redoStack.length === 0 || !currentData) return;

    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);
    
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(currentData))]);
    setRedoStack(newRedoStack);
    
    isInternalUpdate.current = true;
    onRestore(nextState);
  }, [redoStack, currentData, onRestore]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (cmdKey && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if (cmdKey && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const resetHistory = useCallback(() => {
    setHistory([]);
    setRedoStack([]);
    isInternalUpdate.current = false;
  }, []);

  return {
    pushState,
    undo,
    redo,
    resetHistory,
    canUndo: history.length > 0,
    canRedo: redoStack.length > 0
  };
}
