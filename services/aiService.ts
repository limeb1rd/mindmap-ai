
import { GoogleGenAI } from "@google/genai";
import { withAIDebug, withFailover } from "./retryService";
import { buildSkeletonGenerationPrompt, buildNodeDetailsPrompt } from "./promptBuilder";
import { AI_CONFIG, getModelConfig } from "../src/config/ai";
import { ModelManager, TaskType } from "./modelManager";
import { parseMindMapSkeleton, parseNodeDetails } from "./parserService";
import dotenv from "dotenv";

dotenv.config();

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function generateMindMapFromContent(content: string, language: string, modelIndex: number = 0) {
  const startTime = Date.now();
  
  const context = {
    taskType: TaskType.SKELETON,
    contentLength: content.length,
    attempt: modelIndex
  };

  try {
    const rawText = await withFailover(async (model) => {
      const prompt = buildSkeletonGenerationPrompt(content);
      const aiStart = Date.now();
      
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: AI_CONFIG.LIMITS.MAX_TOKENS,
          temperature: 0.1, // Lower temperature for more consistent JSON
        },
      });
      
      console.log(`[Debug AI] AI Call duration: ${Date.now() - aiStart}ms | Model: ${model}`);
      return response.text;
    }, context, "SkeletonGeneration");

    if (!rawText || rawText.trim().length === 0) {
      throw new Error("Empty response from skeleton generator.");
    }

    const parseStart = Date.now();
    const parsed = parseMindMapSkeleton(rawText);
    console.log(`[Debug AI] Parse duration: ${Date.now() - parseStart}ms`);
    
    // Node counting for logging
    let nodeCount = 1;
    const countNodes = (n: any) => {
      if (n.children) {
        nodeCount += n.children.length;
        n.children.forEach(countNodes);
      }
    };
    countNodes(parsed);
    
    console.log(`[Debug AI] Total nodes found: ${nodeCount}`);
    console.log(`[Debug AI] Total skeleton execution time: ${Date.now() - startTime}ms`);
    
    return parsed;
  } catch (error: any) {
    console.error("[Debug AI] SKELETON CRITICAL ERROR:", error);
    throw error;
  }
}

export async function fetchNodeDetails(nodeTitle: string, nodeType: string, context: string | undefined, language: string, modelIndex: number = 0) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  const requestContext = {
    taskType: TaskType.DETAILS,
    contentLength: (nodeTitle + (context || "")).length,
    attempt: modelIndex
  };

  try {
    const rawText = await withFailover(async (model) => {
      const prompt = buildNodeDetailsPrompt(nodeTitle, nodeType, context, language);
      const aiStart = Date.now();
      
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: AI_CONFIG.LIMITS.MAX_TOKENS,
        },
      });
      
      console.log(`[Debug AI][${requestId}] AI Call duration: ${Date.now() - aiStart}ms | Model: ${model}`);
      return response.text;
    }, requestContext, `NodeDetails-${nodeTitle}`);

    const parseStart = Date.now();
    const parsed = parseNodeDetails(rawText);
    console.log(`[Debug AI][${requestId}] Parse duration: ${Date.now() - parseStart}ms`);
    console.log(`[Debug AI][${requestId}] Total detail execution time: ${Date.now() - startTime}ms`);
    
    return parsed;
  } catch (error: any) {
    console.error(`[Debug AI][${requestId}] CRITICAL ERROR:`, error);
    throw error;
  }
}

