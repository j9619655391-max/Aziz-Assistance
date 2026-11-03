# AZIZ AI KERNEL: MASTER DOCUMENTATION INDEX
## PLATFORM PRIMARY ENTRY POINT

---

### INTRODUCTION
Welcome to the central knowledge repository for **Aziz Assistant**. This document is the primary, master entry point for both software developers and AI agents. It maps the absolute layout of the system's architecture, governance protocols, kernel designs, product modules, and verification matrices.

---

### DOCUMENTATION NAVIGATION MENU

| Category | Description | Primary Active Reference |
| :--- | :--- | :--- |
| **Executive** | High-level system context, roadmap, and onboarding views. | `README.md` |
| **Governance** | Team operations, constitutional constraints, and contribution rules. | `PLATFORM_CONSTITUTION.md` |
| **Architecture** | Frozen systemic blueprints, visual diagrams, and core decisions. | `ARCHITECTURE.md` |
| **Kernel** | The Aziz AI Kernel's engine, task flow logic, and API contracts. | `docs/AKDS.md` |
| **Product** | High-fidelity business platforms and features. | `AI_INTELLIGENCE_FOUNDATION.md` |
| **Operations** | Data lineage, disaster recovery protocols, and release checklists. | `DATA_PROVENANCE.md` |
| **Security** | Root-level threat models, safety limits, and sandboxing architecture. | `SECURITY.md` |
| **Deployment** | Run environments, Nginx proxies, and container configurations. | `docs/DEPLOYMENT_GUIDE.md` |

---

### DIRECTORY OF DOCUMENTS BY TAXONOMY

#### 1. EXECUTIVE
*High-level introductory, project-wide status, and future-looking milestones.*
- [README.md](/README.md) `[ACTIVE]` — Primary landing page, development startup guide, and system directory overview.
- [ROADMAP.md](/ROADMAP.md) `[ACTIVE]` — Strategic visual sequence of platform-wide module milestones, core upgrades, and feature phases.

#### 2. GOVERNANCE
*Core alignment protocols, behavioral bounds, and mandatory developer processes.*
- [PLATFORM_CONSTITUTION.md](/PLATFORM_CONSTITUTION.md) `[ACTIVE]` — Governing laws, decision rights, and technical boundaries for the workspace.
- [CONTRIBUTING.md](/CONTRIBUTING.md) `[ACTIVE]` — Development standards, quality gates, merge requirements, and PR review cycles.
- [CODE_OF_CONDUCT.md](/CODE_OF_CONDUCT.md) `[ACTIVE]` — Workspace interaction guidelines, community standards, and ethical behavior protocols.

#### 3. ARCHITECTURE (SYSTEM BLUEPRINTS & ADRs)
*System-level design decisions and frozen structural models.*
- [ARCHITECTURE.md](/ARCHITECTURE.md) `[ACTIVE]` — High-performance, multi-layered block architecture diagram and full technical stack breakdown.
- [PLATFORM_ACCEPTANCE_REVIEW.md](/PLATFORM_ACCEPTANCE_REVIEW.md) `[REFERENCE]` — Technical signing-off matrix verifying the frozen platform capability readiness.
- [docs/AKDS.md](/docs/AKDS.md) `[ACTIVE]` — Aziz Kernel Design Specification (AKDS), defining the blueprint of the cognitive engine.
- **Architectural Decision Records (ADRs):**
  - [docs/adr/ADR-001-AI-KERNEL.md](/docs/adr/ADR-001-AI-KERNEL.md) `[REFERENCE]` — Design choices regarding the modularity of the AI execution core.
  - [docs/adr/ADR-002-EVENT-BUS.md](/docs/adr/ADR-002-EVENT-BUS.md) `[REFERENCE]` — Choice of internal decoupled event emission architectures.
  - [docs/adr/ADR-003-STATE-STORE.md](/docs/adr/ADR-003-STATE-STORE.md) `[REFERENCE]` — Memory management and session state persistence model selections.
  - [docs/adr/ADR-004-AST-KNOWLEDGE-GRAPH.md](/docs/adr/ADR-004-AST-KNOWLEDGE-GRAPH.md) `[REFERENCE]` — Structural choice of utilizing semantic graphs for indexing system services.
  - [docs/adr/ADR-005-TOOL-REGISTRY.md](/docs/adr/ADR-005-TOOL-REGISTRY.md) `[REFERENCE]` — Dynamic mounting and type validation parameters for tools.
  - [docs/adr/ADR-006-MODEL-ROUTER.md](/docs/adr/ADR-006-MODEL-ROUTER.md) `[REFERENCE]` — Dynamic routing algorithms to manage LLM token limits and context boundaries.
  - [docs/adr/ADR-007-EVENT-EMITTER-SELECTION.md](/docs/adr/ADR-007-EVENT-EMITTER-SELECTION.md) `[REFERENCE]` — Comparative analysis resulting in the chosen Node.js event engine components.

