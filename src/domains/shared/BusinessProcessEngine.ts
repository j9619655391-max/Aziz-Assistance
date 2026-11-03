/**
 * @file /src/domains/shared/BusinessProcessEngine.ts
 * @description Configurable, domain-agnostic Business Process Engine (BPE).
 * Provides sequential/parallel orchestration, conditional branching, pause/resume,
 * retry mechanics, versioning, and high-fidelity audit tracking.
 */

export type StageType = "SEQUENTIAL" | "PARALLEL" | "CONDITIONAL";

export interface StageDefinition {
  id: string;
  name: string;
  type?: StageType;
  // Sub-stage IDs to execute in parallel when type is PARALLEL
  parallelStages?: string[];
  // Executable business handler that operates on dynamic context
  handler?: (context: Record<string, any>) => Promise<any> | any;
  // Dynamic rules or conditions that must be satisfied before starting this stage
  preConditions?: Array<{
    id: string;
    description: string;
    evaluate: (context: Record<string, any>) => boolean;
  }>;
  maxRetries?: number;
}

export interface TransitionDefinition {
  fromStageId: string;
  toStageId: string;
  // Optional branching condition based on process context and previous stage outputs
  condition?: (context: Record<string, any>, stageOutput: any) => boolean;
}

export interface ProcessDefinition {
  id: string;
  name: string;
  version: number;
  startStageId: string;
  stages: StageDefinition[];
  transitions: TransitionDefinition[];
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  stageId?: string;
  details: string;
  contextSnapshot?: Record<string, any>;
}

export type ProcessStatus = "CREATED" | "RUNNING" | "PAUSED" | "CANCELLED" | "COMPLETED" | "FAILED";

export interface ProcessInstance {
  instanceId: string;
  definitionId: string;
  version: number;
  status: ProcessStatus;
  currentStageId?: string;
  activeParallelStageIds?: string[];
  context: Record<string, any>;
  auditTrail: AuditEntry[];
  startTime: string;
  endTime?: string;
  lastError?: string;
}

export class BusinessProcessEngine {
  // Safe, thread-safe in-memory stores for definitions and executing instances
  private static definitions: Map<string, ProcessDefinition[]> = new Map();
  private static instances: Map<string, ProcessInstance> = new Map();

  /**
   * Resets the entire registry. Perfect for clean unit testing isolation.
   */
  public static resetRegistry(): void {
    BusinessProcessEngine.definitions.clear();
    BusinessProcessEngine.instances.clear();
  }

  /**
   * Registers or updates a process definition. Versioning is fully supported.
   */
  public registerDefinition(definition: ProcessDefinition): void {
    if (!definition.id || !definition.name || !definition.startStageId) {
      throw new Error("Invalid Process Definition: must contain 'id', 'name', and 'startStageId'.");
    }

    const list = BusinessProcessEngine.definitions.get(definition.id) || [];
    // Remove if same version already exists to prevent duplicates
    const filtered = list.filter(d => d.version !== definition.version);
    filtered.push(definition);
    // Sort versions descending so we can easily resolve the latest version
    filtered.sort((a, b) => b.version - a.version);
    BusinessProcessEngine.definitions.set(definition.id, filtered);
  }

  /**
   * Resolves a registered process definition. Defaults to latest version if not specified.
   */
  public getDefinition(id: string, version?: number): ProcessDefinition | undefined {
    const list = BusinessProcessEngine.definitions.get(id);
    if (!list || list.length === 0) return undefined;
    if (version !== undefined) {
      return list.find(d => d.version === version);
    }
    return list[0]; // Latest version
  }

  /**
   * Retrieves an executing process instance state.
   */
  public getInstance(instanceId: string): ProcessInstance | undefined {
    return BusinessProcessEngine.instances.get(instanceId);
  }

