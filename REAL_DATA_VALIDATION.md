# AZIZ AI SAAS PLATFORM
## ENTERPRISE VALIDATION LABS (EVL) - LAB 5: REAL DATA VALIDATION

This document provides a comprehensive audit of data provenance on the Aziz AI Platform. We analyze exactly where input data originates for every major functional domain.

---

## 1. DATA SOURCE ORIGINS BY DOMAIN

### 1.1 Recruitment Domain
- **Resume Parsing**: Input is sourced from manual text paste or JSON object transmission via the REST API / UI form.
- **Job Descriptions**: Input is defined by recruiters via the job posting dashboard.
- **Folder Watchers**: In development, a file system directory watcher simulates candidate resume folders.
- **Real vs. Mock**: **Real data** is parsed and compared programmatically. However, external ATS (Applicant Tracking System) connections are modeled via interfaces.

### 1.2 Knowledge Domain
- **Documents**: TXT, PDF, and Markdown files are ingested.
- **Storage**: Data is broken into chunks and represented as semantic nodes.
- **Embeddings**: Local similarity vectors are used as a fallback to perform retrieval-augmented matching.
- **Real vs. Mock**: **Real filesystem parsing** of text and PDFs is fully supported, but long-term vector database storage is simulated via an in-memory cosine similarity store.

### 1.3 Identity Domain
- **User Records**: Pre-seeded database profiles.
- **Credentials**: Cryptographically compared local records.
- **Sessions**: Uses actual stateless **JWT Bearer Tokens** signed with keys.
- **Real vs. Mock**: Auth tokens are cryptographically real and fully validated on every request. User database tables are kept in the stateful in-memory relational mock layer, meaning user creation persists during the container's runtime but does not survive container re-creation unless written to cloud disk.

### 1.4 Observability Domain
- **CPU Load**: Sourced from actual Node CPU tracking with minor realistic jitter to reflect actual thread load in containers.
- **Memory Overhead**: Sourced from **`process.memoryUsage().heapUsed` (100% Real)**.
- **Disk / Network / GPU**: Calculated and simulated using realistic infrastructure baselines.
- **Traces & Spans**: Generated programmatically from actual execution paths and timing hooks (**100% Real**).

---

## 2. SYSTEM DATA CLASSIFICATION

| Domain | Feature | Input Sourcing | Persistence Sourcing | Classification |
|---|---|---|---|---|
| **Recruitment** | Resume Analysis | Manual / API Upload | Local `StateStore` | **Real Engine / Local Data** |
| **Knowledge** | Document Search | Filesystem / Folder | Cosine Vector Cache | **Real Parser / In-Memory Storage** |
| **Identity** | Session Validation | HTTP Bearer Header | JWT Cryptography | **100% Real Security** |
| **Observability** | Resource Diagnostics | Node VM Environment | Telemetry Buffer | **Real Heap / Simulated CPU Dials** |
| **Automation** | File Watcher Triggers | File IO Watcher | Audit Trail Event Bus | **Real Events** |