#### 4. KERNEL (COGNITIVE CORE RUNTIME)
*System mechanics, interface contracts, event models, and state orchestration.*
- [TASK_ORCHESTRATION.md](/TASK_ORCHESTRATION.md) `[ACTIVE]` — Multi-step sequential task planning, validation, and reflection execution flows.
- [MODULE_LIFECYCLE.md](/MODULE_LIFECYCLE.md) `[ACTIVE]` — Contractual phases (`uninitialized`, `starting`, `ready`, `stopping`) for all dynamic plugins.
- [AI_INTELLIGENCE_FOUNDATION.md](/AI_INTELLIGENCE_FOUNDATION.md) `[ACTIVE]` — Specifications for the domain-independent cognitive service layers (Explainability, Confidence, Semantic Matching, Risk, Recommendation, Decision Logs).
- [AI_INTELLIGENCE_PLATFORM.md](/AI_INTELLIGENCE_PLATFORM.md) `[ACTIVE]` — High-level platform architecture and multi-domain consumer specs for Sprint 10.
- [SERVICE_INTERFACES.md](/SERVICE_INTERFACES.md) `[ACTIVE]` — Public contracts, input schemas, and output parameters of the six core services.
- [AI_INTELLIGENCE_SEQUENCE_DIAGRAM.md](/AI_INTELLIGENCE_SEQUENCE_DIAGRAM.md) `[ACTIVE]` — Sequential transaction flow outlining business process alignments.
- [SERVICE_DEPENDENCY_MAP.md](/SERVICE_DEPENDENCY_MAP.md) `[ACTIVE]` — Service-to-kernel dependency mapping and architectural guidelines.
- [AI_OPERATIONS_PLATFORM.md](/AI_OPERATIONS_PLATFORM.md) `[ACTIVE]` — Operational orchestration platform specification for Sprint 10B.
- [AI_OPERATIONS_SEQUENCE_DIAGRAM.md](/AI_OPERATIONS_SEQUENCE_DIAGRAM.md) `[ACTIVE]` — Orchestration sequential execution flow diagram.
- [AI_RUNTIME_ARCHITECTURE.md](/AI_RUNTIME_ARCHITECTURE.md) `[ACTIVE]` — Cognitive runtime execution layering and topological maps.
- [PROMPT_REGISTRY_SPEC.md](/PROMPT_REGISTRY_SPEC.md) `[ACTIVE]` — System-wide prompt lifecycle, templating, and versioning specs.
- [MODEL_ROUTING_SPEC.md](/MODEL_ROUTING_SPEC.md) `[ACTIVE]` — Latency, capability, cost, and cross-provider failover routing rules.
- [RESPONSE_COMPOSER_SPEC.md](/RESPONSE_COMPOSER_SPEC.md) `[ACTIVE]` — Payloads consolidation formats and integrated score formulas.
- [OBSERVABILITY_SPEC.md](/OBSERVABILITY_SPEC.md) `[ACTIVE]` — Telemetry auditing schemas, latency trackers, and token cost loggers.
- [docs/KERNEL_API_REFERENCE.md](/docs/KERNEL_API_REFERENCE.md) `[ACTIVE]` — Formal class definitions, constructor properties, and public methods of all main kernel managers.
- [docs/KERNEL_FREEZE_v1.md](/docs/docs/KERNEL_FREEZE_v1.md) `[ACTIVE]` — Formal specification enforcing absolute architectural immutability.
- [docs/TYPE_CONTRACT_REFERENCE.md](/docs/TYPE_CONTRACT_REFERENCE.md) `[ACTIVE]` — Type safety matrices and centralized typescript interface mappings.
- [docs/EVENT_CATALOG.md](/docs/EVENT_CATALOG.md) `[ACTIVE]` — Master list of system events, payload details, and pub-sub topic definitions.

