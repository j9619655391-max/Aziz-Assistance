# AZIZ AI KERNEL: SERVICE INTERFACES
## PLATFORM COGNITIVE API SPECIFICATION (SPRINT 10 DESIGN)

---

### 1. EXPLAINABILITY SERVICE (`ExplainabilityService`)

#### Purpose
Demystifies complex automated predictions, matching assessments, or raw data scores, converting mathematical vector distances or complex conditional routing into transparent, step-by-step reasoning chains and alternative scenario simulations.

#### Responsibilities
- Compiles sequentially ordered reasoning breakdowns explaining the decision logic.
- Gathers explicit evidence logs showing the input sources, facts used, and relative strength values.
- Determines the individual contribution weight (%) and rationale for each active variable factor.
- Predicts potential alternative contingencies or shift paths should the input parameters change.
- Logs a verifiable trace for complete, auditable decision-making.

#### Public Interface (TypeScript Contract)
```typescript
export interface EvidenceItem {
  source: string;        // E.g., "candidate_resume_v2.pdf", "historical_ledger_q1"
  description: string;   // Statement of the specific fact or asset extracted
  strength: number;      // Vector weight or verification priority (0.0 to 1.0)
}

export interface FactorContribution {
  factor: string;        // Variable or field descriptor (e.g., "SRE_experience")
  weight: number;        // Impact percentage (0.0 to 1.0)
  rationale: string;     // Strategic business explanation of why this factor was weighted as such
}

export interface AlternativeScenario {
  scenario: string;      // Actionable contingent scenario description
  likelihood: number;    // Feasibility percentage (0.0 to 1.0)
  impact: string;        // Qualitative evaluation of result variation
}

export interface ExplanationResult {
  explanation: string;                         // Comprehensive human-readable core explanation
  reasoningBreakdown: string[];                // Multi-step analytical path
  evidenceCollected: EvidenceItem[];           // Supporting facts logged during processing
  weightedContributions: FactorContribution[]; // Factor weightings matrix
  alternativeOutcomes: AlternativeScenario[];  // Alternate branching possibilities
}

export interface IExplainabilityService {
  /**
   * Generates a structural multi-layered explanation for a decision context.
   * @param decisionContext Description or ID of the decision being explained
   * @param inputs Raw variable dictionary evaluated during processing
   */
  explain(decisionContext: string, inputs: Record<string, any>): Promise<ExplanationResult>;
}
```

---

### 2. CONFIDENCE SERVICE (`ConfidenceService`)

#### Purpose
Analyzes the stability, mathematical certainty, and integrity of a processed AI outcome relative to the raw, unstructured source inputs provided.

#### Responsibilities
- Calculates the final confidence score (0 to 100%) and categorizes it into a discrete band.
- Audits and classifies positive and negative factors directly driving the certainty index.
- Automatically identifies missing parameters, assigns priority weights, and prompts for remediation.
- Flags ambiguities or uncertainties discovered within the source datasets.

#### Public Interface (TypeScript Contract)
```typescript
export type ConfidenceCategory = "High" | "Medium" | "Low";

export interface ConfidenceFactor {
  factor: string;
  impact: "Positive" | "Negative" | "Neutral";
  description: string;
}

export interface DataAmbiguity {
  item: string;                        // Unclear term, value, or gap
  possibleInterpretations: string[];   // Potential valid meanings
  riskLevel: "High" | "Medium" | "Low";
}

export interface MissingParameter {
  field: string;
  description: string;
  importance: "Critical" | "Useful" | "Minor";
}

export interface ConfidenceResult {
  confidencePercentage: number;          // Overall accuracy probability (0 to 100)
  confidenceCategory: ConfidenceCategory;// High/Medium/Low representation
  confidenceFactors: ConfidenceFactor[]; // Driving points of the evaluation
  uncertaintiesDetected: DataAmbiguity[];// Inconsistencies or double meanings mapped
  missingInformation: MissingParameter[];// Critical parameters omitted in input source
}

export interface IConfidenceService {
  /**
   * Audits the correctness and completeness of a processed outcome against its input data source.
   */
  evaluateConfidence(sourceData: any, processedOutput: any): Promise<ConfidenceResult>;
}
```

---

