import React from 'react';
import { X, Info, Layers, BookOpen, ExternalLink, History, ChevronRight } from 'lucide-react';
import { MindMapNode, translations, Language } from '../types';

interface NodeDetailsProps {
  node: MindMapNode | null;
  language: Language;
  onClose: () => void;
  onSelectLink: (id: string) => void;
  findNodeTitle: (id: string) => string;
}

export function NodeDetails({ node, language, onClose, onSelectLink, findNodeTitle }: NodeDetailsProps) {
  const t = translations[language];

  if (!node) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-[450px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100">
      <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">{node.type}</span>
          <h2 className="text-xl font-black tracking-tight">{node.title}</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth custom-scrollbar">
        {node.summary && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              <Layers size={12} />
              <span>{t.overview || 'Overview'}</span>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100 italic shadow-sm">
              "{node.summary}"
            </p>
          </section>
        )}

        {node.metadata?.detailedBiography && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              <BookOpen size={12} />
              <span>{t.biography || 'Biography'}</span>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
              {node.metadata.detailedBiography}
            </p>
          </section>
        )}

        {node.metadata?.historicalContext && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              <History size={12} />
              <span>{t.history || 'History'}</span>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
              {node.metadata.historicalContext}
            </p>
          </section>
        )}

        {node.metadata?.importance && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              <ExternalLink size={12} />
              <span>{t.importance || 'Importance'}</span>
            </div>
            <div className="text-slate-700 text-sm leading-relaxed border-l-4 border-indigo-400 pl-4 py-2 bg-indigo-50/30 rounded-r-xl">
              {node.metadata.importance}
            </div>
          </section>
        )}

        {node.links && node.links.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              <ExternalLink size={12} />
              <span>{t.relatedNodes || 'Related Nodes'}</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {node.links.map((link, idx) => (
                <button 
                  key={idx}
                  onClick={() => onSelectLink(link.targetId)}
                  className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50 transition-all text-left group"
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">{link.label || 'Link'}</span>
                    <span className="text-xs font-medium text-slate-700">
                      {findNodeTitle(link.targetId)}
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span>{t.nodeType || 'Node Type'}: {node.type}</span>
        </div>
      </div>
    </div>
  );
}
