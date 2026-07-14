import { Language, MindMapData } from '../types';

export class ApiClient {
  static async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch('/api/health');
      return response.ok;
    } catch {
      return false;
    }
  }

  static async generateMindMap(text: string, language: Language, attempt: number): Promise<MindMapData> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 65000); // 65 second timeout

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language, attempt }),
        signal: controller.signal
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const error = new Error(data.error || data.details || 'Failed to generate mind map');
        (error as any).status = response.status;
        (error as any).data = data;
        throw error;
      }

      return await response.json();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(language === 'ru'
          ? "Превышено время ожидания генерации. Попробуйте более короткий текст."
          : "Generation timed out. Try with a shorter text.");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  static async fetchNodeDetails(nodeTitle: string, nodeType: string, contextTitle: string | undefined, language: Language) {
    const response = await fetch('/api/node-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        nodeTitle,
        nodeType,
        context: contextTitle,
        language 
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch node details');
    }

    return response.json();
  }

  static async expandNode(nodeTitle: string, nodeType: string, parentContext: string, language: Language) {
    const response = await fetch('/api/expand-node', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        nodeTitle,
        nodeType,
        parentContext,
        language 
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to expand node branches');
    }

    return response.json();
  }
}
