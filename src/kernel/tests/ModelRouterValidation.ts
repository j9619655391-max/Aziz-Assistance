/**
 * @file /src/kernel/tests/ModelRouterValidation.ts
 * @description Benchmark suite for measuring routing latency, throughput, failover speed, and memory footprint of the Model Router.
 */

import { ModelRouter, MockLLMProvider } from "../ModelRouter";

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

async function runModelRouterBenchmarks() {
  console.log("=================================================================");
  console.log("                AZIZ KERNEL MODEL ROUTER BENCHMARKS              ");
  console.log("=================================================================\n");

  const iterations = 3000;

  // Set up mock providers for high-speed deterministic benchmark runs
  const primaryProvider = new MockLLMProvider("primary", "Primary Mock", { latencyMs: 0 });
  const backupProvider = new MockLLMProvider("backup", "Backup Mock", { latencyMs: 0 });

  const router = new ModelRouter({
    providers: [primaryProvider, backupProvider],
    fallbacks: {
      "primary": ["backup"]
    },
    maxRetries: 1,
    retryDelayMs: 0
  });

  attemptGC();
  const initialHeap = process.memoryUsage().heapUsed;
  const startOverall = Date.now();

  console.log(`[BENCHMARK] Executing ${iterations} sequential policy-routed requests...`);

  let lastResponse: any = null;
  const policies: Array<"fast" | "reasoning" | "bulk"> = ["fast", "reasoning", "bulk"];

  for (let i = 0; i < iterations; i++) {
    const policy = policies[i % policies.length];
    lastResponse = await router.generate("Run complex algebraic verification step", policy);
  }

  const durationMs = Date.now() - startOverall;
  attemptGC();
  const finalHeap = process.memoryUsage().heapUsed;
  const heapDelta = Math.max(0, finalHeap - initialHeap);
  const avgLatencyUs = ((durationMs * 1000) / iterations).toFixed(3);
  const throughput = (iterations / (durationMs / 1000)).toFixed(0);

  console.log("\n------------------------- BENCHMARK RESULTS ---------------------");
  console.log(`Total Requests Processed: ${iterations}`);
  console.log(`Total Execution Time    : ${durationMs} ms`);
  console.log(`Average Latency         : ${avgLatencyUs} µs per request`);
  console.log(`Throughput              : ${throughput} requests / sec`);
  console.log(`Initial Heap Memory     : ${toMB(initialHeap)}`);
  console.log(`Final Heap Memory       : ${toMB(finalHeap)}`);
  console.log(`Memory Overhead Delta   : ${toMB(heapDelta)} (${(heapDelta / iterations).toFixed(0)} bytes per request)`);

  if (lastResponse) {
    console.log("\n------------------------- SAMPLE RESPONSE METRICS ---------------");
    console.log(`Selected Provider       : ${lastResponse.telemetry.selectedProvider}`);
    console.log(`Selected Model          : ${lastResponse.telemetry.selectedModel}`);
    console.log(`Input Tokens            : ${lastResponse.telemetry.inputTokens}`);
    console.log(`Output Tokens           : ${lastResponse.telemetry.outputTokens}`);
    console.log(`Estimated Cost (USD)    : $${lastResponse.telemetry.estimatedCostUSD}`);
    console.log(`Actual Latency (Internal): ${lastResponse.telemetry.latencyMs} ms`);
    console.log(`Retries Encurred        : ${lastResponse.telemetry.retryCount}`);
  }
  console.log("=================================================================\n");

  process.exit(0);
}

runModelRouterBenchmarks().catch((err) => {
  console.error("Fatal model router benchmark runner crash:", err);
  process.exit(1);
});
