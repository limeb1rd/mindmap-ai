import React, { useState, useRef, Suspense, lazy, useCallback, useEffect } from 'react';
import { 
  Send, 
  FileJson, 
  FileImage, 
  FileCode, 
  FileText,
  Loader2,
  BrainCircuit,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ReactFlowInstance } from '@xyflow/react';

import { Language, DisplayMode, MindMapNode, translations } from './types';
import { cn } from './lib/utils';

// Hooks
import { useMindMap } from './hooks/useMindMap';
import { useNodeDetails } from './hooks/useNodeDetails';
import { useServerHealth } from './hooks/useServerHealth';

// Services
import { ExportService } from './services/exportService';

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
    generate,
    reset: resetMindMap,
    setMindMapData
  } = useMindMap(language);

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
    generate(inputText);
  }, [clearNodeCache, generate, inputText]);

  const handleNodeSelect = useCallback((node: MindMapNode) => {
    fetchDetails(node, mindMapData?.title);
  }, [fetchDetails, mindMapData?.title]);

  const handleReset = useCallback(() => {
    resetMindMap();
    setInputText('');
    clearNodeCache();
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

          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
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
                    {retryAttempt === 0 ? t.generatingKnowledge : 
                     retryAttempt === 1 ? t.usingBackup : 
                     t.retrying}
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

          {/* Export Grid */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
              {t.exportLabel}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => mindMapData && ExportService.exportAsPdf(mindMapData, exportRef, setExportNode)} 
                disabled={!mindMapData || isGenerating}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
              >
                <FileText size={14} className="text-slate-400" />
                <span>PDF</span>
              </button>
              <button 
                onClick={() => ExportService.exportAsPng()} 
                disabled={!mindMapData}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
              >
                <FileImage size={14} className="text-slate-400" />
                <span>PNG</span>
              </button>
              <button 
                onClick={() => ExportService.exportAsSvg()} 
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
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.generating}</span>
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
