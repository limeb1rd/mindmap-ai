import { LAYOUT_CONFIG } from '../../config/layout';
import { LayoutNode } from './types';

export class CoordinateCalculator {
  public calculate(sideNodes: LayoutNode[], side: 'left' | 'right'): LayoutNode[] {
    if (sideNodes.length === 0) return [];

    const result: LayoutNode[] = [];

    // 1. Calculate subtree heights recursively
    const calculateSubtreeHeight = (node: LayoutNode): number => {
      if (!node.children || node.children.length === 0) {
        node.totalSubtreeHeight = node.height;
        return node.height;
      }

      const childrenHeight = node.children.reduce((acc, child, index) => {
        const h = calculateSubtreeHeight(child);
        const gap = index === 0 ? 0 : LAYOUT_CONFIG.MIN_V_GAP_BASE;
        return acc + h + gap;
      }, 0);

      node.totalSubtreeHeight = Math.max(node.height, childrenHeight);
      return node.totalSubtreeHeight;
    };

    // Calculate heights for all branches
    sideNodes.forEach(node => calculateSubtreeHeight(node));

    // 2. Calculate total height of the side to center it
    const totalSideHeight = sideNodes.reduce((acc, node, index) => {
      const gap = index === 0 ? 0 : LAYOUT_CONFIG.V_GAP_BRANCH;
      return acc + (node.totalSubtreeHeight || 0) + gap;
    }, 0);

    // 3. Assign positions recursively
    let currentY = -totalSideHeight / 2;

    const assignPositions = (node: LayoutNode, xOffset: number, startY: number) => {
      const centerY = startY + (node.totalSubtreeHeight || 0) / 2;
      const centerX = (side === 'right' ? 1 : -1) * (xOffset + LAYOUT_CONFIG.H_GAP_BASE);

      node.centerX = centerX;
      node.centerY = centerY;
      node.side = side;
      result.push(node);

      if (node.children && node.children.length > 0) {
        let childY = startY + ((node.totalSubtreeHeight || 0) - (node.children.reduce((acc, c, i) => acc + (c.totalSubtreeHeight || 0) + (i === 0 ? 0 : LAYOUT_CONFIG.MIN_V_GAP_BASE), 0))) / 2;
        
        node.children.forEach((child, index) => {
          const nextXOffset = xOffset + Math.max(node.width, LAYOUT_CONFIG.DEFAULT_LEVEL_WIDTH) + LAYOUT_CONFIG.H_GAP_LEVEL;
          assignPositions(child, nextXOffset, childY);
          childY += (child.totalSubtreeHeight || 0) + LAYOUT_CONFIG.MIN_V_GAP_BASE;
        });
      }
    };

    sideNodes.forEach((node, index) => {
      const branchStartY = currentY;
      assignPositions(node, 0, branchStartY);
      currentY += (node.totalSubtreeHeight || 0) + LAYOUT_CONFIG.V_GAP_BRANCH;
    });

    return result;
  }
}
