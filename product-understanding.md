# OPENCLAW PLATFORM - PRODUCT UNDERSTANDING & SPECIFICATION
**Version**: 1.0.0
**Role**: Chief Technology Officer & Principal Software Architect
**Last Updated**: 2026-08-01T22:24:08.961Z

---

## 1. Product Vision
The OpenClaw Platform (Aziz AI Platform) is an enterprise-grade, autonomous AI Agent & Recruitment Intelligence Platform. It combines an advanced AI Agent Kernel (orchestrating task planning, reflection, verification, tool calling, and multi-model routing) with deep domain services (recruitment workflows, job searching, multimodal knowledge ingestion, freelance profile management, and multi-tenant identity control) backed by hybrid PostgreSQL and high-performance in-memory persistence.

---

## 2. Product Goals
- **Autonomous Multi-Step Agent Execution**: Execute complex multi-step workflows with real-time state management, event pub-sub telemetry, self-reflection, and verification.
- **Multimodal Knowledge Ingestion & Vector Retrieval**: Ingest documents (PDF, DOCX, TXT, JSON) with Gemini multimodal parsing, token-aware chunking, vector embedding generation, and hybrid semantic search.
- **Recruitment & Employment Intelligence**: Automate candidate sourcing, job matching, resume analysis, applicant tracking (ATS), and automated recruiter outreach via email/SMTP.
- **Enterprise Observability & Governance**: Provide real-time metrics, distributed tracing, health checks, diagnostic agents, and audit logs with sliding-window rate limiting and OWASP ASVS security defenses.
- **Multi-Tenant Identity & Access Management**: Support workspaces, tenant isolation, fine-grained role-based access control (RBAC), user profiles, and session security.

---

## 3. Business Problems Solved
- Manual recruitment overhead and candidate screening delays.
- Fragmented AI tool orchestration without auditability or safety guardrails.
- High cost and complexity of indexing multi-format domain documents for enterprise search.
- Lack of centralized observability into agent decision-making, token usage, and confidence scores.

---

## 4. User Personas & Roles
- **System Administrator / Platform Owner**: Manages system diagnostics, Hostinger SMTP configuration, global observability, rate limits, and security audits.
- **Recruiter / HR Manager**: Sources candidates, manages recruitment workflows, tracks job applications, triggers automated screening, and monitors candidate match scores.
- **Job Seeker / Candidate**: Analyzes resume alignment against job descriptions, searches open job listings, and manages freelance profile gigs.
- **AI Engineer / Developer**: Interacts with the AI Agent Kernel, customizes tool registries, inspects decision logs, runs terminal diagnostics, and monitors model confidence metrics.

---

## 5. Architectural & System Modules

### A. AI Kernel & Intelligence Stack (`src/kernel`)
- **AgentRuntime**: Orchestrates step execution, tool invocations, state updates, and event notifications.
- **Planner**: Decomposes high-level goals into step-by-step action plans.
- **ToolRegistry**: Manages tool registration, parameter validation, and tool execution.
- **StateStore & EventBus**: Maintains session context and publishes real-time telemetry events.
- **ModelRouter & ContextBuilder**: Dynamically selects models (Gemini Flash, Lite) and builds token-constrained prompts.
- **VerificationEngine & ReflectionEngine**: Validates tool output and refines plans based on execution feedback.
- **IntelligenceCoordinator**: Synchronizes Confidence, Explainability, Risk Intelligence, Semantic, and Recommendation services.

### B. Domain Services Stack (`src/domains`)
- **API Domain**: Express server entry point (`server.ts`), `ApiGateway`, `RequestRouter`, `OpenApiGenerator`, and rate limiting middlewares.
- **Knowledge Domain**: `DocumentIngestionService` for multimodal PDF/DOCX chunking, embeddings, and vector search; `SearchHistoryService`.
- **Employment Domain**: `JobSearchService`, `ResumeService`, `MatchingService`, `ATSService`, and `EmploymentV2Service`.
- **Recruitment Domain**: `RecruiterService`, `RecruitmentWorkflowEngine`, `RecruitmentIntelligenceModule`.
- **Freelance Domain**: `FreelanceService` for gig listings, rates, and freelancer profiles.
- **Identity Domain**: `UserService`, `OrganizationService`, `TenantManager`, `WorkspaceManager`, `RoleService`, `PermissionService`, `AuditIdentityService`.
- **Communication Domain**: `NotificationService` (NodeMailer + Hostinger SMTP) and `HostingerService`.
- **Infrastructure Domain**: `AIService` (Gemini SDK integration with 15s timeout, 2x retry, and model fallback), `SecurityService`, `TerminalService`, `IndexerService`, `DiagnosticAgentService`.
- **Observability Domain**: `ObservabilityModule`, `MetricsService`, `TracingService`, `HealthService`, `DiagnosticsService`, `LogAggregationService`.

### C. Storage & Persistence (`src/domains/shared/repository`)
- **PostgresRepository**: Production PostgreSQL driver with auto-DDL migrations, connection pooling, and transactional operations.
- **InMemoryRepository**: In-memory repository fallback for instant zero-dependency execution and testing.
- **FileStorageService**: Disk file storage mapped to `/data/storage` with workspace fallbacks.

### D. Frontend Presentation Layer (`src/components`)
- **StudioPanel**: Interactive workspace for AI studio workflows and prompt testing.
- **JobAgentPanel & SavedJobsPanel**: Job discovery, application management, and resume matching.
- **RecruitmentIntelligencePanel**: Candidate pipeline dashboard with AI match scores.
- **DiagnosticPanel & TerminalPanel**: System diagnostics, terminal command runner, and live execution logs.
- **GmailPanel**: Email integration and outreach management.
- **MemoryVault**: Knowledge base documents, chunk viewer, and search interface.
- **ApplicationTrackerPanel**: Sourced and active candidate applications tracking.

---

## 6. Current Product Scope & State
- **Core Kernel**: 100% Complete & Passed 23/23 Regression Suites.
- **Backend API & Service Registry**: 100% Integrated with production PostgreSQL and in-memory fallback.
- **Multimodal Document Parsing**: Fully functional with Gemini Flash & embedding generation.
- **UI Panels**: All 13 panels rendered and integrated with Express backend REST endpoints.
