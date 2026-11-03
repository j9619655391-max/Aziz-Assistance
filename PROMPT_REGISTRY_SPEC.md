# AZIZ AI KERNEL: PROMPT REGISTRY SPECIFICATION
## SYSTEM PROMPT ENGINE & LIFECYCLE MANAGEMENT (SPRINT 10B DESIGN)

---

### 1. PROMPT LIFECYCLE GOVERNANCE
Prompts are critical system components that must be versioned, audited, and tested with the same level of rigor as executable code. This specification defines a robust, version-controlled repository structure for prompt templates.

```
+-------------------------------------------------------------------------------------------------+
|                                    PROMPT LIFECYCLE STATES                                      |
|                                                                                                 |
|   [Draft] --------> [Testing] --------> [Production Active] --------> [Deprecated] --------> [Archived]
|      |                                         |                                                |
|      +--------------- Rollback <---------------+                                                |
+-------------------------------------------------------------------------------------------------+
```

#### A. Lifecycle States
- **Draft**: Prompts under active design or refinement. Cannot be retrieved by production service systems.
- **Testing**: Prompts deployed to staging environments to verify formatting, parameter interpolation, and parse rates.
- **Production Active**: The current, binding prompt template used for live customer-facing calculations.
- **Deprecated**: Older prompts marked for phase-out but retained to support legacy, in-flight transactions.
- **Archived**: Prompts locked and retired from active system directories.

---

### 2. DYNAMIC REGISTRATION AND SCHEMAS

#### Template Document Schema
Every prompt is persisted as a structured document within the system repository under the `"prompt_templates"` collection.

```json
{
  "promptId": "risk_audit_template",
  "version": "1.4.2",
  "template": "Analyze the following context for potential security, capability, and compliance hazards: \n\nCONTEXT:\n{{cleanContext}}\n\nOUTPUT FORMAT:\nReturn a JSON object conforming strictly to the RiskAnalysisResult schema.",
  "requiredVariables": [
    "cleanContext"
  ],
  "metadata": {
    "creator": "Security Officer",
    "description": "Performs multi-layered compliance audits and outputs prioritized mitigations.",
    "createdAt": "2026-07-19T06:00:00Z",
    "isActive": true,
    "lastTestedAccuracy": 0.98
  }
}
```

#### Dynamic Variable Interpolation Pattern
To insert variable values into prompt templates at runtime without using heavy template engines:

```typescript
export function interpolate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return rendered;
}
```

---

### 3. CONSTITUTIONAL PROMPT SECURITY POLICIES
To safeguard prompts from compromise, injection attacks, or accidental leaks:

1. **Strict Context Sanitization**: The `ContextBuilder` sanitizes all dynamic user variables, stripping system brackets (`{{` or `}}`) and prompt-injection keywords (e.g. "ignore previous instructions") prior to interpolation.
2. **Deterministic Output Forcing**: All prompt templates must explicitly define and enforce structured output boundaries, requiring the model to return valid JSON matching system type contracts.
3. **Immutability of Released Prompts**: Once a prompt version is marked as **Production Active**, its template contents are frozen. Any modifications require registering a new version increment (e.g., `1.4.2` to `1.4.3`), preserving audit compliance.
4. **Instant Safe Rollbacks**: If a newly deployed prompt version triggers parsing anomalies or quality degradation, admins can roll back the active pointer to the previous stable release instantly via the `rollbackPrompt` API.
