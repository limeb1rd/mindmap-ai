export interface ModelConfig {
  name: string;
  priority: number;
  maxRetries: number;
  timeout: number;
}

export const MODELS: ModelConfig[] = [
  {
    name: "gemini-3.5-flash",
    priority: 1,
    maxRetries: 3,
    timeout: 30000
  },
  {
    name: "gemini-3.1-flash-lite",
    priority: 2,
    maxRetries: 3,
    timeout: 20000
  },
  {
    name: "gemini-3-flash-preview",
    priority: 3,
    maxRetries: 2,
    timeout: 45000
  }
];

export const PRIMARY_MODEL = MODELS[0];

export function getModelConfig(index: number = 0): ModelConfig {
  return MODELS[index % MODELS.length];
}

export function getActiveModelNames(): string[] {
  return MODELS.map(m => m.name);
}

export const AI_CONFIG = {
  LIMITS: {
    MAX_TOKENS: 16384, // Increased to allow larger JSON responses
    MAX_GEN_NODES: 500, // Increased to support "hundreds of nodes"
    MAX_SUMMARY_LENGTH: 2000
  },
  
  PROMPTS: {
    TEMPERATURE: 0.7,
    TOP_P: 0.95,
    TOP_K: 40
  }
};
