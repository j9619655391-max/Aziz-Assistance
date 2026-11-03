/**
 * @file /src/kernel/tests/VerificationEngine.test.ts
 * @description Comprehensive zero-dependency unit tests for VerificationEngine.
 * Validates rule execution, severity levels, failure paths, report structures, and telemetry.
 */

import { VerificationEngine, IVerificationRule, RuleResult } from "../VerificationEngine";
import { IEventBus, KernelEvent } from "../types";

/**
 * Lightweight test framework runner.
 */
class TestRunner {
  private totalTests = 0;
  private failedTests = 0;

  public async run(name: string, fn: () => void | Promise<void>): Promise<void> {
    this.totalTests++;
    console.log(`[TEST] Running: ${name}...`);
    try {
      await fn();
      console.log(`  ✅ Passed\n`);
    } catch (err: any) {
      this.failedTests++;
      console.error(`  ❌ Failed: ${err?.message || err}\n`);
      if (err.stack) {
        console.error(err.stack);
      }
    }
  }

  public finish(): void {
    console.log(`===========================================`);
    console.log(`Verification Engine Unit Tests Complete.`);
    console.log(`Total Trials: ${this.totalTests}`);
    console.log(`Success Rate: ${((this.totalTests - this.failedTests) / this.totalTests * 100).toFixed(1)}%`);
    console.log(`Passed: ${this.totalTests - this.failedTests}`);
    console.log(`Failed: ${this.failedTests}`);
    console.log(`===========================================`);
    if (this.failedTests > 0) {
      process.exit(1);
    } else {
      process.exit(0);
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
  }
};

class MockEventBus implements IEventBus {
  public events: KernelEvent[] = [];

  public publish(event: Omit<KernelEvent, "eventId" | "timestamp">): void {
    const fullEvent: KernelEvent = {
      ...event,
      eventId: Math.random().toString(),
      timestamp: new Date().toISOString()
    };
    this.events.push(fullEvent);
  }

  public subscribe(type: string, handler: (event: KernelEvent) => void): void {
    // No-op for mock testing
  }

