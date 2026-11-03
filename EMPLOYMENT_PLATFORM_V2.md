# Employment Intelligence Platform V2
## Product Sprint 1: Platform Foundation & Modular Delivery

This document outlines the architecture, design choices, and functional delivery of **Employment Intelligence Platform V2** for Aziz Assistant.

---

## 1. Architectural Foundations

In strict accordance with the **Architecture Freeze** guidelines, the system core, task coordinator, database connectors, and module lifecycles have not been modified. Instead, the Employment Intelligence Platform V2 is implemented as a highly cohesive, decoupled, modular subsystem that integrates cleanly with the existing platform patterns.

### Component Map
*   **Business Logic Layer (`EmploymentV2Service.ts`)**: The single entry point for all V2 features. Handles data curation, validation, scoring, and analytics aggregation.
*   **Infrastructure Bridge (`ServiceRegistry.ts`)**: Integrates `EmploymentV2Service` as a system-wide singleton, injected with repository abstraction (`IAppRepository`) and `AIService`.
*   **Unified Module Lifecycles (`EmploymentModule.ts`)**: Declares `EmploymentV2Service` as a required service, registering its startup dependencies with the Module Engine.
*   **API Boundary (`server.ts`)**: Declares all `/api/employment/v2/*` endpoints, securing sensitive API execution server-side while keeping the client lightweight and secure.
*   **Modular Presentation Components (`/src/components/*`)**:
    *   `SavedJobsPanel.tsx`: Manage custom collections, favorites, and job bookmarks.
    *   `ApplicationTrackerPanel.tsx`: Track application progress, upcoming interviews, and follow-up contact reminders.
    *   `SearchHistoryPanel.tsx`: Logs all searches with automated performance metrics and custom purpose notes.
    *   `SearchAnalyticsPanel.tsx`: Responsive funnel diagrams and conversion rates.

---

## 2. Feature Implementation Status (12 / 12 Delivered)

### 1. Automated Search History Logs
*   **Details**: Every time a user executes a job search via the Matched Board, the query, dynamic filter parameters, timestamp, results count, provider source, and latency duration are automatically intercepted and recorded in the database.
*   **Customization**: Users can view all previous search queries and add customized notes about the intent or filters of the query.

### 2. Saved Jobs Catalog
*   **Details**: One-click bookmarking of open listings from the Matched Board. Positions are placed into a secure collection where users can record personal details and notes.
*   **Integrations**: Fully supports updating bookmark status (Favorites, Active Saved, Archived).

### 3. Smart Collections
*   **Details**: Positions are organized into auto-filtered and customized smart collections (e.g., Remote Jobs, High Salary, Dream Companies, Germany, Canada).
*   **Extensibility**: Users can define and attach custom label tags to create and filter custom directories.

### 4. Application Tracker
*   **Details**: Manages applied positions, recruiter metadata (name, contact email), and inline status tracking (Applied, Interviewing, Offer Received, Rejected) with corresponding UI color-coding.

### 5. Interview Pipeline
*   **Details**: Allows scheduling specific interview rounds (Phone Screen, Technical, System Design, Culture Fit, HR Negotiation) linked to tracked positions. Holds scheduled times and past interview feedback summaries.

### 6. Follow-up Reminders Manager
*   **Details**: Creates reminder tasks for outbound recruiter contacts, calculates days since contact, and monitors response states.

### 7. Company Directory
*   **Details**: Records profile notes, industries, and active application counts grouped by company.

### 8. Recruiter Directory
*   **Details**: Tracks recruiter contact details, correspondence channels (LinkedIn, Email, Phone), and relationship logs.

### 9. AI Opportunity Suitability Score
*   **Details**: Connects with Gemini-powered `AIService` to calculate compound compatibility ratings (0–100) across skill match density, estimated salary, location preference, visa sponsorship policies, career growth trajectory, and rating metrics.

### 10. Duplicate Protection
*   **Details**: Ensures that duplicate listings cannot corrupt user collections by comparing cross-collection IDs, role details, and matching providers before persisting.

### 11. Smart Filters
*   **Details**: Responsive UI sidebar filtering options that filter collections on-the-fly based on remote status, location country, or custom tag.

### 12. Funnel Search Analytics
*   **Details**: Aggregates complete pipeline indicators to render visual performance dashboards. Uses the `recharts` library to display status distributions and conversion rate shares.

---

## 3. Database Schema Mapping
All records are persisted through the repository abstraction layer using standard system entities.

