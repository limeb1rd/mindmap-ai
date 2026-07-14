import * as d3 from 'd3-hierarchy';
import { LAYOUT_CONFIG } from '../../config/layout';
import { LayoutNode } from './types';

export class CoordinateCalculator {
  public calculate(sideNodes: LayoutNode[], side: 'left' | 'right'): LayoutNode[] {
    if (sideNodes.length === 0) return [];

    // 1. Create a dummy root to wrap all nodes for this side
    const dummyRootData = {
      id: `dummy-${side}`,
      title: 'dummy',
      width: 0,
      height: 0,
      children: sideNodes
    };

    // 2. Create d3 hierarchy
    const root = d3.hierarchy<any>(dummyRootData, (d) => d.children);

    // 3. Configure tree layout
    // In d3.tree, nodeSize([height, width]) means x is vertical, y is horizontal
    // We use a vertical spacing that accounts for base gap plus some padding
    const vSpacing = LAYOUT_CONFIG.MIN_V_GAP_BASE;
    const hSpacing = LAYOUT_CONFIG.H_GAP_LEVEL;
    
    const treeLayout = d3.tree<any>().nodeSize([vSpacing, hSpacing]);
    treeLayout(root);

    const result: LayoutNode[] = [];
    
    // 4. Calculate vertical centering and root gap
    const level1Nodes = root.children || [];
    
    // Initial centering based on the dummy root's children (level 1 nodes)
    let minY = Infinity;
    let maxY = -Infinity;
    
    root.descendants().slice(1).forEach(d => {
      if (d.x < minY) minY = d.x;
      if (d.x > maxY) maxY = d.x;
    });

    const sideHeight = maxY - minY;
    let verticalOffset = -sideHeight / 2 - minY;

    // Requirement 3: Minimum vertical gap between root and level 1 nodes
    // Root is at (0,0). Level 1 nodes are children of our dummy root.
    // Gap: (rootHalfHeight + nodeHalfHeight + V_GAP_BRANCH)
    const minRequiredGap = (LAYOUT_CONFIG.DIMENSIONS.ROOT.MIN_HEIGHT / 2) + 
                          (LAYOUT_CONFIG.DIMENSIONS.LEVEL_1.MIN_HEIGHT / 2) + 
                          LAYOUT_CONFIG.V_GAP_BRANCH;

    // Push level 1 nodes (and their subtrees) away from the center if they clash with root
    const above = level1Nodes.filter(d => (d.x + verticalOffset) < 0);
    const below = level1Nodes.filter(d => (d.x + verticalOffset) >= 0);
    
    const shifts = new Map<string, number>();
    
    if (above.length > 0) {
      const closestAboveY = Math.max(...above.map(d => d.x + verticalOffset));
      if (closestAboveY > -minRequiredGap) {
        const shift = -minRequiredGap - closestAboveY;
        above.forEach(d => {
          d.descendants().forEach(desc => shifts.set(desc.data.id, shift));
        });
      }
    }
    
    if (below.length > 0) {
      const closestBelowY = Math.min(...below.map(d => d.x + verticalOffset));
      if (closestBelowY < minRequiredGap) {
        const shift = minRequiredGap - closestBelowY;
        below.forEach(d => {
          d.descendants().forEach(desc => shifts.set(desc.data.id, shift));
        });
      }
    }

    // 5. Final coordinate assignment
    root.descendants().slice(1).forEach(d => {
      const node = d.data as LayoutNode;
      const nodeShift = shifts.get(node.id) || 0;
      
      // Horizontal (X) - calculate based on path width
      let x = 0;
      let curr = d;
      while (curr.parent && curr.parent.depth > 0) {
        const parentNode = curr.parent.data as LayoutNode;
        x += Math.max(parentNode.width, LAYOUT_CONFIG.DEFAULT_LEVEL_WIDTH) + LAYOUT_CONFIG.H_GAP_LEVEL;
        curr = curr.parent;
      }
      const finalX = (side === 'right' ? 1 : -1) * (x + LAYOUT_CONFIG.H_GAP_BASE);
      
      // Vertical (Y)
      const finalY = d.x + verticalOffset + nodeShift;

      node.centerX = finalX;
      node.centerY = finalY;
      node.side = side;
      result.push(node);
    });

    return result;
  }
}
