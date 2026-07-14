import { useState, useCallback } from 'react';
import { Language, MindMapData, translations } from '../types';
import { ApiClient } from '../services/apiClient';

import { AI_CONFIG } from '../config/ai';

export function useMindMap(language: Language) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [isOverloaded, setIsOverloaded] = useState(false);

  const t = translations[language];

  const generate = useCallback(async (inputText: string) => {
    if (!inputText.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setRetryAttempt(0);
    setIsOverloaded(false);

    const delays = AI_CONFIG.RETRY_DELAYS;
    let lastError: any;

    for (let attempt = 0; attempt < delays.length; attempt++) {
      setRetryAttempt(attempt);
      
      if (delays[attempt] > 0) {
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      }

      try {
        const data = await ApiClient.generateMindMap(inputText, language, attempt);
        setMindMapData(data);
        setIsGenerating(false);
        setIsOverloaded(false);
        return;
      } catch (err: any) {
        lastError = err;
        
        // Handle 503 (Unavailable) or 429 (Resource Exhausted)
        if (err.status === 503 || err.status === 429) {
          setIsOverloaded(true);
          continue;
        }
        
        setIsOverloaded(false);
        break; 
      }
    }

    setIsGenerating(false);
    if (isOverloaded) {
      setError(t.aiOverloadedTerminal);
    } else {
      setError(lastError?.message || t.error);
    }
  }, [isGenerating, language, t, isOverloaded]);

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
    generate,
    reset,
    setMindMapData
  };
}
