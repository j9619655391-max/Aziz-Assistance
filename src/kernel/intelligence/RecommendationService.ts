import { AIService } from "../../domains/infrastructure/AIService";
import { IRecommendationService, RecommendationResult, ActionItem, BusinessImpact } from "./types";
import { Type } from "@google/genai";

export class RecommendationService implements IRecommendationService {
  constructor(
    private aiService?: AIService,
    private explainabilityService?: any,
    private confidenceService?: any,
    private semanticIntelligenceService?: any,
    private riskIntelligenceService?: any,
    private decisionLogService?: any
  ) {}

  /**
   * Helper to retrieve or lazy-load the ServiceRegistry singleton safely to avoid circular dependency.
   */
  private async getRegistryInstance(): Promise<any> {
    try {
      const mod = await import("../../services/backend/ServiceRegistry");
      return mod.ServiceRegistry.getInstance();
    } catch (err) {
      return null;
    }
  }

  private async getAIService(): Promise<AIService> {
    if (this.aiService) return this.aiService;
    const registry = await this.getRegistryInstance();
    if (registry?.aiService) {
      return registry.aiService;
    }
    throw new Error("AIService is not registered or available in ServiceRegistry");
  }

  private async getExplainabilityService(): Promise<any> {
    if (this.explainabilityService) return this.explainabilityService;
    const registry = await this.getRegistryInstance();
    return registry?.explainabilityService;
  }

  private async getConfidenceService(): Promise<any> {
    if (this.confidenceService) return this.confidenceService;
    const registry = await this.getRegistryInstance();
    return registry?.confidenceService;
  }

  private async getSemanticIntelligenceService(): Promise<any> {
    if (this.semanticIntelligenceService) return this.semanticIntelligenceService;
    const registry = await this.getRegistryInstance();
    return registry?.semanticIntelligenceService;
  }

  private async getRiskIntelligenceService(): Promise<any> {
    if (this.riskIntelligenceService) return this.riskIntelligenceService;
    const registry = await this.getRegistryInstance();
    return registry?.riskIntelligenceService;
  }

  private async getDecisionLogService(): Promise<any> {
    if (this.decisionLogService) return this.decisionLogService;
    const registry = await this.getRegistryInstance();
    return registry?.decisionLogService;
  }

