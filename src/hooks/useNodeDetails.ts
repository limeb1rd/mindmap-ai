import { useState, useCallback } from 'react';
import { Language, MindMapNode } from '../types';
import { ApiClient } from '../services/apiClient';

export function useNodeDetails(language: Language) {
  const [nodeDetailsCache, setNodeDetailsCache] = useState<Record<string, any>>({});
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const fetchDetails = useCallback(async (node: MindMapNode, contextTitle?: string) => {
    setSelectedNodeId(node.id);
    
    if (!nodeDetailsCache[node.id] && node.id !== 'root') {
      setIsFetchingDetails(true);
      try {
        const details = await ApiClient.fetchNodeDetails(node.title, node.type, contextTitle, language);
        setNodeDetailsCache(prev => ({ ...prev, [node.id]: details }));
      } catch (err) {
        console.error('Failed to fetch node details:', err);
      } finally {
        setIsFetchingDetails(false);
      }
    }
  }, [nodeDetailsCache, language]);

  const clearCache = useCallback(() => {
    setNodeDetailsCache({});
    setSelectedNodeId(null);
  }, []);

  return {
    nodeDetailsCache,
    isFetchingDetails,
    selectedNodeId,
    fetchDetails,
    clearCache,
    setSelectedNodeId
  };
}