#### 5. PRODUCT MODULES
*Specific high-fidelity business modules and platform features.*
- [RECRUITMENT_INTELLIGENCE_PLATFORM_PHASE1.md](/RECRUITMENT_INTELLIGENCE_PLATFORM_PHASE1.md) `[ACTIVE]` — Functional spec for Sprint 4 Recruitment Intelligence workspace.
- [EMPLOYMENT_PLATFORM_V2.md](/EMPLOYMENT_PLATFORM_V2.md) `[ACTIVE]` — Functional spec for Sprint 3 Employment domain capabilities.

#### 6. OPERATIONS & RISK
*Data pipelines, disaster response strategies, and quality checklists.*
- [DATA_PROVENANCE.md](/DATA_PROVENANCE.md) `[ACTIVE]` — Data lineage, schema enforcement protocols, and strict source tracking audits.
- [docs/DISASTER_RECOVERY.md](/docs/DISASTER_RECOVERY.md) `[ACTIVE]` — Recovery Point Objectives (RPO), Backup/Restore procedures, and redundancy designs.
- [docs/RISK_REGISTER.md](/docs/RISK_REGISTER.md) `[ACTIVE]` — Threat ledger evaluating business risks, security vulnerabilities, and mitigation progress.
- [docs/RELEASE_CHECKLIST.md](/docs/RELEASE_CHECKLIST.md) `[ACTIVE]` — Mandatory pre-deployment validation gates, code freezes, and quality controls.

#### 7. SECURITY & ACCESS CONTROL
*Threat models, network sandboxing, encryption, and API keys security.*
- [SECURITY.md](/SECURITY.md) `[ACTIVE]` — Core security policy, API keys management, reporting pathways, and cryptographic protocols.
- [docs/SECURITY_AUDIT.md](/docs/SECURITY_AUDIT.md) `[ACTIVE]` — Technical sandbox boundaries, iframe permissions matrix, and networking security audit.

#### 8. DEPLOYMENT & ENVIRONMENTS
*Cloud infrastructure configurations, routing, and proxy setups.*
- [docs/DEPLOYMENT_GUIDE.md](/docs/DEPLOYMENT_GUIDE.md) `[ACTIVE]` — Running in Cloud Run, CI/CD setup, port mappings, and reverse Nginx proxies.
- [docs/PHASE2_IMPLEMENTATION_PLAN.md](/docs/PHASE2_IMPLEMENTATION_PLAN.md) `[REFERENCE]` — Forward-looking blueprint for relational database transitions and Socket.io cluster support.

