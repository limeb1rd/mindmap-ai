import { MindMapNode } from '../../types';

export interface LayoutNode extends Omit<MindMapNode, 'children'> {
  width: number;
  height: number;
  depth: number;
  side?: 'left' | 'right';
  centerX?: number;
  centerY?: number;
  children?: LayoutNode[];
  totalSubtreeHeight?: number;
}

export interface HierarchyResult {
  left: LayoutNode[];
  right: LayoutNode[];
  rootDims: { width: number; height: number };
}