  /**
   * Spawns a new process instance and begins execution.
   */
  public async startProcess(
    definitionId: string,
    initialContext: Record<string, any> = {},
    version?: number
  ): Promise<ProcessInstance> {
    const definition = this.getDefinition(definitionId, version);
    if (!definition) {
      throw new Error(`Process definition not found: id='${definitionId}', version='${version || "latest"}'`);
    }

    const instanceId = `inst_${definitionId}_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    
    // Deep clone the initial context to maintain strict statelessness/isolation
    const context = JSON.parse(JSON.stringify(initialContext));
    context.instanceId = instanceId;
    if (!context.stageOutputs) {
      context.stageOutputs = {};
    }

    const instance: ProcessInstance = {
      instanceId,
      definitionId: definition.id,
      version: definition.version,
      status: "CREATED",
      currentStageId: definition.startStageId,
      context,
      auditTrail: [],
      startTime: new Date().toISOString()
    };

    this.logAudit(instance, "PROCESS_STARTED", `Initialized process flow '${definition.name}' v${definition.version}`);
    BusinessProcessEngine.instances.set(instanceId, instance);

    // Trigger execution loop asynchronously/statelessly
    instance.status = "RUNNING";
    this.executeLoop(instance, definition).catch(err => {
      console.error(`BPE Unhandled execution error on instance ${instanceId}:`, err);
    });

    return instance;
  }

  /**
   * Pauses an active, running process instance safely.
   */
  public async pauseProcess(instanceId: string): Promise<ProcessInstance> {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new Error(`Process instance not found: ${instanceId}`);
    }

    if (instance.status !== "RUNNING") {
      throw new Error(`Cannot pause process instance with status: ${instance.status}`);
    }

    instance.status = "PAUSED";
    this.logAudit(instance, "PROCESS_PAUSED", "Process execution explicitly paused by recruiter/system request.");
    return instance;
  }

  /**
   * Resumes a paused process instance from its saved staging state.
   */
  public async resumeProcess(instanceId: string): Promise<ProcessInstance> {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new Error(`Process instance not found: ${instanceId}`);
    }

    if (instance.status !== "PAUSED") {
      throw new Error(`Cannot resume process instance with status: ${instance.status}`);
    }

    const definition = this.getDefinition(instance.definitionId, instance.version);
    if (!definition) {
      throw new Error(`Definition lost or corrupted for resuming instance: ${instanceId}`);
    }

    instance.status = "RUNNING";
    this.logAudit(instance, "PROCESS_RESUMED", "Process execution resumed from pause checkpoint.");

    // Pick up execution loop
    this.executeLoop(instance, definition).catch(err => {
      console.error(`BPE Unhandled execution error on resumed instance ${instanceId}:`, err);
    });

    return instance;
  }

  /**
   * Cancels a process instance, halting any further progression.
   */
  public async cancelProcess(instanceId: string): Promise<ProcessInstance> {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new Error(`Process instance not found: ${instanceId}`);
    }

    if (instance.status === "COMPLETED" || instance.status === "CANCELLED") {
      throw new Error(`Cannot cancel finished process instance. Current status: ${instance.status}`);
    }

    instance.status = "CANCELLED";
    instance.endTime = new Date().toISOString();
    this.logAudit(instance, "PROCESS_CANCELLED", "Process execution cancelled.");
    return instance;
  }

  /**
   * Retries a failed stage, restoring running status.
   */
  public async retryStage(instanceId: string, stageId: string): Promise<ProcessInstance> {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new Error(`Process instance not found: ${instanceId}`);
    }

    if (instance.status !== "FAILED") {
      throw new Error(`Can only retry stages for failed instances. Current status: ${instance.status}`);
    }

    if (instance.currentStageId !== stageId && !instance.activeParallelStageIds?.includes(stageId)) {
      throw new Error(`Requested stage '${stageId}' is not the active/failed stage on this instance.`);
    }

    const definition = this.getDefinition(instance.definitionId, instance.version);
    if (!definition) {
      throw new Error(`Definition lost or corrupted for retrying instance: ${instanceId}`);
    }

    instance.status = "RUNNING";
    instance.lastError = undefined;
    this.logAudit(instance, "STAGE_RETRY_INITIATED", `Retrying failed stage execution: '${stageId}'`);

    // Pick up execution loop starting specifically with the retried stage
    this.executeLoop(instance, definition, stageId).catch(err => {
      console.error(`BPE Unhandled execution error on retried instance ${instanceId}:`, err);
    });

    return instance;
  }

  // ==========================================
  // CORE ENGINE RUNTIME EXECUTION LOOP
  // ==========================================

  private async executeLoop(
    instance: ProcessInstance,
    definition: ProcessDefinition,
    forceResumeStageId?: string
  ): Promise<void> {
    let currentStageId = forceResumeStageId || instance.currentStageId;
    let executionCycleCount = 0;
    const MAX_EXECUTION_CYCLES = 200;

    while (instance.status === "RUNNING" && currentStageId) {
      executionCycleCount++;
      if (executionCycleCount > MAX_EXECUTION_CYCLES) {
        instance.status = "FAILED";
        instance.lastError = `Process execution halted: Exceeded maximum allowed transition cycles (${MAX_EXECUTION_CYCLES}). Potential infinite transition loop detected.`;
        instance.endTime = new Date().toISOString();
        this.logAudit(instance, "EXECUTION_CYCLE_LIMIT_EXCEEDED", instance.lastError);
        return;
      }

      instance.currentStageId = currentStageId;
      const stage = definition.stages.find(s => s.id === currentStageId);

      if (!stage) {
        instance.status = "FAILED";
        instance.lastError = `Stage definition not found for ID: ${currentStageId}`;
        instance.endTime = new Date().toISOString();
        this.logAudit(instance, "EXECUTION_ERROR", instance.lastError);
        return;
      }

      // Check pre-conditions before running the stage
      if (stage.preConditions && stage.preConditions.length > 0) {
        this.logAudit(instance, "CHECKING_PRECONDITIONS", `Evaluating ${stage.preConditions.length} pre-conditions for stage '${stage.name}'`);
        const failedCondition = stage.preConditions.find(cond => !cond.evaluate(instance.context));
        
        if (failedCondition) {
          instance.status = "FAILED";
          instance.lastError = `Pre-condition check failed for stage '${stage.name}': ${failedCondition.description}`;
          instance.endTime = new Date().toISOString();
          this.logAudit(instance, "PRECONDITION_FAILURE", instance.lastError);
          return;
        }
        this.logAudit(instance, "PRECONDITIONS_PASSED", `All pre-conditions satisfied for stage '${stage.name}'`);
      }

      // Execute the stage work with retry and parallel safeguards
      let stageOutput: any = null;
      let stageSuccess = false;
      let attempt = 0;
      const maxAttempts = (stage.maxRetries || 0) + 1;

      while (attempt < maxAttempts && !stageSuccess && instance.status === "RUNNING") {
        attempt++;
        const startTime = Date.now();
        this.logAudit(
          instance,
          "STAGE_START",
          `Starting stage '${stage.name}' (${stage.type || "SEQUENTIAL"}) - Attempt ${attempt}/${maxAttempts}`,
          stage.id
        );

        try {
          if (stage.type === "PARALLEL") {
            stageOutput = await this.executeParallelStages(instance, stage, definition);
          } else {
            // SEQUENTIAL or CONDITIONAL
            if (stage.handler) {
              stageOutput = await stage.handler(instance.context);
            }
          }

          const durationMs = Date.now() - startTime;
          stageSuccess = true;
          
          // Store output in dynamic shared context
          instance.context.stageOutputs[stage.id] = stageOutput;

          this.logAudit(
            instance,
            "STAGE_COMPLETED",
            `Successfully completed stage '${stage.name}' in ${durationMs}ms`,
            stage.id
          );
        } catch (err: any) {
          const durationMs = Date.now() - startTime;
          const errMsg = err.message || String(err);
          
          this.logAudit(
            instance,
            "STAGE_FAILED",
            `Stage '${stage.name}' failed on attempt ${attempt} in ${durationMs}ms: ${errMsg}`,
            stage.id
          );

          if (attempt >= maxAttempts) {
            instance.status = "FAILED";
            instance.lastError = errMsg;
            instance.endTime = new Date().toISOString();
            this.logAudit(
              instance,
              "PROCESS_FAILED",
              `Process execution halted. Max retries exceeded on stage '${stage.name}'`,
              stage.id
            );
            return;
          }
        }
      }

      // STEP 3: Handle stage transition/branching logic
      const outgoingTransitions = definition.transitions.filter(t => t.fromStageId === currentStageId);

      if (outgoingTransitions.length === 0) {
        // No outgoing transitions -> End of process
        instance.status = "COMPLETED";
        instance.endTime = new Date().toISOString();
        this.logAudit(instance, "PROCESS_COMPLETED", `Process finished successfully. Flow completed.`);
        return;
      }

      // Evaluate transition branching rules
      let matchedTransition: TransitionDefinition | undefined = undefined;

      for (const trans of outgoingTransitions) {
        if (!trans.condition) {
          matchedTransition = trans; // Default transition (unconditional)
          break;
        }
        try {
          if (trans.condition(instance.context, stageOutput)) {
            matchedTransition = trans;
            break;
          }
        } catch (condErr: any) {
          this.logAudit(
            instance,
            "TRANSITION_CONDITION_ERROR",
            `Error evaluating condition from '${trans.fromStageId}' to '${trans.toStageId}': ${condErr.message || condErr}`
          );
        }
      }

      if (matchedTransition) {
        this.logAudit(
          instance,
          "TRANSITION_TRIGGERED",
          `Transitioning from stage '${currentStageId}' to '${matchedTransition.toStageId}'`
        );
        currentStageId = matchedTransition.toStageId;
        instance.currentStageId = currentStageId;
      } else {
        // No match found -> Gracefully complete or fail
        instance.status = "COMPLETED";
        instance.endTime = new Date().toISOString();
        this.logAudit(
          instance,
          "PROCESS_COMPLETED",
          `Process flow completed. No matching outgoing transitions found from stage '${currentStageId}'`
        );
        return;
      }

      // If the workflow was paused or cancelled, abort progression cleanly
      if (instance.status !== "RUNNING") {
        return;
      }
    }
  }

  /**
   * Helper that executes parallel child stages concurrently and joins outputs.
   */
  private async executeParallelStages(
    instance: ProcessInstance,
    parentStage: StageDefinition,
    definition: ProcessDefinition
  ): Promise<Record<string, any>> {
    const subStageIds = parentStage.parallelStages || [];
    if (subStageIds.length === 0) {
      return {};
    }

    instance.activeParallelStageIds = [...subStageIds];
    this.logAudit(
      instance,
      "PARALLEL_GROUP_START",
      `Executing ${subStageIds.length} sub-stages in parallel: [${subStageIds.join(", ")}]`
    );

    const promises = subStageIds.map(async id => {
      const subStage = definition.stages.find(s => s.id === id);
      if (!subStage) {
        throw new Error(`Parallel sub-stage definition missing: ${id}`);
      }

      const start = Date.now();
      this.logAudit(instance, "SUB_STAGE_START", `Starting parallel sub-stage: '${subStage.name}'`, id);

      if (subStage.handler) {
        const out = await subStage.handler(instance.context);
        this.logAudit(
          instance,
          "SUB_STAGE_COMPLETED",
          `Parallel sub-stage '${subStage.name}' finished in ${Date.now() - start}ms`,
          id
        );
        return { id, output: out };
      }

      return { id, output: null };
    });

    const results = await Promise.all(promises);
    instance.activeParallelStageIds = undefined;

    // Collate all sub-stage outputs into a structured results dictionary
    const combinedOutput: Record<string, any> = {};
    results.forEach(res => {
      combinedOutput[res.id] = res.output;
      instance.context.stageOutputs[res.id] = res.output;
    });

    return combinedOutput;
  }

  /**
   * Formats and logs an execution event into the process instance audit log.
   */
  private logAudit(
    instance: ProcessInstance,
    action: string,
    details: string,
    stageId?: string
  ): void {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      action,
      stageId,
      details,
      contextSnapshot: JSON.parse(JSON.stringify(instance.context)) // Safe deep copy of context state
    };
    instance.auditTrail.push(entry);
    console.log(`[BPE] [${instance.instanceId}] [${action}] ${details}`);
  }
}
