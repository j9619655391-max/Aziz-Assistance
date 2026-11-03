# AZIZ AI SAAS PLATFORM
## SPRINT 23 PRODUCTION IMPLEMENTATION ROADMAP

This document outlines the detailed engineering plan to close the gaps identified in the Aziz AI Platform. By implementing these remediation phases, the platform will transition from a highly tested, modular prototype into a secure, scalable, enterprise-grade multi-tenant platform.

---

## ROADMAP OVERVIEW

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: Core Foundation & Security                     │
│  - Persistent Cloud SQL (Postgres) / Firestore Migration                   │
│  - Cryptographic Identity (Firebase Auth / Auth0 Integration)              │
└────────────────────────────────────────┬───────────────────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                  PHASE 2: Serverless Automation & Queues                   │
│  - Cloud Scheduler Trigger Webhooks (No Ephemeral Node Cron)              │
│  - Event-Driven Pub/Sub Ingestion Channels for Resumes                     │
└────────────────────────────────────────┬───────────────────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                     PHASE 3: Real Scraping & Match V2                      │
│  - Puppeteer/Selenium Scrapers + Upwork/Toptal OAuth Linkages              │
│  - pgvector/Firestore Vector Search for cost-efficient resume matching     │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## DETAILED REMEDIATION PLANS

### 1. Persistent Database Migration (Postgres / Cloud Firestore)
- **Current State**: The platform utilizes an in-memory database configuration which wipes all data upon container restarts or downscales in Cloud Run.
- **Desired State**: A production-ready persistent database storing multi-tenant business records, match analytics, audit logs, and security logs with full ACID transactions.
- **How to Implement**:
  1. Leverage our Drizzle ORM setup or provision a Cloud Firestore database.
  2. Implement a new concrete class `FirebaseFirestoreRepository` or `PostgreSqlRepository` complying with the `IAppRepository` interface.
  3. Register this class in the `RepositoryRegistry`.
  4. Configure connection pooling using Node PG Pool or standard Firebase connection managers.
  5. Set the environment variable `REPOSITORY_TYPE=POSTGRES` or `REPOSITORY_TYPE=FIREBASE` to seamlessly redirect the `RepositoryFactory` without touching domain services code.
- **Dependencies**: Cloud SQL PostgreSQL instance OR Google Cloud Firestore, Drizzle ORM client or Firebase Admin SDK.
- **Risk**: Low. The `IAppRepository` interface isolates database queries, meaning no core business logic files will be modified.
- **Estimated Effort**: 3 Business Days.

---

### 2. Cryptographic Identity & Auth (Firebase Auth / Auth0)
- **Current State**: The gateway trusts incoming request header tokens without checking with an authoritative authenticator.
- **Desired State**: Secure JWT verification on every incoming request with cryptographically signed tokens issued by a secure identity provider.
- **How to Implement**:
  1. Integrate the `firebase-admin` authentication SDK or configure Auth0 verification middleware.
  2. Rewrite the `AuthenticationMiddleware` to extract bearer tokens from request authorization headers (`Authorization: Bearer <token>`).
  3. Perform cryptographic token signature checks using JWKS (JSON Web Key Sets) to verify the token was issued by our trusted authority.
  4. Inject verified user claims (TenantId, UserRole, Email) into the thread-safe request context `requestContext`.
- **Dependencies**: Firebase Admin Auth SDK OR `@auth0/node-jwt`, Identity Provider credentials.
- **Risk**: Medium. Requires front-end modifications to handle logins, store JWT tokens in secure HTTP-only cookies, and attach them to client-side requests.
- **Estimated Effort**: 3 Business Days.

---

