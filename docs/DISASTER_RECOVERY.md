# 🚨 Aziz AI Platform: Production Disaster Recovery Plan

This document establishes the official **Disaster Recovery (DR) Plan** for the **Aziz AI Platform** (v1.0 Frozen RC1). It outlines actionable recovery paths, responsibilities, and mitigation procedures to minimize downtime and prevent data loss during catastrophic system failures.

---

## 1. Executive Summary: RTO and RPO Targets

The platform classifies recovery goals into two key metrics:
* **Recovery Time Objective (RTO):** The maximum tolerable duration of system downtime before recovery.
* **Recovery Point Objective (RPO):** The maximum tolerable age of data that can be lost due to an outage.

### System Target Matrix

| Failure Vector | Severity | Target RTO | Target RPO | Primary Recovery Mechanism |
| :--- | :---: | :---: | :---: | :--- |
| **Server Crash / Host Failure** | High | `< 5 minutes` | `0 seconds` | Automated container restart & cloud load balancer redirection. |
| **Firestore Database Failure** | Critical| `< 30 minutes`| `< 24 hours` | Redundant cloud regional clustering & nightly backup restoration. |
| **Gemini API Outage** | Critical| `< 10 seconds`| `0 seconds` | Automated ModelRouter fallback to secondary model profiles or mocks. |
| **Network Outage (Egress)** | Medium | `< 15 minutes`| `0 seconds` | DNS failover routing or local routing cache activation. |
| **Corrupted Workspace** | High | `< 1 minute` | `< 5 minutes` | Automatic SRE git checkout checkpoint rollback. |

---

## 2. Mitigation Playbooks & Action Procedures

### Scenario A: Server Crash / Host Hardware Failure
The physical virtual machine or container running `dist/server.cjs` crashes or experiences hardware failure.
* **Impact:** Absolute API unavailability. Frontend static pages fail to fetch, and SRE agents cease executing.
* **Mitigation / Recovery Playbook:**
  1. **Container Environments (Cloud Run / K8s):**
     * Fully automated. Google Cloud Run's native health checking identifies unhealthy container processes and automatically spawns replacement instances, routing incoming requests to active containers.
  2. **PM2 Bare-metal Environments:**
     * PM2 processes are bound to `systemd` daemon. If the process crashes due to out-of-memory or software errors, `systemd` or PM2 restarts it immediately:
       ```bash
       pm2 restart aziz-platform-prod
       ```
     * In case of physical host server failure, SREs must re-point the external Nginx load balancer to the standby warm node and run:
       ```bash
       pm2 start ecosystem.config.cjs
       ```

### Scenario B: Firestore Database Outage
Google Cloud Firestore experiences a regional outage, preventing read/write of persistent tasks, historical metrics, and configurations.
* **Impact:** Users are unable to load task states or list historical telemetry records.
* **Mitigation / Recovery Playbook:**
  1. **Dual-Mode Persistence Failover:**
     * The `StateStore.ts` engine supports standard client-side state caching. If Firestore calls throw persistent network timeouts, the platform switches to **Degraded Operational Mode**: storing active task logs and steps inside local browser `localStorage` and server memory buffers.
     * The UI notifies users: `"Running in Degraded Offline Mode. Cloud Sync Paused."`
  2. **Database Restore Procedure:**
     * Once Firestore availability is restored, if database records are corrupted, SREs execute a restoration script using the latest daily export from GCS:
       ```bash
       gcloud firestore import gs://aziz-backups-bucket/daily-backups/2026-07-11T00:00:00
       ```

### Scenario C: Google Gemini API Service Outage
The external Google Gemini API endpoint returns 503 Service Unavailable or experiences severe rate-limiting/timeouts.
* **Impact:** The `Planner`, `ReflectionEngine`, and agent coder are unable to process goals or evaluate code files.
* **Mitigation / Recovery Playbook:**
  * **Automated ModelRouter Fallbacks (Built-in Defense):**
    * In `src/kernel/ModelRouter.ts`, the system is configured to handle API failures gracefully. If a primary provider (`gemini-provider`) fails, the system executes an automatic retry with exponential backoff.
    * If retries are exhausted, the `ModelRouter` dynamically routes requests to the fallback array: switching from expensive reasoning models to faster, high-capacity models (e.g. `gemini-2.5-flash`), or routing to alternative provider gateways if configured.
    * In test environments, the system automatically redirects traffic to the high-fidelity `mock-fast` and `mock-reasoning` LLM engines to keep standard offline automation running without throwing system errors.

### Scenario D: Egress Network Connectivity Outage
The hosting container loses connection to external networks, while remaining accessible to internal client web browsers.
* **Impact:** Outbound API calls to Gemini and Firestore fail, but the Express server remains active.
* **Mitigation / Recovery Playbook:**
  1. Internal health probes in `server.ts` monitor network reachability by pinging standard gateways.
  2. On connectivity failure, the gateway emits a `FailureTriggered` event across the `EventBus`.
  3. The front-end renders a visible system connection warning.
  4. Workflows are paused. The `AgentRuntime` freezes current steps and delays active task execution until network ping loops succeed, preventing partial edits or half-finished files.

### Scenario E: Corrupted Workspace Workspace Edits
An autonomous coder agent writes broken code, deletes critical files, or enters an infinite execution loop that corrupts the workspace codebase.
* **Impact:** Build failure, lint errors, or broken site components.
* **Mitigation / Recovery Playbook (Automated Git Checkpoint Defense):**
  * **Automated Rollback Engine:**
    * Before the `AgentRuntime` launches any task, it performs an automatic Git checkpoint (creates a temporary git stash or a temporary commit branch `checkpoint-task-[id]`).
    * After the coder finishes writing files, the `VerificationEngine` runs compilation and linting tests.
    * If the build fails or tests throw syntax/security blocks, the `AgentRuntime` immediately triggers a git checkout to undo the edits:
      ```bash
      git reset --hard HEAD
      git clean -fd
      ```
    * The workspace is restored to its pristine state in less than 1 second, achieving a sub-second RTO.

---

## 3. Disaster Recovery Roles & Contact Escalations

In the event of a catastrophic production disaster, the SRE team must follow the standard escalation chain:

1. **SRE Level 1 (Response & Triage):**
   * Detects alert emails (dispatched via our integrated Mail alert system on `FailureTriggered` events).
   * Verifies API health on `/api/health`.
   * Reviews unified SRE logs inside `LogPanel` or host journals.
2. **SRE Level 2 (Infrastructure Restores):**
   * Executes database recoveries and container manual scale-outs.
   * Modifies Nginx reverse proxy routes if DNS redirects are needed.
3. **Product Lead & CTO:**
   * Notified if RTO exceed 15 minutes.
   * Manages public communications if outage impacts global user domains.
