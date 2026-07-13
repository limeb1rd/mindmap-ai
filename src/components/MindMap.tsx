import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Search, Maximize2, X, Info, Layers, BookOpen, ExternalLink, History, ChevronRight, ChevronDown, Focus, RefreshCw, Plus } from 'lucide-react';
import { MindMapNode as MindMapNodeComponent } from './MindMapNode';
import { MindMapNode as MindMapNodeData, MindMapData, Language, DisplayMode, translations } from '../types';
import { cn } from '../lib/utils';

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
  animated,
}: EdgeProps) => {
  const xDistance = Math.abs(targetX - sourceX);
  // Adaptive curvature: flatter for short distances, more pronounced for long ones
  const curvature = Math.max(0.1, Math.min(0.4, xDistance / 800));

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
        transition: 'stroke 0.3s ease, stroke-width 0.3s ease, d 0.7s cubic-bezier(0.2, 0, 0, 1)',
      }} 
    />
  );
};

const edgeTypes = {
  mindmap: MindMapEdge,
};

interface Props {
  data: MindMapData;
  language: Language;
  displayMode: DisplayMode;
  onChange: (data: MindMapData) => void;
  onInit?: (instance: ReactFlowInstance) => void;
  onNodeSelect?: (node: MindMapNodeData) => void;
  selectedNodeDetails?: any;
  isDetailsLoading?: boolean;
}

