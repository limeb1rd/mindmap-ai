
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

export const validateSkeletonStructure = (parsed: any, content: string): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, issues: ["Parsed output is not an object."] };
  }

  if (!parsed.title || typeof parsed.title !== 'string') {
    issues.push("Missing or invalid 'title' at root level.");
  }

  if (!Array.isArray(parsed.children)) {
    issues.push("'children' must be an array.");
  } else {
    // Check for duplicate IDs
    const ids = new Set<string>();
    const checkIds = (nodes: any[]) => {
      for (const node of nodes) {
        if (node.id) {
          if (ids.has(node.id)) issues.push(`Duplicate ID found: ${node.id}`);
          ids.add(node.id);
        }
        if (Array.isArray(node.children)) checkIds(node.children);
      }
    };
    checkIds(parsed.children);

    // Heuristic: Check for grouping quality
    // If content has many dates/years (suggesting high information density) but very few groups
    const yearMatches = content.match(/\b(18|19|20)\d{2}\b/g) || [];
    if (yearMatches.length >= 10 && parsed.children.length < 2) {
      issues.push("Content contains many specific dates/years but the generated structure lacks sufficient top-level grouping (found < 2 groups).");
    }

    // Check for empty required fields in children
    const validateNodes = (nodes: any[]) => {
      nodes.forEach((node, idx) => {
        if (!node.title) issues.push(`Node missing title at level children[${idx}]`);
        if (node.children && Array.isArray(node.children)) validateNodes(node.children);
      });
    };
    validateNodes(parsed.children);
  }

  return {
    valid: issues.length === 0,
    issues
  };
};

export function parseMindMapSkeleton(rawText: string) {
  const cleanedText = cleanJSON(rawText);
  try {
    return JSON.parse(cleanedText);
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
