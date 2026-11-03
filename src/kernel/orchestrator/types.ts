export type OrchestrationTaskStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED"
  | "RETRES_EXCEEDED";

export interface OrchestrationTask {
  id: string;
  name: string;
  capability: string; // Dynamic capability required e.g. "JOB_SEARCH", "RESUME_ANALYSIS"
  dependencies: string[]; // IDs of other tasks that must complete first
  status: OrchestrationTaskStatus;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  maxRetries: number;
  retryCount: number;
  verificationRequired: boolean;
  verificationPassed?: boolean;
  conditionalExpression?: (context: OrchestrationExecutionContext) => boolean;
  fallbackTaskId?: string; // Execute this if the current task fails after retries
}

export interface TaskGraph {
  tasks: Map<string, OrchestrationTask>;
  dependencyGraph: Record<string, string[]>; // taskId -> dependentTaskIds
}

export interface ExecutionPlan {
  id: string;
  goal: string;
  tasks: OrchestrationTask[];
  resolvedCapabilities: Record<string, string>; // capability -> moduleId
}

export interface OrchestrationExecutionContext {
  taskId: string;
  goal: string;
  variables: Record<string, any>;
  taskOutputs: Record<string, any>;
  executionHistory: {
    taskId: string;
    capability: string;
    status: OrchestrationTaskStatus;
    durationMs: number;
  }[];
}

export interface ExecutionResult {
  success: boolean;
  goal: string;
  executionPlan: ExecutionPlan;
  outputs: Record<string, any>;
  telemetry: {
    durationMs: number;
    stepsExecuted: number;
    failures: number;
    retries: number;
  };
  reflection: {
    passed: boolean;
    confidence: number;
    reasoning: string;
    suggestions: string[];
  };
}

export interface ICapabilityResolver {
  resolveCapability(capability: string): string | null; // Returns Module ID or null
  getSupportedCapabilities(): string[];
}

export interface IGoalInterpreter {
  interpret(goal: string): Promise<{
    subgoals: string[];
    requiredCapabilities: string[];
    contextVariables: Record<string, any>;
  }>;
}

export interface IDependencyResolver {
  calculateExecutionOrder(graph: TaskGraph): string[][]; // Array of parallel task ID batches
  detectCycles(graph: TaskGraph): boolean;
}

export interface IVerificationPipeline {
  verifyTaskOutput(task: OrchestrationTask, context: OrchestrationExecutionContext): Promise<{
    passed: boolean;
    logs: string[];
  }>;
}

export interface IReflectionPipeline {
  reflect(
    result: Partial<ExecutionResult>,
    context: OrchestrationExecutionContext
  ): Promise<{
    passed: boolean;
    confidence: number;
    reasoning: string;
    suggestions: string[];
  }>;
}
