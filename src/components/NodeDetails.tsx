import React from 'react';
import { X, Info, Layers, BookOpen, ExternalLink, History, ChevronRight, Loader2 } from 'lucide-react';
import { MindMapNode, translations, Language } from '../types';
import { cn } from '../lib/utils';

interface NodeDetailsProps {
  node: MindMapNode | null;
  details?: any;
  isLoading?: boolean;
  language: Language;
  onClose: () => void;
  onSelectLink: (id: string) => void;
  findNodeTitle: (id: string) => string;
}

export function NodeDetails({ node, details, isLoading, language, onClose, onSelectLink, findNodeTitle }: NodeDetailsProps) {
  const t = translations[language];
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const prevActiveElement = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (node) {
      prevActiveElement.current = document.activeElement as HTMLElement;
      closeButtonRef.current?.focus();
    } else {
      prevActiveElement.current?.focus();
    }
  }, [node]);

  if (!node) return null;

  // Prefer details from API if available
  const displayDescription = details?.description || node.summary;
  const displayBiography = details?.detailedBiography || node.metadata?.detailedBiography;
  const displayContext = details?.historicalContext || node.metadata?.historicalContext;
  const displayImportance = details?.importance || node.metadata?.importance;
  const displayLinks = details?.links || node.links;

  // Deduplication logic: if summary and description are too similar, only show description
  const showSummary = node.summary && 
    (!details?.description || (details.description.toLowerCase().indexOf(node.summary.toLowerCase()) === -1 && node.summary.toLowerCase().indexOf(details.description.toLowerCase()) === -1));

  const SkeletonRow = () => (
    <div className="space-y-2 animate-pulse">
      <div className="h-2 bg-slate-200 rounded w-1/4"></div>
      <div className="h-4 bg-slate-100 rounded w-full"></div>
      <div className="h-4 bg-slate-100 rounded w-5/6"></div>
    </div>
  );

  return (
    <div 
      className="absolute right-0 top-0 bottom-0 w-[450px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100"
      role="dialog"
      aria-modal="true"
      aria-labelledby="node-details-title"
    >
      <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">{node.type}</span>
          <h2 id="node-details-title" className="text-xl font-black tracking-tight">{node.title}</h2>
        </div>
        <button 
          ref={closeButtonRef}
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white"
          aria-label={t.delete}
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth custom-scrollbar">
        {isLoading ? (
          <div className="space-y-10 py-4">
            <div className="flex items-center gap-3 text-slate-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">
              <Loader2 size={16} className="animate-spin" />
              <span>{t.overview || 'Loading Details...'}</span>
            </div>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : (
          <>
            {(displayDescription || node.summary) && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-slate-600 font-bold uppercase tracking-widest text-[10px]">
                  <Layers size={12} />
                  <span>{t.overview || 'Overview'}</span>
                </div>
                <div className="space-y-4">
                  {showSummary && (
                    <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100 italic shadow-sm">
                      "{node.summary}"
                    </p>
                  )}
                  {details?.description && (
                    <p className="text-slate-700 text-sm leading-relaxed">
                      {details.description}
                    </p>
                  )}
                  {!details?.description && !showSummary && node.summary && (
                     <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100 italic shadow-sm">
                      "{node.summary}"
                    </p>
                  )}
                </div>
              </section>
            )}

            {displayBiography && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-slate-600 font-bold uppercase tracking-widest text-[10px]">
                  <BookOpen size={12} />
                  <span>{t.biography || 'Biography'}</span>
                </div>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {displayBiography}
                </p>
              </section>
            )}

            {displayContext && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-slate-600 font-bold uppercase tracking-widest text-[10px]">
                  <History size={12} />
                  <span>{t.history || 'History'}</span>
                </div>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {displayContext}
                </p>
              </section>
            )}

            {displayImportance && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-slate-600 font-bold uppercase tracking-widest text-[10px]">
                  <ExternalLink size={12} />
                  <span>{t.importance || 'Importance'}</span>
                </div>
                <div className="text-slate-800 text-sm leading-relaxed border-l-4 border-indigo-400 pl-4 py-2 bg-indigo-50/30 rounded-r-xl">
                  {displayImportance}
                </div>
              </section>
            )}

            {displayLinks && displayLinks.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-slate-600 font-bold uppercase tracking-widest text-[10px]">
                  <ExternalLink size={12} />
                  <span>{t.relatedNodes || 'Related Nodes'}</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {displayLinks.map((link: any, idx: number) => (
                    <button 
                      key={idx}
                      onClick={() => onSelectLink(link.targetId)}
                      className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50 transition-all text-left group"
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{link.label || 'Link'}</span>
                        <span className="text-xs font-medium text-slate-800">
                          {findNodeTitle(link.targetId)}
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
        <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium">
          <span>{t.nodeType || 'Node Type'}: {node.type}</span>
        </div>
      </div>
    </div>
  );
}

