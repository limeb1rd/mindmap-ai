import { describe, it, expect } from 'vitest';
import { cleanJSON, parseMindMapSkeleton, parseNodeDetails } from './parserService';

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
    it('should parse a valid skeleton', () => {
      const input = '{"title": "Root", "summary": "Sum", "children": []}';
      const result = parseMindMapSkeleton(input);
      expect(result.title).toBe('Root');
      expect(result.children).toEqual([]);
    });

    it('should throw error for invalid structure', () => {
      const input = '{"not_title": "Root"}';
      expect(() => parseMindMapSkeleton(input)).toThrow('Invalid mind map structure');
    });

    it('should handle truncated JSON error message', () => {
      const input = '{"title": "Root", "children": [';
      expect(() => parseMindMapSkeleton(input)).toThrow('The source content is too complex');
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
