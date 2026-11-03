/**
 * @file /src/kernel/intelligence/types.ts
 * @description Centralized, domain-independent interfaces and type declarations for the platform AI Intelligence services.
 * Part of the Aziz Assistant AI Kernel.
 */

// ==========================================
// 1. EXPLAINABILITY SERVICE CONTRACTS
// ==========================================

export interface Evidence {
  source: string;
  description: string;
  strength: number; // 0.0 to 1.0 (relevance/weight)
}

export interface FactorContribution {
  factor: string;
  weight: number; // 0.0 to 1.0 (contribution weight)
  rationale: string;
}

export interface AlternativeOutcome {
  scenario: string;
  likelihood: number; // 0.0 to 1.0
  impact: string;
}

export interface ExplanationResult {
  reasoningBreakdown: string[];
  evidenceCollected: Evidence[];
  explanation: string;
  weightedContributions: FactorContribution[];
  alternativeOutcomes: AlternativeOutcome[];
}

export interface IExplainabilityService {
  /**
   * Explains a complex decision, scoring outcome, or assessment with a multi-layered reasoning breakdown.
   * @param decisionContext Description of the decision or output to be explained
   * @param inputs Inputs/data considered during the decision process
   */
  explain(decisionContext: string, inputs: Record<string, any>): Promise<ExplanationResult>;
}

// ==========================================
// 2. CONFIDENCE SERVICE CONTRACTS
// ==========================================

export interface ConfidenceFactor {
  factor: string;
  impact: "Positive" | "Negative" | "Neutral";
  description: string;
}

export interface Uncertainty {
  item: string;
  possibleInterpretations: string[];
  riskLevel: "High" | "Medium" | "Low";
}

export interface MissingInformation {
  field: string;
  description: string;
  importance: "Critical" | "Useful" | "Minor";
}

export interface ConfidenceResult {
  confidencePercentage: number; // 0 to 100
  confidenceCategory: "High" | "Medium" | "Low";
  confidenceFactors: ConfidenceFactor[];
  uncertaintiesDetected: Uncertainty[];
  missingInformation: MissingInformation[];
}

export interface IConfidenceService {
  /**
   * Estimates the accuracy and stability confidence level of an assessment or extraction.
   * Identifies systemic data gaps and uncertainties.
   * @param sourceData The input data analyzed
   * @param processedOutput The resulting output or prediction to verify
   */
  evaluateConfidence(sourceData: any, processedOutput: any): Promise<ConfidenceResult>;
}

// ==========================================
// 3. SKILL INTELLIGENCE SERVICE CONTRACTS
// ==========================================

export interface TechnologyMapping {
  ecosystem: string; // e.g. "JavaScript", "Cloud Infrastructure", "Systems Architecture"
  subsector: string; // e.g. "Frontend Frameworks", "NoSQL Databases", "IAC"
  parentTech?: string; // e.g. "Node.js", "AWS"
}

export interface NormalizedSkill {
  name: string; // Standardized name
  category: string;
  synonyms: string[];
  versionAwareness: string;
  aliases: string[];
  technologyMapping: TechnologyMapping;
  frameworkMapping?: {
    metaFrameworks?: string[];
    relatedLibraries?: string[];
  };
}

export interface ISkillIntelligenceService {
  /**
   * Normalizes a raw, non-standardized skill, framework, technology, or domain name.
   */
  normalizeSkill(rawSkill: string): Promise<NormalizedSkill>;

  /**
   * Returns a complete list of known synonyms and alternative terms for a given skill.
   */
  getSynonyms(skillName: string): Promise<string[]>;

  /**
   * Maps parent technology dependencies, associated meta-frameworks, and typical ecosystems.
   */
  mapTechnologyRelations(skillName: string): Promise<TechnologyMapping>;
}

// ==========================================
// 4. SEMANTIC MATCHING SERVICE CONTRACTS
// ==========================================

