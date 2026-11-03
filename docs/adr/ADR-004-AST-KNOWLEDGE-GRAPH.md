# Architecture Decision Record (ADR-004): Workspace Semantic & Symbolic Knowledge Graph

## Context & Problem Statement
The primary bottle-neck for modern AI software engineers is context management. Sending an entire codebase to an LLM exhausts token quotas, introduces latency, and degrades response accuracy due to model distraction. The current `workspace-index.json` compiles lists of files, imports, and components using regex parsing. To support autonomous refactoring and safety impact analysis, the platform must move beyond flat text indices to understand functional relations, dependencies, and symbolic interfaces.

## Decision
We will upgrade the static workspace scanner into a **4-Layer Knowledge Graph** engine. The engine compiles file contents into a symbolic mapping of:
1. **Filesystem Topology**: Physical files, sizes, paths, and directory hierarchies.
2. **Import Dependency Mapping**: Directional import-export references representing code coupling.
3. **Symbolic Signature Mapping**: Function signatures, parameters, interface types, and database fields.
4. **Semantic Call Mapping**: Interactive connections showing which components or routes consume which symbols.

Using this graph, the Kernel can execute **Impact Analysis Queries** prior to patching any file, identifying downstream dependents that will require automatic re-compilation or verification.

### Knowledge Graph Contracts
```typescript
export interface GraphNode {
  id: string; // e.g., "src/types.ts:TaskState"
  type: "file" | "import" | "function" | "class" | "interface" | "endpoint";
  filePath: string;
  name: string;
  metadata: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: "imports" | "defines" | "calls" | "implements" | "references";
}

export interface IWorkspaceGraph {
  buildGraph(): Promise<void>;
  getImpactedNodes(filePath: string): string[]; // Returns list of affected files/symbols
  getSymbolDefinition(symbolName: string): GraphNode | null;
}
```

## Consequences
- **Positive**: Enables Context Compression. The Kernel can select *only* files that are directly related to the target symbol or impacted by the changes.
- **Positive**: Dramatic increase in patching safety by warning the AI before it executes breaking symbol modifications.
- **Negative**: True AST parsing using TypeScript Compiler API or `ts-morph` adds significant processing and package overhead compared to regex-based indexers.

## Acceptance Criteria
- [ ] Maps exact import lines to construct a directional dependency graph.
- [ ] Correctly identifies symbolic connections (which files import or call a target function).
- [ ] Returns a detailed impact list of secondary affected files when queried for a target file modification.
- [ ] Saves the compiled structural relations safely to `workspace-index.json` to avoid expensive re-indexing sweeps.
