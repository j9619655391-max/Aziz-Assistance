# Architecture Decision Record (ADR-002): Asynchronous Event Bus

## Context & Problem Statement
To build an autonomous system, sub-agents, static diagnostic rules, file patchers, and telemetry trackers must communicate dynamically. Direct synchronous function coupling (e.g., calling `diag.run()` inside `chat.respond()`) creates tight architectural dependencies, prevents non-linear step transitions, and blocks real-time streaming of execution milestones back to the Express gateway and client dashboard.

## Decision
We will establish an in-memory, type-safe **Event Bus** as the primary communications spine of the Aziz Kernel. The Event Bus wraps Node's native `EventEmitter` to dispatch events asynchronously. 

Any Kernel sub-system or active Agent can publish events to the bus, and any registered module (such as the SRE Logger or the State Store) can listen to these events.

### Typed Event Schema & Contracts
```typescript
export interface KernelEvent {
  eventId: string;
  taskId: string;
  timestamp: string;
  source: string; // e.g., "Planner", "DiagnosticAgent", "ModelRouter"
  type: 
    | "TaskCreated" 
    | "PlanningStarted" 
    | "PlanningCompleted" 
    | "ToolExecuted" 
    | "VerificationPassed" 
    | "VerificationFailed"
    | "CheckpointCreated"
    | "RollbackTriggered"
    | "MemoryStored" 
    | "TaskCompleted" 
    | "TaskFailed";
  payload: Record<string, any>;
}

export interface IEventBus {
  publish(event: Omit<KernelEvent, "eventId" | "timestamp">): void;
  subscribe(type: KernelEvent["type"], handler: (event: KernelEvent) => void): void;
}
```

## Consequences
- **Positive**: Complete temporal and structural decoupling of agents and tools.
- **Positive**: Provides a single hook point for system-wide auditing and real-time frontend Web Socket/Server-Sent Events streaming.
- **Negative**: Traceability of multi-step chains can become harder without strict task correlation headers (`taskId`). Every published event *must* include the correlating `taskId`.

## Acceptance Criteria
- [ ] Every transition in the Kernel's execution pipeline must publish an event to the Event Bus.
- [ ] The `StateStore` subscribes to these events to update the active execution states dynamically.
- [ ] Events are automatically appended to the `AI Event Journal` for compliance tracking.
- [ ] Multiple subscribers can listen to the same event type simultaneously without message loss.
