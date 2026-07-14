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
  positionLocked?: boolean;
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
  retrying: string;
  usingBackup: string;
  generatingKnowledge: string;
  restoreDraft: string;
  restore: string;
  startNew: string;
  myMaps: string;
  noHistory: string;
  quotaExceeded: string;
  delete: string;
  confirmDelete: string;
  undo: string;
  redo: string;
  node: string;
  rootNode: string;
  expand: string;
  collapse: string;
  addChild: string;
  editNode: string;
  showDetails: string;
  pinNode: string;
  unpinNode: string;
  searchPlaceholder: string;
  resetLayout: string;
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
    aiOverloadedTerminal: "Service is temporarily overloaded.\nPlease try again in a few minutes.",
    retrying: "Performing a retry attempt...",
    usingBackup: "Using a backup model...",
    generatingKnowledge: "Generating knowledge map...",
    restoreDraft: "Restore your last map?",
    restore: "Restore",
    startNew: "Start New",
    myMaps: "My Maps",
    noHistory: "No saved maps yet",
    quotaExceeded: "Storage limit reached. Try deleting old maps.",
    delete: "Delete",
    confirmDelete: "Are you sure?",
    undo: "Undo",
    redo: "Redo",
    node: "Node",
    rootNode: "Central Node",
    expand: "Expand",
    collapse: "Collapse",
    addChild: "Add Child Node",
    editNode: "Edit Node",
    showDetails: "Show details and research",
    pinNode: "Pin node position",
    unpinNode: "Unpin node position",
    searchPlaceholder: "Search nodes...",
    resetLayout: "Reset layout",
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
    aiOverloadedTerminal: "Сервис временно перегружен.\nПопробуйте снова через несколько минут.",
    retrying: "Выполняется повторная попытка...",
    usingBackup: "Используется резервная модель...",
    generatingKnowledge: "Генерируется карта знаний...",
    restoreDraft: "Восстановить последнюю карту?",
    restore: "Восстановить",
    startNew: "Начать заново",
    myMaps: "Мои карты",
    noHistory: "Нет сохраненных карт",
    quotaExceeded: "Лимит хранилища превышен. Попробуйте удалить старые карты.",
    delete: "Удалить",
    confirmDelete: "Вы уверены?",
    undo: "Отменить",
    redo: "Вернуть",
    node: "Узел",
    rootNode: "Центральный узел",
    expand: "Раскрыть",
    collapse: "Свернуть",
    addChild: "Добавить дочерний узел",
    editNode: "Редактировать узел",
    showDetails: "Показать детали и исследование",
    pinNode: "Закрепить позицию узла",
    unpinNode: "Открепить позицию узла",
    searchPlaceholder: "Поиск узлов...",
    resetLayout: "Сбросить макет",
  }
};