### 3. SEMANTIC INTELLIGENCE SERVICE (`SemanticIntelligenceService`)

#### Purpose
Acts as a multi-dimensional technology, skill, and role ontology mapping tool. Transcends literal, exact keyword matches by identifying structural relationships, synonymous terms, transferable skills, and role equivalencies across systems.

#### Responsibilities
- Standardizes raw, non-canonical technical words or phrases into canonical ontology records.
- Matches synonymous expressions, industry shorthand acronyms, and aliases.
- Models parent dependencies and framework mappings (e.g. knowing Django implies Python capability).
- Compares semantic similarity of different roles or context specifications.
- Identifies and evaluates transferable skills and adjacent domain experiences.

#### Public Interface (TypeScript Contract)
```typescript
export interface TechnologyOntologyMap {
  ecosystem: string;     // E.g., "Web Development", "Cloud Infrastructure", "Fintech Systems"
  subsector: string;     // E.g., "Client Frameworks", "Infrastructure as Code", "Asset Pricing"
  parentTech?: string;   // E.g., "JavaScript", "AWS", "Double-Entry Ledger"
}

export interface NormalizedSkill {
  name: string;                                 // Canonical, standardized term
  category: string;                             // Broad technical classification
  synonyms: string[];                           // Direct variations mapped
  versionAwareness: string;                     // Version boundaries / deprecation periods
  aliases: string[];                            // Acronyms or slang
  technologyMapping: TechnologyOntologyMap;     // Relationship to other core systems
  frameworkMapping?: {
    metaFrameworks?: string[];                  // Related wrapping technologies (e.g. NestJS)
    relatedLibraries?: string[];                // Adjacent utility toolboxes
  };
}

export interface TransferableSkillItem {
  skill: string;
  targetDomainSkill: string;
  transferabilityIndex: number;                 // Transfer strength index (0.0 to 1.0)
  explanation: string;                          // Conceptual mapping rationale
}

export interface SemanticMatchResult {
  similarityScore: number;                      // Overall meaning-based correlation (0 to 100)
  roleSimilarityScore: number;                  // Role-to-role compatibility (0 to 100)
  roleRationale: string;                        // Structural reasoning for role match
  transferableSkills: TransferableSkillItem[];  // Equivalent skill mappings
}

export interface ISemanticIntelligenceService {
  /**
   * Standardizes any raw user entry or skill label against the system's central tech taxonomy.
   */
  normalizeSkill(rawSkill: string): Promise<NormalizedSkill>;

  /**
   * Compares two complex specifications or profiles to identify semantic and transferable alignment.
   */
  matchSemantically(sourceEntity: any, targetSpec: any): Promise<SemanticMatchResult>;
}
```

---

### 4. RISK INTELLIGENCE SERVICE (`RiskIntelligenceService`)

#### Purpose
Conducts pro-active, automatic security audits, technical capability gaps assessments, and operational threat classifications on any incoming setup, contract, transaction ledger, or candidate profile.

#### Responsibilities
- Calculates the cumulative threat index (0 to 100%) and risk classification level.
- Categorizes identified hazards into separate domains (e.g., Security, Capability Gap, Financial Risk).
- Outlines exact risk factors, explaining why they pose a threat.
- Details actionable, prioritized mitigations to safeguard platform stability.

#### Public Interface (TypeScript Contract)
```typescript
export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export interface RiskCategoryBreakdown {
  category: string;                             // Domain classification
  score: number;                                // Calculated risk score (0 to 100)
}

export interface RiskFactor {
  factor: string;                               // Specific threat identifier
  riskCategory: string;                         // Reference category
  severity: "Minor" | "Moderate" | "Major" | "Critical";
  explanation: string;                          // Core explanation of hazard
}

export interface MitigationPlan {
  riskFactor: string;                           // Reference factor
  actionableMitigation: string;                 // Remedial operation description
  priority: "High" | "Medium" | "Low";          // Priority score
}

export interface RiskAnalysisResult {
  riskScore: number;                            // Overall integrated hazard index (0 to 100)
  riskLevel: RiskLevel;                         // Risk severity band
  riskCategories: RiskCategoryBreakdown[];      // Breakdown per category
  riskFactors: RiskFactor[];                    // Active threat vectors logged
  explanation: string;                          // Human-friendly executive risk summary
  mitigationSuggestions: MitigationPlan[];      // Recommended actionable mitigations
}

export interface IRiskIntelligenceService {
  /**
   * Evaluates threat levels and compliance risks for a given target context.
   */
  analyzeRisk(auditContext: any): Promise<RiskAnalysisResult>;
}
```

