/**
 * @file /src/kernel/tests/VerificationEngineValidation.ts
 * @description Benchmark suite for measuring validation latency, throughput, and memory footprint of the Verification Engine.
 */

import { VerificationEngine } from "../VerificationEngine";

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

async function runVerificationBenchmarks() {
  console.log("=================================================================");
  console.log("                AZIZ KERNEL VERIFICATION BENCHMARKS             ");
  console.log("=================================================================\n");

  const iterations = 4000;

  // In-memory virtual file structure to ensure lightning-fast deterministic measurements
  const mockFiles: Record<string, string> = {
    "src/kernel/StateStore.ts": "export class StateStore { /* logic */ }",
    "src/kernel/StateStore.test.ts": "import './StateStore';",
    "src/kernel/EventBus.ts": "export class EventBus { /* logic */ }",
    "src/kernel/EventBus.test.ts": "import './EventBus';"
  };

  const mockReadFile = (p: string) => {
    if (mockFiles[p]) return mockFiles[p];
    throw new Error(`ENOENT: ${p}`);
  };

  const mockExistsFile = (p: string) => !!mockFiles[p];

  const engine = new VerificationEngine({
    readFileFn: mockReadFile,
    existsFileFn: mockExistsFile
  });

  attemptGC();
  const initialHeap = process.memoryUsage().heapUsed;
  const startOverall = Date.now();

  console.log(`[BENCHMARK] Executing ${iterations} sequential verification pipelines...`);

  let lastReport: any = null;
  const fileQueues = [
    ["src/kernel/StateStore.ts", "src/kernel/StateStore.test.ts"],
    ["src/kernel/EventBus.ts", "src/kernel/EventBus.test.ts"]
  ];

  for (let i = 0; i < iterations; i++) {
    const files = fileQueues[i % fileQueues.length];
    const res = await engine.verify(`task_bench_${i}`, files);
    lastReport = res.report;
  }

  const durationMs = Date.now() - startOverall;
  attemptGC();
  const finalHeap = process.memoryUsage().heapUsed;
  const heapDelta = Math.max(0, finalHeap - initialHeap);
  const avgLatencyUs = ((durationMs * 1000) / iterations).toFixed(3);
  const throughput = (iterations / (durationMs / 1000)).toFixed(0);

  console.log("\n------------------------- BENCHMARK RESULTS ---------------------");
  console.log(`Total Verifications Runs: ${iterations}`);
  console.log(`Total Execution Time    : ${durationMs} ms`);
  console.log(`Average Latency         : ${avgLatencyUs} µs per verification`);
  console.log(`Throughput              : ${throughput} pipelines / sec`);
  console.log(`Initial Heap Memory     : ${toMB(initialHeap)}`);
  console.log(`Final Heap Memory       : ${toMB(finalHeap)}`);
  console.log(`Memory Overhead Delta   : ${toMB(heapDelta)} (${(heapDelta / iterations).toFixed(0)} bytes per verification)`);

  if (lastReport) {
    console.log("\n------------------------- SAMPLE VERDICT METRICS ----------------");
    console.log(`Report Success Status   : ${lastReport.success}`);
    console.log(`Rules Evaluated         : ${lastReport.telemetry.totalRules}`);
    console.log(`Rules Passed            : ${lastReport.telemetry.passedRules}`);
    console.log(`Warnings Count          : ${lastReport.telemetry.warningsCount}`);
    console.log(`Errors Count            : ${lastReport.telemetry.errorsCount}`);
    console.log(`Internal Latency        : ${lastReport.durationMs} ms`);
  }
  console.log("=================================================================\n");

  process.exit(0);
}

runVerificationBenchmarks().catch((err) => {
  console.error("Fatal verification benchmark runner crash:", err);
  process.exit(1);
});
