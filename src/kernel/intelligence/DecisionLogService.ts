import { IAppRepository } from "../../domains/shared/repository/IRepository";
import { AIService } from "../../domains/infrastructure/AIService";
import { IDecisionLogService, DecisionLogEntry, DecisionRecord } from "./types";
import { Type } from "@google/genai";

export class DecisionLogService implements IDecisionLogService {
  private readonly collectionName = "decision_logs";
  private readonly recordCollectionName = "decision_records";

  constructor(
    private repo: IAppRepository,
    private aiService?: AIService
  ) {}

  /**
   * Helper to retrieve or lazy-load the AIService singleton safely.
   */
  private async getAIService(): Promise<AIService> {
    if (this.aiService) return this.aiService;
    try {
      // Lazy load ServiceRegistry to prevent circular dependency at module evaluation time
      const mod = await import("../../services/backend/ServiceRegistry");
      const ServiceRegistry = mod.ServiceRegistry;
      const instance = ServiceRegistry.getInstance();
      if (instance && instance.aiService) {
        return instance.aiService;
      }
    } catch (err) {
      // Direct logging or unit test mock execution
    }
    throw new Error("AIService is not available or registered in ServiceRegistry");
  }

  /**
   * Legacy interface implementation:
   * Appends an immutable, audit-safe record of a critical AI matching, risk, or validation action.
   */
  public async logDecision(entry: Omit<DecisionLogEntry, "id" | "timestamp">): Promise<DecisionLogEntry> {
    const id = "dec_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
    const timestamp = new Date().toISOString();

    const fullEntry: DecisionLogEntry = {
      id,
      timestamp,
      ...entry
    };

    try {
      await this.repo.insert(this.collectionName, fullEntry);
      await this.repo.addSystemLog("info", "ai", `Logged AI decision: ${entry.decisionSummary.substring(0, 80)}...`);
    } catch (err) {
      console.error("[DecisionLogService] Failed to insert decision log into repository.", err);
    }

    return fullEntry;
  }

  /**
   * Legacy interface implementation:
   * Retrieves the comprehensive timeline execution ledger of system actions.
   */
  public async getLogs(limit = 100): Promise<DecisionLogEntry[]> {
    try {
      const logs = await this.repo.findAll<DecisionLogEntry>(this.collectionName);
      const sorted = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return sorted.slice(0, limit);
    } catch (err) {
      console.warn("[DecisionLogService] Failed to fetch decision logs from repository. Returning empty list.", err);
      return [];
    }
  }

