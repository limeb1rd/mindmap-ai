
export function buildSearchKnowledgePrompt(query: string, language: string): string {
  return `
    Perform an exhaustive intellectual synthesis for the topic: "${query}".
    
    INSTRUCTIONS:
    1. SOURCE AGGREGATION: Gather data from ALL authoritative sources available. DO NOT restrict yourself to a few points.
    2. COMPREHENSIVENESS: Provide a deep, detailed, and multi-faceted analysis. Explore all relevant sub-topics, historical context, key figures, technical details, and future implications.
    3. CONFLICT RESOLUTION: Identify and resolve any contradictions between sources.
    4. REDUNDANCY FILTERING: Eliminate overlapping facts but RETAIN all unique details.
    5. ARCHETYPE IDENTIFICATION: Determine the most logical structure for this topic (History, Science, Dynamic System, Methodology, etc.).
    6. LOGICAL HIERARCHY: Build a vast logical synthesis where:
       - Root: The absolute core essence.
       - Pillars: ALL major high-level concepts (no limit on number).
       - Entities: ALL significant objects, people, or events related to the pillars.
       - Attributes: Exhaustive properties and atomic facts for every entity.
    7. SUPPLEMENTATION: If any aspect of the topic is missing or unclear, actively use the search tool to fill the gaps.
    
    LANGUAGE: Output the synthesis in ${language === 'ru' ? 'Russian' : 'English'}.
    PRIORITY: Maximum depth and breadth of information. DO NOT shorten or summarize for brevity.
  `;
}

export function buildSkeletonGenerationPrompt(content: string): string {
  return `
          Convert the following knowledge synthesis into a comprehensive Mind Map JSON SKELETON.
          
          PHASE 1: UNRESTRICTED ARCHITECTURE
          Organize ALL information provided in the source content. 
          - DO NOT limit the depth of the tree.
          - DO NOT limit the number of children for any node.
          - Every single unique piece of information in the source must be represented as a node or attribute.
          
          PHASE 2: DYNAMIC BRANCHING
          - Create a rich, branching structure that reflects the complexity of the subject.
          - Use meaningful hierarchy: Core Subject -> Pillars -> Sub-categories -> Details -> Sub-details.
          
          PHASE 3: NODE DEFINITIONS
          For every node:
          - title: Precise and descriptive.
          - summary: A concise identifier (1-5 words).
          - type: A custom classification reflecting its role in the system.
          - id: Unique string.
          - expanded: true for the first 3 levels, false for others.
          
          PHASE 4: NO TRUNCATION POLICY
          - It is FORBIDDEN to omit information for the sake of compactness.
          - The priority is COMPLETENESS. If the source has 50 points, generate at least 50 nodes.
          
          OUTPUT SCHEMA:
          {
            "title": "Main Subject Name",
            "summary": "Core subject summary",
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

          SOURCE CONTENT:
          "${content}"
        `;
}

export function buildNodeDetailsPrompt(nodeTitle: string, nodeType: string, context: string | undefined, language: string): string {
  return `
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
}
