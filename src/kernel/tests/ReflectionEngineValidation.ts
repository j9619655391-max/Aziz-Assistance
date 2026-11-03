/**
 * @file /src/kernel/tests/ReflectionEngineValidation.ts
 * @description Benchmark suite for measuring validation latency, throughput, and memory footprint of the Reflection Engine.
 */

import { ReflectionEngine } from "../ReflectionEngine";
import { IModelRouter, ModelResponse } from "../types";

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

class FastMockModelRouter implements IModelRouter {
  private readonly responseJson: string;

  constructor() {
    this.responseJson = JSON.stringify({
      passed: true,
      confidence: 0.98,
      reasoning_summary: "High quality deterministic output matching formatting guidelines.",
      identified_issues: [],
      recommended_actions: ["Automated deploy."],
      risk_level: "low",
      requires_human_review: false
    });
  }

  public async generate(): Promise<ModelResponse> {
    return {
      content: this.responseJson,
      tokensConsumed: 120,
      latencyMs: 1
    };
  }
}

async function runReflectionBenchmarks() {
  console.log("=================================================================");
  console.log("                 AZIZ KERNEL REFLECTION BENCHMARKS              ");
  console.log("=================================================================\n");

  const iterations = 3000;
  const router = new FastMockModelRouter();
  const engine = new ReflectionEngine({ modelRouter: router });

  attemptGC();
  const initialHeap = process.memoryUsage().heapUsed;
  const startOverall = Date.now();

  console.log(`[BENCHMARK] Executing ${iterations} sequential semantic reflection evaluations...`);

  let lastReport: any = null;
  for (let i = 0; i < iterations; i++) {
    const report = await engine.review(
      `task_bench_${i}`,
      "Write fully-compliant standard TS interface",
      "export interface Valid { key: string; }",
      { success: true, telemetry: { errorsCount: 0 } }
    );
    lastReport = report;
  }

  const durationMs = Date.now() - startOverall;
  attemptGC();
  const finalHeap = process.memoryUsage().heapUsed;
  const heapDelta = Math.max(0, finalHeap - initialHeap);
  const avgLatencyUs = ((durationMs * 1000) / iterations).toFixed(3);
  const throughput = (iterations / (durationMs / 1000)).toFixed(0);

  console.log("\n------------------------- BENCHMARK RESULTS ---------------------");
  console.log(`Total Reflection Runs   : ${iterations}`);
  console.log(`Total Execution Time    : ${durationMs} ms`);
  console.log(`Average Latency         : ${avgLatencyUs} µs per reflection`);
  console.log(`Throughput              : ${throughput} reviews / sec`);
  console.log(`Initial Heap Memory     : ${toMB(initialHeap)}`);
  console.log(`Final Heap Memory       : ${toMB(finalHeap)}`);
  console.log(`Memory Overhead Delta   : ${toMB(heapDelta)} (${(heapDelta / iterations).toFixed(0)} bytes per reflection)`);

  if (lastReport) {
    console.log("\n------------------------- SAMPLE RESPONSE METRICS ---------------");
    console.log(`Passed Status           : ${lastReport.passed}`);
    console.log(`Confidence Score        : ${lastReport.confidence}`);
    console.log(`Reasoning Summary       : ${lastReport.reasoning_summary}`);
    console.log(`Risk Level              : ${lastReport.risk_level}`);
    console.log(`Requires Human Review   : ${lastReport.requires_human_review}`);
  }
  console.log("=================================================================\n");

  process.exit(0);
}

runReflectionBenchmarks().catch((err) => {
  console.error("Fatal reflection benchmark runner crash:", err);
  process.exit(1);
});
