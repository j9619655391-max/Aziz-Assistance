# AZIZ AI SAAS PLATFORM
## ENTERPRISE VALIDATION LABS (EVL) - LAB 13: ROOT CAUSE ANALYSIS

This document provides an engineering audit analyzing key operational risks, potential points of failure, and structural bottlenecks in the platform.

---

## 1. COMPILATION OF ARCHITECTURAL RISK ENCLAVES

### Finding 1: Transient Container State Loss (Persistence Risk)
- **Problem**: The primary active repository is configured to default to `InMemoryRepository` to enable zero-configuration local sandboxing.
- **Root Cause**: The repository class stores state in heap variables. In cloud environments like Google Cloud Run, containers are stateless and scale to zero during idle periods.
- **Risk Level**: **HIGH**. Any runtime modifications (such as newly recorded candidates, application statuses, or memory logs) will be lost upon container recycling.
- **Remediation**: Set the default production configuration to `REPOSITORY_TYPE=FIREBASE` or `POSTGRES` to ensure state is committed to a durable cloud-native backing store.

---

### Finding 2: Token Expiration and Session Locking (Credential Risk)
- **Problem**: Autonomous carrier email sweeps depend on registered OAuth session keys.
- **Root Cause**: The Google API yields user authorization tokens that expire after a set time limit (typically 3600 seconds) unless refreshed via an active Refresh Token.
- **Risk Level**: **MEDIUM**. Background cron dispatches will fail silently or raise "Workflow Failure" warnings once the active token expires, locking the user out of notifications.
- **Remediation**: Extend `AlertService` to implement an automatic Refresh Token exchange flow when intercepting `401 Unauthorized` responses from the Google API.

---

### Finding 3: Gemini API Quota Exhaustion (Intelligence Dependency Risk)
- **Problem**: Key matching and recommendation pipelines rely on @google/genai API calls.
- **Root Cause**: High concurrency sweeps or heavy resume indexing will consume API tokens rapidly, potentially hitting default rate limits.
- **Risk Level**: **MEDIUM**. While the system implements excellent fallback routines that prevent app-level crashes, matching precision drops when relying on local keyword mappings.
- **Remediation**: Implement a local caching layer (such as Redis) to store parsed resume assessments. If a duplicate resume matches an identical hash, retrieve the cached result instead of calling the API.
