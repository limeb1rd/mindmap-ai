import { describe, it, expect } from 'vitest';
import { cleanJSON, parseMindMapSkeleton, parseNodeDetails, validateSkeletonStructure } from './parserService';

describe('parserService', () => {
  describe('cleanJSON', () => {
    it('should clean JSON wrapped in markdown code blocks', () => {
      const input = '```json\n{"key": "value"}\n```';
      expect(cleanJSON(input)).toBe('{"key": "value"}');
    });

    it('should clean JSON with text before and after', () => {
      const input = 'Here is the data: {"key": "value"} Hope it helps!';
      expect(cleanJSON(input)).toBe('{"key": "value"}');
    });

    it('should handle raw JSON string', () => {
      const input = '{"key": "value"}';
      expect(cleanJSON(input)).toBe('{"key": "value"}');
    });
  });

  describe('parseMindMapSkeleton', () => {
    it('should parse a valid skeleton JSON', () => {
      const input = '{"title": "Root", "summary": "Sum", "children": []}';
      const result = parseMindMapSkeleton(input);
      expect(result.title).toBe('Root');
      expect(result.children).toEqual([]);
    });

    it('should handle truncated JSON error message', () => {
      const input = '{"title": "Root", "children": [';
      expect(() => parseMindMapSkeleton(input)).toThrow('The source content is too complex');
    });
  });

  describe('validateSkeletonStructure', () => {
    it('should validate a correct skeleton', () => {
      const input = { title: "Root", summary: "Sum", children: [] };
      const result = validateSkeletonStructure(input, "some content");
      expect(result.valid).toBe(true);
    });

    it('should catch missing title', () => {
      const input = { not_title: "Root", children: [] };
      const result = validateSkeletonStructure(input, "some content");
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("Missing or invalid 'title' at root level.");
    });

    it('should catch duplicate IDs', () => {
      const input = {
        title: "Root",
        children: [
          { id: "1", title: "Child 1", children: [] },
          { id: "1", title: "Child 2", children: [] }
        ]
      };
      const result = validateSkeletonStructure(input, "some content");
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("Duplicate ID found: 1");
    });

    it('should catch suspicious lack of grouping (heuristic)', () => {
      const input = {
        title: "Root",
        children: [
          { id: "1", title: "Child 1", children: [] }
        ]
      };
      // Content with 10 years
      const content = "1990 1991 1992 1993 1994 1995 1996 1997 1998 1999";
      const result = validateSkeletonStructure(input, content);
      expect(result.valid).toBe(false);
      expect(result.issues[0]).toContain("lacks sufficient top-level grouping");
    });
  });

  describe('parseNodeDetails', () => {
    it('should parse valid node details', () => {
      const input = '{"description": "details"}';
      const result = parseNodeDetails(input);
      expect(result.description).toBe('details');
    });

    it('should throw error for invalid JSON', () => {
      const input = '{invalid}';
      expect(() => parseNodeDetails(input)).toThrow('Invalid node details JSON');
    });
  });
});