#### 9. SPRINT HISTORICAL REPORTS & VALIDATIONS
*Chronological record of sprint deliveries, quality assurance, and verification reports.*
- [CHANGELOG.md](/CHANGELOG.md) `[ACTIVE]` — Consolidated platform release notes and version updates.
- **Sprint Implementation & Integration Ledgers:**
  - [PLATFORM_INTEGRATION_REPORT.md](/PLATFORM_INTEGRATION_REPORT.md) `[HISTORICAL]` — Complete integration status and dependency evaluation.
  - [docs/KERNEL_INTEGRATION_REPORT.md](/docs/KERNEL_INTEGRATION_REPORT.md) `[HISTORICAL]` — Historical report tracking core kernel compilation.
  - [docs/KERNEL_RC1_REPORT.md](/docs/KERNEL_RC1_REPORT.md) `[HISTORICAL]` — Release Candidate 1 performance and stability checklist.
  - [docs/SPRINT1_VALIDATION_REPORT.md](/docs/docs/SPRINT1_VALIDATION_REPORT.md) | [SPRINT2_IMPLEMENTATION_REPORT.md](/docs/SPRINT2_IMPLEMENTATION_REPORT.md) | [SPRINT2_VALIDATION_REPORT.md](/docs/SPRINT2_VALIDATION_REPORT.md) `[HISTORICAL]` — Sprints 1 & 2 progress metrics.
  - [docs/SPRINT3_IMPLEMENTATION_REPORT.md](/docs/SPRINT3_IMPLEMENTATION_REPORT.md) | [SPRINT3_VALIDATION_REPORT.md](/docs/SPRINT3_VALIDATION_REPORT.md) `[HISTORICAL]` — Sprint 3 Employment core platform reports.
  - [docs/SPRINT4_IMPLEMENTATION_REPORT.md](/docs/SPRINT4_IMPLEMENTATION_REPORT.md) | [SPRINT4_VALIDATION_REPORT.md](/docs/SPRINT4_VALIDATION_REPORT.md) `[HISTORICAL]` — Sprint 4 Recruitment core platform reports.
  - [docs/SPRINT5_IMPLEMENTATION_REPORT.md](/docs/SPRINT5_IMPLEMENTATION_REPORT.md) | [docs/SPRINT5_VALIDATION_REPORT.md](/docs/SPRINT5_VALIDATION_REPORT.md) `[HISTORICAL]` — Sprint 5 historical tracking.
  - [docs/SPRINT6_IMPLEMENTATION_REPORT.md](/docs/SPRINT6_IMPLEMENTATION_REPORT.md) | [docs/SPRINT6_VALIDATION_REPORT.md](/docs/SPRINT6_VALIDATION_REPORT.md) `[HISTORICAL]` — Sprint 6 historical tracking.
  - [docs/SPRINT7_IMPLEMENTATION_REPORT.md](/docs/SPRINT7_IMPLEMENTATION_REPORT.md) | [docs/SPRINT7_VALIDATION_REPORT.md](/docs/SPRINT7_VALIDATION_REPORT.md) `[HISTORICAL]` — Sprint 7 historical tracking.
  - [docs/SPRINT8_IMPLEMENTATION_REPORT.md](/docs/SPRINT8_IMPLEMENTATION_REPORT.md) | [docs/SPRINT8_VALIDATION_REPORT.md](/docs/SPRINT8_VALIDATION_REPORT.md) `[HISTORICAL]` — Sprint 8 historical tracking.
  - [docs/SPRINT9_IMPLEMENTATION_REPORT.md](/docs/SPRINT9_IMPLEMENTATION_REPORT.md) | [docs/SPRINT9_VALIDATION_REPORT.md](/docs/SPRINT9_VALIDATION_REPORT.md) `[HISTORICAL]` — Sprint 9 historical tracking.

---

### DOCUMENTATION DEPENDENCY FLOWMAP

```
     [Governance Standards]  <-- guides --  [Executive: README]
              |                                     |
              v                                     v
     [Architecture: ARCHITECTURE.md]  --->  [Kernel: docs/AKDS.md]
              |                                     |
              v                                     v
     [Type / Event Catalogs]  <----------  [Task Orchestration]
              |                                     |
              v                                     v
     [AI Intelligence Foundation]  ------>  [Product Business Modules]
              |                                     |
              v                                     v
     [Security & Operations Guides]  ---->  [Deployable Run Containers]
```

---

### GOVERNANCE POLICY
All updates to the codebase must be accompanied by relevant documentation revisions in accordance with `/CONTRIBUTING.md`. Do not modify frozen core blueprints (`/docs/docs/KERNEL_FREEZE_v1.md`, `/docs/AKDS.md`) without constitutional approval.
