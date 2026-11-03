# AZIZ AI SAAS PLATFORM
## ENTERPRISE VALIDATION LABS (EVL) - LAB 6: AUTOMATION VALIDATION

This document audits the autonomous processes, background crawlers, and scheduled alerts running on the Aziz AI Platform.

---

## 1. COMPILATION & DISCOVERABILITY
The platform has a dedicated background daemon layer encapsulated by the `AlertService` (`src/domains/automation/AlertService.ts`) and orchestrated under the `automation` module lifecycle.

### 1.1 Discovered Automations

#### Automation 1: Autonomous Career Opportunity Sweep Daemon
- **Trigger**: Automatic recurring cron interval (every 180 seconds / 3 minutes in simulation) or direct manual on-demand webhook.
- **Action Sequence**:
  1. Activates research scanning agents.
  2. Pulls local profile alignment definitions.
  3. Queries LinkedIn, Upwork, Toptal, and other directory targets.
  4. Triggers `MatchingService` to evaluate similarity.
  5. Records results in `ScanLog` database.
  6. Dispatches parsed findings directly to user inbox using registered Google OAuth Gmail credentials.
- **Type**: **Automatic Background Cron**.

#### Automation 2: System Health and Observability Heartbeat
- **Trigger**: Periodic daemon checks.
- **Action Sequence**:
  - Gathers memory heap and response latency rates.
  - Generates trace files.
  - Raises Observability alerts if the error rate exceeds `10%`.
- **Type**: **Automatic / Observability-Driven**.

---

## 2. AUTOMATION TRACE LIFECYCLE (E2E EVENT RECONSTRUCTION)

The table below traces the exact trigger-action-retry path of a background automation execution:

```
[Cron Interval Fires]
          │
          ▼
 [Trigger: AlertService.startBackgroundCron()]
          │
          ▼
 [Execution: AlertService.triggerScan()]
          │
          ▼
 [Checks for OAuth Session ("me")]
          ├─────────────────────────────────────────┐
          ▼ (No Token Found)                        ▼ (Token Found / Active)
 [Local Audit Log: "Scan Completed"]        [Gmail API Request Dispatched]
 [Skip dispatch; log advice]                        │
                                                    ▼
                                     [Success Check: sendGmailDigest()]
                                            ├───────────────────────┐
                                            ▼ (Yes)                 ▼ (No: Token Expired)
                                     [Resolve Metrics Alert]  [Raise Alert: "Workflow Failure"]
                                     [Log: "Digest Delivered"] [Execute Fallback Sequence]
                                                              [Gracefully Log Error]
```

- **Retry Strategy**: If the Gmail API rejects with an expired OAuth token, the engine intercepts the error, flags the state with a `failed` marker, suppresses cascading stack-traces, raises a system-wide "Workflow Failure" warning, and halts the specific branch until token refreshing occurs.
- **Metrics Tracked**:
  - `automation_scan_total`: Real-time gauge of trigger counts.
  - `automation_email_success`: Successful dispatch counts.
  - `automation_email_error`: Expired token or network drops.
