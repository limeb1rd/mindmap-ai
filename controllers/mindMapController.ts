
import { Request, Response } from "express";
import { fetchNodeDetails, generateMindMapFromContent, expandNodeBranches } from "../services/aiService";
import { isSearchQuery, gatherSearchKnowledge } from "../services/searchService";
import { getActiveModelNames } from "../src/config/ai";

export const getNodeDetails = async (req: Request, res: Response) => {
  const { nodeTitle, nodeType, context, language, attempt = 0 } = req.body;
  if (!nodeTitle) return res.status(400).json({ error: "nodeTitle is required" });

  try {
    const details = await fetchNodeDetails(nodeTitle, nodeType, context, language, attempt);
    res.json(details);
  } catch (error: any) {
    const status = error.status || error.response?.status || 500;
    res.status(status).json({ 
      error: "Failed to generate details", 
      details: error.message,
      status 
    });
  }
};

export const expandNode = async (req: Request, res: Response) => {
  const { nodeTitle, nodeType, parentContext, language, attempt = 0 } = req.body;
  if (!nodeTitle) return res.status(400).json({ error: "nodeTitle is required" });

  try {
    const branches = await expandNodeBranches(nodeTitle, nodeType, parentContext, language, attempt);
    res.json(branches);
  } catch (error: any) {
    const status = error.status || error.response?.status || 500;
    res.status(status).json({ 
      error: "Failed to expand node branches", 
      details: error.message,
      status 
    });
  }
};

export const generateMindMap = async (req: Request, res: Response) => {
  const { text, language, attempt = 0 } = req.body;
  const requestId = Math.random().toString(36).substring(7);

  console.log(`[${requestId}] Request received (Attempt: ${attempt}):`, { 
    textLength: text?.length, 
    language,
    timestamp: new Date().toISOString() 
  });

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  if (text.length > 10000) {
    const message = language === 'ru' 
      ? "Текст слишком длинный (максимум 10000 символов)."
      : "Text is too long (maximum 10000 characters).";
    return res.status(400).json({ error: message });
  }

  try {
    let sourceContent = text;

    if (isSearchQuery(text)) {
      try {
        sourceContent = await gatherSearchKnowledge(text, language, attempt);
      } catch (searchError: any) {
        const status = searchError.status || searchError.response?.status || 500;
        return res.status(status).json({ 
          error: searchError.message,
          status
        });
      }
    }

    const mindMapData = await generateMindMapFromContent(sourceContent, language, attempt);
    res.json(mindMapData);
  } catch (error: any) {
    console.error(`[${requestId}] Pipeline Critical Error:`, error);
    
    const status = error.status || error.response?.status || 500;
    const errorMessage = language === 'ru' 
      ? "Произошла ошибка при интеллектуальной обработке знаний. Попробуйте еще раз или уточните запрос."
      : "A critical error occurred during intellectual knowledge processing. Please try again or refine your query.";
      
    res.status(status).json({ 
      error: errorMessage,
      details: error.message,
      code: "PIPELINE_ERROR",
      status
    });
  }
};

export const getHealth = (req: Request, res: Response) => {
  res.json({ status: "ok", models: getActiveModelNames() });
};
