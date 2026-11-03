# Architecture Decision Record (ADR-005): Secure Schema-Based Tool Registry

## Context & Problem Statement
In Phase 1, tools like file operations and terminal executions were accessed as basic, hardcoded route controllers. While secure (due to regex command blockers), this tightly-coupled approach prevents the AI Planner from dynamically selecting tools or matching tool requirements to strict security permissions. To support scalable agents and third-party plugins (including MCP), tools must be registered dynamically with machine-readable metadata.

## Decision
We will construct a centralized, schema-based **Tool Registry** in the Aziz Kernel. Every system operation is wrapped as a `Tool` and registers its **Capability Manifest**. 

A Capability Manifest includes:
- Unique identifier and description.
- Input parameter JSON Schema (enforcing structured types).
- Declared security risk level (`low`, `medium`, `high`).
- Execution constraints (timeouts, retry policies, absolute work directories).

Prior to executing any tool, the Kernel verifies that the active Agent has the corresponding permissions and that the inputs conform to the JSON Schema.

### Tool Registry Interfaces
```typescript
export interface ToolManifest {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, any>; // JSON Schema
  riskLevel: "low" | "medium" | "high";
  timeoutMs: number;
  maxRetries: number;
}

export interface IToolRegistry {
  registerTool(manifest: ToolManifest, handler: (args: any) => Promise<any>): void;
  executeTool(toolId: string, args: Record<string, any>, agentId: string): Promise<any>;
  listTools(): ToolManifest[];
}
```

## Consequences
- **Positive**: Enables a self-describing tool plane. The Planner can dynamically learn about available tools by querying the registry.
- **Positive**: Standardizes error handling, logging, and security auditing across all system operations.
- **Negative**: Adds a schema parsing layer which can increase latency slightly; requires strict parameter validation.

## Acceptance Criteria
- [ ] Every available filesystem and terminal helper registers its JSON Schema.
- [ ] Reject tool execution instantly if the arguments fail the schema check.
- [ ] Reject execution if the tool risk level exceeds the active agent's permission level.
- [ ] Log the exact tool inputs, outputs, execution durations, and any failures to the `AI Event Journal`.
