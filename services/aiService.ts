
import { GoogleGenAI } from "@google/genai";
import { withAIDebug, withFailover } from "./retryService";
import { buildSkeletonGenerationPrompt, buildNodeDetailsPrompt, buildBranchExpansionPrompt } from "./promptBuilder";
import { AI_CONFIG, getModelConfig } from "../src/config/ai";
import { ModelManager, TaskType } from "./modelManager";
import { parseMindMapSkeleton, parseNodeDetails, cleanJSON } from "./parserService";
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

const SKELETON_RESPONSE_SCHEMA = {
  description: "A comprehensive mind map JSON skeleton structure",
  type: "object",
  properties: {
    title: { type: "string", description: "Main Subject Name" },
    summary: { type: "string", description: "Core subject summary" },
    children: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          summary: { type: "string" },
          type: { type: "string" },
          expanded: { type: "boolean" },
          children: { 
            type: "array",
            description: "Recursive children nodes"
          }
        },
        required: ["id", "title", "summary", "type", "expanded", "children"]
      }
    }
  },
  required: ["title", "summary", "children"]
};

export async function generateMindMapFromContent(content: string, language: string, modelIndex: number = 0) {
  const startTime = Date.now();
  
  const context = {
    taskType: TaskType.SKELETON,
    contentLength: content.length,
    attempt: modelIndex
  };

  try {
    const rawText = await withFailover(async (model, signal) => {
      const prompt = buildSkeletonGenerationPrompt(content);
      const aiStart = Date.now();
      
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: SKELETON_RESPONSE_SCHEMA,
          maxOutputTokens: AI_CONFIG.LIMITS.MAX_TOKENS,
          temperature: 0.1, // Lower temperature for more consistent JSON
          abortSignal: signal,
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
    const rawText = await withFailover(async (model, signal) => {
      const prompt = buildNodeDetailsPrompt(nodeTitle, nodeType, context, language);
      const aiStart = Date.now();
      
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: AI_CONFIG.LIMITS.MAX_TOKENS,
          abortSignal: signal,
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

export async function expandNodeBranches(nodeTitle: string, nodeType: string, parentContext: string, language: string, modelIndex: number = 0) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  const requestContext = {
    taskType: TaskType.EXPAND,
    contentLength: (nodeTitle + parentContext).length,
    attempt: modelIndex
  };

  try {
    const rawText = await withFailover(async (model, signal) => {
      const prompt = buildBranchExpansionPrompt(nodeTitle, nodeType, parentContext, language);
      const aiStart = Date.now();
      
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          // Branch expansion is a smaller task, use lower token limit
          maxOutputTokens: 4096,
          abortSignal: signal,
        },
      });
      
      console.log(`[Debug AI][${requestId}] Branch Expansion duration: ${Date.now() - aiStart}ms | Model: ${model}`);
      return response.text;
    }, requestContext, `BranchExpansion-${nodeTitle}`);

    const parseStart = Date.now();
    const cleanedText = cleanJSON(rawText);
    const parsed = JSON.parse(cleanedText);
    console.log(`[Debug AI][${requestId}] Parse duration: ${Date.now() - parseStart}ms`);
    console.log(`[Debug AI][${requestId}] Total expansion execution time: ${Date.now() - startTime}ms`);
    
    return parsed;
  } catch (error: any) {
    console.error(`[Debug AI][${requestId}] EXPANSION ERROR:`, error);
    throw error;
  }
}