### 3. Serverless Background Automation (Cloud Scheduler + Pub/Sub)
- **Current State**: Schedulers run as ephemeral Node `setInterval` timers in memory, which fail under Cloud Run's scale-to-zero model.
- **Desired State**: Robust, serverless, cron-triggered background jobs that wake up the platform on a precise schedule.
- **How to Implement**:
  1. Disable the Node.js `setInterval` logic inside `AlertService.ts`.
  2. Provision a **Google Cloud Scheduler** job that triggers a secure HTTP POST request to `/api/v1/automation/sweep` every 15 minutes.
  3. Secure the endpoint using OIDC (OpenID Connect) authentication headers issued by Cloud Scheduler.
  4. Configure the server-side controller to verify the OIDC token before launching the matching sweep.
- **Dependencies**: Google Cloud Scheduler, Cloud Run IAM policies.
- **Risk**: Low. Removes ephemeral background timer code and transitions to a standard, stateless web endpoint pattern.
- **Estimated Effort**: 1 Business Day.

---

### 4. Automated Resume Ingestion Pipeline
- **Current State**: Resumes must be manually pasted or uploaded via raw REST request bodies.
- **Desired State**: Event-driven resume ingestion where resumes arriving in a Gmail mailbox or Google Drive folder are processed automatically.
- **How to Implement**:
  1. Enable Gmail Push Notifications (Webhooks) by configuring a Cloud Pub/Sub topic and linking it to the Gmail API.
  2. Setup a Cloud Run endpoint `/api/v1/webhooks/gmail` that listens to Google Pub/Sub notifications.
  3. When an email notification arrives, query the Gmail API using our registered OAuth tokens to download attachments (PDF/Docx resumes).
  4. Push the resume files to Google Cloud Storage (GCS) buckets, triggering an asynchronous Cloud Function that parses text, extracts details, and saves to the database.
- **Dependencies**: Gmail API, Google Cloud Pub/Sub, Cloud Storage, Google OAuth client credentials.
- **Risk**: Medium. Requires managing active OAuth user sessions and handles complex external network callbacks.
- **Estimated Effort**: 5 Business Days.

---

### 5. Real Freelance Scrapers Integration
- **Current State**: Gig scraping uses stubbed data providers returning sample static arrays.
- **Desired State**: Live scraping of Upwork and Toptal opportunities in real-time.
- **How to Implement**:
  1. Develop a Puppeteer-based scraper service running in a containerized environment, or subscribe to dedicated Upwork scraping API platforms.
  2. Programmatically navigate freelance index boards, extract gig description texts, budgets, and required skills.
  3. Forward scraped JSON blocks to the `FreelanceService` which maps matches and uses the AI Kernel to compose cover pitches.
- **Dependencies**: Puppeteer, headless Chrome, or external Web Scraping APIs.
- **Risk**: High. Third-party websites constantly alter their DOM structures and security rules (Cloudflare challenges), which requires continuous scraper maintenance.
- **Estimated Effort**: 4 Business Days.

---

### 6. Vector Database Integration for Match V2
- **Current State**: The platform utilizes raw string matching or costly Gemini SDK computations to perform keyword extraction and textual scoring.
- **Desired State**: Sub-millisecond similarity matching for millions of resumes at near-zero API cost.
- **How to Implement**:
  1. Provision a local or cloud vector engine like `pgvector` in PostgreSQL, or use Firestore Vector Search.
  2. When a resume or job description is created, compute its vector embedding using a fast, cost-effective embeddings model (e.g., `text-embedding-004`).
  3. Store the 768-dimension floating-point vector alongside the database record.
  4. Perform semantic matching using SQL cosine-distance queries:
     `SELECT candidate_id FROM candidate_embeddings ORDER BY embedding <=> $1 LIMIT 10`
  5. Pass only the top 10 matched resumes to the Gemini reasoning engine for high-fidelity alignment scoring.
- **Dependencies**: `pgvector` extension or Cloud Firestore Vector Search, Gemini Embeddings API.
- **Risk**: Low. Does not change existing REST shapes, but drastically lowers API transaction costs and latencies by 95%.
- **Estimated Effort**: 3 Business Days.
