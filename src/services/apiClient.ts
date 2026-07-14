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
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language, attempt }),
    }).catch(() => {
      throw new Error(language === 'ru' 
        ? "Сервер недоступен. Проверьте интернет-соединение."
        : "Server is unreachable. Please check your internet connection.");
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error = new Error(data.error || data.details || 'Failed to generate mind map');
      (error as any).status = response.status;
      (error as any).data = data;
      throw error;
    }

    return response.json();
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
}
