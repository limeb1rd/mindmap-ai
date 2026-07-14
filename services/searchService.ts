
import { ai } from "./aiService";
import { getModelConfig } from "../src/config/ai";
import { ModelManager, TaskType } from "./modelManager";
import { withFailover } from "./retryService";
import { buildSearchKnowledgePrompt } from "./promptBuilder";

export function isSearchQuery(text: string): boolean {
  const wordCount = text.trim().split(/\s+/).length;
  // If it's a short query (less than 100 words), it's likely a topic request that could benefit from search.
  // Longer texts are usually content the user wants to visualize directly.
  return wordCount < 100;
}

export async function gatherSearchKnowledge(query: string, language: string, modelIndex: number = 0) {
  const startTime = Date.now();
  
  const context = {
    taskType: TaskType.SEARCH,
    contentLength: query.length,
    attempt: modelIndex
  };

  try {
    const report = await withFailover(async (model) => {
      const prompt = buildSearchKnowledgePrompt(query, language);
      const aiStart = Date.now();
      
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      
      console.log(`[Debug AI] AI Search Call duration: ${Date.now() - aiStart}ms | Model: ${model}`);
      return response.text;
    }, context, "SearchKnowledge");

    if (!report || report.length < 50) {
      throw new Error("No significant information found.");
    }

    console.log(`[Debug AI] Total search execution time: ${Date.now() - startTime}ms`);
    return report;
  } catch (error: any) {
    console.error("[Debug AI] SEARCH CRITICAL ERROR:", error);
    throw new Error(language === 'ru' 
      ? "Интеллектуальный анализ не выявил достаточно данных по этой теме." 
      : "Intellectual analysis failed to find sufficient data on this topic.");
  }
}
