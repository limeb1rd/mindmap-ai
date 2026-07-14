import { describe, it, expect } from 'vitest';
import { HierarchyBuilder } from './hierarchyBuilder';
import { MindMapData } from '../../types';

describe('HierarchyBuilder', () => {
  const builder = new HierarchyBuilder();

  const mockData: MindMapData = {
    title: 'Root Node',
    summary: 'Root Summary',
    children: [
      { id: '1', title: 'Child 1', type: 't', summary: 'S1', expanded: true, children: [] },
      { id: '2', title: 'Child 2', type: 't', summary: 'S2', expanded: true, children: [] },
      { id: '3', title: 'Child 3', type: 't', summary: 'S3', expanded: true, children: [] },
    ]
  };

  it('should build a hierarchy and split children between left and right', () => {
    const result = builder.build(mockData, 'detailed');
    expect(result.rootDims).toBeDefined();
    // With 3 children, it should be split 1 and 2 (or 2 and 1)
    const totalChildren = result.left.length + result.right.length;
    expect(totalChildren).toBe(3);
    expect(result.left.length).toBeGreaterThan(0);
    expect(result.right.length).toBeGreaterThan(0);
  });

  it('should respect overview mode depth (depth < 2)', () => {
    const complexData: MindMapData = {
      title: 'Root',
      summary: 'S',
      children: [
        { 
          id: 'l1', title: 'Level 1', type: 't', summary: 'S', expanded: true,
          children: [
            { id: 'l2', title: 'Level 2', type: 't', summary: 'S', expanded: true, children: [] }
          ]
        }
      ]
    };
    const result = builder.build(complexData, 'overview');
    const level1 = result.right.length > 0 ? result.right[0] : result.left[0];
    // In overview mode, depth 1 node (Level 1) should NOT have children in the layout if they are at depth 2
    // Wait, shouldShowChildren(node, depth, mode)
    // depth 1: return 1 < 2 -> true
    // depth 2: return 2 < 2 -> false
    // So level 1 children should be present, but level 2's children should be undefined.
    expect(level1.children).toBeDefined();
    expect(level1.children![0].children).toBeUndefined();
  });

  it('should balance sides by node count', () => {
    const unbalancedData: MindMapData = {
      title: 'Root',
      summary: 'S',
      children: [
        { 
          id: 'big', title: 'Big Branch', type: 't', summary: 'S', expanded: true,
          children: [
            { id: 'c1', title: 'c1', type: 't', summary: 's', children: [] },
            { id: 'c2', title: 'c2', type: 't', summary: 's', children: [] }
          ]
        },
        { id: 'small1', title: 's1', type: 't', summary: 's', children: [] },
        { id: 'small2', title: 's2', type: 't', summary: 's', children: [] }
      ]
    };
    const result = builder.build(unbalancedData, 'detailed');
    // Big branch (3 nodes total) vs small1 (1 node) and small2 (1 node)
    // It should put Big Branch on one side and the two small ones on the other for best balance (3 vs 2)
    const leftCount = result.left.length;
    const rightCount = result.right.length;
    expect(Math.abs(leftCount - rightCount)).toBeLessThanOrEqual(1);
  });
});
