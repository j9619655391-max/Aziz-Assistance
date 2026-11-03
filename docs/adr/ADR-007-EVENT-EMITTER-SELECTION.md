# Architecture Decision Record (ADR-007): EventEmitter Selection and Future Distributed Migration

## Context & Problem Statement
In [ADR-002](./ADR-002-EVENT-BUS.md), we established an asynchronous Event Bus to decouple the subsystems of the Aziz Kernel. We need to decide on the underlying message broker / event driver implementation for Phase 2. 

The immediate runtime is a single container environment (Cloud Run / Node.js standard process). However, the architecture must support scaling to distributed environments with multiple container replicas, distributed job workers, or external CLI/desktop client connections (Phase 4).

## Decision
We will use Node's native `events.EventEmitter` class as the initial event engine for the Aziz Kernel Event Bus, wrapped inside our type-safe `IEventBus` interface.

We reject heavy external messaging infrastructure (such as RabbitMQ, Kafka, or Redis) for the immediate phase to maintain zero external dependencies, sub-millisecond in-memory dispatch times, and lightweight memory overhead.

### Code Implementation Schema
The implementation will reside in `/src/kernel/EventBus.ts` (or mapped in server.ts for backend) wrapping a typed subscription list around:
```typescript
import { EventEmitter } from "events";
import { IEventBus, KernelEvent } from "./types";

export class NodeEventBus implements IEventBus {
  private emitter = new EventEmitter();

  constructor() {
    // Increase limit of maximum listeners to avoid warning on highly concurrent tasks
    this.emitter.setMaxListeners(100);
  }

  public publish(event: Omit<KernelEvent, "eventId" | "timestamp">): void {
    const fullEvent: KernelEvent = {
      ...event,
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };
    this.emitter.emit(event.type, fullEvent);
    this.emitter.emit("*", fullEvent); // Global wildcard channel for Event Journal logger
  }

  public subscribe(type: KernelEvent["type"] | "*", handler: (event: KernelEvent) => void): void {
    this.emitter.on(type, handler);
  }
}
```

---

## Future Migration Pathway (Distributed Scaling)

When transitioning to **Phase 4: Distributed SRE Workers** and multi-instance cloud deployments, the in-memory `EventEmitter` will become a bottleneck because:
1. **No Inter-Process Communication (IPC)**: An event published on Express Instance A will not be seen by SRE Worker Container B.
2. **Volatile Queueing**: If a worker crashes, events in memory are lost.

To migrate to a distributed bus without breaking codebases, we will substitute `NodeEventBus` with an adapter targeting **Redis Pub/Sub** or **AWS EventBridge / RabbitMQ** while keeping the `IEventBus` interface completely identical:

```
+---------------------------------------------------------------------------------+
|                                 AZIZ KERNEL CORE                                |
|        (Uses IEventBus without knowing the underlying implementation)           |
+---------------------------------------+-----------------------------------------+
                                        |
                         Calls .publish() or .subscribe()
                                        v
+---------------------------------------+-----------------------------------------+
|                          DISTRIBUTED EVENT BUS ADAPTER                          |
|    - Marshals event payloads to JSON                                            |
|    - Publishes to network broker (Redis, RabbitMQ, or NATS)                     |
+---------------------------------------+-----------------------------------------+
                                        |
                            TCP Network Connection
                                        v
+---------------------------------------+-----------------------------------------+
|                      EXTERNAL DISTRIBUTED BROKER (e.g., REDIS)                  |
|    - Broadcasts event to all active instances/workers                           |
+---------------------------------------------------------------------------------+
```

### Migration Blueprint Steps:
1. **Redis Pub/Sub Adapter**: Substitute `NodeEventBus` with a Redis client adapter. This will broadcast event frames across all Node.js server container replicas in Cloud Run.
2. **Task Queueing (BullMQ)**: For durable task execution states across worker containers, transition task scheduling events to BullMQ (backed by Redis), enabling reliable retries, rate limits, and job timeouts.

---

## Consequences
- **Positive**: Zero configuration required, zero infrastructure costs, and instant sub-microsecond in-memory event dispatch latency during Phase 2.
- **Positive**: Strict interface boundaries protect the system from breaking changes during future Redis/RabbitMQ migrations.
- **Negative**: Single-process only. If the server node restarts, in-flight event handlers that have not yet run are lost.

## Acceptance Criteria
- [ ] Wraps native Node `EventEmitter` fully without leaking its internal APIs to external subsystems.
- [ ] Successfully supports wildcard listeners (`*`) for global logging and SRE event auditing.
- [ ] Handles concurrent execution of up to 100 listeners without triggering Node's memory leak warning.
