# AZIZ AI KERNEL: DOCUMENTATION ARCHITECTURE
## TECHNICAL DESIGN & KNOWLEDGE TOPOLOGY

---

### OVERVIEW
In an autonomous development workspace, documentation is not merely passive text; it is the **semantic blueprint** used by AI agents to construct, verify, and scale the application code. This document outlines the structural architecture of the Aziz Assistant documentation library, ensuring high information density, clear segregation of concerns, and rigorous alignment with frozen kernel contracts.

---

### THE KNOWLEDGE TAXONOMY
The workspace documentation is organized into **nine discrete functional domains** to prevent overlap, ease navigation, and establish strict ownership boundaries:

```
  +-------------------------------------------------------------+
  |                        1. EXECUTIVE                         |
  |  Provides absolute context, high-level purpose, & roadmap.  |
  +-------------------------------------------------------------+
                                |
                                v
  +-------------------------------------------------------------+
  |                        2. GOVERNANCE                        |
  |  Enforces the constitutional laws, contribution guidelines, |
  |  and code behavior parameters for the workspace.            |
  +-------------------------------------------------------------+
                                |
                                v
  +-------------------------------------------------------------+
  |                       3. ARCHITECTURE                       |
  |  Frozen blueprints, layout topologies, design decisions     |
  |  (ADRs), and structural model reviews.                      |
  +-------------------------------------------------------------+
                                |
                                v
  +-------------------------------------------------------------+
  |                          4. KERNEL                          |
  |  System execution mechanics, event-bus specs, and API       |
  |  contracts that form the runtime.                           |
  +-------------------------------------------------------------+
                                |
                                v
  +-------------------------------------------------------------+
  |                     5. PRODUCT MODULES                      |
  |  Domain-specific logic, feature scopes, and operational     |
  |  parameters of the business layers.                         |
  +-------------------------------------------------------------+
         |                      |                      |
         v                      v                      v
  +--------------+       +--------------+       +--------------+
  |  6. SECURITY |       | 7. OPERATIONS|       |8. DEPLOYMENT |
  | Sandboxing,  |       | Lineage, risk|       | Containers,  |
  | keys, and    |       | registers, & |       | proxies, &   |
  | threat models|       | checklists.  |       | CI/CD setup. |
  +--------------+       +--------------+       +--------------+
                                |
                                v
  +-------------------------------------------------------------+
  |                       9. SPRINT HISTORY                     |
  |  Chronological logs of completed milestones, validation     |
  |  reports, and change ledgers.                               |
  +-------------------------------------------------------------+
```

---

### DOCUMENT DEPENDENCY MAP
The documentation files exhibit strict hierarchical inheritance. High-level rules guide architectural decisions, which in turn define the APIs and contracts used to build dynamic product systems.

#### 1. Core Inheritance Chains
- **憲法 (Constitution) to Architecture Alignment**:
  `PLATFORM_CONSTITUTION.md` strictly guides `ARCHITECTURE.md`. Technical layouts cannot deviate from established governance laws (e.g. frozen core requirements, local-first data defaults).
- **Architecture to Kernel Specifications**:
  `ARCHITECTURE.md` forms the baseline for `/docs/AKDS.md` (Aziz Kernel Design Specification) and Architectural Decision Records (`/docs/adr/*`). These translate high-level system blocks into class-level technical blueprints.
- **Kernel Specifications to APIs & Contracts**:
  `/docs/AKDS.md` dictates the contracts and event payloads detailed in `/docs/KERNEL_API_REFERENCE.md`, `/docs/EVENT_CATALOG.md`, and `/docs/TYPE_CONTRACT_REFERENCE.md`.
- **Contracts to Product Implementation**:
  `/docs/TYPE_CONTRACT_REFERENCE.md` and `AI_INTELLIGENCE_FOUNDATION.md` serve as the absolute boundary constraints for writing business modules such as `RECRUITMENT_INTELLIGENCE_PLATFORM_PHASE1.md` and `EMPLOYMENT_PLATFORM_V2.md`.
- **Operations & Security Constraints to Deployment**:
  `SECURITY.md` and `/docs/SECURITY_AUDIT.md` restrict network and process bounds, which are then applied inside `/docs/DEPLOYMENT_GUIDE.md` (Docker/Cloud Run configs).

#### 2. Detailed Dependency Matrix

| Downstream Document | Direct Upstream Parent (Dependency) | Required Alignment Verification |
| :--- | :--- | :--- |
| `ARCHITECTURE.md` | `PLATFORM_CONSTITUTION.md` | Ensures strict obedience to frozen-state mandates. |
| `docs/AKDS.md` | `ARCHITECTURE.md` | Maps visual blocks into core runtime software engine files. |
| `docs/adr/ADR-*` | `docs/AKDS.md` | Verifies micro-decisions against the primary cognitive spec. |
| `TASK_ORCHESTRATION.md` | `docs/AKDS.md` | Implements the pipeline planning mechanics defined in AKDS. |
| `AI_INTELLIGENCE_FOUNDATION.md` | `docs/TYPE_CONTRACT_REFERENCE.md` | Adheres strictly to the unified types and domain-neutral parameters. |
| `RECRUITMENT_*_PHASE1.md` | `AI_INTELLIGENCE_FOUNDATION.md` | Recycles matching, risk, and confidence service interfaces. |
| `docs/DEPLOYMENT_GUIDE.md` | `SECURITY.md` | Reflects correct ports (3000), frame permission sandboxes, and SSL proxies. |

---

### TAXONOMIC SEGREGATION POLICIES

To preserve the clean hierarchical architecture of the system's documentation:
1. **Never Duplicate System Contracts**: Do not copy class definitions or API endpoints into product specs. Reference `/docs/KERNEL_API_REFERENCE.md` or `/docs/TYPE_CONTRACT_REFERENCE.md` directly.
2. **Abstract Business Logic from the Kernel**: Kernel specs (`/docs/AKDS.md`, `/docs/KERNEL_API_REFERENCE.md`) must remain strictly domain-independent. Recruitment or Employment schemas must never infect core cognitive engine files.
3. **Chronological Freeze**: Sprint reports and validations (`/docs/SPRINT*_REPORT.md`, `/docs/KERNEL_RC1_REPORT.md`) represent historical milestone signatures. They must remain frozen and unmodified as immutable project ledgers.
