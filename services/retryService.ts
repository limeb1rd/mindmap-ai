
import { ModelConfig } from "../src/config/ai";
import { ModelManager, RequestContext } from "./modelManager";

const MAX_TOTAL_ATTEMPTS = 6; // Total attempts across all models
const INITIAL_BACKOFF = 1000;

export async function withAIDebug<T>(
  operation: (model: string) => Promise<T>, 
  label: string, 
  model: string
): Promise<T> {
  console.log(`[Debug AI][${label}] Starting attempt with ${model}`);
  
  try {
    return await operation(model);
  } catch (error: any) {
    const statusCode = error.status || error.response?.status;
    console.error(`[Debug AI][${label}] ATTEMPT FAILED with status ${statusCode}:`, error);
    throw error;
  }
}

export async function withFailover<T>(
  operation: (model: string) => Promise<T>,
  context: RequestContext,
  label: string
): Promise<T> {
  let attempt = 0;
  let lastError: any = null;

  while (attempt < MAX_TOTAL_ATTEMPTS) {
    const modelConfig = ModelManager.selectModel({ ...context, attempt });
    const modelName = modelConfig.name;

    try {
      if (attempt > 0) {
        const isModelSwitch = attempt === 1 || attempt === 2;
        const statusMessage = isModelSwitch 
          ? `[Failover] Switching to backup model: ${modelName}`
          : `[Retry] Retrying with ${modelName} (Attempt ${attempt})`;
        console.log(statusMessage);
      }

      return await operation(modelName);
    } catch (error: any) {
      lastError = error;
      const status = error.status || error.response?.status || 500;
      
      // Log the error for diagnostics
      console.error(`[Failover][${label}] Error on attempt ${attempt} with ${modelName}:`, {
        status,
        message: error.message
      });

      // Check if we should retry (429, 5xx, or network issues)
      const retryableStatuses = [429, 500, 502, 503, 504];
      const isRetryable = retryableStatuses.includes(status) || !status;

      if (!isRetryable) {
        throw error; // Don't retry on 400, 401, 403, 404
      }

      attempt++;
      
      if (attempt < MAX_TOTAL_ATTEMPTS) {
        const delay = INITIAL_BACKOFF * Math.pow(2, attempt - 1);
        console.log(`[Failover] Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