  public clear(): void {
    this.events = [];
  }
}

const runner = new TestRunner();

// Define isolated VFS mapping for test safety and speed
const mockFiles: Record<string, string> = {
  "src/kernel/Core.ts": "export class Core { constructor() { console.log('hello'); } }",
  "src/kernel/Core.test.ts": "import './Core';",
  "src/banned.ts": "const enum Direction { Up, Down }",
  "src/formatting_issue.ts": "let a = 1;\n\n\n\nlet b = 2;",
  "src/oversized.ts": Array(1200).fill("console.log('line');").join("\n"),
  "src/credentials.ts": "const apiKey = 'AIzaSyChArAcTeRs_AnD_KeYs_StRiNg_VaLuEs_40';",
  "src/no_test.ts": "export const value = 100;"
};

const mockReadFile = (p: string) => {
  if (mockFiles[p]) return mockFiles[p];
  throw new Error(`ENOENT: no such file or directory, open '${p}'`);
};

const mockExistsFile = (p: string) => {
  return !!mockFiles[p];
};

// --- TEST CASES ---

runner.run("Pass Path - Full rule validation on compliant codebase", async () => {
  const engine = new VerificationEngine({
    readFileFn: mockReadFile,
    existsFileFn: mockExistsFile
  });

  const res = await engine.verify("task_validation_success", [
    "src/kernel/Core.ts",
    "src/kernel/Core.test.ts"
  ]);

  assert.equal(res.success, true, "Pipeline should report full success");
  assert.equal(res.verification_policy_version, "policy-v1.0", "Verification response should contain correct policy version");
  assert.equal(res.errors.length, 0, "No errors should be collected");
  assert.ok(res.report, "Structured verification report should be generated");
  
  const report = res.report!;
  assert.equal(report.success, true);
  assert.equal(report.verification_policy_version, "policy-v1.0", "Report should contain correct policy version");
  assert.equal(report.telemetry.passedRules, 5, "All default rules should pass");
  assert.equal(report.telemetry.failedRules, 0);
  assert.equal(report.telemetry.errorsCount, 0);
  assert.equal(report.telemetry.warningsCount, 0);
});

runner.run("Failure Path - Triggers Error Severity Failure (Banned Syntax)", async () => {
  const engine = new VerificationEngine({
    readFileFn: mockReadFile,
    existsFileFn: mockExistsFile
  });

  const res = await engine.verify("task_banned_syntax", [
    "src/banned.ts"
  ]);

  assert.equal(res.success, false, "Pipeline must fail when an Error severity rule fails");
  assert.equal(res.errors.length, 1, "Should collect exactly one syntax error");
  assert.ok(res.errors[0].includes("contains banned construct 'const enum'"));
  
  const report = res.report!;
  assert.equal(report.success, false);
  assert.equal(report.telemetry.failedRules, 1, "Should track exactly 1 failed rule");
  assert.equal(report.telemetry.errorsCount, 1);
});

runner.run("Failure Path - Hardcoded Secrets Leaks Detector", async () => {
  const engine = new VerificationEngine({
    readFileFn: mockReadFile,
    existsFileFn: mockExistsFile
  });

  const res = await engine.verify("task_sec_leaks", [
    "src/credentials.ts"
  ]);

  assert.equal(res.success, false);
  assert.equal(res.errors.length, 1);
  assert.ok(res.errors[0].includes("contains a highly suspicious pattern matching Google API Key"));
  assert.equal(res.report?.telemetry.errorsCount, 1);
});

runner.run("Warning Severity Path - Tracks warning without breaking build status", async () => {
  const engine = new VerificationEngine({
    readFileFn: mockReadFile,
    existsFileFn: mockExistsFile
  });

  const res = await engine.verify("task_warnings", [
    "src/kernel/Core.ts",
    "src/kernel/Core.test.ts",
    "src/formatting_issue.ts",
    "src/oversized.ts"
  ]);

  // Formatting and File scale rules have 'warning' severity, so pipeline success should still be true
  assert.equal(res.success, true, "Warning rules must not fail the pipeline");
  assert.equal(res.errors.length, 0);
  
  const report = res.report!;
  assert.equal(report.success, true);
  assert.equal(report.telemetry.warningsCount, 2, "Should accumulate exactly 2 warnings (scale and formatting)");
  assert.equal(report.telemetry.errorsCount, 0);
});

runner.run("Custom Rule Registration & Eventbus Publishing", async () => {
  const bus = new MockEventBus();
  const engine = new VerificationEngine({
    eventBus: bus,
    readFileFn: mockReadFile,
    existsFileFn: mockExistsFile
  });

  // Create a custom strict compliance rule
  const customRule: IVerificationRule = {
    id: "strict-copyright",
    name: "Copyright Header Verification",
    description: "Verifies files contain standard copyright comments",
    severity: "error",
    execute: async (taskId, filePaths, options) => {
      const reader = options.readFileFn ?? mockReadFile;
      const failed: string[] = [];
      for (const file of filePaths) {
        const text = reader(file);
        if (!text.includes("Copyright") && !text.includes("export class")) {
          failed.push(file);
        }
      }
      return {
        passed: failed.length === 0,
        message: failed.length === 0 ? "Copyright markers verified." : `Missing copyright inside: ${failed.join(", ")}`
      };
    }
  };

  engine.registerRule(customRule);

  const res = await engine.verify("task_custom_rule", [
    "src/formatting_issue.ts"
  ]);

  assert.equal(res.success, false, "Custom rule failure should report failed status");
  assert.equal(bus.events.length, 1, "Should publish a VerificationFailed event");
  assert.equal(bus.events[0].type, "VerificationFailed");
  assert.equal(bus.events[0].payload.success, false);
});

runner.run("Graceful Crash Recovery for Broken Rules", async () => {
  const brokenRule: IVerificationRule = {
    id: "broken",
    name: "Broken Rule",
    description: "Crashes on execution",
    severity: "error",
    execute: async () => {
      throw new Error("Disk error simulated");
    }
  };

  const engine = new VerificationEngine({
    rules: [brokenRule],
    readFileFn: mockReadFile,
    existsFileFn: mockExistsFile
  });

  const res = await engine.verify("task_crash", ["src/kernel/Core.ts"]);

  assert.equal(res.success, false, "Crashed rule should trigger pipeline failure");
  assert.equal(res.errors.length, 1);
  assert.ok(res.errors[0].includes("Crash during execution of rule \"broken\""));
});

// Run all
runner.finish();
