import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini with recommended pattern
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const MODELS = ["gemini-3.5-flash-preview", "gemini-3.5-flash", "gemini-3.5-flash-lite"];

// Helper to determine if input is a search query
function isSearchQuery(text: string): boolean {
  const wordCount = text.trim().split(/\s+/).length;
  // Short inputs (less than 15 words) are likely queries
  return wordCount < 15;
}

// Utility for a single AI attempt with debug logging (retries managed by client for UI feedback)
async function withAIDebug<T>(operation: (model: string) => Promise<T>, label: string, model: string): Promise<T> {
  console.log(`[Debug AI][${label}] Starting attempt with ${model}`);
  
  try {
    return await operation(model);
  } catch (error: any) {
    const statusCode = error.status || error.response?.status;
    console.error(`[Debug AI][${label}] ATTEMPT FAILED with status ${statusCode}:`, error);
    throw error;
  }
}

// STAGE 1 & 2: Search & Deep Synthesis
async function gatherSearchKnowledge(query: string, language: string, modelIndex: number = 0) {
  const startTime = Date.now();
  const currentModel = MODELS[modelIndex % MODELS.length];
  console.log(`[Debug AI] Starting Search Knowledge gathering. Query: ${query} | Model: ${currentModel}`);

  const prompt = `
    Perform an advanced intellectual synthesis for the topic: "${query}".
    
    INSTRUCTIONS:
    1. SOURCE AGGREGATION: Gather data from multiple authoritative sources.
    2. CONFLICT RESOLUTION: Identify and resolve any contradictions between sources.
    3. REDUNDANCY FILTERING: Eliminate all overlapping or repetitive facts.
    4. ARCHETYPE IDENTIFICATION: Determine the most logical structure for this topic:
       - Is it a HISTORY? (Use Chronology)
       - Is it a SCIENCE/SYSTEM? (Use Taxonomy/Classification)
       - Is it a DYNAMIC SYSTEM? (Use Functional Decomposition)
       - Is it a METHODOLOGY? (Use Procedural/Step-by-step logic)
    5. LOGICAL HIERARCHY: Build a logical synthesis where:
       - Root: The absolute core essence.
       - Pillars: The 3-5 most critical high-level concepts.
       - Entities: Significant objects, people, or events.
       - Attributes: Detailed properties and atomic facts.
    6. SEMANTIC RELATIONSHIPS: Note cross-connections between entities that aren't strictly hierarchical.
    
    LANGUAGE: Output the synthesis in ${language === 'ru' ? 'Russian' : 'English'}.
  `;

  console.log(`[Debug AI] Final prompt size: ${prompt.length} chars`);

  try {
    const report = await withAIDebug(async (model) => {
      const aiStart = Date.now();
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      console.log(`[Debug AI] AI Search Call duration: ${Date.now() - aiStart}ms`);
      return response.text;
    }, "SearchKnowledge", currentModel);

    if (!report || report.length < 50) {
      throw new Error("No significant information found.");
    }

    console.log(`[Debug AI] Response size: ${report.length} chars`);
    console.log(`[Debug AI] Response Start (500): ${report.substring(0, 500)}`);
    console.log(`[Debug AI] Response End (500): ${report.substring(Math.max(0, report.length - 500))}`);
    console.log(`[Debug AI] Total search execution time: ${Date.now() - startTime}ms`);
    
    return report;
  } catch (error: any) {
    console.error("[Debug AI] SEARCH CRITICAL ERROR:", error);
    throw new Error(language === 'ru' 
      ? "Интеллектуальный анализ не выявил достаточно данных по этой теме." 
      : "Intellectual analysis failed to find sufficient data on this topic.");
  }
}

