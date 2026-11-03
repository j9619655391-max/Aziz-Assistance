/**
 * @file /src/kernel/tests/KernelIntegrationValidation.ts
 * @description Benchmark suite for measuring the complete end-to-end execution latency of the integrated Aziz Kernel.
 * Audits throughput, sequential execution delays, memory growth, and telemetry recording efficiency.
 */

import { InMemoryStateStore } from "../StateStore";
import { InMemoryEventBus } from "../EventBus";
import { InMemoryToolRegistry } from "../ToolRegistry";
import { AgentRuntime, AgentManifest } from "../AgentRuntime";
import { ToolManifest } from "../types";

function toMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function attemptGC(): void {
  if (global.gc) {
    try {
      global.gc();
    } catch {
      // ignore
    }
  }
}

async function runKernelIntegrationBenchmarks() {
  console.log("=================================================================");
  console.log("             AZIZ KERNEL INTEGRATION BENCHMARKS                  ");
  console.log("=================================================================\n");

  const iterations = 1000;
  const stateStore = new InMemoryStateStore();
  const eventBus = new InMemoryEventBus();
  const toolRegistry = new InMemoryToolRegistry({
    eventBus,
    stateStore,
    grantedPermissions: ["benchmark_permission"]
  });
  const agentRuntime = new AgentRuntime(stateStore, eventBus);

  // 1. Register benchmark Tool
  const manifestTool: ToolManifest = {
    id: "benchmark_tool",
    name: "Benchmark Tool",
    description: "Performs quick operation for latency assessment",
    permissions: ["benchmark_permission"],
    riskLevel: "low",
    timeoutMs: 50,
    maxRetries: 0,
    inputSchema: { type: "object", properties: { num: { type: "number" } } },
    outputSchema: { type: "object", properties: { square: { type: "number" } } }
  };

  toolRegistry.registerTool(manifestTool, async (args) => {
    return { square: args.num * args.num };
  });

  // 2. Register benchmark Agent
  const manifestAgent: AgentManifest = {
    id: "benchmark_agent",
    name: "Benchmark Agent",
    description: "Evaluates kernel stack latencies",
    capabilityTags: ["benchmark"],
    maxExecutionTimeMs: 200
  };

  agentRuntime.registerAgent(manifestAgent, async (ctx) => {
    ctx.log("Executing benchmark iteration");
    
    ctx.stateStore.updateStep(ctx.taskId, "step_bench", {
      name: "Benchmarking Tool Execution",
      status: "running"
    });

    const toolResult = await toolRegistry.executeTool("benchmark_tool", { num: 9 }, ctx.taskId);
    
    ctx.recordStepCompleted("step_bench", 0, [`Completed successfully. Square is ${toolResult.square}`]);
    ctx.recordTelemetry(50, 0.001);

    return toolResult;
  });

  // Garbage collect first if possible
  attemptGC();
  const initialHeap = process.memoryUsage().heapUsed;
  const startOverall = Date.now();

  console.log(`[BENCHMARK] Executing ${iterations} sequential end-to-end task lifecycles...`);

  for (let i = 0; i < iterations; i++) {
    const taskId = stateStore.createTask(`E2E Benchmark Run ${i}`);
    stateStore.updateStep(taskId, "step_bench", { name: "Benchmarking Tool Execution" });
    
    await agentRuntime.executeTask(taskId, "benchmark_agent");
    
    // Periodically log progress to avoid timeouts
    if ((i + 1) % 200 === 0) {
      console.log(`  - Completed ${i + 1} E2E tasks...`);
    }
  }

  const durationMs = Date.now() - startOverall;
  attemptGC();
  const finalHeap = process.memoryUsage().heapUsed;
  const heapDelta = Math.max(0, finalHeap - initialHeap);
  const avgLatencyUs = ((durationMs * 1000) / iterations).toFixed(3);
  const throughput = (iterations / (durationMs / 1000)).toFixed(0);

  console.log("\n------------------------- BENCHMARK RESULTS ---------------------");
  console.log(`Total Task Iterations : ${iterations}`);
  console.log(`Total Execution Time  : ${durationMs} ms`);
  console.log(`Average E2E Latency   : ${avgLatencyUs} µs per full task lifecycle`);
  console.log(`Effective Throughput  : ${throughput} complete E2E tasks/sec`);
  console.log(`Initial Heap Memory   : ${toMB(initialHeap)}`);
  console.log(`Final Heap Memory     : ${toMB(finalHeap)}`);
  console.log(`Memory Overhead Delta : ${toMB(heapDelta)} (${(heapDelta / iterations).toFixed(0)} bytes per task)`);
  console.log("=================================================================\n");

  // Exit code 0
  process.exit(0);
}

runKernelIntegrationBenchmarks().catch((err) => {
  console.error("Fatal benchmark runner crash:", err);
  process.exit(1);
});
