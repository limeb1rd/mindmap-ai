import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  Panel,
  BaseEdge,
  getBezierPath,
  EdgeProps,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Search, Maximize2, X, Info, Layers, BookOpen, ExternalLink, History, ChevronRight, ChevronDown, Focus, RefreshCw, Plus, Download, RotateCcw, Layout } from 'lucide-react';
import { MindMapNode as MindMapNodeComponent } from './MindMapNode';
import { MindMapNode, MindMapData, Language, DisplayMode, translations } from '../types';
import { cn } from '../lib/utils';
import { NodeDetails } from './NodeDetails';
import { ExportCard } from './ExportCard';
import { AnimatePresence, motion } from 'motion/react';

import { LayoutEngine, LayoutOptions } from '../services/layoutEngine';
import { UI_CONFIG } from '../config/ui';
import { useCamera } from '../hooks/layout/useCamera';

const nodeTypes = {
  mindmap: MindMapNodeComponent,
};

const MindMapEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const xDistance = Math.abs(targetX - sourceX);
  const curvature = Math.max(UI_CONFIG.CURVATURE.MIN, Math.min(UI_CONFIG.CURVATURE.MAX, xDistance / UI_CONFIG.CURVATURE.DIVISOR));

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature,
  });

  return (
    <BaseEdge 
      id={id} 
      path={edgePath} 
      markerEnd={markerEnd} 
      style={{
        ...style,
        strokeWidth: style.strokeWidth || 2,
        transition: UI_CONFIG.ANIMATIONS.EDGE_TRANSITION,
      }} 
    />
  );
};

interface Props {
  data: MindMapData;
  language: Language;
  displayMode: DisplayMode;
  onChange: (data: MindMapData) => void;
  onInit?: (instance: ReactFlowInstance) => void;
  onNodeSelect?: (node: MindMapNode) => void;
  selectedNodeDetails?: any;
  isDetailsLoading?: boolean;
}