// STAGE 3, 4 & 5: Skeleton Structure Generation
async function generateMindMapFromContent(content: string, language: string, modelIndex: number = 0) {
  const startTime = Date.now();
  const currentModel = MODELS[modelIndex % MODELS.length];
  console.log(`[Debug AI] Starting skeleton generation. Input content size: ${content.length} chars | Model: ${currentModel}`);
  
  const prompt = `
          Convert the following knowledge synthesis into a professional Mind Map JSON SKELETON.
          
          PHASE 1: SKELETAL ARCHITECTURE
          Organize information strictly by Importance:
          - Depth 0 (Root): Core Theme.
          - Depth 1: Strategic Pillars.
          - Depth 2: Key Entities / Major Sub-categories.
          - Depth 3: Critical Properties / Significant Facts.
          
          PHASE 2: DYNAMIC BRANCHING
          - DO NOT use predefined templates.
          - Focus ONLY on Titles, Types, and IDs.
          - Do NOT generate long descriptions, works, or detailed metadata at this stage.
          
          PHASE 3: NODE DEFINITIONS
          For every node:
          - summary: 1-4 word identifier.
          - type: A custom classification (e.g. "Catalyst", "Component", "Milestone").
          - id: Unique string.
          
          PHASE 4: VISUAL LOGIC
          - expanded: true for Levels 0 and 1.
          - expanded: false for deeper levels.

          OUTPUT SCHEMA:
          {
            "title": "Main Subject Name",
            "summary": "Short core summary",
            "children": [
              {
                "id": "unique_id",
                "title": "Node Title",
                "summary": "Short identifier",
                "type": "Semantic Type",
                "expanded": boolean,
                "children": [ ... ]
              }
            ]
          }

          CONTENT:
          "${content}"
        `;

  console.log(`[Debug AI] Final prompt size: ${prompt.length} chars`);

  try {
    const rawText = await withAIDebug(async (model) => {
      const aiStart = Date.now();
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
        },
      });
      console.log(`[Debug AI] AI Call duration: ${Date.now() - aiStart}ms`);
      return response.text;
    }, "SkeletonGeneration", currentModel);

    if (!rawText || rawText.trim().length === 0) {
      throw new Error("Empty response from skeleton generator.");
    }

    console.log(`[Debug AI] Response size: ${rawText.length} chars`);
    console.log(`[Debug AI] Response Start (500): ${rawText.substring(0, 500)}`);
    console.log(`[Debug AI] Response End (500): ${rawText.substring(Math.max(0, rawText.length - 500))}`);

    const cleanJSON = (text: string) => {
      let cleaned = text.trim();
      if (cleaned.includes("```")) {
        const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match && match[1]) cleaned = match[1].trim();
        else cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      return cleaned;
    };

    const parseStart = Date.now();
    try {
      const cleanedText = cleanJSON(rawText);
      const parsed = JSON.parse(cleanedText);
      console.log(`[Debug AI] JSON.parse duration: ${Date.now() - parseStart}ms`);
      
      // Count nodes
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
    } catch (parseError: any) {
      console.error("[Debug AI] PARSE ERROR. Raw Output:", rawText);
      console.error("[Debug AI] PARSE ERROR details:", parseError);
      throw new Error(`Invalid skeleton JSON: ${parseError.message}`);
    }
  } catch (error: any) {
    console.error("[Debug AI] SKELETON CRITICAL ERROR:", error);
    throw error;
  }
}

// Stage 6 & 7: Node Detailed Analysis (Lazy Loading)
async function fetchNodeDetails(nodeTitle: string, nodeType: string, context: string | undefined, language: string, modelIndex: number = 0) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  const currentModel = MODELS[modelIndex % MODELS.length];
  console.log(`[Debug AI][${requestId}] Starting node details for: ${nodeTitle} | Model: ${currentModel}`);
  
  const prompt = `
    Analyze the concept "${nodeTitle}" (Type: ${nodeType}) within the context of "${context}".
    
    TASK: Generate detailed metadata for this specific mind map node.
    
    REQUIRED FIELDS (JSON):
    - description: 1-2 sentence semantic definition.
    - detailedBiography: 2-4 sentences of deep technical or historical context.
    - historicalContext: (Optional) Background or origins.
    - importance: Why this is significant.
    - metadata: Object with key-value pairs for specific data found (dates, metrics, parts, etc.).
    - links: Array of cross-connections { "targetId": "title_of_related_node", "label": "relationship" }.

    LANGUAGE: ${language === 'ru' ? 'Russian' : 'English'}.
    Return ONLY raw JSON.
  `;

  console.log(`[Debug AI][${requestId}] Final prompt size: ${prompt.length} chars`);

  try {
    const rawText = await withAIDebug(async (model) => {
      const aiStart = Date.now();
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
        },
      });
      console.log(`[Debug AI][${requestId}] AI Call duration: ${Date.now() - aiStart}ms`);
      return response.text;
    }, `NodeDetails-${nodeTitle}`, currentModel);

    console.log(`[Debug AI][${requestId}] Response size: ${rawText.length} chars`);
    console.log(`[Debug AI][${requestId}] Response Start (500): ${rawText.substring(0, 500)}`);
    console.log(`[Debug AI][${requestId}] Response End (500): ${rawText.substring(Math.max(0, rawText.length - 500))}`);

    const cleanJSON = (text: string) => {
      let cleaned = text.trim();
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      return firstBrace !== -1 && lastBrace !== -1 ? cleaned.substring(firstBrace, lastBrace + 1) : cleaned;
    };

    const parseStart = Date.now();
    const parsed = JSON.parse(cleanJSON(rawText));
    console.log(`[Debug AI][${requestId}] JSON.parse duration: ${Date.now() - parseStart}ms`);
    console.log(`[Debug AI][${requestId}] Links found: ${parsed.links?.length || 0}`);
    console.log(`[Debug AI][${requestId}] Total detail execution time: ${Date.now() - startTime}ms`);
    
    return parsed;
  } catch (error: any) {
    console.error(`[Debug AI][${requestId}] CRITICAL ERROR:`, error);
    throw error;
  }
}

// API Handlers
app.post("/api/node-details", async (req, res) => {
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
});

app.post("/api/generate", async (req, res) => {
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

  try {
    let sourceContent = text;

    // STAGE: Request Interpretation & Search Decision
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

    // STAGE: Analysis, Structure & Tree Building
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
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", models: MODELS });
});

async function startServer() {
  try {
    if (process.env.NODE_ENV !== "production") {
      const shouldDisableHMR = process.env.DISABLE_HMR === "true" || !!process.env.K_SERVICE;
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: shouldDisableHMR ? false : undefined,
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer().catch((err) => {
  console.error("Unhandled error in startServer:", err);
  process.exit(1);
});
