import { useState, useCallback } from 'react';
import { Language, MindMapData, MindMapNode, translations } from '../types';
import { ApiClient } from '../services/apiClient';

import { AI_CONFIG } from '../config/ai';

export function useMindMap(language: Language) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [isOverloaded, setIsOverloaded] = useState(false);
  const [expandingNodes, setExpandingNodes] = useState<Set<string>>(new Set());

  const t = translations[language];

  const expandNodes = useCallback(async (data: MindMapData) => {
    // Identify level 3 nodes (children of groups)
    const targets: { node: MindMapNode; parentTitle: string }[] = [];
    data.children.forEach(group => {
      if (group.children) {
        group.children.forEach(item => {
          targets.push({ node: item, parentTitle: group.title });
        });
      }
    });

    if (targets.length === 0) return;

    // Concurrency control: max 4 simultaneous requests
    const CONCURRENCY_LIMIT = 4;
    let index = 0;

    const worker = async () => {
      while (index < targets.length) {
        const currentIdx = index++;
        const { node, parentTitle } = targets[currentIdx];
        
        setExpandingNodes(prev => {
          const next = new Set(prev);
          next.add(node.id);
          return next;
        });

        try {
          const children = await ApiClient.expandNode(node.title, node.type, parentTitle, language);
          
          setMindMapData(currentData => {
            if (!currentData) return null;
            
            const updateNode = (nodes: MindMapNode[]): MindMapNode[] => {
              return nodes.map(n => {
                if (n.id === node.id) {
                  return { ...n, children: children || [] };
                }
                if (n.children && n.children.length > 0) {
                  return { ...n, children: updateNode(n.children) };
                }
                return n;
              });
            };

            return {
              ...currentData,
              children: updateNode(currentData.children)
            };
          });
        } catch (err) {
          console.error(`Failed to expand node ${node.id}:`, err);
        } finally {
          setExpandingNodes(prev => {
            const next = new Set(prev);
            next.delete(node.id);
            return next;
          });
        }
      }
    };

    // Start workers
    const workers = Array.from({ length: Math.min(CONCURRENCY_LIMIT, targets.length) }, () => worker());
    await Promise.all(workers);
  }, [language]);

  const generate = useCallback(async (inputText: string, onSuccess?: (data: MindMapData) => void) => {
    if (!inputText.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setRetryAttempt(0);
    setIsOverloaded(false);
    setExpandingNodes(new Set());

    try {
      // Single API call now, backend handles retries
      const data = await ApiClient.generateMindMap(inputText, language, 0);
      setMindMapData(data);
      setIsGenerating(false);
      if (onSuccess) onSuccess(data);
      
      // Start background expansion
      expandNodes(data);
    } catch (err: any) {
      setIsGenerating(false);
      
      // Handle 503 (Unavailable) or 429 (Resource Exhausted) or 504 (Timeout)
      if (err.status === 503 || err.status === 429 || err.status === 504) {
        setIsOverloaded(true);
        setError(err.status === 504 ? err.message : t.aiOverloadedTerminal);
      } else {
        setError(err?.message || t.error);
      }
    }
  }, [isGenerating, language, t, expandNodes]);

  const loadData = useCallback((data: MindMapData) => {
    setMindMapData(data);
    setError(null);
    setIsOverloaded(false);
  }, []);

  const reset = useCallback(() => {
    setMindMapData(null);
    setError(null);
    setIsOverloaded(false);
    setRetryAttempt(0);
  }, []);

  return {
    isGenerating,
    mindMapData,
    error,
    retryAttempt,
    isOverloaded,
    expandingNodes,
    generate,
    reset,
    loadData,
    setMindMapData
  };
}
