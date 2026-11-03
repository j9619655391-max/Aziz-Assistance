# AZIZ AI KERNEL: DOCUMENT LIFECYCLE MATRIX
## ENTERPRISE INFORMATION LIFECYCLE POLICY

---

### OVERVIEW
To prevent documentation decay and ensure developers and AI agents always rely on accurate specs, every document in the **Aziz Assistant** repository is assigned a specific lifecycle status, governance owner, and revision schedule. This document acts as the authoritative matrix tracking those designations.

---

### STATUS DEFINITIONS
- **ACTIVE**: The current, binding specification. Developers must write code that complies fully with these documents.
- **REFERENCE**: Frozen technical frameworks, specifications, or architectural designs providing vital system context.
- **HISTORICAL**: Immutable snapshots of past milestones, sprint completions, and validation records. Kept for audit trails.
- **SUPERSEDED**: Obsolete specifications replaced by newer editions. Not to be used for active development.
- **DEPRECATED**: Outdated documents slated for deletion or archiving in future iterations.

---

### THE MASTER LIFECYCLE MATRIX

| Document Path | Title | Category | Status | Governance Owner | Revision Cycle |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `README.md` | General Overview & Setup | Executive | **ACTIVE** | Core Dev Team | Continuous (Per Release) |
| `ROADMAP.md` | System Milestones Roadmap | Executive | **ACTIVE** | Product Manager | Quarterly |
| `PLATFORM_CONSTITUTION.md` | Workspace Rules & Laws | Governance | **ACTIVE** | Dev Committee | Semi-Annually |
| `CONTRIBUTING.md` | Developer Guidelines | Governance | **ACTIVE** | Engineering Lead | Annually |
| `CODE_OF_CONDUCT.md` | Workspace Conduct Policy | Governance | **ACTIVE** | HR & Operations | Annually |
| `ARCHITECTURE.md` | Block Diagram & Tech Stack | Architecture | **ACTIVE** | Chief Architect | Major Releases |
| `docs/AKDS.md` | Aziz Kernel Design Spec | Architecture | **ACTIVE** | Core Kernel Team | Frozen |
| `PLATFORM_ACCEPTANCE_REVIEW.md` | frozen Platform Review | Architecture | **REFERENCE**| Chief Architect | Frozen |
| `docs/adr/ADR-001-AI-KERNEL.md` | AI Kernel Decisions | Architecture | **REFERENCE**| Core Kernel Team | Frozen |
| `docs/adr/ADR-002-EVENT-BUS.md` | Event Bus Design | Architecture | **REFERENCE**| Core Kernel Team | Frozen |
| `docs/adr/ADR-003-STATE-STORE.md` | State Store Memory | Architecture | **REFERENCE**| Core Kernel Team | Frozen |
| `docs/adr/ADR-004-AST-*` | AST Search Graphs | Architecture | **REFERENCE**| Core Kernel Team | Frozen |
| `docs/adr/ADR-005-TOOL-*` | Tool Registry Mounting | Architecture | **REFERENCE**| Core Kernel Team | Frozen |
| `docs/adr/ADR-006-MODEL-*` | Model Routing Logic | Architecture | **REFERENCE**| Core Kernel Team | Frozen |
| `docs/adr/ADR-007-EVENT-*` | Event Emitter Protocol | Architecture | **REFERENCE**| Core Kernel Team | Frozen |
| `TASK_ORCHESTRATION.md` | Task Orchestrator Flows | Kernel | **ACTIVE** | Core Kernel Team | Semi-Annually |
| `MODULE_LIFECYCLE.md` | Module Lifecycle Contract | Kernel | **ACTIVE** | Core Kernel Team | Frozen |
| `AI_INTELLIGENCE_FOUNDATION.md`| Core AI Services Spec | Kernel | **ACTIVE** | AI Research Team | Major Releases |
| `AI_INTELLIGENCE_PLATFORM.md`  | Platform Architecture  | Kernel | **ACTIVE** | Chief Architect  | Major Releases |
| `SERVICE_INTERFACES.md`        | Platform API Contracts| Kernel | **ACTIVE** | Lead QA Engineer  | Major Releases |
| `AI_INTELLIGENCE_SEQUENCE_DIAGRAM.md`| Sequence Flows | Kernel | **ACTIVE** | Core Kernel Team  | Major Releases |
| `SERVICE_DEPENDENCY_MAP.md`    | Platform Dependencies | Kernel | **ACTIVE** | Core Kernel Team  | Major Releases |
| `AI_OPERATIONS_PLATFORM.md`    | AI Operations Orch     | Kernel | **ACTIVE** | Chief Architect  | Major Releases |
| `AI_OPERATIONS_SEQUENCE_DIAGRAM.md`| Operations Seq Flow| Kernel | **ACTIVE** | Core Kernel Team  | Major Releases |
| `AI_RUNTIME_ARCHITECTURE.md`   | Cognitive Runtime Map  | Kernel | **ACTIVE** | Chief Architect  | Major Releases |
| `PROMPT_REGISTRY_SPEC.md`      | Prompt Management Spec | Kernel | **ACTIVE** | Lead QA Engineer  | Major Releases |
| `MODEL_ROUTING_SPEC.md`        | Multi-Model Routing    | Kernel | **ACTIVE** | Core Kernel Team  | Major Releases |
| `RESPONSE_COMPOSER_SPEC.md`    | Payload Composer Spec  | Kernel | **ACTIVE** | Lead QA Engineer  | Major Releases |
| `OBSERVABILITY_SPEC.md`         | Telemetry & Metrics    | Kernel | **ACTIVE** | Security Officer  | Major Releases |
| `docs/KERNEL_API_REFERENCE.md` | Kernel API Reference | Kernel | **ACTIVE** | Core Kernel Team | Major Releases |
| `docs/KERNEL_FREEZE_v1.md` | Core Freeze Specifications | Kernel | **ACTIVE** | Dev Committee | Frozen |
| `docs/TYPE_CONTRACT_REFERENCE.md`| Type Contract Reference | Kernel | **ACTIVE** | Lead QA Engineer | Major Releases |
| `docs/EVENT_CATALOG.md` | System Pub-Sub Events | Kernel | **ACTIVE** | Core Kernel Team | Major Releases |
| `RECRUITMENT_*_PHASE1.md` | Recruitment Domain Specs | Product | **ACTIVE** | Product Manager | Per Sprint |
| `EMPLOYMENT_PLATFORM_V2.md` | Employment Platform Specs | Product | **ACTIVE** | Product Manager | Per Sprint |
| `DATA_PROVENANCE.md` | Data Lineage & Schema Audit | Operations | **ACTIVE** | Data Architect | Semi-Annually |
| `docs/DISASTER_RECOVERY.md` | Backup & Recovery Proceds | Operations | **ACTIVE** | Infrastructure Team| Annually |
| `docs/RISK_REGISTER.md` | Platform Security Threat Log | Operations | **ACTIVE** | Security Officer | Continuous |
| `docs/RELEASE_CHECKLIST.md` | Pre-Deployment Checklists | Operations | **ACTIVE** | Engineering Lead | Continuous |
| `SECURITY.md` | Threat Model & Key Safety | Security | **ACTIVE** | Security Officer | Semi-Annually |
| `docs/SECURITY_AUDIT.md` | Sandbox & Network Auditing | Security | **ACTIVE** | Security Officer | Annually |
| `docs/DEPLOYMENT_GUIDE.md` | Cloud Run Deployment Manual | Deployment | **ACTIVE** | Infrastructure Team| Annually |
| `docs/PHASE2_IMPLEMENTATION_PLAN.md`| Post-MVP Migration Blueprints| Deployment | **REFERENCE**| Chief Architect | Quarterly |
| `CHANGELOG.md` | Historical Release Registry | History | **ACTIVE** | Core Dev Team | Continuous (Per Release) |
| `PLATFORM_INTEGRATION_REPORT.md` | Master Integration Status | Sprint Reports| **HISTORICAL**| Engineering Lead | Frozen |
| `docs/KERNEL_INTEGRATION_REPORT.md` | Kernel Build Milestones | Sprint Reports| **HISTORICAL**| Core Kernel Team | Frozen |
| `docs/KERNEL_RC1_REPORT.md` | Release Candidate 1 Report | Sprint Reports| **SUPERSEDED**| Chief Architect | Frozen |
| `docs/KERNEL_RC1_VALIDATION.md` | RC1 Stability Checklist | Validation | **SUPERSEDED**| Chief Architect | Frozen |
| `docs/SPRINT1_VALIDATION_REPORT.md` | Sprint 1 Validation Snapshot| Sprint Reports| **HISTORICAL**| Engineering Lead | Frozen |
| `docs/SPRINT2_IMPLEMENTATION_REPORT.md`| Sprint 2 Progress Metrics | Sprint Reports| **HISTORICAL**| Engineering Lead | Frozen |
| `docs/SPRINT3_IMPLEMENTATION_REPORT.md`| Sprint 3 Progress Metrics | Sprint Reports| **HISTORICAL**| Engineering Lead | Frozen |
| `docs/SPRINT4_IMPLEMENTATION_REPORT.md`| Sprint 4 Progress Metrics | Sprint Reports| **HISTORICAL**| Engineering Lead | Frozen |
| `docs/SPRINT5_IMPLEMENTATION_REPORT.md`| Sprint 5 Progress Metrics | Sprint Reports| **HISTORICAL**| Engineering Lead | Frozen |
| `docs/SPRINT6_IMPLEMENTATION_REPORT.md`| Sprint 6 Progress Metrics | Sprint Reports| **HISTORICAL**| Engineering Lead | Frozen |
| `docs/SPRINT7_IMPLEMENTATION_REPORT.md`| Sprint 7 Progress Metrics | Sprint Reports| **HISTORICAL**| Engineering Lead | Frozen |
| `docs/SPRINT8_IMPLEMENTATION_REPORT.md`| Sprint 8 Progress Metrics | Sprint Reports| **HISTORICAL**| Engineering Lead | Frozen |
| `docs/SPRINT9_IMPLEMENTATION_REPORT.md`| Sprint 9 Progress Metrics | Sprint Reports| **HISTORICAL**| Engineering Lead | Frozen |
| `EMPLOYMENT_PLATFORM_QA_REPORT.md`| Sprint 3 Employment QA | Validation | **REFERENCE**| Lead QA Engineer | Frozen |

---

### INFORMATION LIFECYCLE MANAGEMENT PROCESS
1. **Adding New Documents**: All new document creations must specify their Title, Category, Status, Governance Owner, and Revision Cycle inside this master matrix.
2. **Archiving Superseded Materials**: When a document status shifts from **ACTIVE** to **SUPERSEDED** or **DEPRECATED**, the file should be prefixed with `[OBSOLETE]` or moved to an archived history path to prevent indexing by AI coding agents.
3. **Continuous Auditing**: The Chief Architect and Security Officer must perform a complete documentation audit on the final turn of every major product release cycle.
