# AZIZ AI KERNEL: RESPONSE COMPOSER SPECIFICATION
## COGNITIVE PAYLOAD COMPOSTING & AGGREGATION PATTERNS (SPRINT 10B)

---

### 1. UNIFIED COGNITIVE RESPONSE SCHEMA
The `ResponseComposer` aggregates individual asynchronous outputs from the six active platform intelligence services, compiling them into a single structured, typed payload.

```json
{
  "requestId": "req-98317-sre-audit",
  "timestamp": "2026-07-19T06:30:00Z",
  "integratedAlignmentScore": 88,
  "status": "COMPLETED_WITH_WARNINGS",
  "results": {
    "semanticMatch": {
      "similarityScore": 91,
      "roleSimilarityScore": 89,
      "roleRationale": "Candidate exhibits strong system operations alignment but lacks deep Go development background.",
      "transferableSkills": [
        {
          "skill": "Python Scripting",
          "targetDomainSkill": "Go Automation",
          "transferabilityIndex": 0.85,
          "explanation": "Proven system automation concepts readily translate to Go tool development."
        }
      ]
    },
    "confidenceAudit": {
      "confidencePercentage": 94,
      "confidenceCategory": "High",
      "confidenceFactors": [
        {
          "factor": "Verified Resume History",
          "impact": "Positive",
          "description": "Employment dates align with system telemetry records."
        }
      ],
      "uncertaintiesDetected": [],
      "missingInformation": [
        {
          "field": "SRE_certification",
          "description": "Direct confirmation of cloud architect status was omitted.",
          "importance": "Useful"
        }
      ]
    },
    "riskAudit": {
      "riskScore": 12,
      "riskLevel": "Low",
      "riskCategories": [
        { "category": "Capability Gap", "score": 15 },
        { "category": "Compliance", "score": 8 }
      ],
      "riskFactors": [
        {
          "factor": "Go Syntax Inexperience",
          "riskCategory": "Capability Gap",
          "severity": "Minor",
          "explanation": "The position requires writing native Go monitoring tools."
        }
      ],
      "explanation": "Overall risk is negligible, driven purely by minor syntax training requirements.",
      "mitigationSuggestions": [
        {
          "riskFactor": "Go Syntax Inexperience",
          "actionableMitigation": "Provide a 2-week fast-track Go development course.",
          "priority": "Medium"
        }
      ]
    },
    "explanation": {
      "explanation": "Assessed candidate alignment for SRE position. Semantic matching score is high.",
      "reasoningBreakdown": [
        "1. Verified years of Linux systems administration experience.",
        "2. Assessed automation engineering competency."
      ],
      "evidenceCollected": [
        { "source": "cv_v1.pdf", "description": "Logged 4 years of AWS Cloud experience", "strength": 0.95 }
      ],
      "weightedContributions": [
        { "factor": "Cloud Engineering", "weight": 0.60, "rationale": "SRE core requirement." }
      ],
      "alternativeOutcomes": []
    },
    "recommendations": {
      "nextBestAction": {
        "title": "Proceed to Technical Screen",
        "description": "Schedule a technical panel interview focusing on Linux system internals.",
        "priority": "Immediate",
        "rationale": "High semantic score with negligible risk profile."
      },
      "alternativeActions": [],
      "businessImpact": [
        { "category": "Hiring Speed", "magnitude": "High", "description": "Maintains rapid talent pipeline." }
      ]
    },
    "decisionLog": {
      "id": "log-dec-5517",
      "decisionSummary": "Approved candidate progression to Technical Screen.",
      "evidenceUsed": [ "cv_v1.pdf" ],
      "confidence": 94,
      "reasoning": "High alignment and low risk factors support progression."
    }
  }
}
```

---

### 2. INTEGRATED SCORE COMPUTATION FORMULA
To provide a single unified matching index to the application dashboard, the `ResponseComposer` calculates the `integratedAlignmentScore` using a weighted mathematical formula combining semantic similarity, confidence, and risk deductions:

$$\text{Integrated Score} = \left( \text{Similarity} \times W_{s} \right) + \left( \text{Confidence} \times W_{c} \right) - \left( \text{Risk Score} \times W_{r} \right)$$

#### Configuration Parameters
- $W_s$ (Semantic Weight) = **0.60**
- $W_c$ (Confidence Weight) = **0.25**
- $W_r$ (Risk Weight) = **0.15**

#### Computation Example
Using the values in the JSON schema above:
- Semantic Similarity Score = **91**
- Confidence Percentage = **94**
- Risk Score = **12**

$$\text{Integrated Score} = (91 \times 0.60) + (94 \times 0.25) - (12 \times 0.15)$$
$$\text{Integrated Score} = 54.6 + 23.5 - 1.8 = 76.3 \approx \mathbf{76}$$

---

### 3. PARTIAL SUCCESS AND ERROR COMBINATION PATTERNS
If a component service fails, the composer guarantees system stability using standard fallback rules:

- **Graceful Null Mappings**: If optional services (such as `Explainability` or `Recommendation`) fail or time out, the composer maps their fields to `null` and sets the overall execution state to `COMPLETED_WITH_WARNINGS` instead of crashing.
- **Dynamic Score Scaling**: If the `Confidence` or `Risk` service fails to return a payload, the composer automatically adjusts the formula weights to scale over the remaining active components (e.g., distributing weights strictly to Semantic Match), preserving score validity.
- **Critical Service Requirements**: Only the `SemanticIntelligenceService` is classified as **critical**. If this service fails, the composer throws an exception, prompting the orchestrator to initiate a full-system retry or trigger a 5xx response to the caller.
