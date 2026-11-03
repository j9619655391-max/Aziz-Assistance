# AZIZ AI KERNEL: COGNITIVE EXECUTION FLOW
## AI INTELLIGENCE SEQUENCE DIAGRAM (SPRINT 10 DESIGN)

---

### 1. MERMAID SEQUENTIAL SYSTEM FLOW
The following diagram demonstrates the precise chronological execution pathway when a business module triggers the shared platform intelligence layer.

```mermaid
sequenceDiagram
    autonumber
    actor Recruiter as Recruiter / App Layer
    participant App as Business Module App (e.g., Recruitment)
    participant SemMatch as SemanticIntelligenceService
    participant Conf as ConfidenceService
    participant Risk as RiskIntelligenceService
    participant Expl as ExplainabilityService
    participant Recs as RecommendationService
    participant DecLog as DecisionLogService
    database DB as InMemoryStateStore / Firestore

    Note over Recruiter, DB: 1. Core Request & Processing Lifecycle
    Recruiter->>App: Match Candidate vs. Job Description
    App->>SemMatch: matchSemantically(CandidateData, JobCriteria)
    activate SemMatch
    SemMatch-->>App: return SemanticMatchResult (Similarity Score, Transferable Skills)
    deactivate SemMatch

    App->>Conf: evaluateConfidence(CandidateData, SemanticMatchResult)
    activate Conf
    Conf-->>App: return ConfidenceResult (Confidence %, Gaps, Ambiguities)
    deactivate Conf

    App->>Risk: analyzeRisk(SemanticMatchResult)
    activate Risk
    Risk-->>App: return RiskAnalysisResult (Risk Score, Factors, Mitigations)
    deactivate Risk

    Note over App, Expl: 2. Explainability & Strategic Decisions
    App->>Expl: explain("Candidate Match Audit", variables)
    activate Expl
    Expl-->>App: return ExplanationResult (Reasoning Chains, Contributions)
    deactivate Expl

    App->>Recs: generateRecommendations(ContextState)
    activate Recs
    Recs-->>App: return RecommendationResult (Next Best Action, Impacts)
    deactivate Recs

    Note over App, DB: 3. Persistence & Audit Logging
    App->>DecLog: logDecision(DecisionSummary, inputs, outputs, metadata)
    activate DecLog
    DecLog->>DB: insert("decision_logs", DecisionLogEntry)
    DB-->>DecLog: confirmation
    DecLog-->>App: return Registered DecisionLogEntry
    deactivate DecLog

    App-->>Recruiter: Deliver Rich AI Matching Dossier UI
```

---

### 2. DETAILED EXPLANATORY STEP-BY-STEP CHRONOLOGY

#### Phase 1: Context Aggregation & Matching
- **Step 1**: The end user or automation triggers an operational action. For example, a recruiter clicks "Match Resume", or a trading loop triggers an audit, or a cyber security probe requests a vulnerability evaluation.
- **Step 2**: The matching business module aggregates the relevant source files and requirements specifications, packaging them into generic structured dictionaries.
- **Step 3**: The app dispatches these payloads directly to the `SemanticIntelligenceService` via the `matchSemantically` interface. The service evaluates context-level similarity, mapping skill synonym clusters, transferable capabilities, and role equivalence metrics.

#### Phase 2: Confidence & Threat Audits
- **Step 4**: The system takes the resulting `SemanticMatchResult` and forwards it alongside the raw inputs to the `ConfidenceService`. This engine calculates structural gaps, identifies missing parameters in the source file, and assigns a strict certainty index.
- **Step 5**: In parallel or series, the app invokes `analyzeRisk` on the `RiskIntelligenceService` to evaluate operational threat levels, identifying capability mismatches or structural hazards (e.g., security profile gaps, transaction variance issues) and outputting prioritized mitigations.

#### Phase 3: Explainability & Strategy
- **Step 6**: The application invokes the `ExplainabilityService`, supplying all calculated variable values. The service translates vector distances and mathematical criteria weights into highly scannable step-by-step reasoning blocks.
- **Step 7**: The app calls the `RecommendationService` to obtain strategic next steps, formulating a singular primary "Next Best Action", alternative contingent routes, and qualitative impacts on business metrics (e.g. speed, accuracy).

#### Phase 4: Immutable Logging
- **Step 8**: Finally, to guarantee audit safety and trace compliance, the app registers the transaction inside the `DecisionLogService`. 
- **Step 9**: The `DecisionLogService` assigns a unique, cryptographically clear trace ID, injects system metadata (e.g., model name, runtime configurations, timestamps), and inserts the record directly into the `"decision_logs"` database collection.
- **Step 10**: The rich, secure, and highly transparent cognitive matching package is returned to the user interface, rendering a detailed matching report.
