import React, { useState, useRef, Suspense, lazy, useCallback, useEffect } from 'react';
import { 
  Send, 
  FileJson, 
  FileImage, 
  FileCode, 
  FileText,
  Loader2,
  BrainCircuit,
  History,
  Trash2,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ReactFlowInstance } from '@xyflow/react';

import { Language, DisplayMode, MindMapNode, translations } from './types';
import { cn } from './lib/utils';

// Hooks
import { useMindMap } from './hooks/useMindMap';
import { useNodeDetails } from './hooks/useNodeDetails';
import { useServerHealth } from './hooks/useServerHealth';
import { usePersistence } from './hooks/usePersistence';

// Services
import { ExportService } from './services/exportService';
import { StorageService } from './services/storageService';

// Lazy load visualization components
const MindMapViewer = lazy(() => import('./components/MindMap').then(m => ({ default: m.MindMapViewer })));
const ExportCard = lazy(() => import('./components/ExportCard').then(m => ({ default: m.ExportCard })));

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('detailed');
  const [inputText, setInputText] = useState('');
  const [exportNode, setExportNode] = useState<MindMapNode | null>(null);

  const isServerHealthy = useServerHealth();
  
  const {
    isGenerating,
    mindMapData,
    error,
    retryAttempt,
    isOverloaded,
    expandingNodes,
    generate,
    reset: resetMindMap,
    loadData,
    setMindMapData
  } = useMindMap(language);

  const {
    hasDraft,
    history,
    quotaError,
    restoreDraft,
    discardDraft,
    addToHistory,
    deleteHistoryItem,
    setQuotaError
  } = usePersistence(mindMapData, loadData);

  const {
    nodeDetailsCache,
    isFetchingDetails,
    selectedNodeId,
    fetchDetails,
    clearCache: clearNodeCache,
    setSelectedNodeId
  } = useNodeDetails(language);

  const exportRef = useRef<HTMLDivElement>(null);
  const rfInstance = useRef<ReactFlowInstance | null>(null);

  const handleMindMapInit = useCallback((instance: ReactFlowInstance) => { 
    rfInstance.current = instance; 
  }, []);

  const handleGenerate = useCallback(() => {
    clearNodeCache();
    generate(inputText, (data) => {
      addToHistory(data);
    });
  }, [clearNodeCache, generate, inputText, addToHistory]);

  const handleNodeSelect = useCallback((node: MindMapNode) => {
    fetchDetails(node, mindMapData?.title);
  }, [fetchDetails, mindMapData?.title]);

  const handleReset = useCallback(() => {
    resetMindMap();
    setInputText('');
    clearNodeCache();
    StorageService.clearDraft();
  }, [resetMindMap, clearNodeCache]);

  const t = translations[language];

  return (
    <div className="flex h-screen w-screen bg-[#F8FAFC] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[320px] flex flex-col bg-white/80 backdrop-blur-xl border-r border-slate-200 z-20 shadow-xl shadow-slate-200/50">
        <div className="p-6 flex flex-col h-full">
          {/* Logo & Lang */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">
                <BrainCircuit className="text-white" size={18} />
              </div>
              <h1 className="font-bold text-slate-900 tracking-tight text-sm">MindGraph AI</h1>
            </div>
            
            <div className="flex bg-slate-100 p-0.5 rounded-md text-[10px] font-bold">
              <button
                onClick={() => setLanguage('ru')}
                className={cn(
                  "px-2 py-1 rounded transition-all uppercase",
                  language === 'ru' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-800"
                )}
              >
                RU
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={cn(
                  "px-2 py-1 rounded transition-all uppercase",
                  language === 'en' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-800"
                )}
              >
                EN
              </button>
            </div>
          </div>

          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">
            {t.inputLabel}
          </label>
          
          <textarea
            className="flex-1 w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none text-sm leading-relaxed text-slate-700 shadow-inner mb-4 transition-all placeholder:text-slate-300"
            placeholder={t.placeholder}
            value={inputText}
            maxLength={10000}
            onChange={(e) => setInputText(e.target.value)}
          />

          <button
            onClick={handleGenerate}
            disabled={!inputText.trim() || isGenerating}
            className={cn(
              "w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg",
              inputText.trim() && !isGenerating
                ? "bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            {isGenerating ? (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  <span className="whitespace-pre-line text-center text-[11px]">
                    {t.generatingKnowledge}
                  </span>
                </div>
              </div>
            ) : (
              <>
                <Send size={16} />
                {t.generate}
              </>
            )}
          </button>

          {/* History Section */}
          <div className="mt-8 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                {t.myMaps}
              </label>
              {history.length > 0 && (
                <span className="text-[10px] font-medium text-slate-600">
                  {history.length}/20
                </span>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2 custom-scrollbar">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 opacity-40">
                  <History size={24} className="text-slate-300 mb-2" />
                  <span className="text-[10px] text-slate-400 font-medium">{t.noHistory}</span>
                </div>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.id}
                    className="group flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 cursor-pointer"
                    onClick={() => loadData(item.data)}
                  >
                    <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-indigo-500 shrink-0 group-hover:bg-white">
                      <BrainCircuit size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-700 truncate">{item.title}</p>
                      <p className="text-[9px] text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHistoryItem(item.id);
                      }}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Export Grid */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4">
              {t.exportLabel}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => mindMapData && rfInstance.current && ExportService.exportAsPdf(mindMapData, rfInstance.current, exportRef, setExportNode)} 
                disabled={!mindMapData || isGenerating}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
              >
                <FileText size={14} className="text-slate-400" />
                <span>PDF</span>
              </button>
              <button 
                onClick={() => rfInstance.current && ExportService.exportAsPng(rfInstance.current)} 
                disabled={!mindMapData}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
              >
                <FileImage size={14} className="text-slate-400" />
                <span>PNG</span>
              </button>
              <button 
                onClick={() => rfInstance.current && ExportService.exportAsSvg(rfInstance.current)} 
                disabled={!mindMapData}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
              >
                <FileCode size={14} className="text-slate-400" />
                <span>SVG</span>
              </button>
              <button 
                onClick={() => mindMapData && ExportService.exportAsJson(mindMapData)} 
                disabled={!mindMapData}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
              >
                <FileJson size={14} className="text-slate-400" />
                <span>JSON</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {mindMapData ? (
            <motion.div
              key="viz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 h-full"
            >
              <Suspense fallback={
                <div className="flex-1 h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">{t.generating}</span>
                  </div>
                </div>
              }>
                <MindMapViewer 
                  data={mindMapData} 
                  language={language}
                  displayMode={displayMode}
                  onChange={setMindMapData} 
                  onInit={handleMindMapInit}
                  onNodeSelect={handleNodeSelect}
                  selectedNodeDetails={selectedNodeId ? nodeDetailsCache[selectedNodeId] : null}
                  isDetailsLoading={isFetchingDetails}
                  expandingNodes={expandingNodes}
                />
              </Suspense>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center p-12"
            >
              <div className="w-20 h-20 bg-white rounded-3xl shadow-xl shadow-slate-200/50 flex items-center justify-center mb-8 border border-slate-100">
                <BrainCircuit className="text-indigo-600" size={40} />
              </div>
              <h3 className="text-slate-800 text-xl font-bold mb-3">{t.emptyTitle}</h3>
              <p className="text-slate-400 text-sm max-w-sm leading-relaxed">{t.instructions}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status indicator */}
        <div className="absolute top-8 right-8 bg-white/90 border border-slate-200 rounded-full px-4 py-2 flex items-center gap-4 shadow-sm backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              isServerHealthy === true ? "bg-green-500" : (isServerHealthy === false ? "bg-red-500" : "bg-yellow-500")
            )}></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {isServerHealthy === true ? t.aiStatus : (isServerHealthy === false ? (language === 'ru' ? "СЕРВЕР ОФФЛАЙН" : "SERVER OFFLINE") : (language === 'ru' ? "ПОДКЛЮЧЕНИЕ..." : "CONNECTING..."))}
            </span>
          </div>
          <div className="w-px h-3 bg-slate-200"></div>
          <button 
            onClick={handleReset}
            className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors"
          >
            {t.reset}
          </button>
        </div>

        {hasDraft && !mindMapData && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-8 left-8 right-8 bg-white border border-indigo-100 p-4 rounded-2xl shadow-2xl shadow-indigo-100/50 z-30 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <History size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">{t.restoreDraft}</h4>
                <p className="text-[11px] text-slate-500">You have an unsaved mind map from your last session.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={discardDraft}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                {t.startNew}
              </button>
              <button
                onClick={restoreDraft}
                className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                {t.restore}
              </button>
            </div>
          </motion.div>
        )}

        {quotaError && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-xl z-40 flex items-center gap-3 max-w-sm"
          >
            <AlertCircle className="text-amber-600 shrink-0" size={20} />
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-900 leading-tight mb-1">{t.quotaExceeded}</p>
              <button 
                onClick={() => setQuotaError(false)}
                className="text-[10px] font-bold text-amber-700 uppercase tracking-wider"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}

        {error && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white border border-red-100 px-6 py-4 rounded-2xl flex flex-col items-center gap-4 shadow-2xl shadow-red-100 z-50 animate-in slide-in-from-bottom-4 max-w-md text-center">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold",
                isOverloaded ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
              )}>{isOverloaded ? "?" : "!"}</div>
              <p className="text-sm font-semibold text-slate-700 whitespace-pre-line">{error}</p>
            </div>
            {!isOverloaded && (
              <button
                onClick={handleGenerate}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <Loader2 className={cn("w-3 h-3", isGenerating && "animate-spin")} />
                {t.retry}
              </button>
            )}
          </div>
        )}
      </main>

      <footer className="fixed bottom-4 right-8 pointer-events-none z-50">
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em]">AI Studio • MindGraph</p>
      </footer>

      {/* Hidden Export Container */}
      <div className="fixed -left-[2000px] top-0 pointer-events-none">
        <div ref={exportRef}>
          {exportNode && (
            <Suspense fallback={null}>
              <ExportCard node={exportNode} language={language} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
