import { AIService } from "../../domains/infrastructure/AIService";
import { ISkillIntelligenceService, NormalizedSkill, TechnologyMapping } from "./types";

export class SkillIntelligenceService implements ISkillIntelligenceService {
  constructor(private aiService: AIService) {}

  public async normalizeSkill(rawSkill: string): Promise<NormalizedSkill> {
    try {
      const systemInstruction = 
        "You are the Aziz AI Kernel Skill Standardization & Ontology Engine. Your job is to parse any raw skill or tech term and normalize it into a standardized schema. " +
        "You MUST respond ONLY with a valid JSON object matching the requested schema. No conversational filler.";

      const prompt = `
Normalize the following raw skill/tech term:
"${rawSkill}"

Return a structured JSON object matching this schema:
{
  "name": "Standardized correct name (e.g. React, Docker, Kubernetes, Kubernetes Administration)",
  "category": "Broad category (e.g. Frontend Libraries, DevOps, Databases, Orchestration)",
  "synonyms": ["List", "of", "common", "synonyms/alternatives"],
  "versionAwareness": "Important latest versions or standards (e.g. v18.x, ECMAScript 2022, Python 3.11)",
  "aliases": ["Alternative", "spellings", "or", "shorthands", "like", "K8s"],
  "technologyMapping": {
    "ecosystem": "Ecosystem name (e.g. Web Development, Cloud Infrastructure, Java Ecosystem)",
    "subsector": "Specific subsector (e.g. SPA Frameworks, Containerization, State Management)",
    "parentTech": "Parent technology if applicable (e.g. JavaScript, Linux, AWS)"
  },
  "frameworkMapping": {
    "metaFrameworks": ["Related metaframeworks like Next.js"],
    "relatedLibraries": ["Related adjacent libraries/tools"]
  }
}
`;

      const response = await this.aiService.generateContentWithFallback({
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json"
        }
      });

      if (response && response.candidates?.[0]?.content?.parts?.[0]?.text) {
        const rawJson = response.candidates[0].content.parts[0].text.trim();
        const cleanedJson = rawJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        const result = JSON.parse(cleanedJson) as NormalizedSkill;
        if (result.name && result.technologyMapping) {
          return result;
        }
      }
    } catch (err) {
      console.warn("[SkillIntelligenceService] Gemini call failed, returning static normalization fallback.", err);
    }

    return this.getFallbackNormalization(rawSkill);
  }

  public async getSynonyms(skillName: string): Promise<string[]> {
    const normalized = await this.normalizeSkill(skillName);
    return normalized.synonyms || [];
  }

  public async mapTechnologyRelations(skillName: string): Promise<TechnologyMapping> {
    const normalized = await this.normalizeSkill(skillName);
    return normalized.technologyMapping;
  }

  private getFallbackNormalization(rawSkill: string): NormalizedSkill {
    const trimmed = rawSkill.trim();
    // Simple lookup map for fast fallbacks of common tech skills
    const lookup: Record<string, Partial<NormalizedSkill>> = {
      react: {
        name: "React",
        category: "Frontend Web Development",
        synonyms: ["React.js", "ReactJS", "React Library"],
        aliases: ["ReactJS", "React.js"],
        versionAwareness: "v18.x / v19.0",
        technologyMapping: { ecosystem: "JavaScript / TypeScript", subsector: "SPA Frameworks", parentTech: "Web Technologies" }
      },
      docker: {
        name: "Docker",
        category: "Containerization & DevOps",
        synonyms: ["Docker Containers", "Docker Engine"],
        aliases: ["Docker Compose", "Docker containers"],
        versionAwareness: "v24.x+",
        technologyMapping: { ecosystem: "DevOps", subsector: "Container Runtimes", parentTech: "Linux virtualization" }
      },
      kubernetes: {
        name: "Kubernetes",
        category: "Orchestration & Infrastructure",
        synonyms: ["K8s", "Kubernetes Clusters", "Kube"],
        aliases: ["K8s", "Kube"],
        versionAwareness: "v1.28+",
        technologyMapping: { ecosystem: "Cloud Infrastructure", subsector: "Container Orchestration", parentTech: "Cloud Platform Engine" }
      }
    };

    const key = trimmed.toLowerCase();
    if (lookup[key]) {
      return {
        name: trimmed,
        category: "Technical Skill",
        synonyms: [],
        versionAwareness: "N/A",
        aliases: [],
        technologyMapping: { ecosystem: "General Software", subsector: "Development Tools" },
        ...lookup[key]
      };
    }

    return {
      name: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
      category: "Technical Skill",
      synonyms: [trimmed, `${trimmed} tech`],
      versionAwareness: "N/A",
      aliases: [trimmed],
      technologyMapping: {
        ecosystem: "General Platform Technology",
        subsector: "Software Development",
        parentTech: "Computer Science"
      }
    };
  }
}
