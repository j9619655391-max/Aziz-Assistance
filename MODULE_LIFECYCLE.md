# Aziz Assistant — Module Lifecycle Platform Engine

This document defines the architecture, design patterns, state machine, dependency resolution mechanics, and developer integration guidelines for the **Aziz Assistant Module Lifecycle Platform Engine**.

---

## 1. System Architecture Overview

The Aziz Assistant is structured as a modular AI-native platform. Rather than binding service initializations directly inside a static server configuration, the platform abstracts individual domain logic into self-contained, registerable **Platform Modules**.

```
       +---------------------------------------------+
       |             HTTP REST API layer             |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |               ModuleManager                 |
       +---------------------------------------------+
             /                |                \
            v                 v                 v
    +---------------+ +---------------+ +---------------+
    |  RepoModule   | | ProviderModule| | EmployModule  | ...
    +---------------+ +---------------+ +---------------+
```

---

## 2. Module State Machine

Every module maintains a deterministic state transition pattern governed by the `ModuleManager`. 

```
   [REGISTERED]
         |
         | (Dependency Resolution & Initialization)
         v
   [INITIALIZED]
         |
         | (onStartup Hook)
         v
    [STARTING]
         |
         +-----------------+
         | (Success)       | (Failure)
         v                 v
     [RUNNING]         [FAILED]
     /       \            ^
    /         \           | (Hook Failure)
   v           v          |
[DEGRADED]  [STOPPED] ----+
   ^           |
   | (Enable)  | (Disable)
   +-----+-----+
         |
         v
     [DISABLED]
```

### State Definitions

1. **REGISTERED**: The module instance is registered into the `ModuleManager` registry.
2. **INITIALIZED**: The module dependencies are satisfied, and it's prepared for system boot.
3. **STARTING**: The module's `startup()` hook has initiated.
4. **RUNNING**: The module has successfully started and is executing nominally.
5. **DEGRADED**: The module has experienced a non-fatal dependency degradation or health check failure.
6. **FAILED**: A fatal exception occurred during the module's startup or shutdown hook execution.
7. **DISABLED**: The module is explicitly disabled at runtime, releasing all active event handles, intervals, and memory pools.
8. **STOPPED**: The module has completed its shutdown lifecycle hook cleanly.

---

## 3. Module Metadata and Registration Schema

Every platform module must implement the `IModule` contract and expose the following metadata structure:

```typescript
export interface ModuleMetadata {
  id: string;                    // Unique identifier (e.g., "employment")
  name: string;                  // Human-readable name
  version: string;               // SemVer version string
  description: string;           // Brief summary of module domain
  author: string;                // Maintainer/Author identifier
  capabilities: string[];        // Array of platform capabilities exposed (e.g. ["JOB_SEARCHING"])
  dependencies: string[];        // Identifiers of other required modules (e.g. ["repository"])
  configSchema?: Record<string, any>; // Permitted configuration schema parameters
  requiredServices?: string[];   // Required Service names
  optionalServices?: string[];   // Optional Service names
}
```

---

## 4. Dependency Resolution & Topological Sorting

At system startup, the `ModuleManager` gathers the dependency node graph of all registered modules and calculates the correct execution sequence using a **Topological Sort algorithm with Circular Dependency Detection (DFS-based cycle-guard)**.

### Sorting Flow

1. For each registered module, extract its identifier and listed dependencies.
2. Build a directed dependency node mapping.
3. Recursively visit each node:
   - If a node is already in the `visiting` stack, throw a `Circular dependency detected` exception.
   - If a node has unvisited dependencies, traverse them first.
   - Once all dependencies of a node are resolved and visited, push the node into the `sorted` array.
4. Return the resulting linear list representing the **Startup Sequence**. The **Shutdown Sequence** is calculated by simply reversing this list.

---

## 5. Startup & Shutdown Hook Sequence

```
System Boot
  |
  v
ServiceRegistry (DI Container Created)
  |
  v
ModuleManager.getInstance().register(modules)
  |
  v
ModuleManager.getInstance().startupAll(registry)
  |
  +---> Calculate Topological Startup Sequence
  |
  +---> Loop: Run async onStartup() hook in sequence
```

```
System Shutdown
  |
  v
ServiceRegistry.shutdown()
  |
  v
ModuleManager.getInstance().shutdownAll()
  |
  +---> Loop: Run async onShutdown() hook in REVERSE sequence
```

---

## 6. Developer Guide: Creating a New Bounded-Context Module

Adding new domains, such as a **TradingModule** or a **RecruitmentModule**, requires absolutely **no changes to the core system container or router structure**.

### Step 1: Implement the Module Class

Create a new file in your domain folder extending the `BaseModule`:

```typescript
// /src/domains/trading/TradingModule.ts
import BaseModule from "../../kernel/module/BaseModule";
import { ModuleMetadata, ModuleHealth } from "../../kernel/module/types";

export class TradingModule extends BaseModule {
  public metadata: ModuleMetadata = {
    id: "trading",
    name: "Trading Module",
    version: "1.0.0",
    description: "Algorithmic scouting, portfolio evaluation, and trade signal analytics.",
    author: "Fintech Desk",
    capabilities: ["MARKET_SCOUTING", "SIGNAL_DISPATCH"],
    dependencies: ["repository", "communication"], // Depends on DB storage and notification capability
    requiredServices: ["TradingService"],
  };

  private tradingService: any = null;

  protected async startup(registry: any): Promise<void> {
    this.tradingService = registry.tradingService;
    if (!this.tradingService) {
      throw new Error("Required 'tradingService' not found in DI registry.");
    }
    // Initialize schedules or connection pools
    await this.tradingService.initializeStream();
  }

  protected async shutdown(): Promise<void> {
    if (this.tradingService) {
      await this.tradingService.closeStream();
    }
  }

  protected async diagnostics() {
    return {
      activeSymbolsCount: 42,
      lastFeedLatencyMs: 12,
    };
  }
}
```

### Step 2: Register in ServiceRegistry

Simply register the new module instance in the `/src/services/backend/ServiceRegistry.ts` constructor list:

```typescript
moduleManager.register(new TradingModule());
```

The system automatically detects its required dependencies (`repository`, `communication`), inserts it at the exact appropriate slot of the topological boot order, schedules its startup hooks, and registers its capabilities!

---

## 7. Operational REST APIs

The platform exposes the following standard REST endpoints for telemetry, state manipulation, and orchestration of the Module Lifecycle Platform Engine:

* **`GET /api/modules`**
  - Gathers metadata, active state, health history, capabilities, and configurations for all modules.
* **`GET /api/modules/diagnostics`**
  - Full structural summary, active/failed modules counters, dependency graph, startup sequence, and capabilities registries.
* **`POST /api/modules/:id/disable`**
  - Triggers shutdown and places the module into `DISABLED` status.
* **`POST /api/modules/:id/enable`**
  - Restores status and runs the startup lifecycle hook securely.
* **`POST /api/modules/:id/reload`**
  - Hot-reloads configuration properties.
* **`POST /api/modules/:id/restart`**
  - Performs sequential shutdown and re-startup on the target module.
