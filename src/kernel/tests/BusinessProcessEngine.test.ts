/**
 * @file /src/kernel/tests/BusinessProcessEngine.test.ts
 * @description Thorough test suite validating BusinessProcessEngine sequential execution, parallel stages,
 * conditional branching, pause/resume mechanisms, retry logic, cancellation, audit trails, and concurrency.
 */

import { BusinessProcessEngine, ProcessDefinition, StageDefinition, ProcessInstance } from "../../domains/shared/BusinessProcessEngine";

// Mini assert utility
const assert = {
  ok: (val: any, msg?: string) => {
    if (!val) throw new Error(`${msg || "Assertion failed"}: expected truthy, got ${val}`);
  },
  equal: (a: any, b: any, msg?: string) => {
    if (a !== b) throw new Error(`${msg || "Assertion failed"}: ${a} !== ${b}`);
  },
  deepEqual: (a: any, b: any, msg?: string) => {
    const sj = JSON.stringify(a);
    const tj = JSON.stringify(b);
    if (sj !== tj) throw new Error(`${msg || "Assertion failed"}: ${sj} !== ${tj}`);
  }
};

class TestSuite {
  private total = 0;
  private passed = 0;
  private failed = 0;

  public async run(name: string, fn: () => Promise<void>) {
    this.total++;
    try {
      await fn();
      this.passed++;
      console.log(`  ✅ [PASS] ${name}`);
    } catch (err: any) {
      this.failed++;
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Reason: ${err.message || err}`);
      if (err.stack) {
        console.error(`     ${err.stack.split("\n").slice(1, 4).join("\n")}`);
      }
    }
  }

  public report() {
    console.log(`\n===================================================`);
    console.log(`Business Process Engine Test Completed: ${this.passed}/${this.total} scenarios passed.`);
    console.log(`===================================================`);
    if (this.failed > 0) {
      throw new Error(`TestSuite failed with ${this.failed} assertion errors.`);
    }
  }
}

// Helper utility to sleep for a given millisecond duration
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runBPETests() {
  console.log(`===================================================`);
  console.log(`      BUSINESS PROCESS ENGINE REGRESSION TESTS     `);
  console.log(`===================================================`);

  const suite = new TestSuite();
  const engine = new BusinessProcessEngine();

  // Scenario 1: Sequential Stage Execution Correctness
  await suite.run("Sequential execution correctness and state tracking", async () => {
    BusinessProcessEngine.resetRegistry();

    const definition: ProcessDefinition = {
      id: "seq-workflow-1",
      name: "Sequential Addition & Multiplication Flow",
      version: 1,
      startStageId: "stage_init",
      stages: [
        {
          id: "stage_init",
          name: "Initialize Value",
          handler: (ctx) => {
            ctx.value = 10;
            return { initialized: true };
          }
        },
        {
          id: "stage_mult",
          name: "Multiply Value by 3",
          handler: (ctx) => {
            ctx.value = ctx.value * 3;
            return { multiplier: 3 };
          }
        },
        {
          id: "stage_add",
          name: "Add Constant 15",
          handler: (ctx) => {
            ctx.value = ctx.value + 15;
            return { added: 15 };
          }
        }
      ],
      transitions: [
        { fromStageId: "stage_init", toStageId: "stage_mult" },
        { fromStageId: "stage_mult", toStageId: "stage_add" }
      ]
    };

    engine.registerDefinition(definition);

    const instance = await engine.startProcess("seq-workflow-1", {});
    assert.equal(instance.status, "RUNNING");

    // Wait until completion
    while (instance.status === "RUNNING") {
      await sleep(10);
    }

    assert.equal(instance.status, "COMPLETED");
    assert.equal(instance.context.value, 45, "Expected (10 * 3) + 15 = 45");
    assert.ok(instance.context.stageOutputs.stage_init.initialized);
    assert.equal(instance.context.stageOutputs.stage_mult.multiplier, 3);
    assert.equal(instance.context.stageOutputs.stage_add.added, 15);
  });

  // Scenario 2: Parallel Stage Group Join Correctness
  await suite.run("Parallel stages concurrent execution and result collation", async () => {
    BusinessProcessEngine.resetRegistry();

    const definition: ProcessDefinition = {
      id: "parallel-workflow",
      name: "Parallel Aggregator Flow",
      version: 1,
      startStageId: "stage_parallel_parent",
      stages: [
        {
          id: "stage_parallel_parent",
          name: "Parallel Execution Parent",
          type: "PARALLEL",
          parallelStages: ["sub_stage_a", "sub_stage_b", "sub_stage_c"]
        },
        {
          id: "sub_stage_a",
          name: "Sub Stage Alpha",
          handler: async () => {
            await sleep(20);
            return "alpha_data";
          }
        },
        {
          id: "sub_stage_b",
          name: "Sub Stage Beta",
          handler: async () => {
            await sleep(10);
            return "beta_data";
          }
        },
        {
          id: "sub_stage_c",
          name: "Sub Stage Gamma",
          handler: async () => {
            return "gamma_data";
          }
        },
        {
          id: "stage_final",
          name: "Collate and Finalize",
          handler: (ctx) => {
            const outputs = ctx.stageOutputs["stage_parallel_parent"];
            ctx.summary = `${outputs.sub_stage_a}_${outputs.sub_stage_b}_${outputs.sub_stage_c}`;
          }
        }
      ],
      transitions: [
        { fromStageId: "stage_parallel_parent", toStageId: "stage_final" }
      ]
    };

    engine.registerDefinition(definition);

    const instance = await engine.startProcess("parallel-workflow", {});
    
    // Wait until completion
    while (instance.status === "RUNNING") {
      await sleep(10);
    }

    assert.equal(instance.status, "COMPLETED");
    assert.equal(instance.context.summary, "alpha_data_beta_data_gamma_data");
    assert.equal(instance.context.stageOutputs.sub_stage_a, "alpha_data");
    assert.equal(instance.context.stageOutputs.sub_stage_b, "beta_data");
    assert.equal(instance.context.stageOutputs.sub_stage_c, "gamma_data");
  });

  // Scenario 3: Conditional Branching Logic
  await suite.run("Conditional branching evaluation", async () => {
    BusinessProcessEngine.resetRegistry();

    const makeDefinition = (id: string): ProcessDefinition => ({
      id,
      name: "Risk and Matching router",
      version: 1,
      startStageId: "evaluate_candidate",
      stages: [
        {
          id: "evaluate_candidate",
          name: "Analyze Candidate Experience",
          handler: (ctx) => {
            return { experienceYears: ctx.experience };
          }
        },
        {
          id: "high_bracket",
          name: "Shortlist for Principal Roles",
          handler: (ctx) => {
            ctx.outcome = "PRINCIPAL";
          }
        },
        {
          id: "mid_bracket",
          name: "Shortlist for Standard Roles",
          handler: (ctx) => {
            ctx.outcome = "STANDARD";
          }
        }
      ],
      transitions: [
        {
          fromStageId: "evaluate_candidate",
          toStageId: "high_bracket",
          condition: (ctx, output) => output.experienceYears >= 10
        },
        {
          fromStageId: "evaluate_candidate",
          toStageId: "mid_bracket",
          condition: (ctx, output) => output.experienceYears < 10
        }
      ]
    });

    engine.registerDefinition(makeDefinition("branch-wf-1"));

    // Case A: Higher Bracket (> 10 years)
    const instHigh = await engine.startProcess("branch-wf-1", { experience: 12 });
    while (instHigh.status === "RUNNING") await sleep(5);
    assert.equal(instHigh.status, "COMPLETED");
    assert.equal(instHigh.context.outcome, "PRINCIPAL");

    // Case B: Mid/Lower Bracket (< 10 years)
    const instLow = await engine.startProcess("branch-wf-1", { experience: 6 });
    while (instLow.status === "RUNNING") await sleep(5);
    assert.equal(instLow.status, "COMPLETED");
    assert.equal(instLow.context.outcome, "STANDARD");
  });

  // Scenario 4: Pause and Resume Capabilities
  await suite.run("Process flow pausing and resumption from checkpoint", async () => {
    BusinessProcessEngine.resetRegistry();

    let activeInstanceId: string = "";
    const definition: ProcessDefinition = {
      id: "pause-resume-wf",
      name: "Pause and Resume Testing Flow",
      version: 1,
      startStageId: "stage_first",
      stages: [
        {
          id: "stage_first",
          name: "First Action",
          handler: async (ctx) => {
            ctx.runs = (ctx.runs || 0) + 1;
            // Explicitly pause the engine inside the first stage
            await engine.pauseProcess(ctx.instanceId);
            return { firstDone: true };
          }
        },
        {
          id: "stage_second",
          name: "Second Action",
          handler: async (ctx) => {
            await sleep(20);
            ctx.runs = (ctx.runs || 0) + 1;
            return { secondDone: true };
          }
        }
      ],
      transitions: [
        { fromStageId: "stage_first", toStageId: "stage_second" }
      ]
    };

    engine.registerDefinition(definition);

    // Start flow
    const instance = await engine.startProcess("pause-resume-wf", {});
    activeInstanceId = instance.instanceId;
    
    // Give it a tiny moment to run the first stage and register pause
    await sleep(20);
    
    assert.equal(instance.status, "PAUSED");
    assert.equal(instance.context.runs, 1, "Only first stage should have executed");
    assert.equal(instance.currentStageId, "stage_second", "Should have transitioned currentStageId pointers to stage_second before pausing");

    // Resume execution
    await engine.resumeProcess(instance.instanceId);
    assert.equal(instance.status, "RUNNING");

    // Wait for completion
    while (instance.status === "RUNNING") {
      await sleep(5);
    }

    assert.equal(instance.status, "COMPLETED");
    assert.equal(instance.context.runs, 2, "Both stages should have executed fully exactly once");
  });

  // Scenario 5: Retry Failed Stage Correctness
  await suite.run("Stage execution failure retry mechanics", async () => {
    BusinessProcessEngine.resetRegistry();

    const definition: ProcessDefinition = {
      id: "retry-workflow",
      name: "Failure and Retry Flow",
      version: 1,
      startStageId: "unstable_stage",
      stages: [
        {
          id: "unstable_stage",
          name: "Unstable Database Operation",
          handler: async (ctx) => {
            await sleep(20);
            if (!ctx.allowedToPass) {
              throw new Error("Simulated Database Handshake Timed out!");
            }
            ctx.passedSuccessfully = true;
            return { connectionSuccess: true };
          }
        }
      ],
      transitions: []
    };

    engine.registerDefinition(definition);

    const instance = await engine.startProcess("retry-workflow", { allowedToPass: false });
    
    while (instance.status === "RUNNING") {
      await sleep(5);
    }

    assert.equal(instance.status, "FAILED");
    assert.equal(instance.lastError, "Simulated Database Handshake Timed out!");

    // Set permission to pass, then call retry
    instance.context.allowedToPass = true;
    await engine.retryStage(instance.instanceId, "unstable_stage");
    assert.equal(instance.status as string, "RUNNING");

    while ((instance.status as string) === "RUNNING") {
      await sleep(5);
    }

    assert.equal(instance.status, "COMPLETED");
    assert.ok(instance.context.passedSuccessfully);
  });

  // Scenario 6: Process Cancellation
  await suite.run("Explicit execution cancellation", async () => {
    BusinessProcessEngine.resetRegistry();

    const definition: ProcessDefinition = {
      id: "cancel-workflow",
      name: "Long running cancel flow",
      version: 1,
      startStageId: "stage_init",
      stages: [
        {
          id: "stage_init",
          name: "Initialize Stage",
          handler: () => "ready"
        },
        {
          id: "stage_slow",
          name: "Slow processing stage",
          handler: async () => {
            await sleep(50);
            return "slow_completed";
          }
        },
        {
          id: "stage_final",
          name: "Final stage",
          handler: (ctx) => {
            ctx.shouldNeverBeHere = true;
          }
        }
      ],
      transitions: [
        { fromStageId: "stage_init", toStageId: "stage_slow" },
        { fromStageId: "stage_slow", toStageId: "stage_final" }
      ]
    };

    engine.registerDefinition(definition);

    const instance = await engine.startProcess("cancel-workflow");
    await sleep(15); // Wait during slow stage execution
    
    // Explicitly cancel
    await engine.cancelProcess(instance.instanceId);
    assert.equal(instance.status, "CANCELLED");

    // Let the slow stage resolve to ensure it doesn't continue to the final stage
    await sleep(60);
    assert.equal(instance.context.shouldNeverBeHere, undefined, "Final stage should not execute after cancel");
  });

  // Scenario 7: Full Audit History & Snapshots
  await suite.run("Full audit history trail validation", async () => {
    BusinessProcessEngine.resetRegistry();

    const definition: ProcessDefinition = {
      id: "audit-workflow",
      name: "Audit Tracking Validation Flow",
      version: 2,
      startStageId: "stage_one",
      stages: [
        {
          id: "stage_one",
          name: "Initial Step",
          handler: () => "step_one_done"
        }
      ],
      transitions: []
    };

    engine.registerDefinition(definition);

    const instance = await engine.startProcess("audit-workflow", { initialParam: "abc" });
    while (instance.status === "RUNNING") await sleep(5);

    assert.equal(instance.status, "COMPLETED");
    assert.ok(instance.auditTrail.length >= 3, "Expected at least 3 audit logs (Start, Stage Start, Stage End, Completed)");
    
    const startEvent = instance.auditTrail.find(e => e.action === "PROCESS_STARTED");
    assert.ok(startEvent);
    assert.equal(startEvent?.contextSnapshot?.initialParam, "abc");

    const completeEvent = instance.auditTrail.find(e => e.action === "PROCESS_COMPLETED");
    assert.ok(completeEvent);
  });

  // Scenario 8: High Concurrency Safe Multi-tenant runs
  await suite.run("High concurrency statelessness validation", async () => {
    BusinessProcessEngine.resetRegistry();

    const definition: ProcessDefinition = {
      id: "concurrent-wf",
      name: "Highly Concurrent Process Flow",
      version: 1,
      startStageId: "increment",
      stages: [
        {
          id: "increment",
          name: "Add factor",
          handler: async (ctx) => {
            // Simulated network/db jitter to force cross-talk if state is shared
            await sleep(Math.floor(Math.random() * 10) + 1);
            ctx.value = ctx.value + ctx.factor;
            return ctx.value;
          }
        }
      ],
      transitions: []
    };

    engine.registerDefinition(definition);

    const totalInstances = 50;
    const promises: Promise<ProcessInstance>[] = [];

    for (let i = 0; i < totalInstances; i++) {
      promises.push(engine.startProcess("concurrent-wf", { value: i, factor: 10 }));
    }

    const instances = await Promise.all(promises);

    // Wait for all to finish
    let active = true;
    while (active) {
      active = instances.some(inst => inst.status === "RUNNING");
      if (active) await sleep(10);
    }

    // Verify each completed correctly with zero data cross-talk
    for (let i = 0; i < totalInstances; i++) {
      const inst = instances[i];
      assert.equal(inst.status, "COMPLETED");
      assert.equal(inst.context.value, i + 10, `State pollution detected! Expected ${i + 10} for instance ${i}`);
    }
  });

  // Scenario 9: Empty workflow validation
  await suite.run("Empty workflow execution handling", async () => {
    BusinessProcessEngine.resetRegistry();

    const definition: ProcessDefinition = {
      id: "empty-wf",
      name: "Empty workflow definition",
      version: 1,
      startStageId: "nonexistent",
      stages: [],
      transitions: []
    };

    engine.registerDefinition(definition);

    const instance = await engine.startProcess("empty-wf");
    while (instance.status === "RUNNING") await sleep(5);

    assert.equal(instance.status, "FAILED");
    assert.ok(instance.lastError?.includes("Stage definition not found"));
  });

  // Scenario 10: Invalid workflow definitions registration rejection
  await suite.run("Rejects invalid process definitions on registration", async () => {
    BusinessProcessEngine.resetRegistry();

    const invalidDef: any = {
      id: "",
      name: "Incomplete Flow"
    };

    let threwError = false;
    try {
      engine.registerDefinition(invalidDef);
    } catch (err) {
      threwError = true;
    }

    assert.ok(threwError, "Registering empty ID process should have thrown an Error");
  });

  suite.report();
}

// Execute workflow tests
runBPETests().catch(err => {
  console.error("TestSuite execution crashed:", err);
  process.exit(1);
});

export { runBPETests };
