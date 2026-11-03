# AZIZ AI SAAS PLATFORM
## SPRINT 23 ENTERPRISE OBSERVABILITY & KERNEL AUDIT: PLATFORM INVENTORY

This document provides a highly structured, comprehensive, and programmatically verified inventory of all engineering components, services, modules, repositories, APIs, schedulers, background tasks, tests, documents, and dependencies within the Aziz AI Platform as of **July 2026**.

---

## 1. MODULE SYSTEM (`src/kernel/module` & `src/domains`)
The platform leverages a custom modular architecture managed by a centralized, asynchronous `ModuleManager` lifecycle engine.

| Module Name | Implementation File | Startup Order | Domain / Purpose |
| :--- | :--- | :---: | :--- |
| **RepositoryModule** | `src/domains/shared/module/RepositoryModule.ts` | 1 | Initializes connection to the designated state storage engine. |
| **ProviderModule** | `src/domains/shared/module/ProviderModule.ts` | 2 | Configures live search and data grounding providers. |
| **SharedPlatformModule** | `src/domains/shared/module/SharedPlatformModule.ts` | 3 | Boots internal event streams, event logs, and kernel structures. |
| **IdentityModule** | `src/domains/identity/IdentityModule.ts` | 4 | Coordinates user roles, workspaces, and multi-tenant isolation. |
| **KnowledgeModule** | `src/domains/knowledge/KnowledgeModule.ts` | 5 | Establishes semantic query history caching and context memories. |
| **CommunicationModule** | `src/domains/communication/CommunicationModule.ts` | 6 | Initializes outbound notification routing and SMTP linkages. |
| **RecruitmentModule** | `src/domains/recruitment/RecruitmentModule.ts` | 7 | Registers AI recruiter matching channels and workflow triggers. |
| **InfrastructureModule**| `src/domains/infrastructure/InfrastructureModule.ts` | 8 | Orchestrates terminal emulator sandboxes and workspace security controls. |
| **EmploymentModule** | `src/domains/employment/EmploymentModule.ts` | 9 | Provisions resume parsers, ATS integrations, and profile managers. |
| **FreelanceModule** | `src/domains/freelance/FreelanceModule.ts` | 10 | Maps remote work engines, gig scraping, and automated bidding. |
| **AutomationModule** | `src/domains/automation/AutomationModule.ts` | 11 | Launches background daemons, cron intervals, and polling sweeps. |
| **ObservabilityModule**| `src/domains/observability/ObservabilityModule.ts`| 12 | Launches metrics collectors, tracing, health, and alerting rules. |

---

## 2. SERVICES CATALOG (DEPENDENCY INJECTION REGISTRY)
All services are loaded and registered inside `ServiceRegistry` (`src/services/backend/ServiceRegistry.ts`), enabling a stateless, thread-safe dependency tree.

### 2.1 Storage & Shared Platform Services
- **RepositoryFactory** (`src/domains/shared/repository/RepositoryFactory.ts`): Resolves the active storage instance based on runtime configurations.
- **RepositoryRegistry** (`src/domains/shared/repository/RepositoryRegistry.ts`): Thread-safe registry holding available storage drivers.
- **RepositoryDiagnostics** (`src/domains/shared/repository/RepositoryDiagnostics.ts`): Calculates size, latency, and operational health of storage.
- **RepositoryConfiguration** (`src/domains/shared/repository/RepositoryConfiguration.ts`): Reads environmental config overrides for backend stores.

