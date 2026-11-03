/**
 * @file /src/kernel/tests/ToolRegistry.test.ts
 * @description Unit test suite for InMemoryToolRegistry.
 * Verifies manifest structure, schema validation, permissions, risk, timeouts, retries, and telemetry integration.
 */

import { InMemoryToolRegistry, SchemaValidationError, SecurityException } from "../ToolRegistry";
import { ToolManifest } from "../types";
import { InMemoryEventBus } from "../EventBus";
import { InMemoryStateStore } from "../StateStore";

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
    console.log(`Tool Registry Unit Tests Complete.`);
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
  throws: (fn: () => void, errorType: any, msg?: string) => {
    try {
      fn();
    } catch (err: any) {
      if (err instanceof errorType) {
        return;
      }
      throw new Error(`${msg || "Assertion failed"}: expected error of type ${errorType.name}, got ${err?.name || typeof err}`);
    }
    throw new Error(`${msg || "Assertion failed"}: expected error, but no error was thrown`);
  },
  throwsAsync: async (fn: () => Promise<void>, errorType: any, msg?: string) => {
    try {
      await fn();
    } catch (err: any) {
      if (err instanceof errorType || (errorType === Error && err instanceof Error)) {
        return;
      }
      throw new Error(`${msg || "Assertion failed"}: expected async error of type ${errorType.name}, got ${err?.name || typeof err}`);
    }
    throw new Error(`${msg || "Assertion failed"}: expected async error, but no error was thrown`);
  }
};

const suite = new TestSuite();

// Helper mock manifest
const mockManifest: ToolManifest = {
  id: "math.add",
  name: "Addition Tool",
  description: "Sum two integers",
  permissions: ["math.access"],
  riskLevel: "low",
  timeoutMs: 50,
  maxRetries: 1,
  inputSchema: {
    type: "object",
    required: ["a", "b"],
    properties: {
      a: { type: "integer" },
      b: { type: "integer" }
    }
  },
  outputSchema: {
    type: "integer"
  }
};

