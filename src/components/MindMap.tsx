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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Search, Maximize2, X, Info, Layers, BookOpen, ExternalLink, History, ChevronRight, ChevronDown, Focus, RefreshCw } from 'lucide-react';
import { MindMapNode as MindMapNodeComponent } from './MindMapNode';
import { MindMapNode as MindMapNodeData, MindMapData, Language, DisplayMode, translations } from '../types';
import { cn } from '../lib/utils';

const nodeTypes = {
  mindmap: MindMapNodeComponent,
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
    if (selectedNode?.id === id) setSelectedNode(null);
  }, [data, onChange, selectedNode]);

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
    const MIN_V_GAP = 60; // Minimum 40px as requested, 60px for extra "air"
    const MIN_H_GAP = 100; // Minimum 80px as requested, 100px for extra "air"

    const getEstimatedDimensions = (node: MindMapNodeData, depth: number) => {
      const textLen = node.title.length;
      const charWidth = 9; 
      const horizontalPadding = depth === 0 ? 140 : (depth === 1 ? 120 : 80);
      const toggleButtonMargin = 70;
      
      const width = Math.max(depth === 0 ? 320 : 240, (textLen * charWidth) + horizontalPadding + toggleButtonMargin);
      
      const baseHeights = {
        0: 140, // Root
        1: 110, // Strategic
        2: 95,  // Tactical
        3: 85,  // Descriptive
        4: 75,  // Detailed
        5: 70   // Atomic
      };
      const nodeHeight = baseHeights[depth as keyof typeof baseHeights] || 70;
      
      return { width, height: nodeHeight };
    };

    const getSubtreeHeight = (node: MindMapNodeData, depth: number): number => {
      let shouldShowChildren = true;
      if (displayMode === 'overview') shouldShowChildren = depth < 2;
      else if (displayMode === 'study') shouldShowChildren = depth < 3;
      else shouldShowChildren = node.expanded;

      const { height: nodeHeight } = getEstimatedDimensions(node, depth);

      if (!shouldShowChildren || !node.children || node.children.length === 0) {
        return nodeHeight + MIN_V_GAP;
      }

      // Recursively calculate total height needed for the subtree
      const childrenHeight = node.children.reduce((acc, child) => acc + getSubtreeHeight(child, depth + 1), 0);
      
      // Subtree height must accommodate all children subtrees or its own height
      return Math.max(childrenHeight, nodeHeight + MIN_V_GAP);
    };

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

    const traverse = (
      node: MindMapNodeData,
      depth: number,
      parentId: string,
      color: string,
      side: 'left' | 'right',
      centerX: number,
      centerY: number
    ) => {
      let shouldShow = true;
      if (displayMode === 'overview') shouldShow = depth <= 2;
      else if (displayMode === 'study') shouldShow = depth <= 3;
      
      if (!shouldShow) return;

      const dimensions = getEstimatedDimensions(node, depth);
      
      // MANDATORY FRESH CALCULATION: Ignore autoLayoutCache for tree nodes 
      // to ensure perfect alignment upon structure changes (expand/collapse).
      // We only respect manual user overrides (nodePositions).
      const manualPos = nodePositions.current[node.id];
      
      let finalCenter = { x: centerX, y: centerY };
      
      if (manualPos) {
        finalCenter = getCenterFromTopLeft(manualPos, dimensions.width, dimensions.height);
      } else {
        // Update cache so React Flow knows where we put it procedurally
        const tl = getTopLeftFromCenter(finalCenter, dimensions.width, dimensions.height);
        autoLayoutCache.current[node.id] = tl;
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
        style: { transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }
      });

      if (parentId) {
        newEdges.push({
          id: `e-${parentId}-${node.id}`,
          source: parentId,
          target: node.id,
          sourceHandle: side === 'right' ? 's-right' : 's-left',
          targetHandle: side === 'right' ? 't-left' : 't-right',
          type: 'simplebezier',
          animated: selectedNode?.id === node.id || selectedNode?.id === parentId,
          style: { 
            stroke: color, 
            strokeWidth: Math.max(2, 8 - depth * 1.5),
            opacity: 0.8,
            transition: 'all 0.4s ease'
          },
        });
      }

      if (node.children && node.children.length > 0) {
        let shouldExpand = node.expanded;
        if (displayMode === 'overview') shouldExpand = depth < 2;
        else if (displayMode === 'study') shouldExpand = depth < 3;

        if (shouldExpand) {
          const sortedChildren = [...node.children].sort((a, b) => {
            return a.title.localeCompare(b.title, undefined, { numeric: true });
          });

          // Horizontal step: parent half-width + gap + child average width estimate
          const horizontalStep = (dimensions.width / 2) + MIN_H_GAP + 150; 
          
          const totalSubtreeHeight = sortedChildren.reduce((acc, child) => acc + getSubtreeHeight(child, depth + 1), 0);
          let currentYOffset = -totalSubtreeHeight / 2;

          sortedChildren.forEach((child) => {
            const childSubtreeHeight = getSubtreeHeight(child, depth + 1);
            const childCenterOffset = currentYOffset + (childSubtreeHeight / 2);
            
            const nextCenterX = finalCenter.x + (side === 'right' ? horizontalStep : -horizontalStep);
            const nextCenterY = finalCenter.y + childCenterOffset;
            
            traverse(child, depth + 1, node.id, color, side, nextCenterX, nextCenterY);
            currentYOffset += childSubtreeHeight;
          });
        }
      }
    };

    // Root node placement
    const rootDimensions = getEstimatedDimensions({ title: mindMap.title } as any, 0);
    const manualRootPos = nodePositions.current[rootId];
    let rootCenter = { x: 0, y: 0 };
    if (manualRootPos) {
      rootCenter = getCenterFromTopLeft(manualRootPos, rootDimensions.width, rootDimensions.height);
    }

    newNodes.push({
      id: rootId,
      type: 'mindmap',
      selected: selectedNode?.id === rootId,
      data: { 
        label: mindMap.title,
        type: 'root',
        isRoot: true,
        summary: mindMap.summary,
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
    });

    if (mindMap.children && mindMap.children.length > 0) {
      const totalNodes = mindMap.children.length;
      const leftChildren = mindMap.children.filter((_, i) => i >= Math.ceil(totalNodes / 2));
      const rightChildren = mindMap.children.filter((_, i) => i < Math.ceil(totalNodes / 2));
      
      const leftTotalHeight = leftChildren.reduce((acc, child) => acc + getSubtreeHeight(child, 1), 0);
      const rightTotalHeight = rightChildren.reduce((acc, child) => acc + getSubtreeHeight(child, 1), 0);
      
      let currentLeftY = rootCenter.y - leftTotalHeight / 2;
      let currentRightY = rootCenter.y - rightTotalHeight / 2;
      
      const RADIUS_X = rootDimensions.width / 2 + MIN_H_GAP + 200;

      mindMap.children.forEach((node, index) => {
        const isRight = index < Math.ceil(totalNodes / 2);
        const side = isRight ? 'right' : 'left';
        const subtreeHeight = getSubtreeHeight(node, 1);
        const centerX = rootCenter.x + (isRight ? RADIUS_X : -RADIUS_X);
        const centerY = isRight ? currentRightY + subtreeHeight / 2 : currentLeftY + subtreeHeight / 2;
        const color = branchColors[index % branchColors.length];
        traverse(node, 1, rootId, color, side, centerX, centerY);
        if (isRight) currentRightY += subtreeHeight;
        else currentLeftY += subtreeHeight;
      });
    }

    // FINAL PASS: Collision Detection & Resolution (on centers)
    for (let i = 0; i < 5; i++) {
      let collisionsFound = false;
      for (let j = 0; j < newNodes.length; j++) {
        for (let k = j + 1; k < newNodes.length; k++) {
          const n1 = newNodes[j];
          const n2 = newNodes[k];
          
          const w1 = n1.data.width as number;
          const h1 = n1.data.height as number;
          const w2 = n2.data.width as number;
          const h2 = n2.data.height as number;

          const b1 = {
            left: (n1.data.centerX as number) - w1 / 2 - MIN_H_GAP / 2,
            right: (n1.data.centerX as number) + w1 / 2 + MIN_H_GAP / 2,
            top: (n1.data.centerY as number) - h1 / 2 - MIN_V_GAP / 2,
            bottom: (n1.data.centerY as number) + h1 / 2 + MIN_V_GAP / 2,
          };
          
          const b2 = {
            left: (n2.data.centerX as number) - w2 / 2 - MIN_H_GAP / 2,
            right: (n2.data.centerX as number) + w2 / 2 + MIN_H_GAP / 2,
            top: (n2.data.centerY as number) - h2 / 2 - MIN_V_GAP / 2,
            bottom: (n2.data.centerY as number) + h2 / 2 + MIN_V_GAP / 2,
          };

          const isOverlapping = !(b1.right < b2.left || b1.left > b2.right || b1.bottom < b2.top || b1.top > b2.bottom);

          if (isOverlapping) {
            collisionsFound = true;
            // Solve by pushing away
            const dx = (n1.data.centerX as number) - (n2.data.centerX as number);
            const dy = (n1.data.centerY as number) - (n2.data.centerY as number);
            
            if (Math.abs(dy) > 0.01) {
              const overlapY = Math.min(b1.bottom - b2.top, b2.bottom - b1.top);
              const moveY = (overlapY + MIN_V_GAP) / 2;
              if (dy > 0) {
                (n1.data.centerY as any) += moveY;
                (n2.data.centerY as any) -= moveY;
              } else {
                (n1.data.centerY as any) -= moveY;
                (n2.data.centerY as any) += moveY;
              }
            } else {
              // Same horizontal line? Push horizontally
              const overlapX = Math.min(b1.right - b2.left, b2.right - b1.left);
              const moveX = (overlapX + MIN_H_GAP) / 2;
              if (dx > 0) {
                (n1.data.centerX as any) += moveX;
                (n2.data.centerX as any) -= moveX;
              } else {
                (n1.data.centerX as any) -= moveX;
                (n2.data.centerX as any) += moveX;
              }
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
      return newNodes.map((newNode) => {
        const existingNode = currentNodes.find((n) => n.id === newNode.id);
        
        // Always preserve position if it exists, unless structure changed significantly 
        // (like a whole new set of nodes loaded)
        if (existingNode) {
          return {
            ...newNode,
            position: existingNode.position,
            measured: existingNode.measured,
          };
        }
        return newNode;
      });
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
          // Professional toggle behavior: maintain scale and focus smoothly
          const toggledNode = rfInstance.current.getNode(interaction.id);
          if (toggledNode) {
            const currentZoom = rfInstance.current.getZoom();
            // We keep the current zoom level to avoid "flying back"
            // and use setCenter for a smooth transition to the expanded area
            rfInstance.current.setCenter(
              toggledNode.position.x,
              toggledNode.position.y,
              { duration: 1000, zoom: currentZoom }
            );
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
          fitView
          onInit={handleInit}
          minZoom={0.05}
          maxZoom={2}
          fitViewOptions={{ padding: 0.3 }}
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
