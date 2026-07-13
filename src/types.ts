export type MindMapNodeType = string;

export interface MindMapNodeMetadata {
  description?: string;
  importance?: string;
  detailedBiography?: string;
  historicalContext?: string;
  [key: string]: any; // Allow any custom fields
}

export interface MindMapNode {
  id: string;
  title: string;
  type: MindMapNodeType;
  metadata?: MindMapNodeMetadata;
  
  // Backwards compatibility for UI/State
  summary?: string;
  details?: string;
  expanded?: boolean;
  children?: MindMapNode[];
  links?: { targetId: string; label?: string; type?: string }[];
}

export interface MindMapData {
  title: string;
  summary?: string;
  children: MindMapNode[];
}

export type Language = 'en' | 'ru';
export type DisplayMode = 'overview' | 'study' | 'detailed';

export interface Translation {
  title: string;
  placeholder: string;
  generate: string;
  generating: string;
  exportPdf: string;
  exportPng: string;
  exportSvg: string;
  exportJson: string;
  zoomIn: string;
  zoomOut: string;
  fitView: string;
  editText: string;
  addNode: string;
  deleteNode: string;
  error: string;
  retry: string;
  instructions: string;
  emptyTitle: string;
  aiStatus: string;
  reset: string;
  inputLabel: string;
  exportLabel: string;
  lifespan: string;
  era: string;
  movement: string;
  features: string;
  instruments: string;
  works: string;
  importance: string;
  overview: string;
  study: string;
  detailed: string;
  mode: string;
  details: string;
  history: string;
  biography: string;
  relatedNodes: string;
  nodeType: string;
  aiOverloaded: string;
  aiOverloadedTerminal: string;
}

export const translations: Record<Language, Translation> = {
  en: {
    title: "AI Mind Map Generator",
    placeholder: "Paste your text, ideas, or project plans here...",
    generate: "Generate Mind Map",
    generating: "Analyzing...",
    exportPdf: "Export PDF",
    exportPng: "Export PNG",
    exportSvg: "Export SVG",
    exportJson: "Export JSON",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    fitView: "Fit View",
    editText: "Edit text",
    addNode: "Add child",
    deleteNode: "Delete",
    error: "Failed to generate mind map. Please check your connection or try again.",
    retry: "Retry Generation",
    instructions: "Enter text above and click generate to visualize your ideas.",
    emptyTitle: "Ready to Map?",
    aiStatus: "AI Engine Online",
    reset: "Reset",
    inputLabel: "Input Text",
    exportLabel: "Export Result",
    lifespan: "Details",
    era: "Group",
    movement: "Sub-group",
    features: "Properties",
    instruments: "Parts",
    works: "Contents",
    importance: "Impact",
    overview: "Summary",
    study: "Focus",
    detailed: "Details",
    mode: "View Mode",
    details: "Analysis",
    history: "Context",
    biography: "Full Text",
    relatedNodes: "Connections",
    nodeType: "Classification",
    aiOverloaded: "AI Service is temporarily overloaded.\nRetrying connection...",
    aiOverloadedTerminal: "Service is temporarily overloaded.\nPlease try again in a few minutes."
  },
  ru: {
    title: "AI Генератор Ментальных Карт",
    placeholder: "Вставьте текст, идеи или планы проекта сюда...",
    generate: "Создать карту",
    generating: "Анализ...",
    exportPdf: "Экспорт PDF",
    exportPng: "Экспорт PNG",
    exportSvg: "Экспорт SVG",
    exportJson: "Экспорт JSON",
    zoomIn: "Приблизить",
    zoomOut: "Отдалить",
    fitView: "По центру",
    editText: "Редактировать",
    addNode: "Добавить ветку",
    deleteNode: "Удалить",
    error: "Не удалось создать карту. Проверьте подключение или повторите попытку.",
    retry: "Повторить генерацию",
    instructions: "Введите текст выше и нажмите кнопку, чтобы визуализировать идеи.",
    emptyTitle: "Готовы создать карту?",
    aiStatus: "AI Система Онлайн",
    reset: "Сброс",
    inputLabel: "Ввод текста",
    exportLabel: "Экспорт результата",
    lifespan: "Детали",
    era: "Группа",
    movement: "Подгруппа",
    features: "Свойства",
    instruments: "Компоненты",
    works: "Содержимое",
    importance: "Значимость",
    overview: "Обзор",
    study: "Изучение",
    detailed: "Анализ",
    mode: "Режим",
    details: "Анализ узла",
    history: "Контекст",
    biography: "Полный текст",
    relatedNodes: "Связи",
    nodeType: "Классификация",
    aiOverloaded: "Сервис ИИ временно перегружен.\nПовторяем попытку подключения...",
    aiOverloadedTerminal: "Сервис временно перегружен.\nПопробуйте снова через несколько минут."
  }
};
