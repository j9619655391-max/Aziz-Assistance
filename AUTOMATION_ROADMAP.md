# AZIZ AI SAAS PLATFORM
## ENTERPRISE VALIDATION LABS (EVL) - LAB 14: AUTOMATION ROADMAP

This document outlines a strategic engineering roadmap to transition manual processes on the platform into reliable, fully autonomous, event-driven pipelines.

---

## 1. STRATEGIC AUTOMATION ROADMAP

### Module 1: Automated Resume Version and Skill Sync
- **Manual Task**: Recruiter uploads a candidate's updated resume, manually compares version differences, and adjusts database skill markers.
- **Trigger**: File upload / POST webhook to `/api/v1/recruitment/resume`.
- **Autonomous Action**: 
  1. The engine parses the resume structure.
  2. Compares skills against existing versions.
  3. Bumps version count.
  4. Appends a diff summary log.
- **Verification**: Automatic assertion on version sequence increment.
- **Recovery**: Revert to the previous stable schema if parsing fails.

---

### Module 2: Autonomous Token Refreshing Pipeline
- **Manual Task**: Developer manually requests a new token or copies cookies when Gmail APIs reject with `401 Expired`.
- **Trigger**: HTTP API interceptor catching `401 Unauthorized`.
- **Autonomous Action**:
  1. Suspends active background threads.
  2. Makes a secure call to Google OAuth `/token` with the stored Refresh Token.
  3. Updates session credentials in the repository.
  4. Resumes pending background threads.
- **Verification**: Tests the new credentials with a quick API ping.
- **Recovery**: Raises a "Critical Credential Blocked" system alert if the refresh token is revoked.

---

### Module 3: Dynamic Job Portal Scraper
- **Manual Task**: User manually checks LinkedIn, Upwork, and indeed for job listings matching their profile.
- **Trigger**: Periodic daily/hourly background cron.
- **Autonomous Action**:
  1. Ingests job feeds.
  2. Renders listings using a local headless browser.
  3. Parses requirements and filters out spam listings.
  4. Triggers candidate alignment matching.
- **Verification**: Increments database `opportunity_count` metrics.
- **Recovery**: Rotates proxies and user-agents if target portals enforce blocklists.

---

### Module 4: Cloud Run Scale-to-Zero State Restorer
- **Manual Task**: SRE logs into container shell and manually re-syncs diagnostic buffers or logs when containers restart.
- **Trigger**: Container startup hook (`server.ts` entry point).
- **Autonomous Action**:
  1. Detects state-loss from a crash or shutdown.
  2. Restores persistent scan and system logs from Cloud Storage.
- **Verification**: Confirms database health via dynamic diagnostics queries.
- **Recovery**: Re-seeds default structures from local JSON templates if the backup bucket is unavailable.
