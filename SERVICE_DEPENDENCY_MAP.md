# AZIZ AI KERNEL: SERVICE DEPENDENCY MAP
## PLATFORM COGNITIVE RELATIONSHIPS & CORE ANCHORS (SPRINT 10 DESIGN)

---

### 1. PLATFORM ARCHITECTURAL HIERARCHY
The **AI Intelligence Platform** services reside in a decoupled layer between the high-level business applications and the low-level system kernels. The diagram below illustrates the exact structural dependencies of each service.

```
                  +-------------------------------------------------------------+
                  |                  BUSINESS APPLICATION LAYER                 |
                  |     (Recruitment, Employment, Finance, Cyber Security)      |
                  +------------------------------+------------------------------+
                                                 |
                                                 | Fetches instances via ServiceRegistry
                                                 v
+---------------------------------------------------------------------------------------------------------------+
|                                         AZIZ PLATFORM INTELLIGENCE LAYER                                      |
|                                                                                                               |
|    +-----------------------------+  Consumes   +-----------------------------+                                |
|    |    RecommendationService    |------------>|     ExplainabilityService   |                                |
|    +--------------+--------------+             +--------------+--------------+                                |
|                   |                                           |                                               |
|                   | Consumes                                  | Consumes                                      |
|                   v                                           v                                               |
|    +-----------------------------+  Logs To    +-----------------------------+                                |
|    |      DecisionLogService     |------------>|    RiskIntelligenceService  |                                |
|    +--------------+--------------+             +--------------+--------------+                                |
|                   |                                           |                                               |
|                   | Consumes                                  | Consumes                                      |
|                   v                                           v                                               |
|    +-----------------------------+  Refers To  +-----------------------------+                                |
|    |      ConfidenceService      |------------>|  SemanticIntelligenceService|                                |
|    +-----------------------------+             +-----------------------------+                                |
+------------------------------------------------+--------------------------------------------------------------+
                       |                                           |
                       | Extends                                   | Instantiates with
                       v                                           v
+------------------------------------------------+--------------------------------------------------------------+
|                                         AZIZ COGNITIVE KERNEL CORE                                            |
|                                                                                                               |
|        +----------------------------------+             +----------------------------------+                  |
|        |            AIService             |             |            IAppRepository        |                  |
|        |     (Google GenAI SDK Proxy)     |             |      (InMemoryStateStore / DB)   |                  |
|        +----------------------------------+             +----------------------------------+                  |
+---------------------------------------------------------------------------------------------------------------+
```

---

### 2. SERVICE DEPENDENCY SUMMARY TABLE

The table below outlines the core upstream dependencies and downsteam consumers for each of the six platform intelligence services:

| Service Name | Core Upstream Dependencies | Primary Purpose of Dependency | Downstream Consumers |
| :--- | :--- | :--- | :--- |
| **`SemanticIntelligenceService`** | `AIService` | Invokes the Gemini API for standardizing terminology schemas and calculating transferable indices. | All application modules, `ConfidenceService`, `RiskIntelligenceService` |
| **`ConfidenceService`** | `AIService` | Evaluates missing factors, gaps, and input-to-output data overlap densities using structural prompting. | All application modules, `RecommendationService` |
| **`RiskIntelligenceService`** | `AIService` | Performs hazard audits, threat scoring, and categorizations using the model's spatial alignment parameters. | All application modules, `RecommendationService` |
| **`ExplainabilityService`** | `AIService` | Runs mathematical contribution queries and alternative scenario generations on top of core inputs. | All application modules, `DecisionLogService`, `RecommendationService` |
| **`RecommendationService`** | `AIService` | Computes priority metrics, actionable next steps, and business impact magnitude metrics. | All application modules, `DecisionLogService` |
| **`DecisionLogService`** | `IAppRepository` | Direct, secure insertion of structured immutable transaction payloads into the `"decision_logs"` collection. | All application modules, Security & Admin Dashboards |

---

### 3. KERNEL DECOUPLING DESIGN PARADIGMS
To ensure that these services remain highly performant, modular, and safely separated from other platform layers, the design strictly follows these engineering paradigms:

1. **Dependency Injection (DI)**: No intelligence service manages its own connections, secrets, or database handles. The constructor of each service requires standard abstractions (`AIService`, `IAppRepository`), allowing seamless unit-testing using mock implementations.
2. **Stateless Processing**: Except for `DecisionLogService` (which appends trace entries into the database), all intelligence services are entirely stateless. They receive input parameters, execute calculations, and return standard, structured outputs. This prevents concurrent request racing and thread synchronization locks.
3. **Graceful Fallbacks**: Every service implements a robust local fallback mechanism. If the upstream `AIService` or Google GenAI model times out or returns a raw parsing error, the service catches the exception and returns a deterministic fallback payload, ensuring 100% platform uptime.
