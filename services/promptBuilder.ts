
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
          Convert the following knowledge synthesis into a structural Mind Map JSON SKELETON.
          
          PHASE 1: STRUCTURAL ARCHITECTURE
          Organize the core pillars and major categories from the source content.
          - LIMIT the depth of the tree to LEVEL 3 (Root -> Level 1 Groups -> Level 2 Items).
          - Do NOT generate deep detail branches (contribution, instruments, works, etc.) at this stage.
          - Focus on the main structural components.
          
          PHASE 2: HIERARCHY
          - Level 1 (Root): The main subject.
          - Level 2 (Groups): Major thematic pillars or chapters.
          - Level 3 (Items): Significant entities or concepts within those pillars.
          
          PHASE 3: NODE DEFINITIONS
          For every node:
          - title: Precise and descriptive.
          - summary: A concise identifier (1-5 words).
          - type: A custom classification reflecting its role in the system.
          - id: Unique string.
          - expanded: true.
          
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
                "expanded": true,
                "children": [] 
              }
            ]
          }

          SOURCE CONTENT:
          "${content}"

          Return ONLY the raw JSON object matching the schema above. Do not include markdown code fences, explanations, or any text outside the JSON.
        `;
}

export function buildBranchExpansionPrompt(nodeTitle: string, nodeType: string, parentContext: string, language: string): string {
  return `
    Expand the Mind Map node "${nodeTitle}" (Type: ${nodeType}) with detailed sub-branches.
    Context: This node is part of a larger mind map about "${parentContext}".
    
    TASK: Generate ONLY the children (sub-branches) for this specific node.
    - Create 3-7 highly relevant sub-nodes that explore the specific details of this entity.
    - Example for a composer: "Contribution to music", "Instruments", "Notable works", "Historical significance".
    - Each sub-node can have its own children if necessary to represent complex details (e.g., chronology of works).
    
    STRUCTURE FOR EACH CHILD:
    - id: Unique string.
    - title: Precise title.
    - summary: Short description (1-5 words).
    - type: Category (e.g., "work", "technique", "impact").
    - children: Recursive array of sub-nodes if more detail is needed.

    LANGUAGE: ${language === 'ru' ? 'Russian' : 'English'}.
    
    Return ONLY a raw JSON array of MindMapNode objects. 
    Example: [{"id": "...", "title": "...", "summary": "...", "type": "...", "children": []}]
    Do not include markdown code fences or explanations.
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
