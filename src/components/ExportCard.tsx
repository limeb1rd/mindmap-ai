import React from 'react';
import { MindMapNode, Language, translations } from '../types';
import { ExternalLink, Info, BookOpen, Clock, Layers, History } from 'lucide-react';

interface ExportCardProps {
  node: MindMapNode;
  language: Language;
}

export const ExportCard: React.FC<ExportCardProps> = ({ node, language }) => {
  const t = translations[language];
  const m = node.metadata;

  if (!m) return null;

  // Identify standard fields and "other" fields
  const standardFields = ['description', 'detailedBiography', 'historicalContext', 'importance', 'summary'];
  const otherFields = Object.entries(m).filter(([key, value]) => 
    !standardFields.includes(key) && 
    value !== undefined && 
    value !== null && 
    value !== '' &&
    (Array.isArray(value) ? value.length > 0 : true)
  );

  return (
    <div className="w-[800px] bg-white p-12 rounded-[40px] shadow-2xl border border-slate-100 font-sans text-slate-900">
      <div className="flex justify-between items-start mb-10">
        <div className="flex-1">
          <h2 className="text-5xl font-black tracking-tight mb-4">{node.title}</h2>
          {node.summary && (
            <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full inline-flex border border-indigo-100">
              <Info size={18} />
              <span className="font-bold text-lg">{node.summary}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10">
        {m.description && (
          <section>
            <div className="flex items-center gap-3 text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] mb-4">
              <Info size={14} />
              <span>{t.overview}</span>
            </div>
            <p className="text-2xl text-slate-600 leading-relaxed italic bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-inner">
              "{m.description}"
            </p>
          </section>
        )}

        {m.detailedBiography && (
          <section>
            <div className="flex items-center gap-3 text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] mb-4">
              <Layers size={14} />
              <span>{t.biography}</span>
            </div>
            <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">
              {m.detailedBiography}
            </p>
          </section>
        )}

        {m.historicalContext && (
          <section>
            <div className="flex items-center gap-3 text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] mb-4">
              <History size={14} />
              <span>{t.history}</span>
            </div>
            <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">
              {m.historicalContext}
            </p>
          </section>
        )}

        {m.importance && (
          <section>
            <div className="flex items-center gap-3 text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] mb-4">
              <ExternalLink size={14} />
              <span>{t.importance}</span>
            </div>
            <div className="text-xl text-slate-800 leading-relaxed border-l-8 border-emerald-400 pl-8 py-2">
              {m.importance}
            </div>
          </section>
        )}

        {/* Dynamic Metadata Section */}
        {otherFields.length > 0 && (
          <section className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-100">
            {otherFields.map(([key, value]) => (
              <div key={key} className="flex flex-col gap-2">
                <div className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{key}</div>
                {Array.isArray(value) ? (
                  <div className="flex flex-wrap gap-2">
                    {value.map((v, i) => (
                      <span key={i} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-md text-xs font-bold">
                        {v}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-lg font-bold text-slate-800">{String(value)}</div>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
};
