
export const cleanJSON = (text: string) => {
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

export function parseMindMapSkeleton(rawText: string) {
  const cleanedText = cleanJSON(rawText);
  try {
    const parsed = JSON.parse(cleanedText);
    
    // Optional: Validate structure here if needed
    return parsed;
  } catch (error: any) {
    throw new Error(`Invalid skeleton JSON: ${error.message}`);
  }
}

export function parseNodeDetails(rawText: string) {
  const cleanedText = cleanJSON(rawText);
  try {
    return JSON.parse(cleanedText);
  } catch (error: any) {
    throw new Error(`Invalid node details JSON: ${error.message}`);
  }
}