export const MindMapViewer: React.FC<Props> = ({ 
  data, 
  language, 
  displayMode, 
  onChange, 
  onInit,
  onNodeSelect,
  selectedNodeDetails,
  isDetailsLoading
}) => {
  const [nodes, setNodes, internalOnNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const nodePositions = React.useRef<Record<string, { x: number, y: number }>>({});
  const autoLayoutCache = React.useRef<Record<string, { x: number, y: number }>>({});
  const dragStartPositions = React.useRef<Record<string, { x: number, y: number }>>({});
  const lastInteractionRef = React.useRef<{ type: 'toggle' | 'add' | 'delete' | 'edit' | 'load', id?: string }>({ type: 'load' });

  // Optimization: Caches for layout properties
  const dimensionsCache = React.useRef<Map<string, { width: number, height: number, hash: string }>>(new Map());
  const footprintCache = React.useRef<Map<string, { footprint: number, hash: string }>>(new Map());

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    rfInstance.current = instance;
    if (onInit) onInit(instance);
  }, [onInit]);

  const findNodeById = useCallback((nodes: MindMapNodeData[], id: string): MindMapNodeData | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const findPathToNode = useCallback((nodes: MindMapNodeData[], targetId: string, path: string[] = []): string[] | null => {
    for (const node of nodes) {
      const currentPath = [...path, node.id];
      if (node.id === targetId) return currentPath;
      if (node.children) {
        const found = findPathToNode(node.children, targetId, currentPath);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const getDescendantIds = useCallback((nodeId: string): string[] => {
    const descendants: string[] = [];
    
    let rootNode: MindMapNodeData | null = null;
    if (nodeId === 'root') {
      rootNode = { id: 'root', title: data.title, children: data.children } as MindMapNodeData;
    } else {
      rootNode = findNodeById(data.children, nodeId);
    }

    if (!rootNode) return [];

    const collect = (n: MindMapNodeData) => {
      if (n.children) {
        n.children.forEach(child => {
          descendants.push(child.id);
          collect(child);
        });
      }
    };
    collect(rootNode);
    return descendants;
  }, [data, findNodeById]);

  const onNodeDragStart = useCallback((_: any, node: Node) => {
    const descendants = getDescendantIds(node.id);
    const nodesToTrack = [node.id, ...descendants];
    
    const positions: Record<string, { x: number, y: number }> = {};
    nodesToTrack.forEach(id => {
      const n = rfInstance.current?.getNode(id);
      if (n) {
        positions[id] = { ...n.position };
      }
    });
    dragStartPositions.current = positions;
  }, [getDescendantIds]);

  const onNodeDrag = useCallback((_: any, node: Node) => {
    const startPos = dragStartPositions.current[node.id];
    if (!startPos) return;

    const deltaX = node.position.x - startPos.x;
    const deltaY = node.position.y - startPos.y;

    const descendants = getDescendantIds(node.id);
    if (descendants.length === 0) return;
    
    setNodes((nds) =>
      nds.map((n) => {
        if (descendants.includes(n.id)) {
          const childStartPos = dragStartPositions.current[n.id];
          if (childStartPos) {
            const newPos = {
              x: childStartPos.x + deltaX,
              y: childStartPos.y + deltaY,
            };
            nodePositions.current[n.id] = newPos; // Update persistence ref
            return {
              ...n,
              position: newPos,
            };
          }
        }
        return n;
      })
    );
  }, [getDescendantIds, setNodes]);

  const onNodesChange = useCallback((changes: any) => {
    internalOnNodesChange(changes);
    changes.forEach((change: any) => {
      if (change.type === 'position' && change.position && change.id) {
        nodePositions.current[change.id] = change.position;
      }
    });
  }, [internalOnNodesChange]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<MindMapNodeData | null>(null);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const rfInstance = React.useRef<ReactFlowInstance | null>(null);

  const t = translations[language];

  const branchColors = useMemo(() => [
    '#6366f1', // indigo
    '#f43f5e', // rose
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ec4899', // pink
  ], []);

  const handleSelect = useCallback((id: string) => {
    if (id === 'root') {
      setSelectedNode({
        id: 'root',
        title: data.title,
        type: 'root',
        summary: data.summary,
        children: data.children,
        expanded: true
      });
      setSelectedPath(['root']);
      rfInstance.current?.setCenter(0, 0, { duration: 800, zoom: 0.8 });
      return;
    }
    const node = findNodeById(data.children, id);
    setSelectedNode(node);
    if (node && onNodeSelect) {
      onNodeSelect(node);
    }
    
    // Auto-center the selected node
    if (rfInstance.current) {
      const flowNode = rfInstance.current.getNode(id);
      if (flowNode) {
        rfInstance.current.setCenter(
          flowNode.position.x, 
          flowNode.position.y, 
          { duration: 800, zoom: Math.max(rfInstance.current.getZoom(), 0.7) }
        );
      }
    }

    // Highlight path
    const path = findPathToNode(data.children, id, ['root']);
    if (path) setSelectedPath(path);
  }, [data, findNodeById, findPathToNode]);

  const handleEdit = useCallback((id: string, text: string, isRoot: boolean) => {
    lastInteractionRef.current = { type: 'edit', id };
    if (isRoot) {
      onChange({ ...data, title: text });
      return;
    }

    const updateTree = (node: MindMapNodeData): MindMapNodeData => {
      if (node.id === id) return { ...node, title: text };
      if (node.children) {
        return { ...node, children: node.children.map(updateTree) };
      }
      return node;
    };
    onChange({
      ...data,
      children: data.children.map(updateTree)
    });
  }, [data, onChange]);

  const handleAdd = useCallback((parentId: string) => {
    lastInteractionRef.current = { type: 'add', id: parentId };
    const newId = `node-${Date.now()}`;
    const newNode: MindMapNodeData = { 
      id: newId, 
      title: language === 'ru' ? 'Новое знание' : 'New knowledge', 
      type: 'item',
      expanded: false,
      children: [] 
    };

    if (parentId === 'root') {
      onChange({
        ...data,
        children: [...data.children, newNode]
      });
      return;
    }

    const updateTree = (node: MindMapNodeData): MindMapNodeData => {
      if (node.id === parentId) {
        return {
          ...node,
          expanded: true,
          children: [...(node.children || []), newNode],
        };
      }
      if (node.children) {
        return { ...node, children: node.children.map(updateTree) };
      }
      return node;
    };
    onChange({
      ...data,
      children: data.children.map(updateTree)
    });
  }, [data, language, onChange]);

  const handleDelete = useCallback((id: string) => {
    lastInteractionRef.current = { type: 'delete', id };
    const updateTree = (node: MindMapNodeData): MindMapNodeData | null => {
      if (node.id === id) return null;
      if (node.children) {
        return {
          ...node,
          children: node.children.map(updateTree).filter((c): c is MindMapNodeData => c !== null),
        };
      }
      return node;
    };

    if (data.children.some(n => n.id === id)) {
      onChange({
        ...data,
        children: data.children.filter(n => n.id !== id)
      });
      return;
    }

    onChange({
      ...data,
      children: data.children.map(updateTree).filter((n): n is MindMapNodeData => n !== null)
    });
    
    // Clean up manual positions for deleted node and its descendants
    const deletedIds = [id, ...getDescendantIds(id)];
    deletedIds.forEach(deletedId => {
      delete nodePositions.current[deletedId];
      dimensionsCache.current.delete(deletedId);
      footprintCache.current.delete(deletedId);
    });

    if (selectedNode?.id === id) setSelectedNode(null);
  }, [data, onChange, selectedNode, getDescendantIds]);

  const handleToggleExpand = useCallback((id: string) => {
    lastInteractionRef.current = { type: 'toggle', id };
    
    // Auto-select and fetch details when expanding
    if (id !== 'root') {
      const nodeToToggle = findNodeById(data.children, id);
      if (nodeToToggle && !nodeToToggle.expanded) {
        handleSelect(id);
      }
    }

    const updateTree = (node: MindMapNodeData): MindMapNodeData => {
      if (node.id === id) return { ...node, expanded: !node.expanded };
      if (node.children) {
        return { ...node, children: node.children.map(updateTree) };
      }
      return node;
    };
    onChange({
      ...data,
      children: data.children.map(updateTree)
    });
  }, [data, onChange]);

  const transformToFlow = useCallback((mindMap: MindMapData) => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    
    const rootId = 'root';
    const MIN_V_GAP = 80; 
    const MIN_H_GAP = 120;

    // Helper to get center from top-left (for manual positions)
    const getCenterFromTopLeft = (pos: { x: number, y: number }, width: number, height: number) => ({
      x: pos.x + width / 2,
      y: pos.y + height / 2
    });

    // Helper to get top-left from center (for React Flow)
    const getTopLeftFromCenter = (center: { x: number, y: number }, width: number, height: number) => ({
      x: center.x - width / 2,
      y: center.y - height / 2
    });

    // Global max widths per depth for column alignment
    const maxLevelWidths = new Map<number, number>();
    
    const preCalculateLevelWidths = (node: MindMapNodeData, depth: number) => {
      const dims = getEstimatedDimensions(node, depth);
      const currentMax = maxLevelWidths.get(depth) || 0;
      maxLevelWidths.set(depth, Math.max(currentMax, dims.width));
      
      if (node.children) {
        node.children.forEach(child => preCalculateLevelWidths(child, depth + 1));
      }
    };

    // Adaptive Dynamic Gap Strategy
    const getGaps = (depth: number, childCount: number = 0, nodeHeight: number = 80) => {
      let v = Math.max(20, 100 / (depth + 1) + 15);
      const h = Math.max(60, 160 / (depth + 1) + 40);
      if (childCount > 3) v *= (1 + (childCount - 3) * 0.15);
      if (nodeHeight > 100) v *= 1.15;
      return { v, h };
    };

    const getEstimatedDimensions = (node: MindMapNodeData, depth: number) => {
      const cacheKey = node.id;
      const hash = `${node.title}-${node.summary}-${depth}-${node.children?.length || 0}`;
      const cached = dimensionsCache.current.get(cacheKey);
      
      if (cached && cached.hash === hash) {
        return { width: cached.width, height: cached.height };
      }

      const textLen = node.title.length;
      const charWidth = depth === 0 ? 9 : (depth === 1 ? 8 : 7);
      const horizontalPadding = depth === 0 ? 100 : (depth === 1 ? 80 : 40);
      const toggleButtonMargin = node.children && node.children.length > 0 ? 60 : 0;
      const maxWidth = depth === 0 ? 450 : 400;
      const preferredWidth = (textLen * charWidth) + horizontalPadding + toggleButtonMargin;
      const width = Math.min(maxWidth, Math.max(depth === 0 ? 220 : 160, preferredWidth));
      const contentWidth = width - horizontalPadding - toggleButtonMargin;
      const lines = Math.ceil((textLen * charWidth) / contentWidth);
      const lineHeight = depth === 0 ? 32 : (depth === 1 ? 24 : 20);
      const verticalPadding = depth === 0 ? 60 : (depth === 1 ? 50 : 35);
      const metadataHeight = node.summary ? 20 : 0;
      const height = Math.max(
        depth === 0 ? 120 : (depth === 1 ? 90 : 70), 
        (lines * lineHeight) + verticalPadding + metadataHeight
      );
      
      dimensionsCache.current.set(cacheKey, { width, height, hash });
      return { width, height };
    };

    const virtualRoot: MindMapNodeData = {
      id: rootId,
      title: mindMap.title,
      summary: mindMap.summary,
      children: mindMap.children || [],
      expanded: true,
      type: 'root'
    } as any;

    const subtreeHeights = new Map<string, number>();

    const calculateSubtreeFootprint = (node: MindMapNodeData, depth: number): number => {
      const childCount = node.children?.length || 0;
      const childrenHash = node.children?.map(c => c.id).join(',') || '';
      const nodeExpanded = (displayMode === 'overview' ? depth < 1 : (displayMode === 'study' ? depth < 2 : (node.expanded ?? true)));
      const hash = `${nodeExpanded}-${displayMode}-${childrenHash}-${childCount}`;
      
      const cached = footprintCache.current.get(node.id);
      if (cached && cached.hash === hash) {
        subtreeHeights.set(node.id, cached.footprint);
        return cached.footprint;
      }

      const { height: nodeHeight } = getEstimatedDimensions(node, depth);
      const { v: vGap } = getGaps(depth, childCount, nodeHeight);
      
      let shouldShowChildren = true;
      if (displayMode === 'overview') shouldShowChildren = depth < 2;
      else if (displayMode === 'study') shouldShowChildren = depth < 3;
      else shouldShowChildren = node.expanded ?? true;

      let footprint = 0;
      if (!shouldShowChildren || !node.children || node.children.length === 0) {
        footprint = nodeHeight + vGap;
      } else {
        const childrenFootprint = node.children.reduce((acc, child) => {
          return acc + calculateSubtreeFootprint(child, depth + 1);
        }, 0);
        footprint = Math.max(childrenFootprint, nodeHeight + vGap);
      }

      subtreeHeights.set(node.id, footprint);
      footprintCache.current.set(node.id, { footprint, hash });
      return footprint;
    };

    // Dynamic X-offsets based on actual node widths of previous levels
    const getLevelX = (depth: number, side: 'left' | 'right') => {
      let x = 0;
      for (let i = 0; i < depth; i++) {
        const levelWidth = maxLevelWidths.get(i) || 200;
        const gap = getGaps(i, 0).h; 
        x += levelWidth + gap;
      }
      return side === 'right' ? x : -x;
    };

    const positionNode = (
      node: MindMapNodeData, 
      centerX: number, 
      centerY: number, 
      depth: number, 
      side: 'left' | 'right',
      color: string
    ) => {
      const dimensions = getEstimatedDimensions(node, depth);
      const childCount = node.children?.length || 0;
      const { v: vGap } = getGaps(depth, childCount, dimensions.height);
      const footprint = subtreeHeights.get(node.id) || (dimensions.height + vGap);
      
      const manualPos = nodePositions.current[node.id];
      const isLocked = !!manualPos;
      let finalCenter = { x: centerX, y: centerY };

      if (manualPos) {
        finalCenter = getCenterFromTopLeft(manualPos, dimensions.width, dimensions.height);
      } else {
        autoLayoutCache.current[node.id] = getTopLeftFromCenter(finalCenter, dimensions.width, dimensions.height);
      }

      newNodes.push({
        id: node.id,
        type: 'mindmap',
        selected: selectedNode?.id === node.id,
        data: { 
          ...node,
          label: node.title,
          summary: node.metadata?.description || node.summary,
          color,
          depth,
          side,
          isExpanded: node.expanded,
          isLocked,
          hasChildren: node.children && node.children.length > 0,
          onEdit: (id: string, text: string) => handleEdit(id, text, false),
          onAdd: handleAdd,
          onDelete: handleDelete,
          onToggleExpand: handleToggleExpand,
          onSelect: handleSelect,
          t: { edit: t.editText, add: t.addNode, delete: t.deleteNode },
          width: dimensions.width,
          height: dimensions.height,
          centerX: finalCenter.x,
          centerY: finalCenter.y
        },
        position: getTopLeftFromCenter(finalCenter, dimensions.width, dimensions.height),
        style: { 
          transition: 'transform 0.7s cubic-bezier(0.2, 0, 0, 1), opacity 0.5s ease-out',
          zIndex: depth === 0 ? 100 : 10 - depth
        }
      });

      let shouldShowChildren = true;
      if (displayMode === 'overview') shouldShowChildren = depth < 2;
      else if (displayMode === 'study') shouldShowChildren = depth < 3;
      else shouldShowChildren = node.expanded ?? true;

      if (shouldShowChildren && node.children && node.children.length > 0) {
        let currentChildY = centerY - (footprint / 2);
        const nextX = getLevelX(depth + 1, side);
        
        node.children.forEach((child, index) => {
          const childFootprint = subtreeHeights.get(child.id) || 0;
          const childYCenter = currentChildY + (childFootprint / 2);
          
          newEdges.push({
            id: `e-${node.id}-${child.id}`,
            source: node.id,
            target: child.id,
            sourceHandle: side === 'right' ? 's-right' : 's-left',
            targetHandle: side === 'right' ? 't-left' : 't-right',
            type: 'mindmap',
            style: { stroke: color, strokeWidth: Math.max(1, 4 - depth) },
            animated: false,
          });

          const childColor = depth === 0 ? branchColors[index % branchColors.length] : color;
          positionNode(child, nextX, childYCenter, depth + 1, side, childColor);
          currentChildY += childFootprint;
        });
      }
    };

    // Root node placement logic
    preCalculateLevelWidths(virtualRoot, 0);
    calculateSubtreeFootprint(virtualRoot, 0);
    const rootDimensions = getEstimatedDimensions(virtualRoot, 0);
    
    // Position root at 0,0
    const manualRootPos = nodePositions.current[rootId];
    const isRootLocked = !!manualRootPos;
    let rootCenter = { x: 0, y: 0 };
    if (manualRootPos) {
      rootCenter = getCenterFromTopLeft(manualRootPos, rootDimensions.width, rootDimensions.height);
    }

    newNodes.push({
      id: rootId,
      type: 'mindmap',
      selected: selectedNode?.id === rootId,
      data: { 
        label: virtualRoot.title,
        type: 'root',
        isRoot: true,
        isLocked: isRootLocked,
        summary: virtualRoot.summary,
        depth: 0,
        onEdit: (id: string, text: string) => handleEdit(id, text, true),
        onAdd: () => handleAdd(rootId),
        onDelete: () => {},
        onToggleExpand: () => {},
        onSelect: handleSelect,
        t: { edit: t.editText, add: t.addNode, delete: t.deleteNode },
        width: rootDimensions.width,
        height: rootDimensions.height,
        centerX: rootCenter.x,
        centerY: rootCenter.y
      },
      position: getTopLeftFromCenter(rootCenter, rootDimensions.width, rootDimensions.height),
      style: { 
        transition: 'transform 0.7s cubic-bezier(0.2, 0, 0, 1)',
        zIndex: 1000
      }
    });

    // Distribute root children more intelligently by balancing subtree footprints
    const rootChildren = [...(virtualRoot.children || [])];
    const leftChildren: MindMapNodeData[] = [];
    const rightChildren: MindMapNodeData[] = [];
    
    let leftTotalFootprint = 0;
    let rightTotalFootprint = 0;

    // Sort by footprint to place largest subtrees first for better packing
    rootChildren.sort((a, b) => (subtreeHeights.get(b.id) || 0) - (subtreeHeights.get(a.id) || 0));

    rootChildren.forEach((child) => {
      const footprint = subtreeHeights.get(child.id) || 0;
      if (rightTotalFootprint <= leftTotalFootprint) {
        rightChildren.push(child);
        rightTotalFootprint += footprint;
      } else {
        leftChildren.push(child);
        leftTotalFootprint += footprint;
      }
    });

    let currentRightY = rootCenter.y - (rightTotalFootprint / 2);
    const nextRightX = getLevelX(1, 'right');
    rightChildren.forEach((child, i) => {
      const childFootprint = subtreeHeights.get(child.id) || 0;
      const childYCenter = currentRightY + (childFootprint / 2);
      
      const branchColor = branchColors[i % branchColors.length];
      
      newEdges.push({
        id: `e-root-${child.id}`,
        source: rootId,
        target: child.id,
        sourceHandle: 's-right',
        targetHandle: 't-left',
        type: 'mindmap',
        style: { stroke: branchColor, strokeWidth: 4 },
        animated: false,
      });

      positionNode(child, nextRightX, childYCenter, 1, 'right', branchColor);
      currentRightY += childFootprint;
    });

    let currentLeftY = rootCenter.y - (leftTotalFootprint / 2);
    const nextLeftX = getLevelX(1, 'left');
    leftChildren.forEach((child, i) => {
      const childFootprint = subtreeHeights.get(child.id) || 0;
      const childYCenter = currentLeftY + (childFootprint / 2);
      
      const branchColor = branchColors[(i + rightChildren.length) % branchColors.length];
      
      newEdges.push({
        id: `e-root-${child.id}`,
        source: rootId,
        target: child.id,
        sourceHandle: 's-left',
        targetHandle: 't-right',
        type: 'mindmap',
        style: { stroke: branchColor, strokeWidth: 4 },
        animated: false,
      });

      positionNode(child, nextLeftX, childYCenter, 1, 'left', branchColor);
      currentLeftY += childFootprint;
    });

    // FINAL PASS: Collision Detection & Resolution (Optimized for density)
    for (let i = 0; i < 3; i++) {
      let collisionsFound = false;
      for (let j = 0; j < newNodes.length; j++) {
        for (let k = j + 1; k < newNodes.length; k++) {
          const n1 = newNodes[j];
          const n2 = newNodes[k];
          
          const w1 = n1.data.width as number;
          const h1 = n1.data.height as number;
          const w2 = n2.data.width as number;
          const h2 = n2.data.height as number;

          const bufferH = 40;
          const bufferV = 30;

          const b1 = {
            left: (n1.data.centerX as number) - w1 / 2 - bufferH / 2,
            right: (n1.data.centerX as number) + w1 / 2 + bufferH / 2,
            top: (n1.data.centerY as number) - h1 / 2 - bufferV / 2,
            bottom: (n1.data.centerY as number) + h1 / 2 + bufferV / 2,
          };
          
          const b2 = {
            left: (n2.data.centerX as number) - w2 / 2 - bufferH / 2,
            right: (n2.data.centerX as number) + w2 / 2 + bufferH / 2,
            top: (n2.data.centerY as number) - h2 / 2 - bufferV / 2,
            bottom: (n2.data.centerY as number) + h2 / 2 + bufferV / 2,
          };

          const isOverlapping = !(b1.right < b2.left || b1.left > b2.right || b1.bottom < b2.top || b1.top > b2.bottom);

          if (isOverlapping) {
            collisionsFound = true;
            const dx = (n1.data.centerX as number) - (n2.data.centerX as number);
            const dy = (n1.data.centerY as number) - (n2.data.centerY as number);
            
            const overlapX = Math.min(b1.right - b2.left, b2.right - b1.left);
            const overlapY = Math.min(b1.bottom - b2.top, b2.bottom - b1.top);

            if (overlapY < overlapX * 1.2) {
              const moveY = (overlapY + 10) / 2;
              const dirY = dy >= 0 ? 1 : -1;
              (n1.data.centerY as any) += moveY * dirY;
              (n2.data.centerY as any) -= moveY * dirY;
            } else {
              const moveX = (overlapX + 10) / 2;
              const dirX = dx >= 0 ? 1 : -1;
              (n1.data.centerX as any) += moveX * dirX;
              (n2.data.centerX as any) -= moveX * dirX;
            }
          }
        }
      }
      if (!collisionsFound) break;
    }

    // Apply resolved centers to positions
    newNodes.forEach(n => {
      n.position = getTopLeftFromCenter(
        { x: n.data.centerX as number, y: n.data.centerY as number },
        n.data.width as number,
        n.data.height as number
      );
    });


    // Second pass to add semantic cross-links (Knowledge Graph)
    const allNodesList: MindMapNodeData[] = [];
    const collectNodes = (n: MindMapNodeData) => {
      allNodesList.push(n);
      n.children?.forEach(collectNodes);
    };
    mindMap.children.forEach(collectNodes);

    allNodesList.forEach(node => {
      if (node.links) {
        node.links.forEach((link, idx) => {
          // Check if target exists in our map to avoid broken edges
          const targetNode = newNodes.find(n => n.id === link.targetId);
          if (targetNode) {
            newEdges.push({
              id: `edge-link-${node.id}-${link.targetId}-${idx}`,
              source: node.id,
              target: link.targetId,
              label: link.label,
              type: 'smoothstep',
              animated: true,
              style: { 
                stroke: '#94a3b8', 
                strokeWidth: 2, 
                strokeDasharray: '4,4',
                opacity: 0.4
              },
              labelStyle: { fill: '#64748b', fontWeight: 600, fontSize: 10 },
              labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
              labelBgPadding: [4, 2],
              labelBgBorderRadius: 4,
            });
          }
        });
      }
    });

    return { nodes: newNodes, edges: newEdges };
  }, [t, handleAdd, handleDelete, handleEdit, handleToggleExpand, handleSelect, branchColors, displayMode, selectedPath, selectedNode]);

  const prevDataRef = React.useRef<string>('');

  useEffect(() => {
    const dataString = JSON.stringify(data);
    const isStructureChanged = dataString !== prevDataRef.current;
    
    const { nodes: newNodes, edges: newEdges } = transformToFlow(data);
    
    setNodes((currentNodes) => {
      const nextNodes = newNodes.map((newNode) => {
        const existingNode = currentNodes.find((n) => n.id === newNode.id);
        const isManual = nodePositions.current[newNode.id];
        const isDragging = existingNode?.dragging;
        
        // Disable transitions during dragging for responsiveness
        if (isDragging && newNode.style) {
          newNode.style = {
            ...newNode.style,
            transition: 'none'
          };
        }
        
        if (existingNode) {
          // If manually positioned, keep that position
          if (isManual) {
            return {
              ...newNode,
              position: existingNode.position,
              measured: existingNode.measured,
            };
          }

          // Deep compare data and position to avoid unnecessary object changes
          const posChanged = Math.abs(existingNode.position.x - newNode.position.x) > 0.1 || 
                           Math.abs(existingNode.position.y - newNode.position.y) > 0.1;
          
          // Selection and data comparison
          const dataChanged = JSON.stringify(existingNode.data) !== JSON.stringify(newNode.data);
          const selectionChanged = existingNode.selected !== newNode.selected;
          
          if (!posChanged && !dataChanged && !selectionChanged) {
            return existingNode;
          }
        }
        return newNode;
      });

      // If nothing actually changed (rare but possible), return same array
      if (nextNodes.length === currentNodes.length && nextNodes.every((n, i) => n === currentNodes[i])) {
        return currentNodes;
      }
      
      return nextNodes;
    });

    setEdges((currentEdges) => {
      // Use stable edge comparison to avoid unnecessary re-renders
      const newEdgeIds = new Set(newEdges.map(e => e.id));
      
      // Filter out edges that no longer exist
      const existingEdges = currentEdges.filter(e => newEdgeIds.has(e.id));
      const existingEdgeIds = new Set(existingEdges.map(e => e.id));
      
      // Add new edges
      const edgesToAdd = newEdges.filter(e => !existingEdgeIds.has(e.id));
      
      // Update existing edges properties (animated, style, data) while keeping their identity
      const updatedEdges = existingEdges.map(e => {
        const freshEdge = newEdges.find(ne => ne.id === e.id)!;
        return { 
          ...e, 
          style: freshEdge.style, 
          animated: freshEdge.animated,
          data: freshEdge.data,
          // Preserve source/target just in case
          source: freshEdge.source,
          target: freshEdge.target
        };
      });
      
      return [...updatedEdges, ...edgesToAdd];
    });
    
    if (isStructureChanged) {
      prevDataRef.current = dataString;
      
      if (rfInstance.current) {
        const interaction = lastInteractionRef.current;
        
        if (interaction.type === 'load') {
          // Full fit for initial load
          setTimeout(() => {
            rfInstance.current?.fitView({ duration: 800, padding: 0.3 });
          }, 50);
        } else if (interaction.type === 'toggle' && interaction.id) {
          // Intelligent camera management for toggling:
          // 1. If the expanded branch fits in current viewport, don't change zoom.
          // 2. If it doesn't fit, zoom out only as much as needed.
          const rfNodes = rfInstance.current.getNodes();
          const targetNode = rfNodes.find(n => n.id === interaction.id);
          
          if (targetNode) {
            // Identify all nodes in the affected subtree
            const edges = rfInstance.current.getEdges();
            const subtreeIds = new Set([interaction.id]);
            const stack = [interaction.id];
            
            while (stack.length > 0) {
              const currentId = stack.pop()!;
              for (const edge of edges) {
                if (edge.source === currentId && !subtreeIds.has(edge.target)) {
                  subtreeIds.add(edge.target);
                  stack.push(edge.target);
                }
              }
            }

            const subtreeNodes = rfNodes.filter(n => subtreeIds.has(n.id));
            
            // Calculate bounding box of the subtree
            const bounds = subtreeNodes.reduce((acc, node) => {
              const width = node.measured?.width || 0;
              const height = node.measured?.height || 0;
              return {
                x: Math.min(acc.x, node.position.x),
                y: Math.min(acc.y, node.position.y),
                x2: Math.max(acc.x2, node.position.x + width),
                y2: Math.max(acc.y2, node.position.y + height),
              };
            }, { 
              x: targetNode.position.x, 
              y: targetNode.position.y, 
              x2: targetNode.position.x + (targetNode.measured?.width || 0), 
              y2: targetNode.position.y + (targetNode.measured?.height || 0) 
            });

            const currentZoom = rfInstance.current.getZoom();
            const container = document.querySelector('.react-flow') as HTMLElement;
            
            if (container) {
              const { clientWidth, clientHeight } = container;
              const padding = 100; // Comfortable margin
              
              const neededWidth = (bounds.x2 - bounds.x) + padding * 2;
              const neededHeight = (bounds.y2 - bounds.y) + padding * 2;
              
              // Calculate zoom needed to fit the subtree
              const fitZoom = Math.min(clientWidth / neededWidth, clientHeight / neededHeight);
              
              // Intelligent rule: Never zoom in more than current, but zoom out if needed.
              const targetZoom = Math.min(currentZoom, fitZoom);
              
              const centerX = bounds.x + (bounds.x2 - bounds.x) / 2;
              const centerY = bounds.y + (bounds.y2 - bounds.y) / 2;

              rfInstance.current.setCenter(centerX, centerY, { duration: 1000, zoom: targetZoom });
            }
          }
        } else if (interaction.type === 'add' && interaction.id) {
          // Focus on the new addition smoothly
          setTimeout(() => {
            if (interaction.id && rfInstance.current) {
              const parentNode = rfInstance.current.getNode(interaction.id);
              if (parentNode) {
                const zoom = rfInstance.current.getZoom();
                rfInstance.current.setCenter(
                  parentNode.position.x, 
                  parentNode.position.y, 
                  { duration: 1000, zoom: Math.max(zoom, 0.7) }
                );
              }
            }
          }, 100);
        }
        
        // Reset interaction for next update
        lastInteractionRef.current = { type: 'load' };
      }
    }
  }, [data, transformToFlow, setNodes, setEdges]);

  // Handle search highlighting
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
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          onInit={handleInit}
          minZoom={0.05}
          maxZoom={2}
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background 
            color="#e2e8f0" 
            gap={40} 
            size={1} 
            variant="dots" 
          />
          <Controls showInteractive={false} className="!bg-white !border-slate-200 !shadow-xl !rounded-2xl overflow-hidden" />
          
          <Panel position="top-right" className="bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-2xl flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder={language === 'ru' ? 'Искать в знаниях...' : 'Search knowledge...'}
                className="pl-9 pr-4 py-2 bg-slate-100/50 border-none rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 w-56 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  nodePositions.current = {}; // Clear manual positions
                  autoLayoutCache.current = {}; // Clear layout cache
                  prevDataRef.current = ''; // Force full recalculation
                  const { nodes: newNodes, edges: newEdges } = transformToFlow(data);
                  setNodes(newNodes);
                  setEdges(newEdges);
                  setTimeout(() => rfInstance.current?.fitView({ duration: 800, padding: 0.3 }), 50);
                }}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors flex items-center gap-2"
                title={language === 'ru' ? 'Выровнять карту' : 'Reset layout'}
              >
                <RefreshCw size={18} />
              </button>
              <button 
                onClick={() => rfInstance.current?.fitView({ duration: 800, padding: 0.3 })}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
                title={language === 'ru' ? 'Центрировать' : 'Fit view'}
              >
                <Focus size={18} />
              </button>
            </div>
          </Panel>

          <Panel position="bottom-center" className="mb-6">
            <div className="bg-white/80 backdrop-blur-md px-6 py-2 rounded-full border border-slate-200 shadow-xl text-[10px] font-bold text-slate-500 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-900 shadow-sm" /> 
                <span>{language === 'ru' ? 'Ядро' : 'Core'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-white border-2 border-indigo-500 shadow-sm" /> 
                <span>{language === 'ru' ? 'Раздел' : 'Branch'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-50 border border-slate-200 shadow-sm" /> 
                <span>{language === 'ru' ? 'Деталь' : 'Detail'}</span>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      <div className={cn(
        "fixed right-0 top-0 h-full w-[380px] bg-white border-l border-slate-200 shadow-2xl transition-transform duration-500 z-50 flex flex-col transform",
        selectedNode ? "translate-x-0" : "translate-x-full"
      )}>
        {selectedNode && (
          <>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <BookOpen size={20} />
                </div>
                <h3 className="font-bold text-slate-900 text-lg leading-tight">{selectedNode.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-20">
              {isDetailsLoading ? (
                <div className="space-y-8 animate-pulse">
                  <div className="h-12 bg-slate-100 rounded-2xl w-3/4" />
                  <div className="space-y-3">
                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                    <div className="h-24 bg-slate-100 rounded-2xl w-full" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                    <div className="h-32 bg-slate-100 rounded-2xl w-full" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                    <div className="h-20 bg-slate-100 rounded-2xl w-full" />
                  </div>
                </div>
              ) : (
                (() => {
                  const node = { ...selectedNode, metadata: { ...selectedNode.metadata, ...selectedNodeDetails?.metadata, ...selectedNodeDetails }, links: selectedNodeDetails?.links || selectedNode.links };
                  return (
                    <>
                      {/* Universal Header Attributes */}
                      {(node.metadata?.birth || node.summary) && (
                        <div className="bg-slate-100 px-4 py-3 rounded-2xl border border-slate-200 inline-block">
                          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                            {node.type || t.lifespan}
                          </span>
                          <span className="text-base font-bold text-slate-700">
                            {node.summary || (node.metadata?.birth && `${node.metadata.birth} — ${node.metadata.death || '?'}`)}
                          </span>
                        </div>
                      )}

                      {/* Description */}
                      {(node.metadata?.description || node.metadata?.summary) && (
                        <section className="space-y-3">
                          <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                            <Layers size={12} />
                            <span>{t.overview}</span>
                          </div>
                          <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100 italic shadow-sm">
                            "{node.metadata.description || node.metadata.summary || node.summary}"
                          </p>
                        </section>
                      )}

                      {/* Main Content Blocks */}
                      {node.metadata?.detailedBiography && (
                        <section className="space-y-3">
                          <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                            <BookOpen size={12} />
                            <span>{t.biography}</span>
                          </div>
                          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                            {node.metadata.detailedBiography}
                          </p>
                        </section>
                      )}

                      {/* Context / History */}
                      {node.metadata?.historicalContext && (
                        <section className="space-y-3">
                          <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                            <History size={12} />
                            <span>{t.history}</span>
                          </div>
                          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                            {node.metadata.historicalContext}
                          </p>
                        </section>
                      )}

                      {/* Significance */}
                      {node.metadata?.importance && (
                        <section className="space-y-3">
                          <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                            <ExternalLink size={12} />
                            <span>{t.importance}</span>
                          </div>
                          <div className="text-slate-700 text-sm leading-relaxed border-l-4 border-indigo-400 pl-4 py-2 bg-indigo-50/30 rounded-r-xl">
                            {node.metadata.importance}
                          </div>
                        </section>
                      )}

                      {/* Dynamic Metadata List */}
                      {Object.entries(node.metadata || {})
                        .filter(([key, value]) => 
                          !['description', 'detailedBiography', 'historicalContext', 'importance', 'summary', 'birth', 'death'].includes(key) &&
                          value !== undefined && value !== null && value !== '' &&
                          (Array.isArray(value) ? value.length > 0 : true)
                        )
                        .map(([key, value]) => (
                          <section key={key} className="space-y-3">
                            <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                              <Info size={12} />
                              <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                            </div>
                            {Array.isArray(value) ? (
                              <div className="flex flex-wrap gap-2">
                                {value.map((item, idx) => (
                                  <span key={idx} className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full text-xs text-slate-600 font-medium shadow-sm">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="text-slate-700 text-sm leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                {String(value)}
                              </div>
                            )}
                          </section>
                        ))}

                      {/* Navigation Links */}
                      {node.links && node.links.length > 0 && (
                        <section className="space-y-3">
                          <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                            <ExternalLink size={12} />
                            <span>{t.relatedNodes}</span>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {node.links.map((link, idx) => (
                              <button 
                                key={idx}
                                onClick={() => handleSelect(link.targetId)}
                                className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50 transition-all text-left group"
                              >
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">{link.label || 'Link'}</span>
                                  <span className="text-xs font-medium text-slate-700">
                                    {findNodeById(data.children, link.targetId)?.title || link.targetId}
                                  </span>
                                </div>
                                <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                              </button>
                            ))}
                          </div>
                        </section>
                      )}
                    </>
                  );
                })()
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span>{t.nodeType}: {selectedNode.type}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