### 1. `employment_search_history`
```typescript
{
  id: string;
  query: string;
  filters: Record<string, any>;
  timestamp: string;
  resultsCount: number;
  durationMs: number;
  provider: string;
  userNotes: string;
}
```

### 2. `employment_saved_jobs`
```typescript
{
  id: string;
  job: Job;
  status: "saved" | "archived" | "favorite";
  categories: string[];
  notes: string;
  addedDate: string;
}
```

### 3. `employment_applications`
```typescript
{
  id: string;
  job: Job;
  appliedDate: string;
  currentStatus: "Applied" | "Interviewing" | "Rejected" | "Offer Received";
  recruiterName: string;
  recruiterEmail: string;
  notes: string;
}
```

### 4. `employment_interviews`
```typescript
{
  id: string;
  applicationId: string;
  stageName: "Phone Screen" | "Technical Round" | "System Design" | "Culture Fit" | "HR & Compensation";
  scheduledDate: string;
  completed: boolean;
  feedback: string;
}
```

### 5. `employment_followups`
```typescript
{
  id: string;
  applicationId: string;
  contactDate: string;
  contactPerson: string;
  contactMethod: "Email" | "LinkedIn" | "Phone";
  status: "pending" | "responded" | "no-reply";
  notes: string;
  reminderDate: string;
  reminderSent: boolean;
}
```

---

## 4. Platform Delivery Manifest

### Files Created
*   **`/src/domains/employment/EmploymentV2Service.ts`**: Implements core service APIs for suitability score evaluations, deduplication, collections, history, and search statistics.
*   **`/src/components/SavedJobsPanel.tsx`**: Interface to bookmark, organize, tag, and persist listings.
*   **`/src/components/ApplicationTrackerPanel.tsx`**: Tracking dashboard managing application pipelines, recruiter metrics, and automated reminders.
*   **`/src/components/SearchHistoryPanel.tsx`**: Search query performance logs and custom contextual purpose records.

### Files Modified
*   **`/server.ts`**: Exposes secure API endpoints under `/api/employment/v2/*` for server-side persistence.
*   **`/src/components/JobAgentPanel.tsx`**: Extends UI controls to integrate the tracking systems, search analytics, histories, and bookmark panels seamlessly, resolving potential parsing edge cases.
*   **`/src/components/DiagnosticPanel.tsx`**: Refined file details processing, resolving property access errors on file metadata arrays.
*   **`/src/components/SearchAnalyticsPanel.tsx`**: Standardized data bindings for flawless Recharts funnel visualizations.
*   **`/src/domains/employment/EmploymentModule.ts`**: Declared and registered startup bindings for `EmploymentV2Service`.

---

## 5. System Workflows

### Task Orchestration Flow
```
[ Matched Board Search Triggered ]
               │
               ▼
   [ Task Orchestrator Intercepts ]
               │
               ├─► 1. Save Search History (Log query, parameters, provider source, latency)
               ├─► 2. Run Cross-Collection Duplicate Protection (Prevent list pollution)
               ├─► 3. Execute ATS Compatibility Match Rating (Evaluate CV vs. target JD)
               └─► 4. Calculate AI Suitability Score (Assess compensation, visa, location, growth)
                       │
                       ▼
         [ Active Interactive Panels ]
               │
               ├─► [Saved & Favorites] ──► Smart Collections & Tags
               ├─► [Track Application] ──► Recruiter Contacts & Interview Schedules
               ├─► [Add Follow-up Reminders] ──► Auto-computed Contact Reminders
               └─► [Open Analytics Panel] ──► Pipeline Conversion Funnels (Recharts)
```

---

## 6. Strategic Overview

### Remaining Features
*   Direct integration with external calendar APIs (e.g. Google Calendar) for real-time interview invitation scheduling.
*   Polished browser companion/scraper script to import external jobs from sites like LinkedIn or Indeed directly into the tracking pipeline.

### Known Limitations
*   Suitability scoring is dependent on valid Gemini API connection and structure availability.
*   Automated outbound communication requires valid custom SMTP/Hostinger server configuration settings.

### Recommended Product Sprint 2
1.  **Incoming Email Parsing**: Automatically extract application progress notifications and recruiter messages directly from user mail boxes (e.g. Gmail).
2.  **Adaptive Auto-Response Drafts**: Generating tailor-made follow-up drafts for specific positions using real-time feedback summaries.

