import { OrchestrationTask, OrchestrationExecutionContext, TaskGraph } from "./types";
import { DependencyResolver } from "./DependencyResolver";
import { TaskCoordinator } from "./TaskCoordinator";
import { VerificationPipeline } from "./VerificationPipeline";

export class TaskScheduler {
  private dependencyResolver = new DependencyResolver();
  private coordinator = new TaskCoordinator();
  private verificationPipeline = new VerificationPipeline();

  /**
   * Schedules and executes all nodes in the TaskGraph.
   */
  public async executeGraph(
    graph: TaskGraph,
    context: OrchestrationExecutionContext,
    logCallback: (msg: string) => void
  ): Promise<void> {
    // 1. Resolve linear/parallel execution order
    const batches = this.dependencyResolver.calculateExecutionOrder(graph);
    logCallback(`[TaskScheduler] Execution batches calculated: ${batches.length} sequential steps.`);

    // 2. Walk through batches in sequence
    for (let bIndex = 0; bIndex < batches.length; bIndex++) {
      const batch = batches[bIndex];
      logCallback(`[TaskScheduler] Running Batch ${bIndex + 1}/${batches.length} in parallel: [${batch.join(", ")}]`);

      const batchPromises = batch.map(async (taskId) => {
        const task = graph.tasks.get(taskId);
        if (!task) return;

        // Verify conditional gates
        if (task.conditionalExpression) {
          const check = task.conditionalExpression(context);
          if (!check) {
            task.status = "SKIPPED";
            logCallback(`[TaskScheduler] Task '${task.name}' (${taskId}) skipped via conditional expression.`);
            return;
          }
        }

        task.status = "RUNNING";
        const startTime = Date.now();
        logCallback(`[TaskScheduler] Task started: '${task.name}' using capability '${task.capability}'`);

        let taskSuccess = false;
        let lastError = "";

        // Execute task with retry loop
        while (task.retryCount <= task.maxRetries && !taskSuccess) {
          try {
            if (task.retryCount > 0) {
              logCallback(`[TaskScheduler] Retrying Task '${task.name}' (Attempt ${task.retryCount}/${task.maxRetries})...`);
            }

            const output = await this.coordinator.executeTask(task, context);
            task.output = output;

            // Safely assign output to context.variables without reassigning reference to prevent concurrency race conditions
            context.taskOutputs[taskId] = output;
            if (output && typeof output === "object") {
              Object.assign(context.variables, output);
            }

            // Handle Verification
            if (task.verificationRequired) {
              const verifyRes = await this.verificationPipeline.verifyTaskOutput(task, context);
              task.verificationPassed = verifyRes.passed;
              for (const log of verifyRes.logs) {
                logCallback(log);
              }
              if (!verifyRes.passed) {
                throw new Error("Task verification failed contract audit.");
              }
            }

            taskSuccess = true;
            task.status = "COMPLETED";
            logCallback(`[TaskScheduler] Task completed successfully: '${task.name}'`);
          } catch (err: any) {
            task.retryCount++;
            lastError = err.message || String(err);
            logCallback(`[TaskScheduler] Warning: Task '${task.name}' failed on attempt ${task.retryCount}: ${lastError}`);
          }
        }

        const durationMs = Date.now() - startTime;

        // Check fallback if retries exceeded
        if (!taskSuccess) {
          task.status = "FAILED";
          task.error = lastError;
          logCallback(`[TaskScheduler] Task FAILED: '${task.name}' after ${task.maxRetries} retries. Error: ${lastError}`);

          if (task.fallbackTaskId) {
            logCallback(`[TaskScheduler] Activating fallback task node: '${task.fallbackTaskId}' for failed task '${taskId}'`);
            const fallbackTask = graph.tasks.get(task.fallbackTaskId);
            if (fallbackTask) {
              // Mark fallback task ready and execute with cycle tracking
              fallbackTask.dependencies = [];
              const executedFallbacks = new Set<string>([taskId]);
              await this.executeSingleTask(fallbackTask, context, logCallback, executedFallbacks);
            }
          }
        }

        // Record execution timeline metrics
        context.executionHistory.push({
          taskId,
          capability: task.capability,
          status: task.status,
          durationMs,
        });
      });

      // Await all parallel tasks in the current batch to complete
      await Promise.all(batchPromises);
    }
  }

  /**
   * Helper to execute a single fallback task out of order with cycle protection.
   */
  private async executeSingleTask(
    task: OrchestrationTask,
    context: OrchestrationExecutionContext,
    logCallback: (msg: string) => void,
    executedFallbacks: Set<string> = new Set()
  ): Promise<void> {
    if (executedFallbacks.has(task.id)) {
      logCallback(`[TaskScheduler] Cycle Guard: Skipping execution of fallback task '${task.id}' to prevent recursive loop cycle.`);
      return;
    }
    executedFallbacks.add(task.id);

    task.status = "RUNNING";
    const startTime = Date.now();
    try {
      const output = await this.coordinator.executeTask(task, context);
      task.output = output;
      task.status = "COMPLETED";
      context.taskOutputs[task.id] = output;
      if (output && typeof output === "object") {
        Object.assign(context.variables, output);
      }
      logCallback(`[TaskScheduler] Fallback task completed successfully: '${task.name}'`);
    } catch (err: any) {
      task.status = "FAILED";
      task.error = err.message || String(err);
      logCallback(`[TaskScheduler] Fallback task node failed: '${task.name}'. Error: ${task.error}`);

      if (task.fallbackTaskId) {
        if (executedFallbacks.has(task.fallbackTaskId)) {
          logCallback(`[TaskScheduler] Cycle Guard: Secondary fallback task '${task.fallbackTaskId}' already executed in chain. Halting loop.`);
        } else {
          const nextFallback = context.taskOutputs ? undefined : undefined; // Guard check
          logCallback(`[TaskScheduler] Secondary fallback requested: '${task.fallbackTaskId}'`);
        }
      }
    }

    context.executionHistory.push({
      taskId: task.id,
      capability: task.capability,
      status: task.status,
      durationMs: Date.now() - startTime,
    });
  }
}
export default TaskScheduler;
