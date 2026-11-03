import { AIService } from "../../domains/infrastructure/AIService";
import { IRiskIntelligenceService, RiskAnalysisResult, RiskCategoryBreakdown, RiskFactor, RiskMitigation } from "./types";
import { Type } from "@google/genai";

export class RiskIntelligenceService implements IRiskIntelligenceService {
  constructor(private aiService: AIService) {}

  /**
   * Audits profiles, contracts, actions, or setups to detect latent threats, alignment risk, or security vulnerabilities.
   * @param auditContext Context info and items to be audited for risks
   */
  public async analyzeRisk(auditContext: any): Promise<RiskAnalysisResult> {
    try {
      const systemInstruction = 
        "You are the Aziz AI Kernel Risk Intelligence & Threat Audit Engine. " +
        "Your mission is to perform structured, multi-dimensional risk audits on arbitrary system setups, profiles, data configurations, or specifications. " +
        "You categorize risks generically (Operational, Technical, Compliance, Financial, Security, Quality, Reliability, Unknown) and estimate " +
        "probability (0-100%), overall risk score (0-100), risk levels/severities, and formulate discrete actionable mitigation suggestions. " +
        "You MUST NOT include any domain-specific recruitment, resume, vendor, or candidate logic. " +
        "You MUST respond ONLY with a valid JSON object matching the requested schema. No free-text outside the JSON.";

      const prompt = `
Perform a high-quality, generic risk intelligence assessment on this context:
CONTEXT PAYLOAD:
${JSON.stringify(auditContext, null, 2)}

Identify potential risks, assign normalized scores, estimate probability likelihoods, formulate evidence-supported threat vectors, and outline concrete mitigations.
`;

      const response = await this.aiService.generateContentWithFallback({
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskScore: {
                type: Type.INTEGER,
                description: "Overall legacy normalized risk score from 0 to 100"
              },
              riskLevel: {
                type: Type.STRING,
                enum: ["Low", "Medium", "High", "Critical"],
                description: "Overall legacy risk level tier"
              },
              overallRiskScore: {
                type: Type.INTEGER,
                description: "Normalized overall risk score from 0 to 100"
              },
              severity: {
                type: Type.STRING,
                enum: ["Critical", "High", "Medium", "Low", "Informational"],
                description: "Overall risk severity level"
              },
              probability: {
                type: Type.INTEGER,
                description: "Estimated risk probability likelihood from 0 to 100 percent"
              },
              confidencePercentage: {
                type: Type.INTEGER,
                description: "Confidence in the risk assessment accuracy from 0 to 100"
              },
              explanation: {
                type: Type.STRING,
                description: "High-level summary of risks identified"
              },
              reasoning: {
                type: Type.STRING,
                description: "Explainable rationale supporting this risk assessment"
              },
              evidence: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Specific data inputs, missing parameters, or indicators that serve as risk evidence"
              },
              riskCategories: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: {
                      type: Type.STRING,
                      enum: ["Operational", "Technical", "Compliance", "Financial", "Security", "Quality", "Reliability", "Unknown"],
                      description: "Generic risk categorization"
                    },
                    score: { type: Type.INTEGER, description: "Category specific risk score from 0 to 100" }
                  },
                  required: ["category", "score"]
                },
                description: "Generic risk categories breakdown"
              },
              riskFactors: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    factor: { type: Type.STRING, description: "The core risk driver or failure mode name" },
                    riskCategory: { type: Type.STRING, description: "Associated risk category" },
                    severity: {
                      type: Type.STRING,
                      enum: ["Minor", "Moderate", "Major", "Critical"],
                      description: "Severity of this specific risk factor"
                    },
                    explanation: { type: Type.STRING, description: "How this risk factor could disrupt operations or systems" }
                  },
                  required: ["factor", "riskCategory", "severity", "explanation"]
                },
                description: "Specific identified risk factors"
              },
              mitigationSuggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    riskFactor: { type: Type.STRING, description: "Associated risk factor name" },
                    actionableMitigation: { type: Type.STRING, description: "Actionable concrete recommendation to mitigate risk" },
                    priority: {
                      type: Type.STRING,
                      enum: ["High", "Medium", "Low"],
                      description: "Urgency priority tier"
                    }
                  },
                  required: ["riskFactor", "actionableMitigation", "priority"]
                },
                description: "Concrete mitigation plans"
              }
            },
            required: [
              "riskScore",
              "riskLevel",
              "overallRiskScore",
              "severity",
              "probability",
              "confidencePercentage",
              "explanation",
              "reasoning",
              "evidence",
              "riskCategories",
              "riskFactors",
              "mitigationSuggestions"
            ]
          }
        }
      });

      if (response && response.candidates?.[0]?.content?.parts?.[0]?.text) {
        const rawJson = response.candidates[0].content.parts[0].text.trim();
        const cleanedJson = rawJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        const result = JSON.parse(cleanedJson) as RiskAnalysisResult;

        // Ensure robust structural verification
        if (
          result &&
          typeof result.riskScore === "number" &&
          result.riskLevel &&
          typeof result.overallRiskScore === "number" &&
          result.severity &&
          typeof result.probability === "number" &&
          typeof result.confidencePercentage === "number" &&
          Array.isArray(result.evidence) &&
          Array.isArray(result.riskCategories) &&
          Array.isArray(result.riskFactors) &&
          Array.isArray(result.mitigationSuggestions) &&
          typeof result.reasoning === "string"
        ) {
          result.mitigations = result.mitigations || result.mitigationSuggestions;
          return result;
        }
      }
    } catch (err) {
      console.warn("[RiskIntelligenceService] Gemini call failed, resorting to static fallback evaluator. Error:", err);
    }

    return this.getFallbackRisk(auditContext);
  }

  /**
   * Generates a structural, high-quality fallback risk assessment in case the AI provider is unavailable.
   */
  public getFallbackRisk(auditContext: any): RiskAnalysisResult {
    const evidence: string[] = [];
    const riskCategories: RiskCategoryBreakdown[] = [];
    const riskFactors: RiskFactor[] = [];
    const mitigations: RiskMitigation[] = [];

    // Conservative default risk score (starts low but scales up as context lacks or contains errors)
    let overallRiskScore = 20;
    let confidencePercentage = 85;

    if (!auditContext || (typeof auditContext === "object" && Object.keys(auditContext).length === 0)) {
      // Missing context is an Operational/Technical risk
      overallRiskScore = 75; // Conservative high risk due to complete omission of context
      confidencePercentage = 95;
      evidence.push("The input auditContext object was null, undefined, or empty.");
      
      riskCategories.push(
        { category: "Operational", score: 80 },
        { category: "Technical", score: 70 }
      );

      riskFactors.push({
        factor: "Lack of Contextual Input",
        riskCategory: "Operational",
        severity: "Critical",
        explanation: "Running a risk assessment on non-existent or empty parameters provides zero visibility."
      });

      mitigations.push({
        riskFactor: "Lack of Contextual Input",
        actionableMitigation: "Provide a valid structured Record<string, any> object as input parameters before requesting an audit.",
        priority: "High"
      });
    } else {
      // Analyze available keys and string contents
      const contextString = JSON.stringify(auditContext).toLowerCase();
      const keys = Object.keys(auditContext);
      
      evidence.push(`Audited ${keys.length} core keys from context payload.`);

      // Obvious missing information detection
      const expectedKeys = ["id", "version", "status", "environment", "auth"];
      expectedKeys.forEach((k) => {
        if (!keys.some(key => key.toLowerCase() === k)) {
          overallRiskScore += 10;
          evidence.push(`Missing expected primary system parameter: '${k}'`);
          
          riskFactors.push({
            factor: `Missing Parameter: ${k}`,
            riskCategory: "Technical",
            severity: "Moderate",
            explanation: `Omitting the '${k}' parameter from system setups blocks tracing and telemetry.`
          });

          mitigations.push({
            riskFactor: `Missing Parameter: ${k}`,
            actionableMitigation: `Define and seed the '${k}' parameter within the configuration manifest.`,
            priority: "Medium"
          });
        }
      });

      // Scan for explicit threat words
      if (contextString.includes("error") || contextString.includes("fail") || contextString.includes("crash")) {
        overallRiskScore += 20;
        evidence.push("Detected active error, failure, or crash logs in the audit payload.");
        
        riskFactors.push({
          factor: "Runtime Operational Failures",
          riskCategory: "Reliability",
          severity: "Major",
          explanation: "Active exceptions or error states indicate a system experiencing live failures."
        });

        mitigations.push({
          riskFactor: "Runtime Operational Failures",
          actionableMitigation: "Trace stack logs, quarantine affected routines, and trigger failover state loops.",
          priority: "High"
        });
      }

      if (contextString.includes("legacy") || contextString.includes("deprecated") || contextString.includes("unsupported")) {
        overallRiskScore += 15;
        evidence.push("Detected deprecated or legacy components in use.");

        riskFactors.push({
          factor: "Legacy Dependency Risk",
          riskCategory: "Technical",
          severity: "Moderate",
          explanation: "Utilizing out-of-support or deprecated components exposes the host platform to compatibility degradation."
        });

        mitigations.push({
          riskFactor: "Legacy Dependency Risk",
          actionableMitigation: "Schedule migration blueprints to transition to modern fully-supported package updates.",
          priority: "Medium"
        });
      }

      if (contextString.includes("secret") || contextString.includes("password") || contextString.includes("key") || contextString.includes("token")) {
        overallRiskScore += 15;
        evidence.push("Detected credential references or potentially plain-text token words.");

        riskFactors.push({
          factor: "Credential Exposure Vector",
          riskCategory: "Security",
          severity: "Major",
          explanation: "Including references to secrets or access keys in diagnostic payloads risks credential leaks in audit trail files."
        });

        mitigations.push({
          riskFactor: "Credential Exposure Vector",
          actionableMitigation: "Enforce strict zero-trust sanitization rules to scrub or mask plain-text keys before auditing.",
          priority: "High"
        });
      }

      // Populate categories dynamically based on detected risks
      const technicalScore = Math.min(overallRiskScore, 100);
      const operationalScore = Math.min(Math.max(overallRiskScore - 10, 15), 100);
      const securityScore = contextString.includes("secret") ? Math.min(overallRiskScore + 10, 100) : 10;
      
      riskCategories.push(
        { category: "Technical", score: technicalScore },
        { category: "Operational", score: operationalScore },
        { category: "Security", score: securityScore }
      );

      // Default fallback risk factor if none was added
      if (riskFactors.length === 0) {
        riskFactors.push({
          factor: "Unvalidated Configuration Stream",
          riskCategory: "Quality",
          severity: "Minor",
          explanation: "Audit parameters were processed without an explicit system signature validation."
        });

        mitigations.push({
          riskFactor: "Unvalidated Configuration Stream",
          actionableMitigation: "Incorporate strict input schema schema-validators at runtime boundaries.",
          priority: "Low"
        });
      }
    }

    // Clamp risk score to maximum conservative limits
    overallRiskScore = Math.min(Math.max(overallRiskScore, 10), 100);
    const probability = Math.min(Math.max(Math.floor(overallRiskScore * 0.95), 10), 100);

    let severity: "Critical" | "High" | "Medium" | "Low" | "Informational" = "Low";
    let riskLevel: "Low" | "Medium" | "High" | "Critical" = "Low";

    if (overallRiskScore >= 75) {
      severity = "Critical";
      riskLevel = "Critical";
    } else if (overallRiskScore >= 50) {
      severity = "High";
      riskLevel = "High";
    } else if (overallRiskScore >= 30) {
      severity = "Medium";
      riskLevel = "Medium";
    }

    const reasoning = `Fallback conservative risk calculation of ${overallRiskScore}% score with ${probability}% probability based on contextual heuristics. Evidence contains ${evidence.length} items.`;

    return {
      riskScore: overallRiskScore,
      riskLevel,
      overallRiskScore,
      severity,
      probability,
      confidencePercentage,
      explanation: "Fallback assessment generated successfully due to AI provider unavailability or parsing constraints.",
      reasoning,
      evidence,
      riskCategories,
      riskFactors,
      mitigations,
      mitigationSuggestions: mitigations
    };
  }
}