---

### 5. RECOMMENDATION SERVICE (`RecommendationService`)

#### Purpose
Formulates strategic, highly actionable paths, prioritizes tasks, and predicts business impact magnitudes directly following any assessment, state transition, or dynamic error event.

#### Responsibilities
- Pinpoints the absolute, singular "Next Best Action" with direct logical rationale.
- Drafts optional alternative paths or contingencies to navigate surrounding variables.
- Evaluates specific business impacts (e.g. Velocity, Savings, Accuracy, Defense) with magnitude indicators.
- Assesses priority scores based on active systemic variables.

#### Public Interface (TypeScript Contract)
```typescript
export interface RecommendationAction {
  title: string;
  description: string;
  priority: "Immediate" | "High" | "Medium" | "Low";
  rationale: string;
}

export interface ImpactAssessment {
  category: string;                             // Business metrics impacted
  magnitude: "High" | "Medium" | "Low";         // Scale of improvement or degradation
  description: string;                          // Impact summary
}

export interface RecommendationResult {
  nextBestAction: RecommendationAction;         // Singular top priority step
  alternativeActions: RecommendationAction[];   // Alternative backup plans
  businessImpact: ImpactAssessment[];           // Strategic outcome projections
}

export interface IRecommendationService {
  /**
   * Prescribes strategic action plans based on current operational metrics, gap audits, or threat levels.
   */
  generateRecommendations(statusContext: any): Promise<RecommendationResult>;
}
```

---

### 6. DECISION LOG SERVICE (`DecisionLogService`)

#### Purpose
Constructs an immutable, trace-compliant audit history of every automated AI decision, matchmaking run, or security check, enabling detailed post-mortem reviews and complete scenario replication.

#### Responsibilities
- Appends comprehensive, structured decision objects into the system's transaction collections.
- Stores active AI metadata including model specifications, engine hashes, and runtime system parameters.
- Records exact inputs, collected evidence sets, confidence records, and calculations.
- Exposes complete search and filter utilities to query the historic ledger for system reviews.
- Provides re-play telemetry payloads to allow re-running identical parameters on future system versions.

#### Public Interface (TypeScript Contract)
```typescript
export interface DecisionLogEntry {
  id: string;                                   // Uniquely structured trace identifier
  timestamp: string;                            // Standard ISO string format
  decisionSummary: string;                      // Human-scannable title of the logged operation
  evidenceUsed: string[];                       // List of raw asset keys or document hashes referenced
  confidencePercentage: number;                 // Evaluated certainty percentage during run
  reasoningChain: string[];                     // Step-by-step logic history
  inputsSnapshot: Record<string, any>;          // Immutable copy of processed parameters
  outputSnapshot: Record<string, any>;          // Immutable copy of resulting predictions/matches
  modelMetadata: {
    modelName: string;                          // E.g., "gemini-3.5-flash"
    version: string;                            // Software version tracker (e.g., "v4.1")
    temperature: number;                        // LLM variance parameter applied
  };
}

export interface IDecisionLogService {
  /**
   * Logs a critical decision run securely into the system repository collections.
   */
  logDecision(entry: Omit<DecisionLogEntry, "id" | "timestamp">): Promise<DecisionLogEntry>;

  /**
   * Retrieves past execution details with query size caps.
   */
  getLogs(limit?: number, filters?: Record<string, any>): Promise<DecisionLogEntry[]>;
}
```

---

### CENTRALIZED SCHEMA INDEPENDENCE
To verify that these services remain purely domain-independent:
- No service interface references domains like `Candidate`, `JobDescription`, `SRE`, `Resume`, `Trader`, `Bond`, `Broker`, or `Stock`.
- All methods utilize primitive values, generic parameters (`any`, `Record<string, any>`), and structured cognitive sub-models (`NormalizedSkill`, `ConfidenceResult`, `RiskAnalysisResult`).
- Any business module can wrap these services with domain-specific type assertions at the application level.
