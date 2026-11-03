# 📐 Aziz Kernel (Sprint 6) - Implementation Report

This report documents the design and code architecture deployed for the **Deterministic Context Builder (Phase 4.0)** in the Aziz Kernel. The implementation satisfies all constraints and strict functional requirements of the Sprint 6 specification.

---

## 1. Technical Architecture & Flow

The `ContextBuilder` is a fully deterministic, side-effect-free compiler. It gathers active source files, processes them for keywords and explicit priority targets, filters out redundant whitespace and comments, and maps them to a strict token budget, outputting a type-safe context package.

```
                      ┌────────────────────────┐
                      │    Goal / Query        │
                      └───────────┬────────────┘
                                  │
                                  ▼
┌─────────────────┐       ┌──────────────┐       ┌─────────────────┐
│   Workspace /   │──────►│   Context    │◄──────│ Impacted Files  │
│   Virtual FS    │       │   Builder    │       │  (Prioritized)  │
└─────────────────┘       └──────┬───────┘       └─────────────────┘
                                 │
                                 ├────────────────────────┐
                                 ▼                        ▼
                       ┌──────────────────┐     ┌──────────────────┐
                       │  Symbols Graph   │     │  ContextPackage  │
                       │ (Imports Map)    │     │ (Pruned/Metrics) │
                       └──────────────────┘     └──────────────────┘
```

### Flow Execution Steps:
1. **Source Discovery**: Collects all source files from either the workspace on disk or an in-memory VFS map (used for isolated testing and benchmarks).
2. **Deterministic Relevance Scoring**:
   - Scores files based on query keyword match occurrences.
   - Files explicitly requested in `impactedFiles` receive an immediate priority score weight of `+1000`.
3. **Redundancy & Noise Pruning**:
   - Removes JS/TS block comments (`/* ... */`) and single-line comments (`// ...`) to focus purely on logical syntax.
   - Compresses consecutive vertical whitespace, limiting lines to a maximum of one consecutive empty line.
4. **Token Budget Enforcement**:
   - Computes estimated token allocations using character boundaries (approx. 4 chars per token).
   - If a file exceeds the remaining budget, it is deterministically truncated, warning markers are appended, and the budget enforcement flag is raised.
5. **Deterministic Graph Mapping**: Analyzes exact relative import keywords (e.g. `import ... from "./Path"`) between sorted files to build a clean dependency map (`symbolsGraph`).

---

## 2. Interface Definition & Implementation

The engine fully adheres to `IContextBuilder` from `/src/kernel/types.ts`:

```typescript
export interface IContextBuilder {
  buildContext(query: string, impactedFiles: string[]): Promise<WorkspaceContext>;
}
```

And extends the return structure with exact diagnostic properties in `/src/kernel/ContextBuilder.ts`:

```typescript
export interface ContextMetrics {
  totalBytesBefore: number;
  totalBytesAfter: number;
  compressionRatio: number;
  estimatedTokensBefore: number;
  estimatedTokensAfter: number;
  tokenReductionRatio: number;
}

export interface ContextPackage extends WorkspaceContext {
  metrics: ContextMetrics;
  budgetEnforced: boolean;
  truncatedFiles: string[];
}
```

---

## 3. Strict Boundary Compliance

To protect the core of the Aziz Kernel, we validated that the `ContextBuilder` complies with the following boundaries:
* **No Direct LLM Interactions**: Operates purely procedurally without external AI endpoint latency or billable invocations.
* **No Side-Effects / Modifications**: Workspace directories on disk are only scanned read-only; no local files are modified.
* **No Planning or Execution Loops**: Compiles context in a single pass without planning steps, executing tools, or creating timers.
