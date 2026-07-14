
import { ModelConfig, MODELS } from "../src/config/ai";

export enum TaskType {
  SEARCH = "search",
  SKELETON = "skeleton",
  DETAILS = "details",
  EXPAND = "expand",
}

export interface RequestContext {
  taskType: TaskType;
  contentLength: number;
  attempt?: number;
}

/**
 * ModelManager implements intelligent model selection logic.
 * 
 * Strategy:
 * - Gemini 3.1 Flash Lite: Default for simple tasks, search, and documents < 20k chars.
 * - Gemini 3.5 Flash: For large documents, complex structures, or fallback for Flash Lite.
 * - Gemini 3 Flash Preview: Last resort for 429/503 errors or repeated failures.
 */
export class ModelManager {
  private static findModel(name: string): ModelConfig {
    return MODELS.find(m => m.name === name) || MODELS[0];
  }

  public static selectModel(context: RequestContext): ModelConfig {
    const { taskType, contentLength, attempt = 0 } = context;

    // RULE: Emergency Fallback
    // Use Gemini 3 Flash Preview ONLY as a last resort (attempt >= 2)
    if (attempt >= 2) {
      console.log(`[ModelManager] Emergency fallback triggered. Attempt: ${attempt}`);
      return this.findModel("gemini-3-flash-preview");
    }

    // RULE: Quality Fallback
    // If Flash Lite failed (attempt 1), upgrade to Gemini 3.5 Flash
    if (attempt === 1) {
      console.log(`[ModelManager] Quality fallback/retry triggered. Upgrading to 3.5 Flash.`);
      return this.findModel("gemini-3.5-flash");
    }

    // --- INITIAL ATTEMPT STRATEGY ---

    // RULE: Simple Tasks & Search -> Flash Lite
    if (taskType === TaskType.SEARCH) {
      return this.findModel("gemini-3.1-flash-lite");
    }

    // RULE: Skeleton Generation Strategy
    if (taskType === TaskType.SKELETON) {
      // Documents over 20,000 characters require 3.5 Flash
      if (contentLength > 20000) {
        console.log(`[ModelManager] Large document detected (${contentLength} chars). Selecting 3.5 Flash.`);
        return this.findModel("gemini-3.5-flash");
      }
      
      // Default for skeleton
      return this.findModel("gemini-3.1-flash-lite");
    }

    // RULE: Node Details & Branch Expansion
    if (taskType === TaskType.DETAILS || taskType === TaskType.EXPAND) {
      // Usually smaller context
      return this.findModel("gemini-3.1-flash-lite");
    }

    // Default to Flash Lite to save costs
    return this.findModel("gemini-3.1-flash-lite");
  }
}