async function runTests() {
  // --- TEST CASES ---

  await suite.run("Tool Registration and Discovery", () => {
    const registry = new InMemoryToolRegistry();
    registry.registerTool(mockManifest, async (args) => args.a + args.b);

    const tools = registry.listTools();
    assert.equal(tools.length, 1, "Should have 1 registered tool");
    assert.equal(tools[0].id, "math.add");

    const tool = registry.getTool("math.add");
    assert.ok(tool, "Tool should be accessible");
    assert.equal(tool?.name, "Addition Tool");

    // Check memory isolation (modifying fetched manifest should not alter register)
    if (tool) {
      tool.name = "CHANGED_NAME";
    }
    assert.equal(registry.getTool("math.add")?.name, "Addition Tool", "Returned manifest must be deep-copied");
  });

  await suite.run("Bad Manifest Validation During Registration", () => {
    const registry = new InMemoryToolRegistry();
    const badManifest = { ...mockManifest, id: "" };
    assert.throws(() => {
      registry.registerTool(badManifest, async () => {});
    }, Error, "Should throw error on empty tool id");

    const badRiskManifest = { ...mockManifest, riskLevel: "extreme" as any };
    assert.throws(() => {
      registry.registerTool(badRiskManifest, async () => {});
    }, Error, "Should throw error on invalid riskLevel");
  });

  await suite.run("JSON Schema Validation Constraints", () => {
    // 1. Primitive Type Validations
    assert.throws(() => {
      InMemoryToolRegistry.validateSchema("hello", { type: "number" });
    }, SchemaValidationError, "String is not a number");

    assert.throws(() => {
      InMemoryToolRegistry.validateSchema(5.5, { type: "integer" });
    }, SchemaValidationError, "Float is not an integer");

    // 2. Enum Validation
    InMemoryToolRegistry.validateSchema("medium", { type: "string", enum: ["low", "medium", "high"] });
    assert.throws(() => {
      InMemoryToolRegistry.validateSchema("critical", { type: "string", enum: ["low", "medium", "high"] });
    }, SchemaValidationError, "Value must belong to enum list");

    // 3. Object Required Properties & Nested Types
    const objSchema = {
      type: "object",
      required: ["name", "age"],
      properties: {
        name: { type: "string" },
        age: { type: "integer" },
        address: {
          type: "object",
          required: ["city"],
          properties: {
            city: { type: "string" }
          }
        }
      }
    };

    InMemoryToolRegistry.validateSchema({ name: "Alex", age: 30 }, objSchema);
    
    assert.throws(() => {
      InMemoryToolRegistry.validateSchema({ name: "Alex" }, objSchema);
    }, SchemaValidationError, "Missing required age");

    assert.throws(() => {
      InMemoryToolRegistry.validateSchema({ name: "Alex", age: "30" }, objSchema);
    }, SchemaValidationError, "Age must be an integer");

    assert.throws(() => {
      InMemoryToolRegistry.validateSchema({ name: "Alex", age: 30, address: {} }, objSchema);
    }, SchemaValidationError, "Nested address missing city");
  });

  await suite.run("Tool Argument Verification Before Execution", async () => {
    const registry = new InMemoryToolRegistry();
    registry.registerTool(mockManifest, async (args) => args.a + args.b);

    // Call with missing arguments
    await assert.throwsAsync(async () => {
      await registry.executeTool("math.add", { a: 10 }, "task_1");
    }, SchemaValidationError, "Should throw for missing argument b");

    // Call with bad type
    await assert.throwsAsync(async () => {
      await registry.executeTool("math.add", { a: 10, b: "20" }, "task_1");
    }, SchemaValidationError, "Should throw for bad argument b type");

    // Correct arguments
    const result = await registry.executeTool("math.add", { a: 10, b: 20 }, "task_1");
    assert.equal(result, 30, "Should successfully return sum");
  });

  await suite.run("Static Permission Deny Policies", async () => {
    // Configure registry with restricted permissions
    const registry = new InMemoryToolRegistry({
      grantedPermissions: ["filesystem.read"]
    });

    registry.registerTool(mockManifest, async () => "ok");

    await assert.throwsAsync(async () => {
      await registry.executeTool("math.add", { a: 1, b: 2 }, "task_1");
    }, SecurityException, "Should block execution since 'math.access' is missing from granted list");
  });

  await suite.run("Dynamic Permission Callback Audit", async () => {
    let callHistory: string[] = [];
    const registry = new InMemoryToolRegistry({
      permissionChecker: (permissions, toolId, taskId) => {
        callHistory.push(`${toolId}:${taskId}:${permissions.join(",")}`);
        return taskId === "authorized_task";
      }
    });

    registry.registerTool(mockManifest, async () => "secret_data");

    // Call with unauthorized task
    await assert.throwsAsync(async () => {
      await registry.executeTool("math.add", { a: 1, b: 2 }, "unauthorized_task");
    }, SecurityException, "Should block execution on dynamic checker");

    // Call with authorized task
    const res = await registry.executeTool("math.add", { a: 1, b: 2 }, "authorized_task");
    assert.equal(res, "secret_data");
    assert.equal(callHistory.length, 2);
    assert.equal(callHistory[0], "math.add:unauthorized_task:math.access");
    assert.equal(callHistory[1], "math.add:authorized_task:math.access");
  });

  await suite.run("Risk Level Classification Control", () => {
    const registry = new InMemoryToolRegistry({
      maxAllowedRiskLevel: "medium"
    });

    const highRiskManifest: ToolManifest = {
      ...mockManifest,
      id: "system.format",
      riskLevel: "high"
    };

    assert.throws(() => {
      registry.registerTool(highRiskManifest, async () => {});
    }, SecurityException, "Should prevent high risk registration when limit is medium");
  });

  await suite.run("Absolute Timeout Termination Policy", async () => {
    const registry = new InMemoryToolRegistry();
    const slowManifest: ToolManifest = {
      ...mockManifest,
      id: "slow.tool",
      timeoutMs: 30, // Very low timeout
      maxRetries: 0
    };

    registry.registerTool(slowManifest, async () => {
      await new Promise((resolve) => setTimeout(resolve, 100)); // Sleep 100ms
      return "done";
    });

    await assert.throwsAsync(async () => {
      await registry.executeTool("slow.tool", { a: 1, b: 2 }, "task_1");
    }, Error, "Should timeout and throw");
  });

  await suite.run("Automated Retry Loop Policy (Success on retry)", async () => {
    const registry = new InMemoryToolRegistry();
    let invocations = 0;

    const fragileManifest: ToolManifest = {
      ...mockManifest,
      id: "fragile.tool",
      maxRetries: 2
    };

    registry.registerTool(fragileManifest, async () => {
      invocations++;
      if (invocations < 3) {
        throw new Error("Transient server error");
      }
      return "retry_success";
    });

    const result = await registry.executeTool("fragile.tool", { a: 1, b: 2 }, "task_1");
    assert.equal(result, "retry_success", "Should eventually succeed after retries");
    assert.equal(invocations, 3, "Should take 3 total attempts");

    // Verify registry telemetry logs 2 retries
    const telemetry = registry.getTelemetry("fragile.tool");
    assert.equal(telemetry?.retries, 2);
    assert.equal(telemetry?.successes, 1);
  });

  await suite.run("Automated Retry Loop Policy (Exhaustion failure)", async () => {
    const registry = new InMemoryToolRegistry();
    let invocations = 0;

    const deadManifest: ToolManifest = {
      ...mockManifest,
      id: "dead.tool",
      maxRetries: 2
    };

    registry.registerTool(deadManifest, async () => {
      invocations++;
      throw new Error("Permanent database error");
    });

    await assert.throwsAsync(async () => {
      await registry.executeTool("dead.tool", { a: 1, b: 2 }, "task_1");
    }, Error);

    assert.equal(invocations, 3, "Initial attempt (1) + retries (2) = 3 total attempts");

    const telemetry = registry.getTelemetry("dead.tool");
    assert.equal(telemetry?.failures, 1);
    assert.equal(telemetry?.retries, 2);
  });

  await suite.run("Event Bus Event Publishing Integration", async () => {
    const bus = new InMemoryEventBus();
    const registry = new InMemoryToolRegistry({ eventBus: bus });
    
    registry.registerTool(mockManifest, async (args) => args.a + args.b);

    const receivedEvents: any[] = [];
    bus.subscribe("ToolExecuted", (ev) => {
      receivedEvents.push(ev);
    });

    await registry.executeTool("math.add", { a: 5, b: 5 }, "task_event_check");

    assert.equal(receivedEvents.length, 1);
    const payload = receivedEvents[0].payload;
    assert.equal(payload.toolId, "math.add");
    assert.equal(payload.success, true);
    assert.equal(payload.args.a, 5);
    assert.equal(payload.output, 10);
    assert.equal(receivedEvents[0].taskId, "task_event_check");
  });

  await suite.run("State Store Telemetry Integration", async () => {
    const store = new InMemoryStateStore();
    const registry = new InMemoryToolRegistry({ stateStore: store });

    registry.registerTool(mockManifest, async (args) => args.a + args.b);

    const taskId = store.createTask("Integrate state tracking");
    
    await registry.executeTool("math.add", { a: 2, b: 3 }, taskId);

    const state = store.getTaskState(taskId);
    assert.ok(state);
    assert.equal(state?.telemetry.toolInvocations["math.add"], 1);
    assert.ok((state?.telemetry.durationMs ?? 0) >= 0);
  });

  suite.report();
}

runTests().catch(err => {
  console.error("Fatal test crash:", err);
  process.exit(1);
});