### 2.2 AI Kernel Intelligence Services
- **SemanticIntelligenceService** (`src/kernel/intelligence/SemanticIntelligenceService.ts`): Resolves advanced resume-to-job matching, skill translation, and concept extraction.
- **ConfidenceService** (`src/kernel/intelligence/ConfidenceService.ts`): Scores decision accuracy and determines alignment reliability coefficients.
- **RiskIntelligenceService** (`src/kernel/intelligence/RiskIntelligenceService.ts`): Performs automated safety, integrity, and operational risk screenings on inputs.
- **ExplainabilityService** (`src/kernel/intelligence/ExplainabilityService.ts`): Deconstructs model reasoning into structured explanation trees for transparency.
- **DecisionLogService** (`src/kernel/intelligence/DecisionLogService.ts`): Archives trace records of intelligence assessments to the storage repository.
- **RecommendationService** (`src/kernel/intelligence/RecommendationService.ts`): Formulates contextual, action-oriented, and strategic next steps.
- **IntelligenceCoordinator** (`src/kernel/intelligence/IntelligenceCoordinator.ts`): Single-entry orchestration facade compiling the outputs of all AI Kernel sub-services.

### 2.3 Identity, Access & Organization Services
- **ProfileService** (`src/domains/identity/ProfileService.ts`): Updates core personal skills, resumes, country permissions, and user parameters.
- **TenantManager** (`src/domains/identity/TenantManager.ts`): Isolates corporate partitions and database prefixes in a multi-tenant layout.
- **OrganizationService** (`src/domains/identity/OrganizationService.ts`): Manages division hierarchy, department workspaces, and billing clusters.
- **WorkspaceManager** (`src/domains/identity/WorkspaceManager.ts`): Restricts workspace folder hierarchies and handles sharing privileges.
- **UserService** (`src/domains/identity/UserService.ts`): Creates, indexes, audits, and soft-deletes corporate employee profiles.
- **RoleService** (`src/domains/identity/RoleService.ts`): Defines, deletes, and links RBAC (Role-Based Access Control) assignments.
- **PermissionService** (`src/domains/identity/PermissionService.ts`): Evaluates granular permissions against resource types.
- **SessionService** (`src/domains/identity/SessionService.ts`): Validates and expires JSON Web Tokens (JWT) or temporary API credentials.
- **AuditIdentityService** (`src/domains/identity/AuditIdentityService.ts`): Chronicles compliance logs for modifications to access permissions.

### 2.4 Employment & Freelance Match Services
- **JobSearchService** (`src/domains/employment/JobSearchService.ts`): Queries external job feeds, invoking matching heuristics.
- **FreelanceService** (`src/domains/freelance/FreelanceService.ts`): Aggregates gig posts from Upwork, Toptal, and Freelancer, triggering automated cover-pitch writing.
- **ResumeService** (`src/domains/employment/ResumeService.ts`): Extracts layout structures, skills, and chronological timelines from plain text.
- **ATSService** (`src/domains/employment/ATSService.ts`): Manages workflows, stages, and recruiter logs across active job candidate pipelines.
- **EmploymentV2Service** (`src/domains/employment/EmploymentV2Service.ts`): Orchestrates advanced match scoring overlays and automated resume updates.
- **MatchingService** (`src/domains/employment/MatchingService.ts`): Standardizes raw strings into structured sets to score text overlaps.

### 2.5 Recruitment Services
- **RecruiterService** (`src/domains/recruitment/RecruiterService.ts`): Manages recruiter profiles, contact histories, and preferred parameters.
- **RecruitmentIntelligenceModule** (`src/domains/recruitment/RecruitmentIntelligenceModule.ts`): Adapts the underlying AI Kernel Coordinator to high-throughput recruiter scoring.
- **RecruitmentWorkflowEngine** (`src/domains/recruitment/RecruitmentWorkflowEngine.ts`): Evaluates batches of candidates against job specifications, validating resume versions and duplicates.

### 2.6 Communication & Notification Services
- **NotificationService** (`src/domains/communication/NotificationService.ts`): Emits system events, websocket alerts, and routes emails.
- **HostingerService** (`src/domains/communication/HostingerService.ts`): Connects directly to Hostinger mail systems via secure SMTP transport.

### 2.7 Automation & Background Services
- **AlertService** (`src/domains/automation/AlertService.ts`): Fires autonomous scheduled interval sweeps to parse mailboxes and index opportunities.

