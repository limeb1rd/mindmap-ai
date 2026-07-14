
export const cleanJSON = (text: string) => {
  let cleaned = text.trim();
  if (cleaned.includes("```")) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) cleaned = match[1].trim();
    else cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  const lastBrace = cleaned.lastIndexOf("}");
  const lastBracket = cleaned.lastIndexOf("]");

  let start = -1;
  let end = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    end = lastBrace;
  } else if (firstBracket !== -1) {
    start = firstBracket;
    end = lastBracket;
  }

  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }
  
  return cleaned;
};

export function isValidMindMapSkeleton(parsed: any): boolean {
  if (!parsed || typeof parsed !== 'object') return false;
  if (typeof parsed.title !== 'string') return false;
  if (!Array.isArray(parsed.children)) return false;
  return true;
}

export function parseMindMapSkeleton(rawText: string) {
  const cleanedText = cleanJSON(rawText);
  try {
    const parsed = JSON.parse(cleanedText);
    
    if (!isValidMindMapSkeleton(parsed)) {
      throw new Error("Invalid mind map structure: Root node must have a title and children array.");
    }
    
    return parsed;
  } catch (error: any) {
    if (error.message.includes("Unexpected end of JSON input")) {
      throw new Error("The source content is too complex and the AI response was truncated. Try selecting a smaller part of the text or reducing complexity.");
    }
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
