# Architecture Decision Record (ADR-001): AI Kernel Core Runtime Architecture

## Context & Problem Statement
The Aziz AI Platform is transitioning from a modular API gateway with separated diagnostic and terminal tools into an autonomous software engineering and SRE platform. To coordinate multi-step plans, manage agent lifecycles, and recover from execution failures without over-relying on visual UI states, the platform requires a centralized, non-blocking execution engine—the **Aziz Kernel**. 

Historically, AI agent behaviors were coupled directly to API routes. This limits state tracking, transaction replays, and support for alternative interface clients (e.g., CLI, VSCode Extension, or MCP hosts).

## Decision
We will implement the **Aziz Kernel Core Runtime** as a stateful, model-agnostic controller running inside the Express backend. The Kernel will decouple the visual presentation layer (**Aziz Studio**) from the backend worker execution.

The Kernel design will adhere to the following rules:
1. **Asynchronous Non-Blocking Execution**: Tasks are accepted, assigned a unique `taskId`, and executed as background promises.
2. **Interface-Driven Decoupling**: All core Kernel sub-systems (Planner, Agent Runtime, Event Bus, Tool Registry, State Store) must communicate strictly through typed interface contracts.
3. **Session Sandbox Isolation**: Agent interactions operate inside designated workspace directories with restricted access privileges.

### Core Interface Definitions
```typescript
export interface IKernel {
  dispatch(goal: string): Promise<string>; // Returns taskId
  getTaskState(taskId: string): TaskState | null;
}

export interface IAgent {
  id: string;
  role: string;
  capabilities: string[];
  execute(taskId: string, taskDescription: string): Promise<AgentResult>;
}

export interface AgentResult {
  success: boolean;
  output: string;
  patchesProposed?: FilePatch[];
  logs: string[];
}
```

## Consequences
- **Positive**: Strict decoupling enables running the same Kernel via REST APIs, CLI, or an MCP host without modifying core agent logic.
- **Positive**: Introduces deterministic transaction logging and state verification.
- **Negative**: Adds moderate runtime complexity; requires thread-safe or callback-safe storage for active execution states in Express memory.

## Acceptance Criteria
- [ ] Task execution state persists across standard asynchronous cycles using a centralized `StateStore`.
- [ ] Agent executions execute through the core `AgentRuntime` loop rather than direct route handlers.
- [ ] All errors in agent routines are caught by the Kernel and logged to the global SRE logs.
- [ ] Verification tests compile successfully without circular dependencies.