### 2.8 Infrastructure & Workspace Hardening Services
- **AIService** (`src/domains/infrastructure/AIService.ts`): Configures and instantiates the Gemini SDK connection.
- **DiagnosticAgentService** (`src/domains/infrastructure/DiagnosticAgentService.ts`): Deploys an automated workspace fixer agent to resolve system issues.
- **IndexerService** (`src/domains/infrastructure/IndexerService.ts`): Catalogs, tokenizes, and segments directory files to maintain local grounding models.
- **ProviderDiagnosticService** (`src/domains/infrastructure/ProviderDiagnosticService.ts`): Queries outer-link APIs (e.g. Google Search) to verify connection integrity.
- **SecurityService** (`src/domains/infrastructure/SecurityService.ts`): Runs deep static audits on workspace files to search for keys, leaks, or loose permissions.
- **SystemAuditService** (`src/domains/infrastructure/SystemAuditService.ts`): Records system operational logs.
- **TerminalService** (`src/domains/infrastructure/TerminalService.ts`): Emulates a restricted bash shell environment supporting system hardening actions.

### 2.9 Enterprise Observability Services
- **MetricsService** (`src/domains/observability/MetricsService.ts`): Collects, buffers, and aggregates high-precision counter, gauge, and timer metrics.
- **TracingService** (`src/domains/observability/TracingService.ts`): Tracks transaction flows across nested modules under request ID scopes.
- **HealthService** (`src/domains/observability/HealthService.ts`): Performs live health checks across the kernel, databases, networks, and integrations.
- **LogAggregationService** (`src/domains/observability/LogAggregationService.ts`): Captures system logs, formatting them as structured single-line JSON streams.
- **DiagnosticsService** (`src/domains/observability/DiagnosticsService.ts`): Combines metrics, traces, health, and logs to export unified system state reports.
- **PerformanceProfiler** (`src/domains/observability/PerformanceProfiler.ts`): Measures microsecond processing durations and memory profiles.
- **AlertService (Observability)** (`src/domains/observability/AlertService.ts`): Evaluates metrics thresholds to trigger, escalate, and resolve alerts.
- **DashboardAggregator** (`src/domains/observability/DashboardAggregator.ts`): Formulates highly detailed analytics, charts, and telemetry maps for the front-end dashboard.

---

## 3. CONTROLLERS & ENDPOINTS SYSTEM
The platform mounts endpoints in `server.ts` and maps the modularized REST structure via Express.

### 3.1 Routers
- **ApiGateway** (`src/domains/api/ApiGateway.ts`): Entry point for all `/api/v1/` endpoints.
- **RequestRouter** (`src/domains/api/RequestRouter.ts`): Dynamically resolves gateway routing to underlying controllers.
- **RecruitmentRouter** (`src/domains/recruitment/RecruitmentRouter.ts`): Handles high-throughput recruiter analysis.

### 3.2 Middlewares
- **AuthenticationMiddleware** (`src/domains/api/AuthenticationMiddleware.ts`): Validates session headers, request tokens, and RBAC clearances.
- **ValidationMiddleware** (`src/domains/api/ValidationMiddleware.ts`): Validates request shapes using JSON-Schema validation.
- **ErrorMiddleware** (`src/domains/api/ErrorMiddleware.ts`): Catches stack trace exceptions, logging details before transforming them into standardized API responses.

---

## 4. PERSISTENCE LAYER & DATA MODELS
Data modeling is structured as clean TypeScript interfaces in `src/types.ts` and domain-specific typings.

