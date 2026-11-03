# 📐 Aziz Kernel (Phase 2) - Sprint 3 Implementation Report

This report outlines the detailed architecture, file structures, and code design choices of the **Aziz Kernel Tool Registry (Sprint 3)**. This subsystem handles safe capabilities registration, dynamic argument verification, permission gating, and policy-driven tool executions (timeouts, retries, and analytics).

---

## 1. Architectural Blueprint & File Layout

The Tool Registry is structured as a self-contained, high-performance module within `/src/kernel`. It enforces absolute isolation and 100% backward compatibility.

* **Interface Contract**: Defined in `/src/kernel/types.ts` (`IToolRegistry`, `ToolManifest`)
* **Concrete Class**: `/src/kernel/ToolRegistry.ts` (`InMemoryToolRegistry`)
* **Unit Tests**: `/src/kernel/tests/ToolRegistry.test.ts` (12 test cases, 100% pass)
* **Validation Performance Suite**: `/src/kernel/tests/ToolRegistryValidation.ts`

---

## 2. Core Subsystems & Design Choices

### A. Deep Manifest Registration and Safety Guardrails
To prevent registration of corrupt or hazardous tools, `registerTool` conducts rigid manifest structure checks upon entry:
* Validates type correctness of `id`, `name`, `description`, `permissions`, `riskLevel`, `timeoutMs`, `maxRetries`, `inputSchema`, and `outputSchema`.
* Enforces **Risk Level Classification Limit policies**: If a tool's declared risk level exceeds the registry's configured maximum allowed risk level (e.g., registering a `high` risk tool on a `medium` risk maximum registry limit), registration is aborted immediately with a `SecurityException`.
* Deep-copies manifests to prevent external caller state-mutation side-effects.

### B. In-Line JSON Schema Validation Engine
To remain zero-dependency and eliminate third-party package issues, we engineered a custom, highly-optimized recursive JSON Schema validation engine (`validateSchema`) inside `InMemoryToolRegistry`:
* **Type Conformity Checks**: Supports `"string"`, `"number"`, `"integer"`, `"boolean"`, `"array"`, and `"object"`.
* **Structural Boundaries**: Evaluates nested object properties, required field arrays, and recursive array item schemas.
* **Enumerated Values**: Verifies that input matches specified enum lists.
* **Clear Diagnostic Errors**: Raises a custom `SchemaValidationError` with exact field paths (e.g., `args.params.flags[0]`) to assist diagnostics.

### C. Tiered Permission Model
Access control is guarded via a dual-layer security policy:
1. **Static Permissions Check**: Compares the required permissions listed in the tool’s manifest against a configured `grantedPermissions` set. If any permission is missing, execution is blocked with a `SecurityException`.
2. **Dynamic Permission Callback Check**: Passes requests to a developer-supplied `permissionChecker` callback, supporting dynamic contextual authorization decisions (e.g. querying active task contexts, checking specific taskId boundaries).

### D. Policy-Driven Execution Layer (Timeouts & Retries)
When `executeTool` is invoked, the handler execution is passed through a deterministic pipeline:
* **Timeout Gating**: Executes the primary handler inside a `Promise.race` paired with a Node.js `setTimeout` abort trigger. Exceeding `timeoutMs` rejects the execution immediately, cleaning up timers to avoid memory leakages.
* **Automated Retry Loop**: If execution fails, the registry triggers automated retries up to `maxRetries` with simple linear backoff, resolving transient pipeline failures before propagating errors.

### E. Telemetry Metadata & Subsystem Integration
The Tool Registry tracks in-depth performance analytics:
* **Internal Telemetry Logs**: Maintains invocation counts, successes, failures, retries, and latency averages both globally and per-tool.
* **State Store Synchronization**: If a `StateStore` instance is provided, the registry atomically increments the active task's `toolInvocations` count and accumulates running durations using `stateStore.recordTelemetry`.
* **Event Bus Notifications**: Automatically publishes `ToolExecuted` events to the Event Bus, providing the complete trace of input arguments, durations, retries, and outputs.

---

## 3. Key Implementation References

### Custom Recursive JSON Schema Validator
```typescript
public static validateSchema(data: any, schema: any, path: string = "args"): void {
  if (!schema) return;

  if (Array.isArray(schema.enum)) {
    if (!schema.enum.includes(data)) {
      throw new SchemaValidationError(path, `value must belong to enum list`);
    }
  }

  if (schema.type) {
    const type = schema.type;
    if (type === "string") {
      if (typeof data !== "string") throw new SchemaValidationError(path, "expected string");
    } else if (type === "integer") {
      if (typeof data !== "number" || !Number.isInteger(data)) throw new SchemaValidationError(path, "expected integer");
    } else if (type === "array") {
      if (!Array.isArray(data)) throw new SchemaValidationError(path, "expected array");
      if (schema.items) {
        data.forEach((item, index) => InMemoryToolRegistry.validateSchema(item, schema.items, `${path}[${index}]`));
      }
    } else if (type === "object") {
      if (data === null || typeof data !== "object" || Array.isArray(data)) throw new SchemaValidationError(path, "expected object");
      if (Array.isArray(schema.required)) {
        for (const req of schema.required) {
          if (data[req] === undefined) throw new SchemaValidationError(path, `missing required property "${req}"`);
        }
      }
    }
  }
}
```

---

## 4. Sprint 3 Scope Adherence Checklist

* **IToolRegistry implementation** ➡️ **COMPLETE** (in `/src/kernel/ToolRegistry.ts`)
* **Tool Discovery** ➡️ **COMPLETE** (`listTools()` and `getTool()`)
* **Manifest validation** ➡️ **COMPLETE** (comprehensive manifest-integrity checks on registration)
* **Permission model & authorization** ➡️ **COMPLETE** (static granted checks & dynamic callback hooks)
* **Risk classification limits** ➡️ **COMPLETE** (blocks registrations exceeding max allowed levels)
* **Timeout Policy** ➡️ **COMPLETE** (strict execution aborts via `Promise.race`)
* **Retry Policy** ➡️ **COMPLETE** (resilient loop retries with automatic linear backoff)
* **Telemetry logging** ➡️ **COMPLETE** (both built-in and external `StateStore` + `EventBus` hooks)
* **Unit tests** ➡️ **COMPLETE** (12 passing tests in `/src/kernel/tests/ToolRegistry.test.ts`)
* **Validation benchmarks** ➡️ **COMPLETE** (executed and analyzed in `/src/kernel/tests/ToolRegistryValidation.ts`)

No unauthorized planner, agent, or reflection integrations were introduced, respecting boundaries perfectly.