export interface TechRelationship {
  sourceTech: string;
  targetTech: string;
  relationType: "Direct Match" | "Compatible" | "Superset" | "Subset" | "Unrelated";
  strength: number; // 0.0 to 1.0
}

export interface TransferableSkill {
  skill: string;
  targetDomainSkill: string;
  transferabilityIndex: number; // 0.0 to 1.0
  explanation: string;
}

export interface SemanticMatchResult {
  similarityScore: number; // 0 to 100
  technologyRelationships: TechRelationship[];
  roleSimilarity: {
    score: number; // 0 to 100
    rationale: string;
  };
  transferableSkills: TransferableSkill[];
  relatedExperienceAnalysis: {
    score: number; // 0 to 100
    evidenceSummary: string;
  };
}

export interface ISemanticMatchingService {
  /**
   * Performs deep semantic comparison between a profile / resource description and a target specification.
   * Transcends strict exact keyword matching using technology clustering and transferable domain dynamics.
   * @param sourceProfile Text or structured data representing the source entity
   * @param targetRequirement Text or structured data representing target expectations
   */
  match(sourceProfile: any, targetRequirement: any): Promise<SemanticMatchResult>;
}

// ==========================================
// 5. RISK INTELLIGENCE SERVICE CONTRACTS
// ==========================================

export interface RiskCategoryBreakdown {
  category: string;
  score: number; // 0 to 100
}

export interface RiskFactor {
  factor: string;
  riskCategory: string;
  severity: "Minor" | "Moderate" | "Major" | "Critical";
  explanation: string;
}

export interface RiskMitigation {
  riskFactor: string;
  actionableMitigation: string;
  priority: "High" | "Medium" | "Low";
}

export interface RiskAnalysisResult {
  riskScore: number; // 0 to 100
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  riskCategories: RiskCategoryBreakdown[];
  riskFactors: RiskFactor[];
  explanation: string;
  mitigationSuggestions: RiskMitigation[];

  // New Sprint 14 Unified Fields
  overallRiskScore: number; // 0 to 100
  severity: "Critical" | "High" | "Medium" | "Low" | "Informational";
  probability: number; // 0 to 100 representing likelihood
  confidencePercentage: number; // 0 to 100 representing confidence in assessment
  evidence: string[];
  mitigations: RiskMitigation[];
  reasoning: string;
}

export interface IRiskIntelligenceService {
  /**
   * Audits profiles, contracts, actions, or setups to detect latent threats, alignment risk, or security vulnerabilities.
   * @param auditContext Context info and items to be audited for risks
   */
  analyzeRisk(auditContext: any): Promise<RiskAnalysisResult>;
}

// ==========================================
// 6. DECISION LOG SERVICE CONTRACTS
// ==========================================

export interface DecisionLogEntry {
  id: string;
  decisionSummary: string;
  evidenceUsed: string[];
  confidence: number; // 0 to 100
  reasoning: string;
  timestamp: string; // ISO string format
  model: string;
  version: string;
}

export interface DecisionRecord {
  decisionId: string;
  timestamp: string;
  summary: string;
  reasoning: string;
  confidence: number; // 0 to 100
  riskSummary: string;
  semanticTags: string[];
  explainabilityReference?: string;
  metadata: Record<string, any>;
}

export interface IDecisionLogService {
  /**
   * Appends an immutable, audit-safe record of a critical AI matching, risk, or validation action.
   */
  logDecision(entry: Omit<DecisionLogEntry, "id" | "timestamp">): Promise<DecisionLogEntry>;

  /**
   * Retrieves the comprehensive timeline execution ledger of system actions.
   */
  getLogs(limit?: number): Promise<DecisionLogEntry[]>;

  /**
   * Normalizes, explains, and records an arbitrary decision input into a structured DecisionRecord.
   */
  recordDecision(decisionInput: Record<string, any>): Promise<DecisionRecord>;

  /**
   * Retrieves the structured decision records history.
   */
  getDecisionHistory(limit?: number): Promise<DecisionRecord[]>;

