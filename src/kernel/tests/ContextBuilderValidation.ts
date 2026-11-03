/**
 * @file /src/kernel/tests/ContextBuilderValidation.ts
 * @description Benchmark suite for measuring compile latency, throughput, and memory footprint of the Context Builder.
 */

import { ContextBuilder } from "../ContextBuilder";

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

async function runContextBuilderBenchmarks() {
  console.log("=================================================================");
  console.log("              AZIZ KERNEL CONTEXT BUILDER BENCHMARKS             ");
  console.log("=================================================================\n");

  const iterations = 5000;
  
  // Create a realistic multi-file virtual environment
  const mockVfs: Record<string, string> = {
    "src/kernel/StateStore.ts": `
      import { TaskState } from "./types";
      export class StateStore {
        private state: TaskState[] = [];
        public save() { return "success"; }
      }
    `,
    "src/kernel/types.ts": `
      export interface TaskState {
        id: string;
      }
    `,
    "src/kernel/EventBus.ts": `
      import { TaskState } from "./types";
      export class EventBus {}
    `,
    "src/kernel/Planner.ts": `
      import { IPlanner, TaskStep } from "./types";
      export class Planner implements IPlanner {
        public async createPlan(): Promise<TaskStep[]> {
          return [];
        }
      }
    `,
    "src/kernel/AgentRuntime.ts": `
      import { IAgentRuntime } from "./types";
      import { StateStore } from "./StateStore";
      import { EventBus } from "./EventBus";
      export class AgentRuntime implements IAgentRuntime {
        public async executeTask() { return true; }
      }
    `
  };

  const builder = new ContextBuilder({ vfs: mockVfs, tokenBudget: 4000, stripComments: true });

  attemptGC();
  const initialHeap = process.memoryUsage().heapUsed;
  const startOverall = Date.now();

  console.log(`[BENCHMARK] Generating ${iterations} sequential context packages...`);

  let lastPkg: any = null;
  for (let i = 0; i < iterations; i++) {
    lastPkg = await builder.buildContext("state store runtime planning", [
      "src/kernel/AgentRuntime.ts",
      "src/kernel/StateStore.ts"
    ]);
  }

  const durationMs = Date.now() - startOverall;
  attemptGC();
  const finalHeap = process.memoryUsage().heapUsed;
  const heapDelta = Math.max(0, finalHeap - initialHeap);
  const avgLatencyUs = ((durationMs * 1000) / iterations).toFixed(3);
  const throughput = (iterations / (durationMs / 1000)).toFixed(0);

  console.log("\n------------------------- BENCHMARK RESULTS ---------------------");
  console.log(`Total Packages Compiled: ${iterations}`);
  console.log(`Total Execution Time   : ${durationMs} ms`);
  console.log(`Average Latency        : ${avgLatencyUs} µs per package`);
  console.log(`Throughput             : ${throughput} packages compiled/sec`);
  console.log(`Initial Heap Memory    : ${toMB(initialHeap)}`);
  console.log(`Final Heap Memory      : ${toMB(finalHeap)}`);
  console.log(`Memory Overhead Delta  : ${toMB(heapDelta)} (${(heapDelta / iterations).toFixed(0)} bytes per package)`);

  if (lastPkg) {
    console.log("\n------------------------- SAMPLE PACKAGE METRICS ----------------");
    console.log(`Included Files         : ${lastPkg.files.join(", ")}`);
    console.log(`Original Bytes Size    : ${lastPkg.metrics.totalBytesBefore} bytes`);
    console.log(`Compressed Bytes Size  : ${lastPkg.metrics.totalBytesAfter} bytes`);
    console.log(`Size Compression Ratio : ${(lastPkg.metrics.compressionRatio * 100).toFixed(2)}%`);
    console.log(`Original Est. Tokens   : ${lastPkg.metrics.estimatedTokensBefore} tokens`);
    console.log(`Compressed Est. Tokens : ${lastPkg.metrics.estimatedTokensAfter} tokens`);
    console.log(`Token Reduction Ratio  : ${(lastPkg.metrics.tokenReductionRatio * 100).toFixed(2)}%`);
    console.log(`Budget Enforced?       : ${lastPkg.budgetEnforced ? "YES" : "NO"}`);
    console.log(`Truncated Files        : ${lastPkg.truncatedFiles.length > 0 ? lastPkg.truncatedFiles.join(", ") : "None"}`);
  }
  console.log("=================================================================\n");

  process.exit(0);
}

runContextBuilderBenchmarks().catch((err) => {
  console.error("Fatal benchmark runner crash:", err);
  process.exit(1);
});
