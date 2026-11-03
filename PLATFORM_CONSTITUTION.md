# AZIZ ASSISTANT – PLATFORM CONSTITUTION

This document establishes the official architectural standards, engineering principles, data policies, and technical governance guidelines for the **Aziz Assistant** platform. All future development, code edits, module integrations, and AI-driven enhancements must adhere strictly to this constitution.

---

## 1. CORE MISSION & OBJECTIVE
Aziz Assistant is a unified, modular, enterprise-grade AI Operating System. It is **NOT** a collection of disconnected standalone applications, nor is it a prototype built for short-term demos. It is a long-term, scalable, cohesive platform. 
Every new feature, integration, or agent capability must be implemented as a module within the existing architecture, sharing core infrastructure and UI elements.

---

## 2. THE GOLDEN RULE OF EVOLUTION (ANTI-REWRITE)
The existing, stable, and working codebase of Aziz Assistant must be **improved, scaled, completed, and hardened**—never rewritten, discarded, or replaced.
* **No Standalone Apps**: You are strictly forbidden from creating parallel, detached apps.
* **No Functional Duplication**: Always reuse and extend existing components, services, or utilities before writing new ones.
* **No Destructive Overwrites**: Working UI panels, robust API endpoints, and database models must remain backwards-compatible.
* **No Redundant Infrastructure**: Do not spin up parallel implementations of memory, state stores, event buses, or AI routers when the core platform services can support the requirement.

---

## 3. ARCHITECTURAL DECISION MATRIX
Before implementing any feature, the following logic tree must be strictly evaluated:
1. **Does the capability already exist?**
   * *Yes* $\rightarrow$ Extend the existing implementation.
   * *No* $\rightarrow$ Proceed to Step 2.
2. **Can an existing shared service support this requirement?**
   * *Yes* $\rightarrow$ Reuse and configure the shared service.
   * *No* $\rightarrow$ Proceed to Step 3.
3. **Should this capability become a reusable shared service?**
   * *Yes* $\rightarrow$ Design and build a reusable Shared Service.
   * *No* $\rightarrow$ Proceed to Step 4.
4. **Create a new modular plug-in/module.** Ensure it integrates seamlessly into the existing platform's dashboard, sharing the unified layout, state, and event bus.

---

## 4. SHARED SERVICE ARCHITECTURE
Every module within Aziz Assistant must rely on a single, centralized set of shared services. Duplicating these layers is a critical failure.
* **Authentication**: Firebase Authentication with Google Sign-In and cached OAuth Access Tokens.
* **Authorization**: Role-Based Access Control (RBAC) ensuring appropriate level-of-privilege.
* **User Profile**: Shared persistent user profile data (skills, location, preferences).
* **Memory & Storage**: Unified Memory Vault and State Store (`InMemoryStateStore` and local caching).
* **Notification Engine**: Shared dispatchers for email (SMTP/Nodemailer) and live alerts.
* **Scheduler**: Centralized agent scheduling and background execution loop.
* **AI Router & Providers**: Unified `ModelRouter` with fallback mechanisms (`GeminiLLMProvider`).
* **Prompt Library**: Centralized system instructions and few-shot examples.
* **Observability**: Shared Logging, Diagnostics (`diagnostic-agent`), and Health Monitoring.

---

## 5. FIREBASE STUDIO COMPATIBILITY & PORTABILITY
The platform is designed to run and build seamlessly inside the Google Firebase Studio container runtime environment.
* **Infrastructure Abstraction**: To prevent vendor lock-in, all major technical services (Database, Auth, AI, Notifications, Schedulers, Storage, and Queues) must be defined behind abstract interfaces (e.g., `ILLMProvider`, `IStateStore`, `IEventBus`).
* **Portability**: The code must compile and run on Cloud Run, and remain ready for seamless migration to Docker, standard VPS, AWS, GCP, Azure, or Self-Hosted infrastructure without refactoring.

---

## 6. STRICT LIVE DATA & DATA PROVENANCE POLICY
Production dashboards and agent workflows must operate only on verified, real-world data.
* **No Mock Data in Production**: Silent fallbacks to mock, simulated, placeholder, or hardcoded jobs, recruiters, salaries, or freelance projects are strictly prohibited.
* **Mandatory Provenance Metadata**: Every data record retrieved or stored must contain:
  1. `source`: Name of the originating platform or live feed (e.g., "Gmail API", "SMTP Handshake", "Adzuna API").
  2. `timestamp`: Exact UTC time of retrieval.
  3. `verificationStatus`: Authentication status and validity checks (e.g., "Verified Signature").
  4. `confidenceScore`: A calculated confidence index based on source reliability.
  5. `originalReference`: Direct link, message ID, or primary key of the original record.
  6. `deduplicationStatus`: Marker indicating whether the record has been merged or deduplicated.
* **Graceful Degraded States**: If a live data feed is offline or unavailable, the UI must display `"Live source unavailable"` instead of generating or falling back to fake records.

---

## 7. ENTERPRISE SECURITY CONSTRAINTS
* **No Secret Exposure**: All server-side secrets (`GEMINI_API_KEY`, `SMTP_PASSWORD`, OAuth tokens, session keys) must reside exclusively in backend environment variables (`process.env`). They are strictly forbidden from appearing in client-side directories (`src/`), static bundles, or console logs.
* **Credential Safety**: SMTP and OAuth credentials must never be printed, stored in plain text, or leaked in debugging contexts.
* **Input Validation**: Never trust client-side parameters. Perform strict schema validation and safety checks on all backend API routes.

---

## 8. CODE QUALITY & TECHNICAL GOVERNANCE
* **Design Standards**: Adhere strictly to **SOLID**, **DRY**, **KISS**, **YAGNI**, Clean Architecture, Domain-Driven Design (DDD), and Composition over Inheritance.
* **TypeScript Integrity**: Maintain strict type safety. Avoid unsafe `as any` type assertions or implicit `any` parameter declarations.
* **Performance**: Optimize file scans, limit state re-renders in React hooks, and leverage asynchronous tasks to prevent blocking the main event loop.
* **Verification**: Every code modification must pass linter validation (`npm run lint`) and successfully compile (`npm run build`) before delivery.