  /**
   * Compares a given target reasoning or decision with historical decisions to find similarities.
   */
  findSimilarDecisions(targetReasoning: string, limit?: number): Promise<Array<{ record: DecisionRecord; similarityScore: number; matchExplanation: string }>>;

  /**
   * Evaluates the evolution of reasoning across historical decision logs.
   */
  trackReasonEvolution(contextCategory?: string): Promise<{ trendSummary: string; changesDetected: string[]; confidenceTrend: number[] }>;
}

// ==========================================
// 7. RECOMMENDATION SERVICE CONTRACTS
// ==========================================

export interface ActionItem {
  title: string;
  description: string;
  priority: "Immediate" | "High" | "Medium" | "Low";
  rationale: string;
}

export interface BusinessImpact {
  category: string;
  magnitude: "High" | "Medium" | "Low";
  description: string;
}

export interface RecommendationResult {
  nextBestAction: ActionItem;
  alternativeActions: ActionItem[];
  businessImpact: BusinessImpact[];

  // Orchestrated recommendation properties (Sprint 16)
  recommendations?: Array<{
    title: string;
    description: string;
    priority: "Immediate" | "High" | "Medium" | "Low";
    rationale: string;
  }>;
  primaryRecommendation?: string | ActionItem;
  alternativeRecommendations?: string[] | ActionItem[];
  confidence?: number;
  riskSummary?: string;
  semanticSummary?: string;
  historicalMatches?: any[];
  reasoning?: string;
  evidence?: string[];
}

export interface IRecommendationService {
  /**
   * Provides prescriptive suggestions on the strategic "Next Best Action" and secondary options.
   * Includes qualitative business impact metrics.
   * @param statusContext Current state machine properties, risks, and mismatch indicators
   */
  generateRecommendations(statusContext: any): Promise<RecommendationResult>;
}

// ==========================================
// 8. SEMANTIC INTELLIGENCE SERVICE CONTRACTS
// ==========================================

export interface TechnologyRelationship {
  concept: string;
  relationshipType: "parent" | "child" | "related" | "dependency" | "alternative" | "complementary";
  description: string;
}

export interface SemanticIntelligenceResult {
  canonicalConcept: string;
  normalizedTerms: string[];
  relatedConcepts: string[];
  similarityScore: number; // 0 to 100 representing similarity to compareWith concept, or internal cohesion
  confidencePercentage: number; // 0 to 100 representing confidence in the assessment
  knowledgeClusters: string[];
  transferableCapabilities: string[];
  semanticTags: string[];
  technologyRelationships: TechnologyRelationship[];
  reasoning: string;
}

export interface ISemanticIntelligenceService {
  /**
   * Performs deep semantic analysis on concepts, resolving synonyms, technology relationships,
   * canonical representations, transferable skills, clusters, tags, and semantic similarity.
   * @param concept The primary concept to analyze (e.g., "C Sharp", "Linux Administration")
   * @param compareWith Optional secondary concept to compute semantic similarity against
   */
  analyzeConcept(concept: string, compareWith?: string): Promise<SemanticIntelligenceResult>;
}

// ==========================================
// 9. INTELLIGENCE COORDINATOR CONTRACTS (Sprint 17)
// ==========================================

export interface ExecutionMetrics {
  executionTime: number;
  perServiceLatency: Record<string, number>;
  pipelineLatency: number;
  memoryEstimate: number;
  providerUsed: string;
  fallbackTriggered: boolean;
  timeoutCount: number;
  errorCount: number;
}

export interface UnifiedIntelligenceResult {
  correlationId: string;
  timestamp: string;
  semantic: any;
  confidence: any;
  risk: any;
  explanation: any;
  decisionHistory: any[];
  recommendations: any;
  executionMetrics: ExecutionMetrics;
  pipelineStatus: "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED";
  pipelineTrace: string[];
  trace?: string[];
}

export interface IIntelligenceCoordinator {
  coordinate(input: Record<string, any>): Promise<UnifiedIntelligenceResult>;
}


