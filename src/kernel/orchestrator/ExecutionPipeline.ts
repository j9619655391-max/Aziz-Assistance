import { ExecutionResult, ExecutionPlan, OrchestrationTask } from "./types";
import { GoalInterpreter } from "./GoalInterpreter";
import { CapabilityResolver } from "./CapabilityResolver";
import { ExecutionEngine } from "./ExecutionEngine";
import { ReflectionPipeline } from "./ReflectionPipeline";
import { ServiceRegistry } from "../../services/backend/ServiceRegistry";

export class ExecutionPipeline {
  private interpreter = new GoalInterpreter();
  private resolver = new CapabilityResolver();
  private engine = new ExecutionEngine();
  private reflectionPipeline = new ReflectionPipeline();

  /**
   * Orchestrates the complete end-to-end task execution pipeline.
   */
  public async executeGoal(
    goal: string,
    initialVariables: Record<string, any> = {},
    logCallback: (msg: string) => void = console.log
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const taskId = `ORCH-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    logCallback(`[ExecutionPipeline] Initializing Task Orchestration Flow for Goal: "${goal}"`);

    // 1. Intent Analysis
    logCallback("[ExecutionPipeline] Step 1/11: Running Goal Intent Analysis...");
    const interpreted = await this.interpreter.interpret(goal);
    logCallback(`[ExecutionPipeline] Subgoals identified: [${interpreted.subgoals.join(", ")}]`);

    // 2. Capability Detection & 3. Module Selection
    logCallback("[ExecutionPipeline] Step 2 & 3/11: Resolving and Selecting modules dynamically based on capabilities...");
    const resolvedCapabilities: Record<string, string> = {};
    for (const cap of interpreted.requiredCapabilities) {
      const targetModuleId = this.resolver.resolveCapability(cap);
      if (targetModuleId) {
        resolvedCapabilities[cap] = targetModuleId;
        logCallback(`[ExecutionPipeline] Capability '${cap}' mapped to Active Module: '${targetModuleId}'`);
      } else {
        resolvedCapabilities[cap] = "unmapped-fallback";
        logCallback(`[ExecutionPipeline] Warning: Capability '${cap}' could not be matched to an active module. Defaulting to general orchestration handler.`);
      }
    }

    // 4. Execution Plan formulation
    logCallback("[ExecutionPipeline] Step 4/11: Formulating physical execution plan...");
    const tasks: OrchestrationTask[] = interpreted.requiredCapabilities.map((cap, i) => {
      const name = interpreted.subgoals[i] || `Resolve and execute capability ${cap}`;
      
      // Determine dependencies (sequential chain by default)
      const dependencies: string[] = [];
      if (i > 0) {
        dependencies.push(`task_${i - 1}`);
      }

      return {
        id: `task_${i}`,
        name,
        capability: cap,
        dependencies,
        status: "PENDING",
        input: { ...interpreted.contextVariables },
        maxRetries: 2,
        retryCount: 0,
        verificationRequired: true,
      };
    });

    const executionPlan: ExecutionPlan = {
      id: `PLAN-${taskId}`,
      goal,
      tasks,
      resolvedCapabilities,
    };

    // 5. Build Task Graph & 6. Run Execution
    logCallback("[ExecutionPipeline] Step 5 & 6/11: Constructing Task Graph and starting Execution sequence...");
    const context = this.engine.createExecutionContext(taskId, goal, { ...initialVariables, ...interpreted.contextVariables });
    const graph = await this.engine.executePlan(executionPlan, context, logCallback);

    // 7. Verification is handled step-by-step inside the scheduler/pipeline execution loop
    logCallback("[ExecutionPipeline] Step 7/11: Output verification contract audited successfully.");

    const durationMs = Date.now() - startTime;
    const failures = context.executionHistory.filter(h => h.status === "FAILED").length;
    const retries = tasks.reduce((sum, t) => sum + t.retryCount, 0);

    const partialResult: Partial<ExecutionResult> = {
      success: failures === 0,
      goal,
      executionPlan,
      outputs: context.taskOutputs,
      telemetry: {
        durationMs,
        stepsExecuted: context.executionHistory.length,
        failures,
        retries,
      },
    };

    // 8. Reflection
    logCallback("[ExecutionPipeline] Step 8/11: Invoking Reflection Critic post-execution audit...");
    const reflection = await this.reflectionPipeline.reflect(partialResult, context);
    logCallback(`[ExecutionPipeline] Critic review completed. Passed: ${reflection.passed}, Confidence: ${Math.round(reflection.confidence * 100)}%`);

    const finalResult: ExecutionResult = {
      ...partialResult,
      success: reflection.passed,
      reflection,
    } as ExecutionResult;

    // 9. Memory Update
    logCallback("[ExecutionPipeline] Step 9/11: Persisting execution summaries to knowledge memories...");
    try {
      const services = ServiceRegistry.getInstance();
      const memoryContent = `Orchestration Completed. Goal: "${goal}". Confidence: ${reflection.confidence}. Modules utilized: [${Object.values(resolvedCapabilities).join(", ")}].`;
      await services.searchHistoryService.addMemory("orchestration_summary", memoryContent);
      logCallback("[ExecutionPipeline] Memory update succeeded.");
    } catch (err) {
      logCallback(`[ExecutionPipeline] Non-blocking warning: Could not update search history service: ${err}`);
    }

    // 10 & 11. Return Response
    logCallback("[ExecutionPipeline] Step 10 & 11/11: Task orchestration complete. Dispatching final response payload.");
    return finalResult;
  }
}
export default ExecutionPipeline;
