import { describe, it, expect } from 'vitest';
import { ModelManager, TaskType } from './modelManager';

describe('ModelManager', () => {
  it('should select Flash Lite for search tasks', () => {
    const config = ModelManager.selectModel({
      taskType: TaskType.SEARCH,
      contentLength: 1000
    });
    expect(config.name).toBe('gemini-3.1-flash-lite');
  });

  it('should select Flash Lite for small skeleton tasks', () => {
    const config = ModelManager.selectModel({
      taskType: TaskType.SKELETON,
      contentLength: 5000
    });
    expect(config.name).toBe('gemini-3.1-flash-lite');
  });

  it('should select 3.5 Flash for large skeleton tasks', () => {
    const config = ModelManager.selectModel({
      taskType: TaskType.SKELETON,
      contentLength: 25000
    });
    expect(config.name).toBe('gemini-3.5-flash');
  });

  it('should upgrade to 3.5 Flash on first retry (attempt 1)', () => {
    const config = ModelManager.selectModel({
      taskType: TaskType.SKELETON,
      contentLength: 1000,
      attempt: 1
    });
    expect(config.name).toBe('gemini-3.5-flash');
  });

  it('should use Preview for emergency fallback (attempt >= 2)', () => {
    const config = ModelManager.selectModel({
      taskType: TaskType.SKELETON,
      contentLength: 1000,
      attempt: 2
    });
    expect(config.name).toBe('gemini-3-flash-preview');
  });
});
