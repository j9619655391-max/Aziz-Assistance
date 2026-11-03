import { AIService } from "../../domains/infrastructure/AIService";
import { ISemanticIntelligenceService, SemanticIntelligenceResult, TechnologyRelationship } from "./types";
import { Type } from "@google/genai";

export class SemanticIntelligenceService implements ISemanticIntelligenceService {
  constructor(private aiService: AIService) {}

  /**
   * Performs deep semantic analysis on concepts, resolving synonyms, technology relationships,
   * canonical representations, transferable skills, clusters, tags, and semantic similarity.
   * @param concept The primary concept to analyze (e.g., "C Sharp", "Linux Administration")
   * @param compareWith Optional secondary concept to compute semantic similarity against
   */
  public async analyzeConcept(concept: string, compareWith?: string): Promise<SemanticIntelligenceResult> {
    try {
      const systemInstruction = 
        "You are the Aziz AI Kernel Semantic Intelligence & Technology Alignment Engine. " +
        "Your mission is to perform deep conceptual analyses on technologies, systems, concepts, or operations. " +
        "You compute semantic similarity, resolve synonyms and canonical representations, classify technology relationships " +
        "(such as parent, child, alternative, or dependency), and map transferable capabilities without any business-specific logic. " +
        "You MUST respond ONLY with a valid JSON object matching the requested schema. Do not add any prefix, suffix, conversational filler, or markdown syntax besides JSON.";

      const prompt = `
Analyze the semantic properties of the following concept:
Primary Concept: "${concept}"
${compareWith ? `Secondary Concept to Compare With: "${compareWith}"` : ""}

Evaluate alternative synonyms, related domain concepts, high-level technology classifications, parent-child structures, and transferable capabilities.
${compareWith ? `Provide a thorough semantic similarity score (0 to 100) and explain their structural alignment.` : `Provide a high-quality self-cohesion similarity assessment.`}
`;

      const response = await this.aiService.generateContentWithFallback({
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              canonicalConcept: {
                type: Type.STRING,
                description: "Standardized or canonical representation of the primary concept (e.g., 'C#' for 'C Sharp')"
              },
              normalizedTerms: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Alternative names, common abbreviations, or resolved synonyms (e.g., 'JS', 'ES6' for 'JavaScript')"
              },
              relatedConcepts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Closely related technologies or domain areas"
              },
              similarityScore: {
                type: Type.INTEGER,
                description: "Semantic similarity score from 0 to 100 between concept and compareWith (if provided), or internal conceptual cohesion"
              },
              confidencePercentage: {
                type: Type.INTEGER,
                description: "Self-assessed confidence percentage of this relationship mapping, from 0 to 100"
              },
              knowledgeClusters: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "High-level grouping categories or conceptual categories"
              },
              transferableCapabilities: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Knowledge or skills easily transferable from or to this concept (e.g., VM concepts transfer between VMware and Hyper-V)"
              },
              semanticTags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Normalized semantic descriptors or hashtags representing key attributes"
              },
              technologyRelationships: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    concept: { type: Type.STRING, description: "Target technology or concept name" },
                    relationshipType: {
                      type: Type.STRING,
                      enum: ["parent", "child", "related", "dependency", "alternative", "complementary"],
                      description: "Structural relationship classification"
                    },
                    description: { type: Type.STRING, description: "Brief rationale describing the structural link" }
                  },
                  required: ["concept", "relationshipType", "description"]
                },
                description: "Structural technology relationship links"
              },
              reasoning: {
                type: Type.STRING,
                description: "Detailed multi-layered reasoning analysis backing up the similarities and classifications"
              }
            },
            required: [
              "canonicalConcept",
              "normalizedTerms",
              "relatedConcepts",
              "similarityScore",
              "confidencePercentage",
              "knowledgeClusters",
              "transferableCapabilities",
              "semanticTags",
              "technologyRelationships",
              "reasoning"
            ]
          }
        }
      });

      if (response && response.candidates?.[0]?.content?.parts?.[0]?.text) {
        const rawJson = response.candidates[0].content.parts[0].text.trim();
        const cleanedJson = rawJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        const result = JSON.parse(cleanedJson) as SemanticIntelligenceResult;
        
        // Validate structured outcome matching expected model schemas
        if (
          result &&
          typeof result.canonicalConcept === "string" &&
          Array.isArray(result.normalizedTerms) &&
          Array.isArray(result.relatedConcepts) &&
          typeof result.similarityScore === "number" &&
          typeof result.confidencePercentage === "number" &&
          Array.isArray(result.knowledgeClusters) &&
          Array.isArray(result.transferableCapabilities) &&
          Array.isArray(result.semanticTags) &&
          Array.isArray(result.technologyRelationships) &&
          typeof result.reasoning === "string"
        ) {
          return result;
        }
      }
    } catch (err) {
      console.warn("[SemanticIntelligenceService] Gemini call failed, resorting to static fallback evaluator. Error:", err);
    }

    return this.getFallbackSemantic(concept, compareWith);
  }

  /**
   * Generates a structural, high-quality fallback semantic calculation in case the AI provider is unavailable.
   */
  public getFallbackSemantic(concept: string, compareWith?: string): SemanticIntelligenceResult {
    const rawConcept = concept || "";
    const cleanConcept = rawConcept.trim();
    
    // Normalize casing and clean strings
    const canonicalConcept = this.resolveCanonicalHeuristic(cleanConcept);
    
    // Normalize terms and deduplicate
    const normalizedTerms = Array.from(new Set([
      cleanConcept,
      cleanConcept.toLowerCase(),
      cleanConcept.toUpperCase(),
      cleanConcept.replace(/\s+/g, ""),
      cleanConcept.replace(/\s+/g, "").toLowerCase(),
      cleanConcept.replace(/\s+/g, "").toUpperCase(),
      canonicalConcept,
      canonicalConcept.toLowerCase(),
      canonicalConcept.toUpperCase()
    ])).filter(t => t.length > 0);

    // Basic synonym map for fallback
    const basicSynonyms: Record<string, string[]> = {
      "javascript": ["JS", "ES6", "ECMAScript", "Vanilla JS"],
      "js": ["JavaScript", "ES6", "ECMAScript", "Vanilla JS"],
      "typescript": ["TS", "Strict JS", "Static JS"],
      "ts": ["TypeScript", "Strict JS", "Static JS"],
      "react": ["ReactJS", "React.js", "SPA Framework", "Frontend"],
      "reactjs": ["React", "React.js", "SPA Framework", "Frontend"],
      "nodejs": ["Node.js", "Node", "Backend JS", "V8 Engine"],
      "node.js": ["NodeJS", "Node", "Backend JS", "V8 Engine"],
      "c sharp": ["C#", "CSharp", ".NET"],
      "c#": ["C Sharp", "CSharp", ".NET"],
      "csharp": ["C#", "C Sharp", ".NET"],
      "linux": ["Unix", "Linux OS", "Ubuntu", "Debian", "CentOS"],
      "docker": ["Containers", "Containerization", "Docker Engine"],
      "kubernetes": ["K8s", "Orchestration", "Kubernetes Engine"],
      "vmware": ["Virtualization", "Hypervisor", "vSphere"],
      "hyper-v": ["Virtualization", "Hypervisor", "Microsoft Hyper-V"]
    };

    const termKey = cleanConcept.toLowerCase();
    if (basicSynonyms[termKey]) {
      basicSynonyms[termKey].forEach(syn => normalizedTerms.push(syn));
    }

    // Related Concepts & Tech Relationships Heuristics
    const relatedConcepts: string[] = [];
    const technologyRelationships: TechnologyRelationship[] = [];
    const transferableCapabilities: string[] = [];
    const knowledgeClusters: string[] = [];
    const semanticTags: string[] = [];

    if (termKey.includes("linux") || termKey.includes("unix") || termKey.includes("system admin")) {
      relatedConcepts.push("System Administration", "Operating Systems", "Bash Scripting", "Infrastructure");
      technologyRelationships.push(
        { concept: "Operating Systems", relationshipType: "parent", description: "Linux is an open-source operating system kernel." },
        { concept: "Bash Scripting", relationshipType: "dependency", description: "Automation on Linux relies heavily on shell scripting." },
        { concept: "Windows Server", relationshipType: "alternative", description: "Alternative enterprise host operating system." }
      );
      transferableCapabilities.push("Shell automation", "Server maintenance", "File system administration", "User permission management");
      knowledgeClusters.push("Systems Engineering", "Infrastructure Operations");
      semanticTags.push("OS", "Kernel", "Unix", "SysAdmin", "OpenSource");
    } else if (termKey.includes("javascript") || termKey.includes("js") || termKey.includes("typescript") || termKey.includes("ts")) {
      relatedConcepts.push("Web Development", "Frontend Frameworks", "ECMAScript", "Asynchronous Programming");
      technologyRelationships.push(
        { concept: "TypeScript", relationshipType: "related", description: "Superset of JavaScript adding strict static types." },
        { concept: "V8 Engine", relationshipType: "dependency", description: "Executes JavaScript in highly optimized runtimes." },
        { concept: "Python", relationshipType: "alternative", description: "Alternative high-level language for scripting and general development." }
      );
      transferableCapabilities.push("Asynchronous flow logic", "Component-based DOM interaction", "Object-oriented scripting");
      knowledgeClusters.push("Software Engineering", "Web Technologies");
      semanticTags.push("Programming", "Scripting", "Web", "Async", "Engine");
    } else if (termKey.includes("docker") || termKey.includes("container") || termKey.includes("kubernetes") || termKey.includes("k8s")) {
      relatedConcepts.push("Cloud Native", "DevOps", "Microservices", "Orchestration");
      technologyRelationships.push(
        { concept: "Kubernetes", relationshipType: "complementary", description: "Docker provides containers, Kubernetes orchestrates them." },
        { concept: "Podman", relationshipType: "alternative", description: "Daemonless alternative tool for running OCI containers." }
      );
      transferableCapabilities.push("Isolated sandbox setups", "Application distribution", "Infrastructure-as-code scripting");
      knowledgeClusters.push("DevOps & Cloud Engineering");
      semanticTags.push("Containers", "CloudNative", "Microservices", "Orchestration");
    } else {
      // Default generic mappings
      relatedConcepts.push(`${cleanConcept} Foundations`, "Information Technology", "Engineering Principles");
      technologyRelationships.push(
        { concept: "Information Technology", relationshipType: "parent", description: "Standard conceptual classification branch." }
      );
      transferableCapabilities.push("Analytical reasoning", "Conceptual problem-solving", "Domain systems layout");
      knowledgeClusters.push("General Technology & Engineering");
      semanticTags.push("Technology", "DomainKnowledge", "Engineering");
    }

    // Handle Semantic Similarity if compareWith is supplied
    let similarityScore = 0;
    let similarityReason = "No comparison requested; internal conceptual cohesion assessed.";

    if (compareWith) {
      const compKey = compareWith.trim().toLowerCase();
      const cleanComp = compareWith.trim();

      // Normalize casing / remove duplicates for compareWith too
      const compCanonical = this.resolveCanonicalHeuristic(cleanComp);

      if (termKey === compKey || canonicalConcept.toLowerCase() === compCanonical.toLowerCase()) {
        similarityScore = 100;
        similarityReason = `Exact match identified between '${cleanConcept}' and '${cleanComp}' (Canonical resolved: '${canonicalConcept}').`;
      } else {
        // Simple synonym lookup
        const syn1 = basicSynonyms[termKey] || [];
        const syn2 = basicSynonyms[compKey] || [];
        const isSynonym = syn1.some(s => s.toLowerCase() === compKey) || syn2.some(s => s.toLowerCase() === termKey);

        if (isSynonym) {
          similarityScore = 90;
          similarityReason = `Direct synonym relationship identified. '${cleanConcept}' and '${cleanComp}' resolve to the same underlying capability framework.`;
        } else {
          // Similarity based on token overlaps
          const words1 = termKey.split(/\s+/);
          const words2 = compKey.split(/\s+/);
          const commonWords = words1.filter(w => words2.includes(w) && w.length > 2);

          if (commonWords.length > 0) {
            similarityScore = Math.min(45 + (commonWords.length * 20), 85);
            similarityReason = `Partial semantic match established. Shares common keywords: ${commonWords.join(", ")}.`;
          } else {
            // Contextual ecosystem similarities (e.g. Linux and Windows Server)
            const osTerms = ["linux", "unix", "windows", "macos", "ubuntu", "centos", "redhat", "debian"];
            const isOS1 = osTerms.some(t => termKey.includes(t));
            const isOS2 = osTerms.some(t => compKey.includes(t));

            const virtualTerms = ["vmware", "hyper-v", "virtualization", "hypervisor", "proxmox", "kvm", "virtualbox"];
            const isVirt1 = virtualTerms.some(t => termKey.includes(t));
            const isVirt2 = virtualTerms.some(t => compKey.includes(t));

            if (isOS1 && isOS2) {
              similarityScore = 75;
              similarityReason = `High transferability detected. Both concepts are primary Operating Systems, sharing common command and structural paradigms.`;
              transferableCapabilities.push(`Cross-platform systems management`, `Kernel parameters tuning`);
            } else if (isVirt1 && isVirt2) {
              similarityScore = 80;
              similarityReason = `High transferability detected. Both concepts are virtualization hypervisors, enabling shared virtual machine configuration skillsets.`;
              transferableCapabilities.push(`Virtual environment architecture`, `Host resources partitioning`);
            } else {
              similarityScore = 15;
              similarityReason = `Low semantic relationship observed between '${cleanConcept}' and '${cleanComp}'. Conceptual scopes appear unrelated.`;
            }
          }
        }
      }
    }

    const confidencePercentage = compareWith ? Math.min(similarityScore + 10, 95) : 85;

    return {
      canonicalConcept,
      normalizedTerms: Array.from(new Set(normalizedTerms)),
      relatedConcepts: Array.from(new Set(relatedConcepts)),
      similarityScore,
      confidencePercentage,
      knowledgeClusters: Array.from(new Set(knowledgeClusters)),
      transferableCapabilities: Array.from(new Set(transferableCapabilities)),
      semanticTags: Array.from(new Set(semanticTags)),
      technologyRelationships,
      reasoning: similarityReason
    };
  }

  private resolveCanonicalHeuristic(term: string): string {
    const map: Record<string, string> = {
      "c sharp": "C#",
      "csharp": "C#",
      "javascript": "JavaScript",
      "js": "JavaScript",
      "typescript": "TypeScript",
      "ts": "TypeScript",
      "nodejs": "Node.js",
      "node.js": "Node.js",
      "react": "React",
      "reactjs": "React",
      "react.js": "React",
      "k8s": "Kubernetes",
      "kubernetes": "Kubernetes",
      "vmware": "VMware",
      "hyper-v": "Hyper-V"
    };
    return map[term.toLowerCase().trim()] || term;
  }
}
