import { OrchestrationTask, TaskGraph, OrchestrationExecutionContext, ExecutionPlan } from "./types";
import { TaskScheduler } from "./TaskScheduler";

export class ExecutionEngine {
  private scheduler = new TaskScheduler();

  /**
   * Initializes a task graph structure from an execution plan.
   */
  public buildGraph(plan: ExecutionPlan): TaskGraph {
    const tasksMap = new Map<string, OrchestrationTask>();
    const dependencyGraph: Record<string, string[]> = {};

    for (const t of plan.tasks) {
      tasksMap.set(t.id, t);
      dependencyGraph[t.id] = t.dependencies;
    }

    return {
      tasks: tasksMap,
      dependencyGraph,
    };
  }

  /**
   * Creates an empty, isolated execution context container.
   */
  public createExecutionContext(taskId: string, goal: string, initialVariables: Record<string, any> = {}): OrchestrationExecutionContext {
    return {
      taskId,
      goal,
      variables: initialVariables,
      taskOutputs: {},
      executionHistory: [],
    };
  }

  /**
   * Dispatches the plan execution through the built task graph.
   */
  public async executePlan(
    plan: ExecutionPlan,
    context: OrchestrationExecutionContext,
    logCallback: (msg: string) => void
  ): Promise<TaskGraph> {
    const graph = this.buildGraph(plan);
    logCallback(`[ExecutionEngine] Successfully compiled TaskGraph with ${plan.tasks.length} active nodes.`);
    await this.scheduler.executeGraph(graph, context, logCallback);
    return graph;
  }
}
export default ExecutionEngine;