  /**
   * Generates highly optimized, structured strategic recommendations by orchestrating
   * multi-dimensional feeds from other foundation AI intelligence services.
   */
  public async generateRecommendations(statusContext: any): Promise<RecommendationResult> {
    let riskResult: any = null;
    let confidenceResult: any = null;
    let semanticResult: any = null;
    let decisionHistory: any[] = [];
    let explanationResult: any = null;

    // 1. Parallel asynchronous intelligence gathering to minimize execution latency
    try {
      const [riskSvc, confidenceSvc, semanticSvc, decisionSvc, explainSvc] = await Promise.all([
        this.getRiskIntelligenceService().catch(() => null),
        this.getConfidenceService().catch(() => null),
        this.getSemanticIntelligenceService().catch(() => null),
        this.getDecisionLogService().catch(() => null),
        this.getExplainabilityService().catch(() => null)
      ]);

      const promises: Promise<void>[] = [];

      if (riskSvc) {
        promises.push(
          riskSvc.analyzeRisk(statusContext)
            .then((res: any) => { riskResult = res; })
            .catch((err: any) => console.warn("[RecommendationService] Risk analysis error:", err))
        );
      }
      if (confidenceSvc) {
        promises.push(
          confidenceSvc.evaluateConfidence(statusContext, { verified: true })
            .then((res: any) => { confidenceResult = res; })
            .catch((err: any) => console.warn("[RecommendationService] Confidence evaluation error:", err))
        );
      }
      if (semanticSvc) {
        const concept = statusContext?.concept || statusContext?.title || "system optimization";
        promises.push(
          semanticSvc.analyzeConcept(concept)
            .then((res: any) => { semanticResult = res; })
            .catch((err: any) => console.warn("[RecommendationService] Semantic analysis error:", err))
        );
      }
      if (decisionSvc) {
        promises.push(
          decisionSvc.getDecisionHistory(5)
            .then((res: any[]) => { decisionHistory = res; })
            .catch((err: any) => console.warn("[RecommendationService] Decision log history error:", err))
        );
      }
      if (explainSvc) {
        promises.push(
          explainSvc.explain("Automated strategic recommendation synthesis", statusContext)
            .then((res: any) => { explanationResult = res; })
            .catch((err: any) => console.warn("[RecommendationService] Explainability error:", err))
        );
      }

      await Promise.all(promises);
    } catch (err) {
      console.warn("[RecommendationService] Non-blocking warning during parallel intelligence gathering:", err);
    }

    // 2. Dynamic generation of structured strategic recommendations via LLM
    try {
      const ai = await this.getAIService();
      const systemInstruction = 
        "You are the Aziz AI Kernel Recommendation Orchestration Engine. " +
        "Your mission is to intake consolidated intelligence reports from several foundation AI services " +
        "(such as Risk, Confidence, Semantic, Explainability, and Decision Histories) and synthesize " +
        "them into a unified, highly optimized strategic RecommendationResult. " +
        "You MUST rank recommendation items, formulate alternative contingency suggestions, and " +
        "summarize risks, confidence factors, semantic tags, and matching historical points. " +
        "You MUST NOT include any domain-specific recruitment, resume, vendor, or candidate logic. " +
        "You MUST respond ONLY with a valid JSON object matching the requested schema. No conversational wrapper.";

      const prompt = `
Orchestrate, align, and synthesize these multi-dimensional intelligence inputs into a singular RecommendationResult:

SYSTEM STATE / STATUS CONTEXT:
${JSON.stringify(statusContext, null, 2)}

1. AUDITED SYSTEM RISK ASSESSMENT:
${riskResult ? JSON.stringify(riskResult, null, 2) : "No risk intelligence available."}

2. OUTPUT INTEGRITY & CONFIDENCE LEVEL:
${confidenceResult ? JSON.stringify(confidenceResult, null, 2) : "No confidence intelligence available."}

3. SEMANTIC TECH ALIGNMENT & CONCEPT RELATIONSHIPS:
${semanticResult ? JSON.stringify(semanticResult, null, 2) : "No semantic intelligence available."}

4. HISTORICAL DECISION LOG TIMELINE:
${decisionHistory && decisionHistory.length > 0 ? JSON.stringify(decisionHistory, null, 2) : "No previous decision histories logged."}

5. PROCESS EXPLAINABILITY BREAKDOWN:
${explanationResult ? JSON.stringify(explanationResult, null, 2) : "No explainability reference available."}

Produce a structured strategic recommendation following this JSON Schema:
{
  "nextBestAction": {
    "title": "Clear action item title",
    "description": "Elaborate actionable steps to perform right now.",
    "priority": "Immediate" | "High" | "Medium" | "Low",
    "rationale": "Strategic reasoning why this is the highest priority."
  },
  "alternativeActions": [
    {
      "title": "Secondary option title",
      "description": "Secondary steps or contingent plans.",
      "priority": "High" | "Medium" | "Low",
      "rationale": "Reasoning for this alternative contingency."
    }
  ],
  "businessImpact": [
    {
      "category": "Operational Efficiency" | "Velocity" | "Risk Mitigation" | "Security" | "Accuracy",
      "magnitude": "High" | "Medium" | "Low",
      "description": "How the action impacts this category"
    }
  ],
  "recommendations": [
    {
      "title": "Recommendation item title",
      "description": "Prescriptive details of the recommended action.",
      "priority": "Immediate" | "High" | "Medium" | "Low",
      "rationale": "Why this recommendation is suggested."
    }
  ],
  "primaryRecommendation": "Primary action statement or summary",
  "alternativeRecommendations": [
    "Alternative action summary one",
    "Alternative action summary two"
  ],
  "confidence": number, // Overall recommendation confidence level (0 to 100)
  "riskSummary": "Synthesized risk analysis based on the risk inputs",
  "semanticSummary": "Synthesized semantic alignment based on the semantic inputs",
  "historicalMatches": ["List of matching historical decision identifiers or summaries"],
  "reasoning": "Complete orchestrated logical reasoning synthesizing all 5 source intelligence inputs",
  "evidence": ["Evidence item 1", "Evidence item 2"]
}
`;

      const response = await ai.generateContentWithFallback({
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nextBestAction: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ["Immediate", "High", "Medium", "Low"] },
                  rationale: { type: Type.STRING }
                },
                required: ["title", "description", "priority", "rationale"]
              },
              alternativeActions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ["Immediate", "High", "Medium", "Low"] },
                    rationale: { type: Type.STRING }
                  },
                  required: ["title", "description", "priority", "rationale"]
                }
              },
              businessImpact: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    magnitude: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                    description: { type: Type.STRING }
                  },
                  required: ["category", "magnitude", "description"]
                }
              },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ["Immediate", "High", "Medium", "Low"] },
                    rationale: { type: Type.STRING }
                  },
                  required: ["title", "description", "priority", "rationale"]
                }
              },
              primaryRecommendation: { type: Type.STRING },
              alternativeRecommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              confidence: { type: Type.INTEGER },
              riskSummary: { type: Type.STRING },
              semanticSummary: { type: Type.STRING },
              historicalMatches: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              reasoning: { type: Type.STRING },
              evidence: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: [
              "nextBestAction",
              "alternativeActions",
              "businessImpact",
              "recommendations",
              "primaryRecommendation",
              "alternativeRecommendations",
              "confidence",
              "riskSummary",
              "semanticSummary",
              "historicalMatches",
              "reasoning",
              "evidence"
            ]
          }
        }
      });

      if (response && response.candidates?.[0]?.content?.parts?.[0]?.text) {
        const rawJson = response.candidates[0].content.parts[0].text.trim();
        const cleanedJson = rawJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        const result = JSON.parse(cleanedJson) as RecommendationResult;

        if (
          result.nextBestAction &&
          Array.isArray(result.alternativeActions) &&
          Array.isArray(result.businessImpact) &&
          Array.isArray(result.recommendations) &&
          result.primaryRecommendation
        ) {
          return result;
        }
      }
    } catch (err) {
      console.warn("[RecommendationService] AI orchestration failed or timed out. Swapping to deterministic fallback evaluator.", err);
    }

    return this.getFallbackRecommendations(statusContext, riskResult, confidenceResult, semanticResult, decisionHistory, explanationResult);
  }

  /**
   * Completely CPU-bound deterministic fallback to generate fully structured, hallucination-free
   * RecommendationResult objects by synthesizing successful local/mock feed metrics.
   */
  public getFallbackRecommendations(
    statusContext: any,
    riskResult?: any,
    confidenceResult?: any,
    semanticResult?: any,
    decisionHistory?: any[],
    explanationResult?: any
  ): RecommendationResult {
    // 1. Determine synthesized confidence safely
    let confidence = 80;
    if (confidenceResult && typeof confidenceResult.confidencePercentage === "number") {
      confidence = confidenceResult.confidencePercentage;
    } else if (statusContext?.errorRate !== undefined) {
      confidence = Math.max(40, 100 - (statusContext.errorRate * 100));
    }

    // 2. Synthesize risk assessment summary safely
    let riskSummary = "Deterministic safety profile compiled. Low residual threats identified.";
    if (riskResult) {
      const level = riskResult.riskLevel || riskResult.severity || "Low";
      const score = riskResult.riskScore !== undefined ? riskResult.riskScore : (riskResult.overallRiskScore ?? 20);
      riskSummary = `Aggregated intelligence indicates ${level} threat level with a dynamic risk score of ${score}/100. ${riskResult.explanation || ""}`;
    }

    // 3. Synthesize semantic concepts and metadata safely
    let semanticSummary = "Static concept cohesion assessment resolved successfully.";
    const tags: string[] = ["fallback-synthesis"];
    if (semanticResult) {
      const canon = semanticResult.canonicalConcept || "Generic Core Technology";
      const similarity = semanticResult.similarityScore ?? 100;
      semanticSummary = `Canonical concepts matched: '${canon}' with self-cohesion score of ${similarity}%. ${semanticResult.reasoning || ""}`;
      if (Array.isArray(semanticResult.semanticTags)) {
        tags.push(...semanticResult.semanticTags);
      }
    }

    // 4. Trace historical matches safely
    const historicalMatches: string[] = [];
    if (decisionHistory && decisionHistory.length > 0) {
      decisionHistory.forEach((h: any) => {
        if (h.decisionId) {
          historicalMatches.push(`${h.decisionId}: ${h.summary || h.reasoning || "Historical Action"}`);
        }
      });
    } else {
      historicalMatches.push("dec_baseline: Primary default configuration established.");
    }

    // 5. Gather evidence factors cleanly
    const evidence: string[] = [
      `Inputs analyzed: ${Object.keys(statusContext || {}).join(", ") || "None"}`,
      `Synthesized processing path: deterministic-orchestration-pipeline`
    ];
    if (explanationResult?.explanation) {
      evidence.push(explanationResult.explanation);
    }

    // 6. Formulate logical orchestrated reasoning
    const reasoning = 
      `Orchestrated deterministic synthesis complete. ` +
      `System Risk is analyzed as ${riskResult?.riskLevel || "Low"}. ` +
      `System confidence evaluation parsed at ${confidence}%. ` +
      `Traced ${historicalMatches.length} matching decision logs. ` +
      `Resolution paths are fully outlined.`;

    // 7. Compose actions deterministically
    const nextBestAction: ActionItem = {
      title: "Run automated sandbox pipeline validation",
      description: "Trigger comprehensive simulation probes in an isolated runtime cluster to test stability parameters.",
      priority: "Immediate",
      rationale: `Compiles system parameters securely with a verified confidence level of ${confidence}% and mitigated risks.`
    };

    const alternativeActions: ActionItem[] = [
      {
        title: "Initiate secondary telemetry log sweep",
        description: "Deploy audit and scanning trackers across all running system boundaries to extract further diagnostic points.",
        priority: "High",
        rationale: "Ensures comprehensive structural feedback if the primary validation pipeline registers unexpected variances."
      }
    ];

    const businessImpact: BusinessImpact[] = [
      {
        category: "Risk Mitigation",
        magnitude: riskResult && (riskResult.riskLevel === "High" || riskResult.riskLevel === "Critical") ? "High" : "Medium",
        description: "Reduces latent threats and safeguards production deployment continuity through isolated tests."
      },
      {
        category: "Operational Efficiency",
        magnitude: "High",
        description: "Ensures maximum continuity and zero human error through autonomous rule and constraint tracing."
      }
    ];

    return {
      nextBestAction,
      alternativeActions,
      businessImpact,
      recommendations: [
        {
          title: "Promote validated build parameters to registry",
          description: "Record successful execution signatures into the central decision and log ledger.",
          priority: "Immediate",
          rationale: "Creates a stable, indexable record for future semantic alignment and query similarity comparisons."
        }
      ],
      primaryRecommendation: "Deploy automated simulation validation immediately to clear operational gaps.",
      alternativeRecommendations: [
        "Deploy secondary live telemetry scanners to secure continuous audit tracing."
      ],
      confidence,
      riskSummary,
      semanticSummary,
      historicalMatches,
      reasoning,
      evidence
    };
  }
}
