/**
 * @file /src/kernel/Planner.ts
 * @description Pure, deterministic task planning engine implementing IPlanner.
 * Formulates execution plans, validates input constraints, verifies tool matching, and
 * detects circular dependencies in workspace context symbols graphs.
 */

import { IPlanner, IEventBus, IToolRegistry, WorkspaceContext, TaskStep, ToolManifest } from "./types";

export class InvalidGoalError extends Error {
  constructor(message: string) {
    super(`InvalidGoalError: ${message}`);
    this.name = "InvalidGoalError";
  }
}

export class MissingCapabilityError extends Error {
  constructor(message: string) {
    super(`MissingCapabilityError: ${message}`);
    this.name = "MissingCapabilityError";
  }
}

export class CircularPlanError extends Error {
  constructor(message: string) {
    super(`CircularPlanError: ${message}`);
    this.name = "CircularPlanError";
  }
}

export class Planner implements IPlanner {
  public static readonly planner_version = "1.0.0-rc2";
  public readonly planner_version = Planner.planner_version;

  constructor(
    private readonly toolRegistry: IToolRegistry,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Translates a plain-text task goal and a workspace context into an ordered list of task steps.
   * Emits lifecycle events and performs strict contract and circular dependency validation.
   */
  public async createPlan(taskId: string, goal: string, context: WorkspaceContext): Promise<TaskStep[]> {
    // 1. Validate Input Guards
    if (!taskId || typeof taskId !== "string") {
      throw new InvalidGoalError("Task ID must be a non-empty string");
    }
    if (!goal || typeof goal !== "string" || goal.trim() === "") {
      throw new InvalidGoalError("Task goal must be a non-empty string");
    }

    // Publish PlanningStarted event
    this.eventBus.publish({
      taskId,
      type: "PlanningStarted",
      payload: { goal }
    });

    // 2. Validate Circular Dependencies in Workspace Graph
    if (context.symbolsGraph) {
      if (this.detectCycle(context.symbolsGraph)) {
        throw new CircularPlanError("Circular dependency detected in workspace context symbols graph");
      }
    }

    // 3. Resolve Available Capabilities (Tools)
    const availableTools = this.toolRegistry.listTools();

    // 4. Check for Explicitly Requested Missing Capabilities
    // We parse the goal for explicit tool requests, e.g. "requires tool: <id>", "use tool <id>", "execute tool <id>"
    const explicitToolMatches = goal.match(/(?:requires\s+tool:|use\s+tool|execute\s+tool|tool:)\s*([a-zA-Z0-9_\-]+)/gi);
    if (explicitToolMatches) {
      for (const match of explicitToolMatches) {
        const idMatch = match.match(/(?:requires\s+tool:|use\s+tool|execute\s+tool|tool:)\s*([a-zA-Z0-9_\-]+)/i);
        if (idMatch && idMatch[1]) {
          const requestedToolId = idMatch[1].trim();
          const exists = availableTools.some(t => t.id === requestedToolId);
          if (!exists) {
            throw new MissingCapabilityError(`Requested tool capability "${requestedToolId}" is not registered`);
          }
        }
      }
    }

    // Check specific keywords for missing standard tools
    const lowercaseGoal = goal.toLowerCase();
    if (lowercaseGoal.includes("calculator") || lowercaseGoal.includes("math")) {
      const mathToolExists = availableTools.some(t => t.id === "calculator" || t.permissions.includes("math_allowed"));
      if (!mathToolExists && lowercaseGoal.includes("requires math_allowed")) {
        throw new MissingCapabilityError("Requested math capability is missing");
      }
    }

    // 5. Generate Ordered Task Steps deterministically based on goal content
    const steps: TaskStep[] = [];

    if (lowercaseGoal.includes("math") || lowercaseGoal.includes("calculator") || lowercaseGoal.includes("calculate") || lowercaseGoal.includes("+")) {
      // Math flow plan
      steps.push({
        stepId: "step_0",
        name: "Analyze arithmetic expressions and parameters",
        status: "pending",
        logs: []
      });

      const calculatorTool = availableTools.find(t => t.id === "calculator");
      steps.push({
        stepId: "step_1",
        name: "Execute arithmetic calculations via Calculator Tool",
        status: "pending",
        toolId: calculatorTool ? calculatorTool.id : undefined,
        logs: []
      });

      steps.push({
        stepId: "step_2",
        name: "Verify calculated output and format report",
        status: "pending",
        logs: []
      });
    } else if (lowercaseGoal.includes("lint") || lowercaseGoal.includes("audit") || lowercaseGoal.includes("sre") || lowercaseGoal.includes("compliance")) {
      // Audit/SRE flow plan
      const auditTool = availableTools.find(t => t.id === "system_lint_audit" || t.id === "linter" || t.permissions.includes("sys_audit"));
      
      steps.push({
        stepId: "step_0",
        name: "Inspect configuration directory and source files",
        status: "pending",
        logs: []
      });

      steps.push({
        stepId: "step_1",
        name: "Invoke diagnostic audit linter tool",
        status: "pending",
        toolId: auditTool ? auditTool.id : undefined,
        logs: []
      });

      steps.push({
        stepId: "step_2",
        name: "Compile compliance report and mark task completed",
        status: "pending",
        logs: []
      });
    } else {
      // General fallback plan - match any tools matching keywords in the goal
      steps.push({
        stepId: "step_0",
        name: "Perform initial workspace analysis",
        status: "pending",
        logs: []
      });

      // Match available tools by looking for tool id or words in description in the goal
      let stepCounter = 1;
      for (const tool of availableTools) {
        if (lowercaseGoal.includes(tool.id.toLowerCase()) || 
            tool.name.toLowerCase().split(" ").some(word => word.length > 3 && lowercaseGoal.includes(word))) {
          steps.push({
            stepId: `step_${stepCounter++}`,
            name: `Execute operation using ${tool.name}`,
            status: "pending",
            toolId: tool.id,
            logs: []
          });
        }
      }

      steps.push({
        stepId: `step_${stepCounter}`,
        name: "Consolidate final task outcomes and verify outputs",
        status: "pending",
        logs: []
      });
    }

    // Publish PlanningCompleted event
    this.eventBus.publish({
      taskId,
      type: "PlanningCompleted",
      payload: {
        stepsCount: steps.length,
        planner_version: this.planner_version,
        stepsSummary: steps.map(s => ({
          id: s.stepId,
          name: s.name,
          toolId: s.toolId || null
        }))
      }
    });

    return steps;
  }

  /**
   * Helper DFS cycle-detection algorithm on symbols dependency graph.
   */
  private detectCycle(graph: Record<string, any>): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (node: string): boolean => {
      if (recStack.has(node)) {
        return true;
      }
      if (visited.has(node)) {
        return false;
      }

      visited.add(node);
      recStack.add(node);

      const neighbors = graph[node];
      if (Array.isArray(neighbors)) {
        for (const neighbor of neighbors) {
          if (typeof neighbor === "string" && dfs(neighbor)) {
            return true;
          }
        }
      } else if (neighbors && typeof neighbors === "object") {
        // Handle object representation (e.g. adjacent map or nested list)
        for (const neighbor of Object.keys(neighbors)) {
          if (dfs(neighbor)) {
            return true;
          }
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const node of Object.keys(graph)) {
      if (dfs(node)) {
        return true;
      }
    }

    return false;
  }
}