const MindMapCanvas: React.FC<Props> = ({ 
  data, 
  language, 
  displayMode, 
  onChange, 
  onInit,
  onNodeSelect,
}) => {
  const [nodes, setNodes, internalOnNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  const nodePositions = useRef<Record<string, { x: number, y: number }>>({});
  const autoLayoutCache = useRef<Record<string, { x: number, y: number }>>({});
  const lastInteractionRef = useRef<{ type: 'toggle' | 'add' | 'delete' | 'edit' | 'load', id?: string }>({ type: 'load' });
  const hasInitialized = useRef(false);

  const { handleInit: cameraInit, centerNode, resetView, fitToView, rfInstance } = useCamera();

  const layoutEngine = useMemo(() => 
    new LayoutEngine(nodePositions.current, autoLayoutCache.current), 
  []);

  const branchColors = useMemo(() => [
    '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#f43f5e'
  ], []);

  const t = translations[language];

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    cameraInit(instance);
    if (onInit) onInit(instance);
  }, [cameraInit, onInit]);

  const onNodesChange = useCallback((changes: any) => {
    internalOnNodesChange(changes);
    changes.forEach((change: any) => {
      if (change.type === 'position' && change.position && change.id) {
        nodePositions.current[change.id] = change.position;
      }
    });
  }, [internalOnNodesChange]);

  const findNodeById = useCallback((nodes: MindMapNode[], id: string): MindMapNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedNodeId(id);
    
    // Use the instance to get the node position to avoid dependency on 'nodes' state
    const flowNode = rfInstance.current?.getNode(id);
    if (flowNode) {
      centerNode(flowNode.position.x, flowNode.position.y);
    }
    
    const node = id === 'root' 
      ? { id: 'root', title: data.title, children: data.children, type: 'root', summary: data.summary, expanded: true } as MindMapNode
      : findNodeById(data.children, id);
    
    if (node && onNodeSelect) onNodeSelect(node);
  }, [data, findNodeById, onNodeSelect, centerNode, rfInstance]);

  const handleEdit = useCallback((id: string, text: string, isRoot: boolean) => {
    lastInteractionRef.current = { type: 'edit', id };
    if (isRoot) onChange({ ...data, title: text });
    else {
      const updateNode = (nodes: MindMapNode[]): MindMapNode[] => {
        return nodes.map(node => {
          if (node.id === id) return { ...node, title: text };
          if (node.children) return { ...node, children: updateNode(node.children) };
          return node;
        });
      };
      onChange({ ...data, children: updateNode(data.children) });
    }
  }, [data, onChange]);

  const handleAdd = useCallback((parentId: string) => {
    lastInteractionRef.current = { type: 'add', id: parentId };
    const newNode: MindMapNode = {
      id: `node-${Date.now()}`,
      title: language === 'ru' ? 'Новое знание' : 'New knowledge',
      summary: '',
      type: 'item',
      expanded: false,
      children: []
    };
    if (parentId === 'root') {
      onChange({ ...data, children: [...data.children, newNode] });
    } else {
      const updateNode = (nodes: MindMapNode[]): MindMapNode[] => {
        return nodes.map(node => {
          if (node.id === parentId) return { ...node, children: [...(node.children || []), newNode], expanded: true };
          if (node.children) return { ...node, children: updateNode(node.children) };
          return node;
        });
      };
      onChange({ ...data, children: updateNode(data.children) });
    }
  }, [data, language, onChange]);

  const handleDelete = useCallback((id: string) => {
    lastInteractionRef.current = { type: 'delete', id };
    const deleteNode = (nodes: MindMapNode[]): MindMapNode[] => {
      return nodes.filter(node => node.id !== id).map(node => ({
        ...node,
        children: node.children ? deleteNode(node.children) : []
      }));
    };
    onChange({ ...data, children: deleteNode(data.children) });
  }, [data, onChange]);

  const handleToggleExpand = useCallback((id: string) => {
    lastInteractionRef.current = { type: 'toggle', id };
    const toggleNode = (nodes: MindMapNode[]): MindMapNode[] => {
      return nodes.map(node => {
        if (node.id === id) return { ...node, expanded: !node.expanded };
        if (node.children) return { ...node, children: toggleNode(node.children) };
        return node;
      });
    };
    onChange({ ...data, children: toggleNode(data.children) });
  }, [data, onChange]);

  // Stable reference for callbacks to prevent dependency loops in transformToFlow
  const callbacksRef = useRef({
    onEdit: handleEdit,
    onAdd: handleAdd,
    onDelete: handleDelete,
    onToggleExpand: handleToggleExpand,
    onSelect: handleSelect,
  });

  useEffect(() => {
    callbacksRef.current = {
      onEdit: handleEdit,
      onAdd: handleAdd,
      onDelete: handleDelete,
      onToggleExpand: handleToggleExpand,
      onSelect: handleSelect,
    };
  }, [handleEdit, handleAdd, handleDelete, handleToggleExpand, handleSelect]);

  const transformToFlow = useCallback((mindMap: MindMapData) => {
    return layoutEngine.transformToFlow(mindMap, {
      language,
      displayMode,
      selectedNodeId,
      branchColors,
      t: t as any,
      callbacks: {
        onEdit: (id, text, root) => callbacksRef.current.onEdit(id, text, root),
        onAdd: (parentId) => callbacksRef.current.onAdd(parentId),
        onDelete: (id) => callbacksRef.current.onDelete(id),
        onToggleExpand: (id) => callbacksRef.current.onToggleExpand(id),
        onSelect: (id) => callbacksRef.current.onSelect(id),
      }
    });
  }, [language, displayMode, selectedNodeId, branchColors, t, layoutEngine]);

  const onNodeDrag = useCallback((_: any, node: Node) => {
    const prevPos = nodePositions.current[node.id];
    if (!prevPos) {
      nodePositions.current[node.id] = node.position;
      return;
    }

    const deltaX = node.position.x - prevPos.x;
    const deltaY = node.position.y - prevPos.y;

    if (Math.abs(deltaX) < 0.1 && Math.abs(deltaY) < 0.1) return;

    // Find all descendants
    const getDescendants = (nodeId: string): string[] => {
      const childIds = edges.filter(e => e.source === nodeId && !e.id.startsWith('link-')).map(e => e.target);
      return [...childIds, ...childIds.flatMap(id => getDescendants(id))];
    };

    const descendantIds = getDescendants(node.id);
    if (descendantIds.length === 0) {
      nodePositions.current[node.id] = node.position;
      return;
    }

    setNodes((nds) => 
      nds.map((n) => {
        if (descendantIds.includes(n.id)) {
          const newPos = {
            x: n.position.x + deltaX,
            y: n.position.y + deltaY,
          };
          nodePositions.current[n.id] = newPos;
          return { ...n, position: newPos };
        }
        if (n.id === node.id) {
          return { ...n, position: node.position };
        }
        return n;
      })
    );

    nodePositions.current[node.id] = node.position;
  }, [edges, setNodes]);

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = transformToFlow(data);
    setNodes(newNodes);
    setEdges(newEdges);

    const interaction = lastInteractionRef.current;
    if (interaction.type === 'load' && !hasInitialized.current) {
      fitToView();
      hasInitialized.current = true;
    } else if (interaction.type === 'toggle' && interaction.id) {
      const node = newNodes.find(n => n.id === interaction.id);
      if (node) centerNode(node.position.x, node.position.y);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, transformToFlow]);

  useEffect(() => {
    if (!searchQuery) {
      setNodes((nds) => nds.map((n) => ({ ...n, style: { ...n.style, opacity: 1 } })));
      return;
    }
    const query = searchQuery.toLowerCase();
    setNodes((nds) => nds.map((n) => ({
      ...n,
      style: {
        ...n.style,
        opacity: n.data.label.toLowerCase().includes(query) ? 1 : 0.2
      }
    })));
  }, [searchQuery, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="w-full h-full bg-[#f8fafc] relative overflow-hidden flex">
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDrag={onNodeDrag}
          nodeTypes={nodeTypes}
          edgeTypes={{ mindmap: MindMapEdge }}
          fitView
          onInit={handleInit}
          minZoom={UI_CONFIG.ZOOM.MIN}
          maxZoom={UI_CONFIG.ZOOM.MAX}
        >
          <Background color="#e2e8f0" gap={40} size={1} variant="dots" />
          <Controls showInteractive={false} className="!bg-white !shadow-xl !rounded-2xl" />
          
          <Panel position="top-right" className="bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-2xl flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder={language === 'ru' ? 'Искать...' : 'Search...'}
                className="pl-9 pr-4 py-2 bg-slate-100/50 rounded-xl text-xs outline-none w-56"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  nodePositions.current = {};
                  autoLayoutCache.current = {};
                  const { nodes: newNodes, edges: newEdges } = transformToFlow(data);
                  setNodes(newNodes);
                  setEdges(newEdges);
                  fitToView();
                }}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-500"
                title={t.resetLayout || 'Reset layout'}
              >
                <RefreshCw size={18} />
              </button>
              <button 
                onClick={() => setIsExporting(true)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-500"
                title={t.export || 'Export'}
              >
                <Download size={18} />
              </button>
              <button 
                onClick={() => fitToView()}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-500"
                title={t.fitView || 'Fit view'}
              >
                <Maximize2 size={18} />
              </button>
            </div>
          </Panel>
        </ReactFlow>

        <AnimatePresence>
          {selectedNodeId && (
            <NodeDetails 
              node={selectedNodeId === 'root' ? { id: 'root', title: data.title, summary: data.summary, type: 'root', children: data.children } as MindMapNode : findNodeById(data.children, selectedNodeId)}
              language={language}
              onClose={() => setSelectedNodeId(null)}
              onSelectLink={handleSelect}
              findNodeTitle={(id) => findNodeById(data.children, id)?.title || id}
            />
          )}
          {isExporting && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsExporting(false)}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={e => e.stopPropagation()}
              >
                <ExportCard 
                  node={{ 
                    id: 'root', 
                    title: data.title, 
                    summary: data.summary, 
                    type: 'root', 
                    children: data.children,
                    metadata: { summary: data.summary } 
                  } as MindMapNode} 
                  language={language} 
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export const MindMapViewer: React.FC<Props> = (props) => {
  return (
    <ReactFlowProvider>
      <MindMapCanvas {...props} />
    </ReactFlowProvider>
  );
};