  /**
   * Normalizes, explains, and records an arbitrary decision input into a structured DecisionRecord.
   */
  public async recordDecision(decisionInput: Record<string, any>): Promise<DecisionRecord> {
    let record: DecisionRecord;

    try {
      const ai = await this.getAIService();
      const systemInstruction =
        "You are the Aziz AI Kernel Decision Normalization & Explanation Engine. " +
        "Your mission is to intake arbitrary, generic decision parameters and produce a standardized DecisionRecord JSON. " +
        "You must extract or generate a concise summary, rich explainable reasoning, confidence score (0-100), risk summary, semantic tags, and any explainability references. " +
        "You MUST NOT include any domain-specific recruitment, resume, vendor, or candidate logic. " +
        "You MUST respond ONLY with a valid JSON object matching the requested schema. No free-text outside the JSON.";

      const prompt = `
Perform decision normalization, reasoning extraction, and risk assessment on this payload:
PAYLOAD:
${JSON.stringify(decisionInput, null, 2)}
`;

      const response = await ai.generateContentWithFallback({
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: "A concise summary of the decision made" },
              reasoning: { type: Type.STRING, description: "Detailed, explainable reasoning justifying this decision" },
              confidence: { type: Type.INTEGER, description: "System confidence from 0 to 100" },
              riskSummary: { type: Type.STRING, description: "Conservative summary of risks or assumptions associated with this decision" },
              semanticTags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of generic tags related to the decision type or elements involved"
              },
              explainabilityReference: { type: Type.STRING, description: "Optional reference or logic block ID" }
            },
            required: ["summary", "reasoning", "confidence", "riskSummary", "semanticTags"]
          }
        }
      });

      if (response && response.candidates?.[0]?.content?.parts?.[0]?.text) {
        const rawJson = response.candidates[0].content.parts[0].text.trim();
        const cleanedJson = rawJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        const parsed = JSON.parse(cleanedJson);

        if (
          parsed &&
          typeof parsed.summary === "string" &&
          typeof parsed.reasoning === "string" &&
          typeof parsed.confidence === "number" &&
          typeof parsed.riskSummary === "string" &&
          Array.isArray(parsed.semanticTags)
        ) {
          record = {
            decisionId: this.generateStableId(decisionInput),
            timestamp: new Date().toISOString(),
            summary: parsed.summary,
            reasoning: parsed.reasoning,
            confidence: parsed.confidence,
            riskSummary: parsed.riskSummary,
            semanticTags: parsed.semanticTags,
            explainabilityReference: parsed.explainabilityReference,
            metadata: {
              engine: "Gemini-3.5-Flash",
              inputKeys: Object.keys(decisionInput),
              version: "1.0"
            }
          };
          
          // Save and return
          await this.saveRecord(record);
          return record;
        }
      }
    } catch (err) {
      console.warn("[DecisionLogService] Failed to record decision via AI, resorting to fallback. Error:", err);
    }

    record = this.getFallbackDecision(decisionInput);
    await this.saveRecord(record);
    return record;
  }

  /**
   * Retrieves the structured decision records history.
   */
  public async getDecisionHistory(limit = 100): Promise<DecisionRecord[]> {
    try {
      const records = await this.repo.findAll<DecisionRecord>(this.recordCollectionName);
      const sorted = records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return sorted.slice(0, limit);
    } catch (err) {
      console.warn("[DecisionLogService] Failed to retrieve decision history from repository.", err);
      return [];
    }
  }

  /**
   * Compares a given target reasoning or decision with historical decisions to find similarities.
   */
  public async findSimilarDecisions(
    targetReasoning: string,
    limit = 5
  ): Promise<Array<{ record: DecisionRecord; similarityScore: number; matchExplanation: string }>> {
    const history = await this.getDecisionHistory();
    if (history.length === 0) {
      return [];
    }

    try {
      const ai = await this.getAIService();
      const systemInstruction =
        "You are the Aziz AI Kernel Decision Similarity Engine. " +
        "Your goal is to compare a target reasoning statement with a list of historical decision records. " +
        "You must output a JSON array containing the similarity matches. " +
        "For each match, return the matching decisionId, a similarityScore from 0 to 100, and a matchExplanation. " +
        "Analyze the core concepts, constraints, confidence scores, and logic inside the reasoning fields. " +
        "You MUST respond ONLY with valid JSON matching the schema. No conversational prefix or suffix.";

      const comparisonList = history.map((h) => ({
        decisionId: h.decisionId,
        summary: h.summary,
        reasoning: h.reasoning,
        semanticTags: h.semanticTags
      }));

      const response = await ai.generateContentWithFallback({
        contents: `
Target reasoning to compare: "${targetReasoning}"

Compare against this historical list:
${JSON.stringify(comparisonList, null, 2)}
`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                decisionId: { type: Type.STRING },
                similarityScore: { type: Type.INTEGER, description: "Similarity score from 0 to 100" },
                matchExplanation: { type: Type.STRING, description: "Rationale for why these are similar or different" }
              },
              required: ["decisionId", "similarityScore", "matchExplanation"]
            }
          }
        }
      });

      if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const rawText = response.candidates[0].content.parts[0].text.trim();
        const cleanedText = rawText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        const matches = JSON.parse(cleanedText) as Array<{ decisionId: string; similarityScore: number; matchExplanation: string }>;

        const results = matches
          .map((m) => {
            const rec = history.find((h) => h.decisionId === m.decisionId);
            if (!rec) return null;
            return {
              record: rec,
              similarityScore: m.similarityScore,
              matchExplanation: m.matchExplanation
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null)
          .sort((a, b) => b.similarityScore - a.similarityScore)
          .slice(0, limit);

        return results;
      }
    } catch (err) {
      console.warn("[DecisionLogService] Failed to analyze decision similarity via AI, using fallback. Error:", err);
    }

    return this.getFallbackSimilarDecisions(targetReasoning, history, limit);
  }

  /**
   * Evaluates the evolution of reasoning across historical decision logs.
   */
  public async trackReasonEvolution(
    contextCategory?: string
  ): Promise<{ trendSummary: string; changesDetected: string[]; confidenceTrend: number[] }> {
    const history = await this.getDecisionHistory();
    if (history.length === 0) {
      return {
        trendSummary: "No historical decision records available to track reason evolution.",
        changesDetected: [],
        confidenceTrend: []
      };
    }

    // Filter by contextCategory if specified
    const filtered = contextCategory 
      ? history.filter((h) => h.semanticTags.some((tag) => tag.toLowerCase().includes(contextCategory.toLowerCase())))
      : history;

    const confidenceTrend = filtered.map((h) => h.confidence).reverse();

    try {
      const ai = await this.getAIService();
      const systemInstruction =
        "You are the Aziz AI Kernel Reason Evolution Tracking Engine. " +
        "Your mission is to analyze a chronological sequence of decision reasons and summaries, " +
        "and synthesize how reasoning has evolved, identifying key transitions, shifts in confidence, and repeating risk factors. " +
        "You must respond ONLY with a valid JSON object matching the requested schema. No conversational text.";

      const inputData = filtered
        .map((h) => ({
          timestamp: h.timestamp,
          summary: h.summary,
          reasoning: h.reasoning,
          confidence: h.confidence,
          semanticTags: h.semanticTags
        }))
        .reverse();

      const response = await ai.generateContentWithFallback({
        contents: `
Analyze the evolution of reasoning for these decisions:
CHRONOLOGICAL HISTORICAL LOGS:
${JSON.stringify(inputData, null, 2)}
`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              trendSummary: { type: Type.STRING, description: "Detailed narrative describing how decision logic and parameters evolved over time" },
              changesDetected: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Major changes, shifts, or deviations detected in reasoning patterns"
              }
            },
            required: ["trendSummary", "changesDetected"]
          }
        }
      });

      if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const rawText = response.candidates[0].content.parts[0].text.trim();
        const cleanedText = rawText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        const result = JSON.parse(cleanedText) as { trendSummary: string; changesDetected: string[] };

        return {
          trendSummary: result.trendSummary,
          changesDetected: result.changesDetected,
          confidenceTrend
        };
      }
    } catch (err) {
      console.warn("[DecisionLogService] Failed to analyze reason evolution via AI, using fallback. Error:", err);
    }

    // Fallback: local trend tracking
    const changesDetected: string[] = [];
    if (confidenceTrend.length > 1) {
      const delta = confidenceTrend[confidenceTrend.length - 1] - confidenceTrend[0];
      if (Math.abs(delta) > 5) {
        changesDetected.push(`System confidence shifted by ${delta.toFixed(1)}% from earliest record to most recent.`);
      } else {
        changesDetected.push("System confidence level remained stable across the logged period.");
      }
    }

    const uniqueTags = new Set(filtered.flatMap((h) => h.semanticTags));
    if (uniqueTags.size > 0) {
      changesDetected.push(`Decision spectrum expanded across ${uniqueTags.size} distinct semantic tags: ${Array.from(uniqueTags).join(", ")}.`);
    }

    const trendSummary = `Local heuristic evolution analyzer processed ${filtered.length} decision records. Confidence trend starts at ${confidenceTrend[0] || 0}% and concludes at ${confidenceTrend[confidenceTrend.length - 1] || 0}%.`;

    return {
      trendSummary,
      changesDetected,
      confidenceTrend
    };
  }

  /**
   * Internal helper to persist structured decision records safely.
   */
  private async saveRecord(record: DecisionRecord): Promise<void> {
    try {
      await this.repo.insert(this.recordCollectionName, record);
    } catch (err) {
      console.error("[DecisionLogService] Failed to save DecisionRecord to repository.", err);
    }
  }

  /**
   * Generates a stable, hash-based decision identifier for deterministic processing.
   */
  public generateStableId(input: any): string {
    if (!input || (typeof input === "object" && Object.keys(input).length === 0)) return "dec_fallback_empty";
    const str = JSON.stringify(input);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `dec_stable_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Fallback structured decision generator when AI provider is unavailable.
   */
  public getFallbackDecision(decisionInput: any): DecisionRecord {
    const decisionId = this.generateStableId(decisionInput);
    const timestamp = new Date().toISOString();
    const summary = decisionInput?.summary || decisionInput?.title || "Fallback decision normalization";

    let reasoning = "Fallback deterministic analysis executed due to AI Provider service interruption or timeout.";
    let confidence = 80;
    let riskSummary = "No active risk indicators detected.";
    const semanticTags = ["fallback-processed", "deterministic-engine"];

    if (decisionInput) {
      const keys = Object.keys(decisionInput);
      semanticTags.push(...keys.map((k) => k.toLowerCase()));

      const str = JSON.stringify(decisionInput).toLowerCase();
      if (str.includes("error") || str.includes("fail") || str.includes("crash")) {
        confidence = 55;
        riskSummary = "Conservative warning: input payload contains error tags, live failure records, or platform crashes.";
        reasoning = "Deterministic warning triggered. Critical parameters indicate a potential system failure, exception, or instability.";
        semanticTags.push("system-failure");
      } else if (str.includes("security") || str.includes("unauthorized") || str.includes("expired")) {
        confidence = 60;
        riskSummary = "Conservative warning: input references potential security alerts, credentials, or authorization blocks.";
        reasoning = "Deterministic warning triggered. Input context contains potential zero-trust security warnings or expired states.";
        semanticTags.push("access-control");
      }
    }

    return {
      decisionId,
      timestamp,
      summary,
      reasoning,
      confidence,
      riskSummary,
      semanticTags,
      metadata: {
        engine: "Fallback-Static",
        inputKeys: decisionInput ? Object.keys(decisionInput) : [],
        version: "1.0"
      }
    };
  }

  /**
   * Local text similarity calculation heuristic.
   */
  private getFallbackSimilarDecisions(
    target: string,
    history: DecisionRecord[],
    limit: number
  ): Array<{ record: DecisionRecord; similarityScore: number; matchExplanation: string }> {
    const targetWords = target.toLowerCase().match(/\w+/g) || [];

    const matches = history.map((record) => {
      const recordText = (record.reasoning + " " + record.summary).toLowerCase();
      let commonCount = 0;
      targetWords.forEach((w) => {
        if (w.length > 3 && recordText.includes(w)) {
          commonCount++;
        }
      });

      let similarityScore = Math.min(15 + commonCount * 12, 90);

      record.semanticTags.forEach((tag) => {
        if (target.toLowerCase().includes(tag.toLowerCase())) {
          similarityScore += 10;
        }
      });

      similarityScore = Math.min(similarityScore, 100);

      return {
        record,
        similarityScore,
        matchExplanation: `Local heuristic similarity calculation identified ${commonCount} matching semantic parameters & tag overlap.`
      };
    });

    return matches.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, limit);
  }
}
