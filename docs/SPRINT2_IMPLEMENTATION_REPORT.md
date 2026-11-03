# 📐 Aziz Kernel (Phase 2) - Sprint 2 Implementation Report

This report outlines the detailed architecture, file structures, and code design choices of the **Aziz Kernel Event Bus (Sprint 2)**. This subsystem provides the central communication spine for the agent runtime, executing type-safe event routing, subscription lifecycles, wildcard listening, and transaction journaling.

---

## 1. Architectural Blueprint & File Layout

The Event Bus has been engineered as a zero-dependency, typesafe spine using high-performance, single-threaded Node.js event-loop primitives. 

* **Interface Contract**: Defined in `/src/kernel/types.ts` (`IEventBus`)
* **Concrete Class**: `/src/kernel/EventBus.ts` (`InMemoryEventBus`)
* **Unit Tests**: `/src/kernel/tests/EventBus.test.ts` (6 test cases, 100% pass)
* **Validation Performance Suite**: `/src/kernel/tests/EventBusValidation.ts`

---

## 2. Core Subsystems & Design Choices

### A. Typed EventEmitter Wrapper
We chose to encapsulate Node's native `events.EventEmitter` to serve as our event routing engine. Node's `EventEmitter` is extremely robust and highly optimized in V8. 
By wrapping it, we achieve:
* **True Synchronous Dispatch**: Events fire synchronously on the main thread, guaranteeing that sequential pipeline execution remains completely order-deterministic.
* **Infinite Listener Capability**: Configured `emitter.setMaxListeners(0)` to prevent native Node warning messages during large-scale stress testing or dense sub-agent listening.

### B. Subscription Lifecycle & Wildcard Routing
The subscription lifecycle supports:
* **Specific Channel Registration**: Listeners can bind directly to fine-grained typed channels (e.g., `TaskCreated`, `PlanningStarted`, `ToolExecuted`, `TaskCompleted`).
* **Wildcard Channel Routing**: Registering on the wildcard channel `"*"` routes every single published event to that listener, allowing global compliance loggers and debug panels to eavesdrop without needing manual channel stitching.
* **Unsubscribe Closure Callbacks**: `subscribe(...)` returns an immutable closure `() => void`. Invoking this closure removes the wrapper reference from the inner EventEmitter registry, freeing heap space immediately.

### C. Compliance Event Journal
To meet the "AI Event Journal for compliance tracking" requirements of the Aziz Kernel Specification:
* Every published event is automatically assigned a unique event ID (`ev_...`) and an RFC 3339 formatted timestamp.
* The Event Bus deep-clones the event envelope using `JSON.parse(JSON.stringify(event))` before inserting it into the internal chronological array (`journal`).
* Deep-cloning isolates the stored history from caller modifications, preventing malicious or accidental tampering with historical compliance logs.

### D. Chronological Event Replay Subsystem
The replay system provides chronological reconstruction capabilities:
* Exposes a `replay(handler, filters)` method.
* Replays can be filtered down by `taskId`, specific `type`, or compound conditions.
* This allows state-reconstruction listeners to re-consume past transactions to rebuild the State Store in the event of an eviction or process recycle.

---

## 3. Key Implementation References

### Event Publishing & Wildcard Emission
When `publish` is called, the envelope is populated, logged, and sequentially dispatched on both the targeted channel and the wildcard channel:

```typescript
public publish(event: Omit<KernelEvent, "eventId" | "timestamp">): void {
  const fullEvent: KernelEvent = {
    ...event,
    eventId: this.generateId(),
    timestamp: new Date().toISOString()
  };

  // Deep-clone and record to compliance audit journal to isolate memory references
  this.journal.push(JSON.parse(JSON.stringify(fullEvent)));

  // Publish to specific event-type channel
  this.emitter.emit(fullEvent.type, fullEvent);

  // Publish to wildcard channel
  this.emitter.emit("*", fullEvent);
}
```

### Unsubscribe Closure Pattern
The subscription wrapper handles internal callback encapsulation and ensures unhandled exceptions do not interrupt sister listeners:

```typescript
public subscribe(type: KernelEventType | "*", handler: (event: KernelEvent) => void): () => void {
  const wrapper = (event: KernelEvent) => {
    try {
      handler(event);
    } catch (err) {
      console.error(`[EventBus] Subscriber thrown uncaught exception for channel "${type}":`, err);
    }
  };

  this.emitter.on(type, wrapper);

  // Return unsubscribe cleanup handler
  return () => {
    this.emitter.off(type, wrapper);
  };
}
```

---

## 4. Sprint 2 Scope Adherence Checklist

* **IEventBus implementation** ➡️ **COMPLETE** (in `/src/kernel/EventBus.ts`)
* **Typed EventEmitter wrapper** ➡️ **COMPLETE** (encapsulating Node's `EventEmitter`)
* **Event Journal** ➡️ **COMPLETE** (chronological append-only isolated journal)
* **Subscription lifecycle** ➡️ **COMPLETE** (specific registration, wildcard `*`, unsubscribe closures, and explicit unsubscribe callbacks)
* **Event replay support** ➡️ **COMPLETE** (supports target filters and strict memory safety cloning)
* **Unit tests** ➡️ **COMPLETE** (all passing in `/src/kernel/tests/EventBus.test.ts`)
* **Validation benchmarks** ➡️ **COMPLETE** (executed and analyzed in `/src/kernel/tests/EventBusValidation.ts`)

No unauthorized agent orchestration modules, context builders, reflection criticisms, or tool integrations were introduced, respecting user constraints completely.
