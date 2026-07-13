import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Edit2, Plus, Trash2, ChevronRight, ChevronDown, Info, Pin } from 'lucide-react';
import { MindMapNodeType } from '../types';
import { cn } from '../lib/utils';

type NodeData = {
  label: string;
  type: MindMapNodeType;
  color?: string;
  isRoot?: boolean;
  isExpanded?: boolean;
  hasChildren?: boolean;
  summary?: string;
  details?: string;
  isLocked?: boolean;
  birth?: string;
  death?: string;
  era?: string;
  nationality?: string;
  movement?: string;
  features?: string[];
  instruments?: string[];
  works?: string[];
  importance?: string;
  detailedBiography?: string;
  historicalContext?: string;
  depth: number;
  side?: 'left' | 'right';
  onEdit: (id: string, text: string) => void;
  onAdd: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  t: {
    edit: string;
    add: string;
    delete: string;
  };
};

export const MindMapNode = React.memo(({ data, id, selected }: NodeProps<Node<NodeData>>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.label);

  useEffect(() => {
    setText(data.label);
  }, [data.label]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsEditing(false);
    data.onEdit(id, text);
  };

  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onSelect(id);
  };

  const branchColor = data.color || '#64748b';
  
  const getStyles = () => {
    const selectedStyle = selected ? "ring-4 ring-indigo-500/40 border-indigo-500 z-30" : "";
    
    // Level 1: Root
    if (data.depth === 0) {
      return cn(
        "bg-gradient-to-br from-indigo-500 to-purple-600 border-none text-white shadow-2xl scale-125 min-w-[200px] py-8 px-14 rounded-full font-black tracking-tight",
        selectedStyle
      );
    }

    // Level 2: Main Branches
    if (data.depth === 1) {
      return cn(
        "bg-white border-2 text-slate-900 shadow-xl min-w-[200px] py-5 px-12 rounded-[2.5rem] font-extrabold uppercase tracking-widest",
        selectedStyle
      );
    }

    // Level 3: Entities/Categories
    if (data.depth === 2) {
      return cn(
        "bg-white/90 border-2 text-slate-900 shadow-md min-w-[160px] py-3 px-6 rounded-2xl font-bold backdrop-blur-sm",
        selectedStyle
      );
    }

    // Level 4: Groups/Sub-categories
    if (data.depth === 3) {
      return cn(
        "bg-white/80 border text-slate-600 shadow-sm min-w-[140px] py-2 px-4 rounded-xl font-semibold italic backdrop-blur-sm",
        selectedStyle
      );
    }

    // Level 5+: Leaves/Items
    return cn(
      "bg-white/70 border border-slate-200 text-slate-500 shadow-sm min-w-[120px] py-1.5 px-3 rounded-lg text-[11px] font-medium backdrop-blur-sm",
      selectedStyle
    );
  };

  const getFontSize = () => {
    if (data.depth === 0) return "text-lg";
    if (data.depth === 1) return "text-sm";
    if (data.depth === 2) return "text-xs";
    return "text-[10px]";
  };

  return (
    <div 
      className={cn(
        "group relative border transition-all duration-300 flex items-center justify-center cursor-pointer select-none",
        getStyles()
      )}
      style={{ 
        borderColor: data.isRoot ? undefined : (selected ? undefined : branchColor),
      }}
      onClick={handleNodeClick}
    >
      <Handle id="t-top" type="target" position={Position.Top} className="opacity-0 w-0 h-0" />
      <Handle id="t-bottom" type="target" position={Position.Bottom} className="opacity-0 w-0 h-0" />
      <Handle id="t-left" type="target" position={Position.Left} className="opacity-0 w-0 h-0" />
      <Handle id="t-right" type="target" position={Position.Right} className="opacity-0 w-0 h-0" />
      
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center justify-center min-h-[1.25rem]">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="w-full">
              <input
                autoFocus
                className={cn(
                  "w-full bg-transparent border-none outline-none text-center font-bold",
                  data.isRoot ? "text-white" : "text-slate-800",
                  getFontSize()
                )}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={() => handleSubmit()}
              />
            </form>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center justify-center gap-1.5">
                {data.isLocked && (
                  <Pin size={12} className={cn(
                    "rotate-45",
                    data.depth === 0 ? "text-white/70" : "text-slate-400"
                  )} />
                )}
                <span className={cn(
                  "font-bold text-center leading-tight transition-colors whitespace-pre-wrap break-words w-full",
                  getFontSize(),
                  data.depth === 0 ? "text-white" : "text-slate-800"
                )}>
                  {data.label}
                </span>
              </div>
              
              {/* Universal Metadata Badge (e.g. Years, Categories, Short labels) */}
              {data.summary && data.depth > 0 && (
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-1 leading-none max-w-[150px] truncate">
                  {data.summary}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expand/Collapse Toggle Button */}
      {data.hasChildren && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            data.onToggleExpand(id);
          }}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border-2 flex items-center justify-center shadow-xl transition-all hover:scale-110 z-50 group/expand",
            // Positioned outside with a clear gap (20px) to avoid overlap
            data.side === 'left' ? "-left-14" : "-right-14",
            data.isExpanded 
              ? "text-indigo-600 border-indigo-400 bg-indigo-50" 
              : "text-slate-500 border-slate-200 bg-white"
          )}
        >
          {data.isExpanded 
            ? <ChevronDown size={18} strokeWidth={3} className="transition-transform" /> 
            : <Plus size={18} strokeWidth={3} className="transition-transform group-hover/expand:rotate-90" />
          }
        </button>
      )}

      {/* Actions */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all bg-white/95 backdrop-blur-sm p-1 rounded-full shadow-lg border border-slate-100 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          className="p-1.5 hover:bg-slate-50 rounded-full text-slate-600 transition-colors"
          title={data.t.edit}
        >
          <Edit2 size={10} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); data.onAdd(id); }}
          className="p-1.5 hover:bg-emerald-50 rounded-full text-emerald-600 transition-colors"
          title={data.t.add}
        >
          <Plus size={10} />
        </button>
        {!data.isRoot && (
          <button
            onClick={(e) => { e.stopPropagation(); data.onDelete(id); }}
            className="p-1.5 hover:bg-rose-50 rounded-full text-rose-600 transition-colors"
            title={data.t.delete}
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>

      <Handle id="s-top" type="source" position={Position.Top} className="opacity-0 w-0 h-0" />
      <Handle id="s-bottom" type="source" position={Position.Bottom} className="opacity-0 w-0 h-0" />
      <Handle id="s-left" type="source" position={Position.Left} className="opacity-0 w-0 h-0" />
      <Handle id="s-right" type="source" position={Position.Right} className="opacity-0 w-0 h-0" />
    </div>
  );
});
