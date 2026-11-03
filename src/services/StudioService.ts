/**
 * @file /src/services/StudioService.ts
 * @description Type-safe frontend Studio Service Layer isolating the React UI from the Kernel API endpoints.
 * Enables local, dockerized, remote, or cloud deployment changes with zero UI ripple effects.
 */

export interface StudioTaskStep {
  stepId: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  durationMs?: number;
  logs?: string[];
  error?: string;
  toolId?: string;
}

export interface StudioTelemetry {
  tokensUsed: number;
  promptTokens: number;
  completionTokens: number;
  costInUSD: number;
  durationMs: number;
  toolInvocations: Record<string, number>;
}

export interface StudioTask {
  taskId: string;
  goal: string;
  status: "pending" | "planning" | "running" | "verification" | "reflection" | "completed" | "failed";
  activeStatus: string;
  steps: StudioTaskStep[];
  telemetry: StudioTelemetry;
  createdAt: string;
  updatedAt: string;
  planner_version?: string;
  context_policy_version?: string;
  verification_policy_version?: string;
  reflection_version?: string;
}

export interface StudioTool {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  riskLevel: "low" | "medium" | "high";
  timeoutMs: number;
  maxRetries: number;
  inputSchema: any;
  outputSchema: any;
}

export interface StudioAgent {
  id: string;
  name: string;
  description: string;
  capabilityTags: string[];
  maxExecutionTimeMs: number;
}

export class StudioService {
  /**
   * Translates a goal and selected context files into a structured ordered list of steps using the Planner.
   */
  public static async buildPlan(goal: string, contextFiles: string[] = []): Promise<{
    taskId: string;
    goal: string;
    steps: StudioTaskStep[];
    context: any;
    planner_version: string;
    context_policy_version: string;
  }> {
    const res = await fetch("/api/studio/planner/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, contextFiles })
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || "Failed to formulate plan from goal");
    }
    return await res.json();
  }

  /**
   * Compiles files into a compressed context using the Context Builder.
   */
  public static async compileContext(query: string, impactedFiles: string[] = []): Promise<any> {
    const res = await fetch("/api/studio/context/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, impactedFiles })
    });
    if (!res.ok) {
      throw new Error("Failed to compile workspace context");
    }
    return await res.json();
  }

  /**
   * Runs rule verification using the Verification Engine.
   */
  public static async runVerification(taskId: string, filePaths: string[] = []): Promise<any> {
    const res = await fetch("/api/studio/verification/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, filePaths })
    });
    if (!res.ok) {
      throw new Error("Failed to run rules verification");
    }
    return await res.json();
  }

  /**
   * Analyzes goal results and scorecards using the Reflection Engine.
   */
  public static async runReflection(
    taskId: string,
    goal: string,
    result: string,
    verificationReport?: any
  ): Promise<any> {
    const res = await fetch("/api/studio/reflection/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, goal, result, verificationReport })
    });
    if (!res.ok) {
      throw new Error("Failed to execute outcome critique review");
    }
    return await res.json();
  }

  /**
   * Triggers E2E asynchronous task execution under the specified agent.
   */
  public static async executeTask(goal: string, agentId?: string): Promise<{
    taskId: string;
    goal: string;
    status: string;
    steps: StudioTaskStep[];
  }> {
    const res = await fetch("/api/studio/task/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, agentId })
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || "Failed to launch E2E task execution pipeline");
    }
    return await res.json();
  }

  /**
   * Fetches the current state of a task.
   */
  public static async getTask(id: string): Promise<StudioTask> {
    const res = await fetch(`/api/studio/task/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to retrieve state for Task ${id}`);
    }
    return await res.json();
  }

  /**
   * Lists all historical or active task records.
   */
  public static async listTasks(): Promise<{ tasks: StudioTask[] }> {
    const res = await fetch("/api/studio/tasks");
    if (!res.ok) {
      throw new Error("Failed to fetch task records");
    }
    return await res.json();
  }

  /**
   * Fetches global and aggregated telemetry counters.
   */
  public static async getTelemetry(): Promise<{
    runtime: {
      totalExecutions: number;
      successfulExecutions: number;
      failedExecutions: number;
      cancelledExecutions: number;
      timedOutExecutions: number;
      totalDurationMs: number;
      averageDurationMs: number;
      tokensConsumed: number;
      costInUSD: number;
    };
    aggregated: {
      totalTokens: number;
      totalCost: number;
      totalDuration: number;
      toolCounts: Record<string, number>;
    };
  }> {
    const res = await fetch("/api/studio/telemetry");
    if (!res.ok) {
      throw new Error("Failed to retrieve telemetry");
    }
    return await res.json();
  }

  /**
   * Lists all registered machine capabilities.
   */
  public static async listTools(): Promise<{ tools: StudioTool[] }> {
    const res = await fetch("/api/studio/tools");
    if (!res.ok) {
      throw new Error("Failed to list tool schemas");
    }
    return await res.json();
  }

  /**
   * Lists all registered autonomous agent profiles.
   */
  public static async listAgents(): Promise<{ agents: StudioAgent[] }> {
    const res = await fetch("/api/studio/agents");
    if (!res.ok) {
      throw new Error("Failed to retrieve agent catalog");
    }
    return await res.json();
  }
}
