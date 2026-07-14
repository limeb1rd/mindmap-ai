
import { ModelConfig, MODELS } from "../src/config/ai";
import { ModelManager, RequestContext } from "./modelManager";

const TOTAL_MAX_RETRIES = MODELS.reduce((acc, m) => acc + m.maxRetries, 0);
const INITIAL_BACKOFF = 1000;
const GLOBAL_TIMEOUT_MS = 120000; // Increased to 120s to accommodate multiple model timeouts

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
  operation: (model: string, signal?: AbortSignal) => Promise<T>,
  context: RequestContext,
  label: string
): Promise<T> {
  let attempt = 0;
  let lastError: any = null;
  const startTime = Date.now();

  while (attempt < TOTAL_MAX_RETRIES) {
    // Check for global timeout
    if (Date.now() - startTime > GLOBAL_TIMEOUT_MS) {
      console.error(`[Failover][${label}] Global timeout reached after ${Date.now() - startTime}ms`);
      const timeoutError = new Error("Generation timed out. The AI models are currently busy or the request was too complex. Please try again with a shorter text.");
      (timeoutError as any).status = 504; // Gateway Timeout
      throw timeoutError;
    }

    const modelConfig = ModelManager.selectModel({ ...context, attempt });
    const modelName = modelConfig.name;
    const modelTimeout = modelConfig.timeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), modelTimeout);

    try {
      if (attempt > 0) {
        const statusMessage = `[Failover] Attempt ${attempt} using ${modelName} (timeout: ${modelTimeout}ms)`;
        console.log(statusMessage);
      }

      const result = await operation(modelName, controller.signal);
      clearTimeout(timeoutId);
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;
      
      const isTimeout = error.name === 'AbortError' || error.status === 504;
      const status = isTimeout ? 504 : (error.status || error.response?.status || 500);
      
      // Log the error for diagnostics
      console.error(`[Failover][${label}] Error on attempt ${attempt} with ${modelName}:`, {
        status,
        message: error.message,
        isTimeout
      });

      // Check if we should retry (429, 5xx, or network issues)
      const retryableStatuses = [429, 500, 502, 503, 504];
      const isRetryable = retryableStatuses.includes(status) || !status;

      if (!isRetryable) {
        throw error; // Don't retry on 400, 401, 403, 404
      }

      attempt++;
      
      if (attempt < TOTAL_MAX_RETRIES) {
        const delay = INITIAL_BACKOFF * Math.pow(2, attempt - 1);
        
        // Ensure we don't wait if the delay would put us past the timeout
        if (Date.now() - startTime + delay > GLOBAL_TIMEOUT_MS) {
           console.error(`[Failover][${label}] Next retry would exceed global timeout. Stopping.`);
           break;
        }

        console.log(`[Failover] Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
