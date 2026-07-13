import React, { useState, useRef, useCallback, Suspense, lazy } from 'react';
import { 
  Languages, 
  Send, 
  Download, 
  FileJson, 
  FileImage, 
  FileCode, 
  FileText,
  Loader2,
  BrainCircuit,
  Github
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ReactFlowInstance } from '@xyflow/react';

import { Language, DisplayMode, MindMapNode, MindMapData, translations } from './types';
import { cn } from './lib/utils';

// Lazy load visualization components
const MindMapViewer = lazy(() => import('./components/MindMap').then(m => ({ default: m.MindMapViewer })));
const ExportCard = lazy(() => import('./components/ExportCard').then(m => ({ default: m.ExportCard })));

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('detailed');
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nodeDetailsCache, setNodeDetailsCache] = useState<Record<string, any>>({});
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [exportNode, setExportNode] = useState<MindMapNode | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [isOverloaded, setIsOverloaded] = useState(false);

  const handleNodeSelect = async (node: MindMapNode) => {
    setSelectedNodeId(node.id);
    
    // Lazy load details if not in cache
    if (!nodeDetailsCache[node.id] && node.id !== 'root') {
      setIsFetchingDetails(true);
      try {
        const response = await fetch('/api/node-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            nodeTitle: node.title,
            nodeType: node.type,
            context: mindMapData?.title,
            language 
          }),
        });
        
        if (response.ok) {
          const details = await response.json();
          setNodeDetailsCache(prev => ({ ...prev, [node.id]: details }));
        }
      } catch (err) {
        console.error('Failed to fetch node details:', err);
      } finally {
        setIsFetchingDetails(false);
      }
    }
  };
  const exportRef = useRef<HTMLDivElement>(null);
  const rfInstance = useRef<ReactFlowInstance | null>(null);
  const t = translations[language];

  const [isServerHealthy, setIsServerHealthy] = useState<boolean | null>(null);

  // Check server health on mount
  React.useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health');
        setIsServerHealthy(response.ok);
      } catch (err) {
        setIsServerHealthy(false);
      }
    };
    checkHealth();
  }, []);

  const handleGenerate = async () => {
    if (!inputText.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setNodeDetailsCache({});
    setSelectedNodeId(null);
    setRetryAttempt(0);
    setIsOverloaded(false);

    const delays = [0, 2000, 5000, 10000, 20000];
    let lastError: any;

    for (let attempt = 0; attempt < delays.length; attempt++) {
      setRetryAttempt(attempt);
      
      if (delays[attempt] > 0) {
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      }

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: inputText, language, attempt }),
        }).catch(err => {
          throw new Error(language === 'ru' 
            ? "Сервер недоступен. Проверьте интернет-соединение."
            : "Server is unreachable. Please check your internet connection.");
        });

        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        }

        if (response.ok) {
          setMindMapData(data);
          setIsGenerating(false);
          setIsOverloaded(false);
          return;
        }

        // Handle 503 (Unavailable) or 429 (Resource Exhausted)
        if (response.status === 503 || response.status === 429) {
          setIsOverloaded(true);
          continue;
        }

        throw new Error(data?.error || data?.details || t.error);
      } catch (err: any) {
        lastError = err;
        if (!isOverloaded) break; // Only retry on overload
      }
    }

    setIsGenerating(false);
    if (isOverloaded) {
      setError(t.aiOverloadedTerminal);
    } else {
      setError(lastError?.message || t.error);
    }
  };

  const exportAsPng = useCallback(async () => {
    const { toPng } = await import('html-to-image');
    const element = document.querySelector('.react-flow') as HTMLElement;
    if (element) {
      // Mind Map Layer only
      const dataUrl = await toPng(element, { backgroundColor: '#f8fafc', quality: 1 });
      const link = document.createElement('a');
      link.download = `mindmap-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }
  }, []);

  const exportAsSvg = useCallback(async () => {
    const { toSvg } = await import('html-to-image');
    const element = document.querySelector('.react-flow') as HTMLElement;
    if (element) {
      const dataUrl = await toSvg(element, { backgroundColor: '#f8fafc' });
      const link = document.createElement('a');
      link.download = `mindmap-${Date.now()}.svg`;
      link.href = dataUrl;
      link.click();
    }
  }, []);

  const exportAsPdf = useCallback(async () => {
    if (!mindMapData) return;
    
    const element = document.querySelector('.react-flow') as HTMLElement;
    if (!element) return;

    try {
      setIsGenerating(true);
      
      const [
        { toPng },
        { jsPDF }
      ] = await Promise.all([
        import('html-to-image'),
        import('jspdf')
      ]);

      // 1. Capture Mind Map Layer
      const mapDataUrl = await toPng(element, { backgroundColor: '#f8fafc', quality: 1 });
      
      const pdf = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Page 1: Map
      const mapImgWidth = pageWidth;
      const mapImgHeight = (element.offsetHeight * mapImgWidth) / element.offsetWidth;
      const yOffset = mapImgHeight < pageHeight ? (pageHeight - mapImgHeight) / 2 : 0;
      pdf.addImage(mapDataUrl, 'PNG', 0, yOffset, mapImgWidth, mapImgHeight);

      // Collect all nodes with significant metadata
      const nodesWithMetadata: MindMapNode[] = [];
      const traverse = (node: MindMapNode) => {
        if (node.metadata && (node.metadata.description || node.metadata.importance || node.metadata.detailedBiography)) {
          nodesWithMetadata.push(node);
        }
        node.children?.forEach(traverse);
      };
      traverse(mindMapData);

      // Export each card in the order found in the map
      for (const node of nodesWithMetadata) {
        setExportNode(node);
        // Wait for state to apply and DOM to render
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (exportRef.current) {
          const cardUrl = await toPng(exportRef.current, { backgroundColor: '#ffffff', quality: 1 });
          pdf.addPage([210, 297], 'p'); // A4 Portrait for details
          const cardWidth = 210;
          const cardHeight = (exportRef.current.offsetHeight * cardWidth) / exportRef.current.offsetWidth;
          pdf.addImage(cardUrl, 'PNG', 0, 0, cardWidth, cardHeight > 297 ? 297 : cardHeight);
        }
      }

      pdf.save(`mindmap-full-${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF Export failed', err);
    } finally {
      setIsGenerating(false);
      setExportNode(null);
    }
  }, [mindMapData]);

  const exportAsJson = useCallback(() => {
    if (!mindMapData) return;
    const blob = new Blob([JSON.stringify(mindMapData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `mindmap-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [mindMapData]);

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
                  <span className="whitespace-pre-line text-center">{isOverloaded ? t.aiOverloaded : t.generating}</span>
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
              <button onClick={exportAsPdf} className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
                <FileText size={14} className="text-slate-400" />
                <span>PDF</span>
              </button>
              <button onClick={exportAsPng} className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
                <FileImage size={14} className="text-slate-400" />
                <span>PNG</span>
              </button>
              <button onClick={exportAsSvg} className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
                <FileCode size={14} className="text-slate-400" />
                <span>SVG</span>
              </button>
              <button onClick={exportAsJson} className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
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
                  onInit={(instance) => (rfInstance.current = instance)}
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
            onClick={() => {
              setMindMapData(null);
              setInputText('');
              setNodeDetailsCache({});
              setSelectedNodeId(null);
            }}
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
