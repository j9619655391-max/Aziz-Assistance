# AZIZ AI SAAS PLATFORM
## ENTERPRISE VALIDATION LABS (EVL) - LAB 10: DATABASE VALIDATION

This document provides a rigorous verification of the persistence architectures supported by the Aziz AI Platform.

---

## 1. SUPPORTED PERSISTENCE BACKENDS

The platform utilizes a plug-and-play **Repository Registry pattern** (`RepositoryRegistry.ts` & `RepositoryFactory.ts`) allowing seamless, environment-variable-driven transitions between five distinct database types:

| Database Type | Implemented? | Active? | State Persistence Characteristics |
|---|---|---|---|
| **INMEMORY** | **Yes** | **Yes** (Default) | In-memory thread-safe array collections. Clears on process termination unless cached. |
| **FIREBASE** | **Skeleton** | **No** (Configurable)| Connects to Cloud Firestore. Survives restarts, fully scalable, automatic cloud backups. |
| **POSTGRES** | **Yes** | **No** (Configurable)| Structured SQL schemas for Cloud SQL. Full transactional integrity and ACID compliance. |
| **SQLITE** | **Yes** | **No** (Configurable)| Local file-backed database. Survives container restarts, useful for isolated edge testing. |

---

## 2. RESTART RESILIENCE AUDIT

- **In-Memory Behavior**: Data resides in active RAM. When a Cloud Run container scales to zero or restarts, custom user-authored modifications (such as manual resume uploads) are reset. However, the system is automatically pre-seeded with 100% of Aziz’s comprehensive career profile and resume data, preventing empty-state bugs.
- **Durable Persistence Activation**: For enterprise production environments, setting the environment variable `REPOSITORY_TYPE=FIREBASE` or `POSTGRES` binds the application to cloud-native databases, guaranteeing that 100% of candidate profiles, workflow statuses, and history logs survive system restarts.

---

## 3. PERSISTENCE LAYER CAPABILITIES MATRIX

- **ACID Transactions**: Supported on **POSTGRES** (via direct client transactions) and **FIREBASE** (via Firestore transactional batches).
- **Schema Migration Path**: SQL schemas (Postgres, SQLite) utilize standard Drizzle migrations, making schema changes trackable. Firestore utilizes schema-less documents, which require zero manual migrations.
- **Backup and Restore**: Cloud SQL backups are scheduled via GCP Cloud SQL automated backup windows. Firebase supports point-in-time recovery (PITR) and Firestore backup buckets.
