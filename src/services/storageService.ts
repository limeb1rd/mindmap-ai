import { MindMapData } from '../types';

const STORAGE_KEYS = {
  DRAFT: 'mindmap:draft',
  HISTORY: 'mindmap:history',
};

const MAX_HISTORY_ITEMS = 20;

export interface HistoryItem {
  id: string;
  title: string;
  createdAt: number;
  data: MindMapData;
}

export class StorageService {
  static saveDraft(data: MindMapData | null): void {
    try {
      if (data) {
        localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(data));
      } else {
        localStorage.removeItem(STORAGE_KEYS.DRAFT);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded while saving draft');
      }
    }
  }

  static getDraft(): MindMapData | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DRAFT);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading draft from localStorage', error);
      return null;
    }
  }

  static clearDraft(): void {
    localStorage.removeItem(STORAGE_KEYS.DRAFT);
  }

  static addToHistory(data: MindMapData): void {
    try {
      const history = this.getHistory();
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        title: data.title || 'Untitled Mind Map',
        createdAt: Date.now(),
        data,
      };

      // Remove duplicates if same title (optional, but good for cleanliness)
      const updatedHistory = [newItem, ...history.filter(item => item.data.title !== data.title)]
        .slice(0, MAX_HISTORY_ITEMS);

      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new Error('QUOTA_EXCEEDED');
      }
      console.error('Error saving history to localStorage', error);
    }
  }

  static getHistory(): HistoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading history from localStorage', error);
      return [];
    }
  }

  static deleteFromHistory(id: string): void {
    try {
      const history = this.getHistory();
      const updatedHistory = history.filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error deleting from history', error);
    }
  }
}
