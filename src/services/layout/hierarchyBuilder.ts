import { MindMapNode, MindMapData, DisplayMode } from '../../types';
import { LAYOUT_CONFIG } from '../../config/layout';
import { LayoutNode, HierarchyResult } from './types';

export class HierarchyBuilder {
  private dimensionCache = new Map<string, { width: number; height: number; hash: string }>();

  public build(data: MindMapData, displayMode: DisplayMode): HierarchyResult {
    const rootDims = this.getEstimatedDimensions(data as any, 0);
    
    const rootChildren = [...(data.children || [])];
    const leftChildren: LayoutNode[] = [];
    const rightChildren: LayoutNode[] = [];
    
    // Balanced splitting heuristic
    const countNodes = (n: MindMapNode, depth: number): number => {
      if (!this.shouldShowChildren(n, depth, displayMode) || !n.children) return 1;
      return 1 + n.children.reduce((acc, c) => acc + countNodes(c, depth + 1), 0);
    };

    const sortedChildren = rootChildren.map(c => ({ node: c, count: countNodes(c, 1) }))
      .sort((a, b) => b.count - a.count);

    let leftCount = 0;
    let rightCount = 0;
    
    sortedChildren.forEach(item => {
      const layoutNode = this.prepareNode(item.node, 1, displayMode);
      if (rightCount <= leftCount) {
        rightChildren.push(layoutNode);
        rightCount += item.count;
      } else {
        leftChildren.push(layoutNode);
        leftCount += item.count;
      }
    });

    return { left: leftChildren, right: rightChildren, rootDims };
  }

  private prepareNode(node: MindMapNode, depth: number, displayMode: DisplayMode): LayoutNode {
    const dims = this.getEstimatedDimensions(node, depth);
    const shouldShow = this.shouldShowChildren(node, depth, displayMode);
    
    return {
      ...node,
      depth,
      width: dims.width,
      height: dims.height,
      children: shouldShow && node.children 
        ? node.children.map(c => this.prepareNode(c, depth + 1, displayMode))
        : undefined
    } as LayoutNode;
  }

  private shouldShowChildren(node: MindMapNode, depth: number, displayMode: DisplayMode): boolean {
    if (displayMode === 'overview') return depth < 2;
    if (displayMode === 'study') return depth < 3;
    return node.expanded ?? true;
  }

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private getContext() {
    if (!this.ctx && typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
    }
    return this.ctx;
  }

  private getEstimatedDimensions(node: MindMapNode, depth: number) {
    const hash = `${node.title}-${node.summary}-${depth}-${node.children?.length || 0}`;
    const cached = this.dimensionCache.get(node.id);
    if (cached && cached.hash === hash) {
      return { width: cached.width, height: cached.height };
    }

    const config = depth === 0 
      ? LAYOUT_CONFIG.DIMENSIONS.ROOT 
      : (depth === 1 ? LAYOUT_CONFIG.DIMENSIONS.LEVEL_1 : LAYOUT_CONFIG.DIMENSIONS.DEFAULT);

    const ctx = this.getContext();
    let measuredWidth = 0;
    const title = depth === 1 ? node.title.toUpperCase() : node.title;

    if (ctx) {
      // Font mapping from MindMapNode.tsx styles
      let font = '12px Inter, sans-serif';
      if (depth === 0) font = '900 18px Inter, sans-serif';
      else if (depth === 1) font = '800 14px Inter, sans-serif';
      else if (depth === 2) font = '700 12px Inter, sans-serif';
      else font = '500 10px Inter, sans-serif';

      ctx.font = font;
      measuredWidth = ctx.measureText(title).width;
    } else {
      // Fallback if canvas is not available
      measuredWidth = title.length * config.CHAR_WIDTH;
    }

    const horizontalPadding = config.H_PADDING;
    const toggleButtonMargin = node.children && node.children.length > 0 ? LAYOUT_CONFIG.DIMENSIONS.TOGGLE_BUTTON_MARGIN : 0;
    const maxWidth = config.MAX_WIDTH;
    
    // We try to fit text in 1 line if possible, otherwise wrap to 2 lines
    // preferredWidth is for 1 line
    const preferredWidth = measuredWidth + horizontalPadding + toggleButtonMargin;
    
    // Final width clamped between MIN and MAX
    const width = Math.min(maxWidth, Math.max(config.MIN_WIDTH, preferredWidth));
    
    // Calculate lines (max 2 due to line-clamp-2)
    const availableTextWidth = width - horizontalPadding - toggleButtonMargin;
    const lines = Math.min(2, Math.ceil(measuredWidth / availableTextWidth) || 1);
    
    const lineHeight = config.LINE_HEIGHT;
    const verticalPadding = config.V_PADDING;
    const metadataHeight = node.summary ? LAYOUT_CONFIG.DIMENSIONS.METADATA_HEIGHT : 0;
    
    const height = Math.max(
      config.MIN_HEIGHT,
      (lines * lineHeight) + verticalPadding + metadataHeight
    );

    this.dimensionCache.set(node.id, { width, height, hash });
    return { width, height };
  }
}
