# Aziz Assistant — AI Task Orchestration Engine

This document outlines the design, architecture, component interfaces, execution lifecycle, and future development path of the **Aziz Assistant AI Task Orchestration Engine**.

---

## 1. Core Architecture Overview

The AI Task Orchestration Engine converts the Aziz Assistant from a standard, static collection of independent domain modules into a unified, **autonomous multi-agent execution platform**.

Rather than calling specific modules or services explicitly, the orchestrator accepts high-level natural language instructions, parses user intents, detects required capabilities, and dynamically maps them to registered modules using the platform's `ModuleManager` registry.

```
       [ User Goal / Plain-Text Input ]
                       │
                       ▼
             [ GoalInterpreter ]  ◄── (Intent Analysis & Subgoal Breakdown via Gemini API)
                       │
                       ▼
           [ CapabilityResolver ] ◄── (Inspects running modules from ModuleManager)
                       │
                       ▼
             [ ExecutionEngine ]  ◄── (Formulates ExecutionPlan & compiles TaskGraph)
                       │
                       ▼
             [ TaskScheduler ]    ◄── (Executes tasks in parallel or sequential batches)
              ├── Retry Loops
              ├── Fallback Gates
              └── Verification Pipeline
                       │
                       ▼
            [ ReflectionPipeline ]◄── (Post-execution confidence and suggestion critique)
                       │
                       ▼
               [ Memory Update ]  ◄── (Persists summaries to SearchHistory memory)
                       │
                       ▼
             [ Orchestrated Response ]
```

---

## 2. Dynamic Capability Resolution

The orchestration engine employs a strict decoupling boundary: **No module names or direct service routes are hardcoded within the orchestration pipelines**. Instead, modules expose descriptive **Capabilities** in their metadata.

### Core Mappings

| Capability | Purpose / Description | Primary Target Module |
| :--- | :--- | :--- |
| **`JOB_SEARCH`** | Scout real-time, remote, or contract career opportunities. | `employment` |
| **`RESUME_ANALYSIS`** | Compare resume data structures and user skills against job requirements. | `employment`, `identity` |
| **`ATS_ANALYSIS`** | Audit resumes for keyword score, formatting readability, and missing skills. | `employment` |
| **`EMAIL_GENERATION`** | Draft personalized outreach templates or cover letters. | `communication` |
| **`FOLLOWUP_AUTOMATION`** | Schedule future alerts, check-ins, or cron-based reminders. | `automation` |
| **`PROFILE_UPDATE`** | Sync and update candidate profiles or portfolio assets. | `identity` |
| **`SEARCH_HISTORY`** | Archive search context, summaries, and indexing details. | `knowledge` |

The `CapabilityResolver` queries `ModuleManager.getInstance().getCapabilitiesRegistry()` to dynamically find running modules supporting these capabilities at runtime.

---

## 3. Dynamic Task Graphs & Scheduling

The `ExecutionEngine` compiles the formulated `ExecutionPlan` into an executable `TaskGraph` composed of independent or interdependent task nodes.

### Advanced Node Support

1. **Sequential Tasks**: Default linear dependency chain where `Task B` begins only after `Task A` successfully passes validation.
2. **Parallel Tasks**: Tasks with overlapping dependencies are grouped into parallel execution batches by the `DependencyResolver`'s topological sorter and dispatched concurrently via `Promise.all`.
3. **Conditional Tasks**: Evaluated against the execution context at runtime. If a conditional gate evaluates to false, the task is safely marked `SKIPPED`.
4. **Retry & Fallback Gates**: If a task fails, it is automatically retried up to `maxRetries` (default: 2) with backoff warnings. If retries are exceeded, the scheduler activates the defined `fallbackTaskId` to keep the pipeline intact.
5. **Verification Tasks**: Automated contract-validators check intermediate outputs before downstream nodes are permitted to execute.

---

## 4. Double-Loop Verification & Reflection

To ensure pristine output quality and prevent model hallucinations, the engine implements a rigorous double-loop validation architecture.

### Step 1: Verification Pipeline (Contract Gate)
Every task output is validated before triggering the next node. For example, `JOB_SEARCH` output is verified to ensure it has valid array listings, and `EMAIL_GENERATION` is checked to confirm the presence of text longer than a basic threshold. If verification fails, a retry is automatically triggered.

### Step 2: Reflection Pipeline (Critic Gate)
After the graph execution finishes, a central critic reviews the completed workflow context, calculating a **Confidence Index (0.0 to 1.0)**, detailing reasoning, and providing 2-3 constructive suggestions for future iterations.

---

## 5. Developer Guide: Future Multi-Agent Expansion

The Orchestration Engine is built to easily scale to support highly complex multi-agent simulations.

### Adding a New Autonomous Agent

To add a specialized agent (e.g., a **PortfolioOptimizationAgent**), follow these simple steps:

1. **Expose Capabilities**: In your module class (e.g. `PortfolioModule`), declare new capability strings:
   ```typescript
   capabilities: ["PORTFOLIO_OPTIMIZATION", "ASSET_INDEXING"]
   ```
2. **Update the Coordinator**: Add the capability hook inside `TaskCoordinator.ts` to map the action to your service method:
   ```typescript
   case "PORTFOLIO_OPTIMIZATION": {
     return await services.portfolioService.optimize(task.input);
   }
   ```
3. **Let AI Plan**: The `GoalInterpreter` will automatically include this step in future execution graphs whenever a user goal mentions "portfolio", "assets", or "rebalancing"!

---

## 6. Verification & Readiness Status

- [x] Circular Dependency DFS cycle-guard is fully operational.
- [x] Dynamic module discovery utilizing `ModuleManager` is fully active.
- [x] Comprehensive 11-step multi-agent execution pipeline is compiled.
- [x] System lints and compiles successfully with zero errors.
