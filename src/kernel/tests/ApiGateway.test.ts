/**
 * @file /src/kernel/tests/ApiGateway.test.ts
 * @description Master integration test, load test, and validation suite for SPRINT 21 Unified API Platform.
 */

import express from "express";
import http from "http";
import { ApiGateway } from "../../../src/domains/api/ApiGateway";
import { ServiceRegistry } from "../../../src/services/backend/ServiceRegistry";
import { providerManager } from "../../../src/kernel/provider";
import { requestContext, generateRequestId } from "../../../src/kernel/context";
import { BusinessProcessEngine, ProcessDefinition } from "../../../src/domains/shared/BusinessProcessEngine";
import { RecruitmentController } from "../../../src/domains/api/ApiController";

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
    console.log(`Unified API Gateway Test Completed: ${this.passed}/${this.total} scenarios passed.`);
    console.log(`===================================================`);
    if (this.failed > 0) {
      throw new Error(`TestSuite failed with ${this.failed} assertion errors.`);
    }
  }
}

// Port for test server
const TEST_PORT = 3123;

// Helper to make native HTTP requests to our local test server
function makeRequest(
  method: string,
  path: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : "";
    const options = {
      hostname: "localhost",
      port: TEST_PORT,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode || 500,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        } catch (err) {
          resolve({
            status: res.statusCode || 500,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runApiGatewayTests() {
  console.log(`===================================================`);
  console.log(`       UNIFIED API PLATFORM REGRESSION TESTS       `);
  console.log(`===================================================`);

  const app = express();

  // Initialize service registry
  let services: ServiceRegistry;
  try {
    services = ServiceRegistry.getInstance();
  } catch {
    services = new ServiceRegistry(providerManager);
  }

  // Mock recruitment intelligence and workflow engine to be fully isolated from Gemini API / network rate limits
  services.recruitmentIntelligenceModule.assessCandidate = async (candidate, job, options) => {
    return {
      candidateScore: 85,
      matchingSkills: ["typescript", "express"],
      missingSkills: ["architecture"],
      transferableSkills: ["strategic thinking"],
      semanticSimilarity: 0.85,
      confidence: 0.9,
      riskSummary: "Low risk, solid technical background.",
      recommendation: "Strong candidate for UI / API development.",
      explanation: "Matched 2/3 required skills and has solid Node.js and Express experience.",
      decisionHistoryReference: []
    };
  };

  services.recruitmentWorkflowEngine.executeWorkflow = async (submissions, job, options) => {
    return {
      correlationId: options?.correlationId || "mock-correlation-id",
      timestamp: new Date().toISOString(),
      shortlisted: submissions.map(sub => ({
        candidateName: sub.candidate.name,
        score: 85,
        decision: "RECOMMENDED",
        reasons: ["Strong technical match"]
      })),
      auditTrail: ["Mock workflow run completed successfully."]
    } as any;
  };

  // Request ID Context middleware
  app.use((req, res, next) => {
    const requestId = (req.headers["x-request-id"] as string) || 
                      (req.headers["request-id"] as string) || 
                      generateRequestId();
    
    res.setHeader("X-Request-Id", requestId);
    (req as any).requestId = requestId;
    (req as any).startTime = Date.now();

    requestContext.run({ requestId }, () => {
      next();
    });
  });

  app.use(express.json());

  // Mount API Gateway
  const gateway = new ApiGateway();
  gateway.mount(app);

  // Start test server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, "localhost", () => {
      console.log(`[TEST SERVER] Booted on port ${TEST_PORT}`);
      resolve();
    });
  });

  const suite = new TestSuite();

  try {
    // SCENARIO 1: Health endpoint
    await suite.run("GET /api/v1/health - Service health verification", async () => {
      const res = await makeRequest("GET", "/api/v1/health");
      assert.equal(res.status, 200);
      assert.ok(res.body.success, "Response should indicate success");
      assert.equal(res.body.data.status, "healthy");
      assert.ok(res.body.requestId, "Should return a request ID");
    });

    // SCENARIO 2: Metadata verification
    await suite.run("GET /api/v1/version & /api/v1/build - Platform versioning and compilation data", async () => {
      const resVer = await makeRequest("GET", "/api/v1/version");
      assert.equal(resVer.status, 200);
      assert.equal(resVer.body.data.apiVersion, "v1");

      const resBuild = await makeRequest("GET", "/api/v1/build");
      assert.equal(resBuild.status, 200);
      assert.equal(resBuild.body.data.environment, "production");
    });

    // SCENARIO 3: Recruitment single candidate assessment
    await suite.run("POST /api/v1/recruitment/assess - Assess a candidate profile against job description", async () => {
      const payload = {
        candidate: {
          name: "Aziz Engineer",
          skills: ["TypeScript", "Express", "Node.js"],
          experienceYears: 6
        },
        job: {
          title: "Principal Platform Architect",
          requiredSkills: ["TypeScript", "Express", "Architecture"],
          minimumExperienceYears: 5
        }
      };

      const res = await makeRequest("POST", "/api/v1/recruitment/assess", payload);
      assert.equal(res.status, 200);
      assert.ok(res.body.success);
      assert.ok(res.body.data.candidateScore !== undefined);
      assert.ok(res.body.data.matchingSkills.includes("typescript"));
    });

    // SCENARIO 4: Recruitment workflow lifecycle (start, pause, resume, cancel, status)
    await suite.run("Recruitment workflow orchestrations lifecycle (start, pause, resume, status)", async () => {
      RecruitmentController.clearWorkflows();

      const payload = {
        submissions: [
          {
            candidate: {
              name: "Amal Smith",
              skills: ["React", "Typescript"],
              experienceYears: 4
            }
          }
        ],
        job: {
          title: "Senior UI Architect",
          requiredSkills: ["React", "Typescript"],
          minimumExperienceYears: 4
        },
        options: {
          correlationId: "rec-wf-test-unique-1"
        }
      };

      // 1. Start Workflow
      const resStart = await makeRequest("POST", "/api/v1/recruitment/workflow/start", payload);
      assert.equal(resStart.status, 200);
      assert.equal(resStart.body.data.id, "rec-wf-test-unique-1");
      assert.equal(resStart.body.data.status, "COMPLETED");

      // 2. Status check
      const resStatus = await makeRequest("GET", "/api/v1/recruitment/workflow/rec-wf-test-unique-1");
      assert.equal(resStatus.status, 200);
      assert.equal(resStatus.body.data.status, "COMPLETED");

      // 3. Pause failure (cannot pause COMPLETED workflow)
      const resPause = await makeRequest("POST", "/api/v1/recruitment/workflow/pause", { workflowId: "rec-wf-test-unique-1" });
      assert.equal(resPause.status, 422, "Cannot pause finished workflow, should return 422");

      // 4. Seed active RUNNING workflows to test transitions (pause, resume, cancel)
      const activeWfId = "rec-wf-test-active-1";
      const payloadActive = {
        id: activeWfId,
        status: "RUNNING",
        submissions: payload.submissions,
        job: payload.job,
        auditTrail: ["Seeded active workflow for transition testing."],
        startTime: new Date().toISOString()
      };
      
      (RecruitmentController as any).workflows.set(activeWfId, payloadActive);

      // Pause active
      const resPauseActive = await makeRequest("POST", "/api/v1/recruitment/workflow/pause", { workflowId: activeWfId });
      assert.equal(resPauseActive.status, 200);
      assert.equal(resPauseActive.body.data.status, "PAUSED");

      // Resume paused
      const resResumeActive = await makeRequest("POST", "/api/v1/recruitment/workflow/resume", { workflowId: activeWfId });
      assert.equal(resResumeActive.status, 200);
      assert.equal(resResumeActive.body.data.status, "COMPLETED");

      // Seed another active to test cancellation
      const cancelWfId = "rec-wf-test-cancel-1";
      const payloadCancel = {
        id: cancelWfId,
        status: "RUNNING",
        submissions: payload.submissions,
        job: payload.job,
        auditTrail: ["Seeded active workflow for cancellation testing."],
        startTime: new Date().toISOString()
      };
      (RecruitmentController as any).workflows.set(cancelWfId, payloadCancel);

      const resCancel = await makeRequest("POST", "/api/v1/recruitment/workflow/cancel", { workflowId: cancelWfId });
      assert.equal(resCancel.status, 200);
      assert.equal(resCancel.body.data.status, "CANCELLED");
    });

    // SCENARIO 5: BPE process endpoints execution
    await suite.run("POST /api/v1/process/* - Business Process Engine interaction and state checkpoints", async () => {
      const bpe = new BusinessProcessEngine();
      BusinessProcessEngine.resetRegistry();

      const definition: ProcessDefinition = {
        id: "bpe-api-test",
        name: "BPE Endpoint Validation Flow",
        version: 1,
        startStageId: "stage_init",
        stages: [
          {
            id: "stage_init",
            name: "Initialization Stage",
            handler: (ctx) => {
              ctx.stepCompleted = true;
            }
          },
          {
            id: "stage_fail",
            name: "Fragile Stage",
            handler: (ctx) => {
              if (!ctx.bypassFailure) {
                throw new Error("Simulated Checkpoint Failure");
              }
              ctx.resolved = true;
            },
            maxRetries: 0
          }
        ],
        transitions: [
          { fromStageId: "stage_init", toStageId: "stage_fail" }
        ]
      };

      bpe.registerDefinition(definition);

      // 1. Start Process
      const resStart = await makeRequest("POST", "/api/v1/process/start", {
        definitionId: "bpe-api-test"
      });
      assert.equal(resStart.status, 200);
      const instanceId = resStart.body.data.instanceId;
      assert.ok(instanceId);

      // Let process execute. Since it fails on stage_fail, status should transition to FAILED
      await sleep(100);

      // 2. Fetch State
      const resGet = await makeRequest("GET", `/api/v1/process/${instanceId}`);
      assert.equal(resGet.status, 200);
      assert.equal(resGet.body.data.status, "FAILED");
      assert.equal(resGet.body.data.currentStageId, "stage_fail");

      // 3. Retry Failure (without bypass, should fail again)
      const resRetryFail = await makeRequest("POST", "/api/v1/process/retry", {
        instanceId,
        stageId: "stage_fail"
      });
      assert.equal(resRetryFail.status, 200);
      assert.equal(resRetryFail.body.data.status, "FAILED"); // Fails immediately/synchronously

      await sleep(100);

      // 4. Update context to bypass and retry again
      const currentInst = bpe.getInstance(instanceId);
      if (currentInst) {
        currentInst.context.bypassFailure = true;
      }

      const resRetrySuccess = await makeRequest("POST", "/api/v1/process/retry", {
        instanceId,
        stageId: "stage_fail"
      });
      assert.equal(resRetrySuccess.status, 200);

      await sleep(100);

      const resGetFinal = await makeRequest("GET", `/api/v1/process/${instanceId}`);
      assert.equal(resGetFinal.body.data.status, "COMPLETED");
      assert.ok(resGetFinal.body.data.context.resolved);
    });

    // SCENARIO 6: Centralized validation failure mapping
    await suite.run("Centralized validation middleware assertions", async () => {
      // Invalid assess body
      const resAssess = await makeRequest("POST", "/api/v1/recruitment/assess", {
        candidate: { name: "Missing Skills" }
      });
      assert.equal(resAssess.status, 400);
      assert.ok(resAssess.body.errors.length > 0);
      assert.ok(resAssess.body.errors[0].includes("skills"));

      // Invalid process start body
      const resProc = await makeRequest("POST", "/api/v1/process/start", {});
      assert.equal(resProc.status, 400);
      assert.ok(resProc.body.errors[0].includes("definitionId"));
    });

    // SCENARIO 7: Authentication stub behavior
    await suite.run("Authentication and authorization stub scenarios", async () => {
      // Invalid Bearer Token
      const resAuthBearer = await makeRequest("POST", "/api/v1/recruitment/assess", {}, {
        "Authorization": "Bearer invalid-token"
      });
      assert.equal(resAuthBearer.status, 401);
      assert.ok(resAuthBearer.body.errors[0].includes("invalid or expired"));

      // Invalid API Key
      const resApiKey = await makeRequest("POST", "/api/v1/recruitment/assess", {}, {
        "x-api-key": "invalid-key"
      });
      assert.equal(resApiKey.status, 403);
      assert.ok(resApiKey.body.errors[0].includes("Invalid API Key"));
    });

    // SCENARIO 8: Error mapper mapping to correct HTTP statuses
    await suite.run("Unified error mapper status resolution", async () => {
      // 404 Process Not Found
      const res404 = await makeRequest("GET", "/api/v1/process/non-existent-instance-id");
      assert.equal(res404.status, 404);
      assert.ok(res404.body.errors[0].includes("not found"));

      // 422 Invalid Process State Action
      const res422 = await makeRequest("POST", "/api/v1/process/pause", { instanceId: "non-existent" });
      assert.equal(res422.status, 404); // Not found takes precedence
    });

    // SCENARIO 9: OpenAPI specification generation
    await suite.run("GET /api/v1/openapi.json - OpenAPI 3.1 schema auto-generation", async () => {
      const res = await makeRequest("GET", "/api/v1/openapi.json");
      assert.equal(res.status, 200);
      assert.equal(res.body.openapi, "3.1.0");
      assert.ok(res.body.paths["/recruitment/assess"]);
      assert.ok(res.body.components.schemas.StandardResponse);
    });

    // SCENARIO 10: High Concurrency Load Test (1000 requests)
    await suite.run("Load Test - 1000 concurrent API requests", async () => {
      console.log("     Spawning 1000 concurrent HTTP requests asynchronously...");
      const startLoad = Date.now();

      const promises = Array.from({ length: 1000 }).map(() =>
        makeRequest("GET", "/api/v1/health")
      );

      const results = await Promise.all(promises);
      const durationLoad = Date.now() - startLoad;

      console.log(`     1000 requests completed in ${durationLoad}ms.`);

      const allSuccess = results.every(res => res.status === 200 && res.body.success);
      assert.ok(allSuccess, "All 1000 requests must return 200 OK with success format");

      // Verify no shared request state - each request must have its own unique Request ID returned in header/body
      const requestIds = results.map(res => res.body.requestId);
      const uniqueRequestIds = new Set(requestIds);
      assert.equal(uniqueRequestIds.size, 1000, "Every concurrent request must maintain strict isolation and propagate its own Request ID");
    });

  } finally {
    // Tear down test server
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log("[TEST SERVER] Successfully terminated.");
        resolve();
      });
    });
  }

  suite.report();
}

// Execute directly if run via CLI
runApiGatewayTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error("Test Suite execution crashed:", err);
  process.exit(1);
});
