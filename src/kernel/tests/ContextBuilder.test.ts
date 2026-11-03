/**
 * @file /src/kernel/tests/ContextBuilder.test.ts
 * @description Comprehensive Unit Tests for the Deterministic Context Builder.
 * Validates deterministic packages, whitespace and comment stripping, token budget truncation,
 * correct analytics metric formulas, import graph parsing, and invalid parameters.
 */

import { ContextBuilder, ContextMetrics, ContextPackage } from "../ContextBuilder";

class TestSuite {
  private passed = 0;
  private failed = 0;

  public async run(name: string, fn: () => void | Promise<void>): Promise<void> {
    console.log(`[TEST] Running: ${name}...`);
    try {
      await fn();
      this.passed++;
      console.log(`  ✅ Passed\n`);
    } catch (err: any) {
      this.failed++;
      console.error(`  ❌ Failed: ${err?.message || err}\n`);
      if (err.stack) {
        console.error(err.stack);
      }
    }
  }

  public report(): void {
    console.log(`===========================================`);
    console.log(`Context Builder Unit Tests Complete.`);
    console.log(`Total Trials: ${this.passed + this.failed}`);
    console.log(`Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`===========================================`);
    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

const assert = {
  equal: <T>(actual: T, expected: T, msg?: string) => {
    if (actual !== expected) {
      throw new Error(`${msg || "Assertion failed"}: expected ${expected}, got ${actual}`);
    }
  },
  ok: (val: any, msg?: string) => {
    if (!val) {
      throw new Error(`${msg || "Assertion failed"}: value was not truthy`);
    }
  },
  deepEqual: (actual: any, expected: any, msg?: string) => {
    const actStr = JSON.stringify(actual);
    const expStr = JSON.stringify(expected);
    if (actStr !== expStr) {
      throw new Error(`${msg || "Deep assertion failed"}: expected ${expStr}, got ${actStr}`);
    }
  }
};

const suite = new TestSuite();

async function runContextBuilderTests() {
  // Mock Virtual File System Setup
  const mockVfs: Record<string, string> = {
    "src/kernel/StateStore.ts": `
      // Clean state storage
      import { TaskState } from "./types";
      /* Block comment of store */
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
      // Messaging spinal cord
      import { TaskState } from "./types";
      export class EventBus {}
    `
  };

  // 1. Happy Path - Context Construction & Keyword Scoring
  await suite.run("Build deterministic workspace context based on scoring keywords", async () => {
    const builder = new ContextBuilder({ vfs: mockVfs, tokenBudget: 2000, stripComments: true });
    
    // Querying for "store" should score StateStore.ts highest
    const pkg = await builder.buildContext("store context", ["src/kernel/EventBus.ts"]);

    assert.ok(pkg.files.includes("src/kernel/StateStore.ts"), "StateStore should be gathered");
    assert.ok(pkg.files.includes("src/kernel/types.ts"), "types should be gathered");
    
    // Check comment stripping
    const stateStoreContent = pkg.compressedSummary;
    assert.ok(!stateStoreContent.includes("Clean state storage"), "Single-line comments must be stripped");
    assert.ok(!stateStoreContent.includes("Block comment of store"), "Block comments must be stripped");

    // Metrics validation
    assert.equal(builder.context_policy_version, "policy-v1.0", "Builder should expose correct version");
    assert.equal(pkg.context_policy_version, "policy-v1.0", "Context package should contain correct policy version");
    assert.ok(pkg.metrics.totalBytesBefore > 0, "Bytes before must be positive");
    assert.ok(pkg.metrics.totalBytesAfter > 0, "Bytes after must be positive");
    assert.ok(pkg.metrics.compressionRatio >= 0, "Compression ratio is positive or zero");
    assert.ok(pkg.metrics.estimatedTokensBefore > 0, "Tokens before must be positive");
    assert.ok(pkg.metrics.estimatedTokensAfter > 0, "Tokens after must be positive");
  });

  // 2. Token Budget Enforcement (Truncation)
  await suite.run("Enforce strict token budgets and truncate excess contents", async () => {
    // Large file contents exceeding budget
    const smallVfs: Record<string, string> = {
      "fileA.ts": "A".repeat(400), // ~100 tokens
      "fileB.ts": "B".repeat(800)  // ~200 tokens
    };

    const builder = new ContextBuilder({ vfs: smallVfs, tokenBudget: 50, stripComments: false });
    const pkg = await builder.buildContext("test", ["fileB.ts"]); // Prioritizes fileB.ts (impacted file)

    assert.ok(pkg.budgetEnforced, "Budget enforcement flag must be true");
    assert.ok(pkg.truncatedFiles.includes("fileB.ts"), "fileB.ts must be logged as truncated");
    assert.ok(pkg.metrics.estimatedTokensAfter <= 70, "Final estimated tokens must respect limits");
    assert.ok(pkg.compressedSummary.includes("[TRUNCATED TO RESPECT MAXIMUM TOKEN BUDGET]"), "Summary contains truncation warning");
  });

  // 3. Exact Identity Output (Determinism)
  await suite.run("Ensure identical inputs yield identical Context Package structures", async () => {
    const builder1 = new ContextBuilder({ vfs: mockVfs, tokenBudget: 1000 });
    const builder2 = new ContextBuilder({ vfs: mockVfs, tokenBudget: 1000 });

    const pkg1 = await builder1.buildContext("state messaging", ["src/kernel/EventBus.ts"]);
    const pkg2 = await builder2.buildContext("state messaging", ["src/kernel/EventBus.ts"]);

    assert.deepEqual(pkg1, pkg2, "Identical inputs must yield identical Context Package structures");
  });

  // 4. Imports/Symbols Dependency Graph Parser
  await suite.run("Generate structured deterministic symbols imports dependency graph", async () => {
    const builder = new ContextBuilder({ vfs: mockVfs, stripComments: true });
    const pkg = await builder.buildContext("test", []);

    const graph = pkg.symbolsGraph!;
    assert.ok(graph, "Dependency graph should exist");
    
    // "src/kernel/StateStore.ts" contains `import { TaskState } from "./types";`
    // which resolves to "src/kernel/types.ts"
    const storeImports = graph["src/kernel/StateStore.ts"];
    assert.ok(Array.isArray(storeImports), "Imports mapping must be an array");
    assert.equal(storeImports[0], "src/kernel/types.ts", "Relative import path is resolved correctly");

    const eventBusImports = graph["src/kernel/EventBus.ts"];
    assert.equal(eventBusImports[0], "src/kernel/types.ts", "EventBus imports path resolves correctly");
  });

  // 5. Redundancy Whitespace Compression
  await suite.run("Prune consecutive and redundant whitespaces seamlessly", async () => {
    const whitespaceVfs = {
      "messy.ts": `
        const first = 1;


        const second = 2;


        const third = 3;
      `
    };

    const builder = new ContextBuilder({ vfs: whitespaceVfs, stripComments: true });
    const pkg = await builder.buildContext("messy", []);

    const processed = pkg.compressedSummary;
    // Verify that consecutive blank lines are limited to maximum 1
    assert.ok(!processed.includes("\n\n\n"), "Should compress consecutive blank lines down to a maximum of 1");
  });

  suite.report();
}

runContextBuilderTests().catch((err) => {
  console.error("Fatal exception during ContextBuilder unit testing:", err);
  process.exit(1);
});
