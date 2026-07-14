import { Node, Edge } from '@xyflow/react';
import { MindMapNode, MindMapData, Language, DisplayMode } from '../types';
import { HierarchyBuilder } from './layout/hierarchyBuilder';
import { CoordinateCalculator } from './layout/coordinateCalculator';
import { EdgeGenerator } from './layout/edgeGenerator';
import { LayoutNode } from './layout/types';

export interface LayoutOptions {
  language: Language;
  displayMode: DisplayMode;
  selectedNodeId?: string | null;
  branchColors: string[];
  expandingNodes?: Set<string>;
  t: {
    edit: string;
    add: string;
    delete: string;
    rootNode: string;
    node: string;
    expand: string;
    collapse: string;
    editNode: string;
    addChild: string;
  };
  callbacks: {
    onEdit: (id: string, text: string, isRoot: boolean) => void;
    onAdd: (parentId: string) => void;
    onDelete: (id: string) => void;
    onToggleExpand: (id: string) => void;
    onSelect: (id: string) => void;
  };
}

export class LayoutEngine {
  private hierarchyBuilder = new HierarchyBuilder();
  private coordinateCalculator = new CoordinateCalculator();
  private edgeGenerator = new EdgeGenerator();
  
  constructor(
    private nodePositions: Record<string, { x: number; y: number }>,
    private autoLayoutCache: Record<string, { x: number; y: number }>
  ) {}

  public getCenterFromTopLeft(pos: { x: number; y: number }, width: number, height: number) {
    return {
      x: pos.x + width / 2,
      y: pos.y + height / 2,
    };
  }

  public getTopLeftFromCenter(center: { x: number; y: number }, width: number, height: number) {
    return {
      x: center.x - width / 2,
      y: center.y - height / 2,
    };
  }

  public transformToFlow(mindMap: MindMapData, options: LayoutOptions) {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const rootId = 'root';

    // 1. Build hierarchy and split into sides
    const { left, right, rootDims } = this.hierarchyBuilder.build(mindMap, options.displayMode);

    // 2. Calculate coordinates for each side
    const leftLayout = this.coordinateCalculator.calculate(left, 'left');
    const rightLayout = this.coordinateCalculator.calculate(right, 'right');

    const calculateAccOffset = (node: LayoutNode, idealTopLeft: { x: number; y: number }, parentAccOffset: { x: number; y: number }) => {
      const isLocked = !!this.nodePositions[node.id];
      if (isLocked) {
        const manualPos = this.nodePositions[node.id];
        return {
          x: manualPos.x - idealTopLeft.x,
          y: manualPos.y - idealTopLeft.y
        };
      }
      return parentAccOffset;
    };

    const createFlowNode = (node: LayoutNode, idealCenter: { x: number; y: number }, accOffset: { x: number; y: number }, color: string): Node => {
      const idealTopLeft = this.getTopLeftFromCenter(idealCenter, node.width, node.height);
      const isLocked = !!this.nodePositions[node.id];
      
      const finalPos = isLocked 
        ? this.nodePositions[node.id] 
        : { x: idealTopLeft.x + accOffset.x, y: idealTopLeft.y + accOffset.y };

      if (!isLocked) {
        this.autoLayoutCache[node.id] = finalPos;
      }

      return {
        id: node.id,
        type: 'mindmap',
        selected: options.selectedNodeId === node.id,
        data: {
          ...node,
          label: node.title,
          summary: node.metadata?.description || node.summary,
          color,
          isExpanded: node.expanded,
          isLocked,
          isExpanding: options.expandingNodes?.has(node.id),
          hasChildren: node.children && node.children.length > 0,
          onEdit: (id: string, text: string) => options.callbacks.onEdit(id, text, node.depth === 0),
          onAdd: options.callbacks.onAdd,
          onDelete: options.callbacks.onDelete,
          onToggleExpand: options.callbacks.onToggleExpand,
          onSelect: options.callbacks.onSelect,
          t: options.t,
          centerX: idealCenter.x + (isLocked ? (finalPos.x - idealTopLeft.x) : accOffset.x),
          centerY: idealCenter.y + (isLocked ? (finalPos.y - idealTopLeft.y) : accOffset.y)
        },
        position: finalPos,
        style: {
          transition: 'transform 0.7s cubic-bezier(0.2, 0, 0, 1), opacity 0.5s ease-out',
          zIndex: node.depth === 0 ? 100 : 10 - node.depth
        }
      };
    };

    // 1. Calculate root ideal position and its accumulated offset
    const rootIdealCenter = { x: 0, y: 0 };
    const rootIdealTopLeft = this.getTopLeftFromCenter(rootIdealCenter, rootDims.width, rootDims.height);
    const rootAccOffset = calculateAccOffset({ id: rootId } as any, rootIdealTopLeft, { x: 0, y: 0 });
    
    // 2. Add root node
    newNodes.push(createFlowNode({ 
      id: rootId, 
      title: mindMap.title, 
      depth: 0, 
      width: rootDims.width, 
      height: rootDims.height,
      expanded: true
    } as any, rootIdealCenter, { x: 0, y: 0 }, '#6366f1'));

    // Recursive processor for branches
    const processRecursive = (node: LayoutNode, parentId: string, side: 'left' | 'right', branchColor: string, accOffset: { x: number; y: number }) => {
      const idealCenter = { x: node.centerX!, y: node.centerY! };
      const idealTopLeft = this.getTopLeftFromCenter(idealCenter, node.width, node.height);
      
      newNodes.push(createFlowNode(node, idealCenter, accOffset, branchColor));
      
      if (parentId !== '') {
        newEdges.push(this.edgeGenerator.createEdge(parentId, node.id, side, branchColor, node.depth));
      }

      // Pass down this node's accumulated offset to its children
      const nextAccOffset = calculateAccOffset(node, idealTopLeft, accOffset);

      if (node.children) {
        node.children.forEach(child => {
          processRecursive(child, node.id, side, branchColor, nextAccOffset);
        });
      }
    };

    // Process sides with root's accumulated offset
    rightLayout.filter(n => n.depth === 1).forEach((branch, i) => {
      const color = options.branchColors[i % options.branchColors.length];
      processRecursive(branch, rootId, 'right', color, rootAccOffset);
    });

    leftLayout.filter(n => n.depth === 1).forEach((branch, i) => {
      const color = options.branchColors[(i + right.length) % options.branchColors.length];
      processRecursive(branch, rootId, 'left', color, rootAccOffset);
    });

    // Semantic cross-links
    const allNodesList: MindMapNode[] = [];
    const collectNodes = (n: MindMapNode) => {
      allNodesList.push(n);
      if (n.children) n.children.forEach(collectNodes);
    };
    mindMap.children.forEach(collectNodes);

    allNodesList.forEach(node => {
      if (node.metadata?.links) {
        node.metadata.links.forEach(link => {
          const target = allNodesList.find(n => n.title === link.targetId || n.id === link.targetId);
          if (target) {
            newEdges.push({
              id: `link-${node.id}-${target.id}`,
              source: node.id,
              target: target.id,
              label: link.label,
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '5,5', opacity: 0.6 },
              labelStyle: { fill: '#64748b', fontSize: 10, fontWeight: 500 }
            });
          }
        });
      }
    });

    return { nodes: newNodes, edges: newEdges };
  }
}