### 4.1 Schema Definitions
- **JobProfile**: Defines executive resume text, years of experience, primary skills, and country target parameters.
- **FreelanceProfile**: Holds hourly pricing rates, freelance platform linkages, portfolio urls, offerings, and pitch templates.
- **FreelanceGig**: Defines external gig listings parsed from scrapers, tracking title, platform, budget, complexity, and description.
- **RecruiterContact**: Logs individual external recruiter interactions, including email, organization, LinkedIn profile, and history notes.
- **Memory**: Stores semantic memories used for system grounding, detailing type, content, and timestamp.
- **ScanLog**: Captures automation sweep outcomes, archiving timestamp, success count, log messages, and error states.
- **MetricEntry**: Standardizes high-precision observability records containing value, tags, and timestamps.
- **DiagnosticResult**: Models security audit outputs, grade, scanned files count, and recommended fixes.

### 4.2 Storage Drivers
- **InMemoryRepository**: Clean state store holding structures as local arrays.
- **FirebaseRepositorySkeleton**: Empty skeleton driver with unfinished Firestore connection queries.

---

## 5. SCHEDULERS & DAEMONS
The platform uses background loops to handle asynchronous automation tasks.

- **Gmail Parsing Poller** (`src/domains/automation/AlertService.ts`): Uses a periodic interval (`setInterval` fallback) simulating a 15-minute background sweep.
  - *Trigger*: Launched by `AutomationModule.onStartup()`.
  - *Actions*: Checks the designated Gmail Session, scans local folders, runs matching, and triggers direct SMTP alerts via `NotificationService` when matching leads appear.

---

## 6. COMPLETE REWRITE-READY DEPENDENCIES INVENTORY
Extracted from `package.json`, our runtime environment relies on the following active dependencies:

### 6.1 Runtime Dependencies
- `@google/genai` (^2.4.0): Core Google Gemini API Client SDK.
- `express` (^4.21.2): Backend HTTP server.
- `firebase` (^12.15.0): Client-side database SDK (skeletons only).
- `googleapis` (^173.0.0): Workspace authentication and Gmail API interface.
- `lucide-react` (^0.546.0): Front-end modern UI icons.
- `motion` (^12.23.24): UI micro-animations and layout transitions.
- `nodemailer` (^9.0.3): SMTP transporter for alerts and logs.
- `react` (^19.0.1) & `react-dom` (^19.0.1): Modern SPA interface.
- `recharts` (^3.9.2): High-fidelity front-end dashboards.
- `dotenv` (^17.2.3): Environment variable manager.
- `vite` (^6.2.3): Build-tooling and development server.

### 6.2 Developer Dependencies
- `typescript` (~5.8.2): Strict Type compiler.
- `tsx` (^4.21.0): High-speed TypeScript direct runner for servers and tests.
- `esbuild` (^0.25.0): Compiles full-stack entry points into unified `.cjs` production bundles.
- `@types/express` (^4.17.21), `@types/node` (^22.14.0), `@types/nodemailer` (^8.0.1): Accurate compilation typings.
- `tailwindcss` (^4.1.14) & `autoprefixer` (^10.4.21): CSS engine.

---

## 7. SYSTEM DOCUMENTATION INDEX

The platform maintains a rich archive of specification sheets and implementation reports in the repository root:
1. `README.md` - Primary guide for installation, operation, and development scripts.
2. `ARCHITECTURE.md` - Complete visual layout and architecture diagram of the micro-kernel.
3. `PLATFORM_CONSTITUTION.md` - Absolute core principles of the platform and coding guidelines.
4. `OBSERVABILITY_SPEC.md` - Technical standard and blueprint for metrics, traces, and diagnostics.
5. `AI_OPERATIONS_PLATFORM.md` - Details of the DevOps pipeline, Terminal, and Hardening engines.
6. `AI_INTELLIGENCE_PLATFORM.md` - Core details of the AI Model Routing and Prompt Registry.
7. `AI_INTELLIGENCE_FOUNDATION.md` - Details of the multi-tier AI reasoning and coordinator layer.
8. `API_PLATFORM_IMPLEMENTATION_REPORT.md` - Summary of the unified SPRINT 21 router.
9. `OBSERVABILITY_PLATFORM_IMPLEMENTATION_REPORT.md` - Verification report for the performance metrics engine.
