import { Request, Response, NextFunction } from "express";
import { ServiceRegistry } from "../../services/backend/ServiceRegistry";
import { ApiResponseFactory } from "./ApiResponseFactory";
import { BusinessProcessEngine } from "../shared/BusinessProcessEngine";
import { OpenApiGenerator } from "./OpenApiGenerator";
import { getRequestId } from "../../kernel/context";
import crypto from "crypto";

/**
 * Centrally manages observability metrics for the unified API platform.
 */
export class ApiMetrics {
  public static requestCount = 0;
  public static errorCount = 0;
  public static activeRequests = 0;
  public static totalApiLatency = 0;
  public static processLatencyCount = 0;
  public static totalProcessLatency = 0;

  public static getMetricsReport() {
    return {
      requestCount: ApiMetrics.requestCount,
      errorCount: ApiMetrics.errorCount,
      activeRequests: ApiMetrics.activeRequests,
      averageApiLatencyMs: ApiMetrics.requestCount > 0 ? parseFloat((ApiMetrics.totalApiLatency / ApiMetrics.requestCount).toFixed(2)) : 0,
      averageProcessLatencyMs: ApiMetrics.processLatencyCount > 0 ? parseFloat((ApiMetrics.totalProcessLatency / ApiMetrics.processLatencyCount).toFixed(2)) : 0,
    };
  }
}

/**
 * Abstract Base Controller class
 */
export abstract class ApiController {
  protected getServices(): ServiceRegistry {
    return ServiceRegistry.getInstance();
  }
}

/**
 * RecruitmentController handles all recruitment-related v1 routes.
 */
export class RecruitmentController extends ApiController {
  // In-memory thread-safe registry of active workflows
  private static workflows = new Map<string, any>();

  public static clearWorkflows(): void {
    RecruitmentController.workflows.clear();
  }

  /**
   * Assesses a single candidate against a job description.
   * POST /api/v1/recruitment/assess
   */
  public assessCandidate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const services = this.getServices();
      const { candidate, job, options } = req.body;

      const result = await services.recruitmentIntelligenceModule.assessCandidate(candidate, job, options);

      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;

      res.json(ApiResponseFactory.createSuccess(result, duration));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  /**
   * Initiates a multi-candidate recruitment assessment workflow.
   * POST /api/v1/recruitment/workflow/start
   */
  public startWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const services = this.getServices();
      const { submissions, job, options } = req.body;

      // SPRINT: Generate UUID and propagate across API/BPE/Workflow/Coordinator
      const workflowId = options?.correlationId || `wf-${crypto.randomUUID()}`;

      const workflowInstance = {
        id: workflowId,
        status: "RUNNING",
        submissions,
        job,
        options,
        auditTrail: [`Recruitment workflow started with id: ${workflowId}`],
        startTime: new Date().toISOString(),
      };

      RecruitmentController.workflows.set(workflowId, workflowInstance);

      // Execute actual core workflow engine logic
      const result = await services.recruitmentWorkflowEngine.executeWorkflow(submissions, job, {
        ...options,
        correlationId: workflowId,
      });

      workflowInstance.status = "COMPLETED";
      workflowInstance.auditTrail.push("Recruitment workflow successfully completed.");
      (workflowInstance as any).result = result;

      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;

      res.json(ApiResponseFactory.createSuccess(workflowInstance, duration));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  /**
   * Pauses an active recruitment workflow.
   * POST /api/v1/recruitment/workflow/pause
   */
  public pauseWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const { workflowId, id } = req.body;
      const targetId = workflowId || id;

      const instance = RecruitmentController.workflows.get(targetId);
      if (!instance) {
        throw new Error(`Recruitment workflow not found: ${targetId}`);
      }

      if (instance.status !== "RUNNING" && instance.status !== "CREATED") {
        throw new Error(`Cannot pause recruitment workflow with status: ${instance.status}`);
      }

      instance.status = "PAUSED";
      instance.auditTrail.push("Recruitment workflow explicitly paused.");

      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;

      res.json(ApiResponseFactory.createSuccess(instance, duration));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  /**
   * Resumes a paused recruitment workflow.
   * POST /api/v1/recruitment/workflow/resume
   */
  public resumeWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const { workflowId, id } = req.body;
      const targetId = workflowId || id;

      const instance = RecruitmentController.workflows.get(targetId);
      if (!instance) {
        throw new Error(`Recruitment workflow not found: ${targetId}`);
      }

      if (instance.status !== "PAUSED") {
        throw new Error(`Cannot resume recruitment workflow with status: ${instance.status}`);
      }

      instance.status = "RUNNING";
      instance.auditTrail.push("Recruitment workflow resumed.");

      // Re-trigger/finish workflow
      const services = this.getServices();
      const result = await services.recruitmentWorkflowEngine.executeWorkflow(
        instance.submissions,
        instance.job,
        { ...instance.options, correlationId: targetId }
      );

      instance.status = "COMPLETED";
      instance.auditTrail.push("Recruitment workflow successfully completed after resume.");
      instance.result = result;

      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;

      res.json(ApiResponseFactory.createSuccess(instance, duration));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  /**
   * Cancels a recruitment workflow.
   * POST /api/v1/recruitment/workflow/cancel
   */
  public cancelWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const { workflowId, id } = req.body;
      const targetId = workflowId || id;

      const instance = RecruitmentController.workflows.get(targetId);
      if (!instance) {
        throw new Error(`Recruitment workflow not found: ${targetId}`);
      }

      if (instance.status === "COMPLETED" || instance.status === "CANCELLED") {
        throw new Error(`Cannot cancel finished recruitment workflow. Current status: ${instance.status}`);
      }

      instance.status = "CANCELLED";
      instance.endTime = new Date().toISOString();
      instance.auditTrail.push("Recruitment workflow explicitly cancelled.");

      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;

      res.json(ApiResponseFactory.createSuccess(instance, duration));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  /**
   * Retrieves a recruitment workflow's full state.
   * GET /api/v1/recruitment/workflow/:id
   */
  public getWorkflowState = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const { id } = req.params;

      const instance = RecruitmentController.workflows.get(id);
      if (!instance) {
        throw new Error(`Recruitment workflow not found: ${id}`);
      }

      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;

      res.json(ApiResponseFactory.createSuccess(instance, duration));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };
}

/**
 * ProcessController orchestrates Business Process Engine endpoints.
 */
export class ProcessController extends ApiController {
  private bpe = new BusinessProcessEngine();

  /**
   * Starts a dynamic, domain-agnostic BPE process.
   * POST /api/v1/process/start
   */
  public startProcess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const { definitionId, initialContext, version } = req.body;

      // Measure BPE internal execution latency as requested by OBSERVABILITY
      const processStart = Date.now();
      const instance = await this.bpe.startProcess(definitionId, initialContext, version);
      const processLatency = Date.now() - processStart;

      ApiMetrics.totalProcessLatency += processLatency;
      ApiMetrics.processLatencyCount++;

      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;

      res.json(ApiResponseFactory.createSuccess(instance, duration, processLatency));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  /**
   * Pauses an active BPE process.
   * POST /api/v1/process/pause
   */
  public pauseProcess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const { instanceId, id } = req.body;
      const targetId = instanceId || id;

      const processStart = Date.now();
      const instance = await this.bpe.pauseProcess(targetId);
      const processLatency = Date.now() - processStart;

      ApiMetrics.totalProcessLatency += processLatency;
      ApiMetrics.processLatencyCount++;

      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;

      res.json(ApiResponseFactory.createSuccess(instance, duration, processLatency));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  /**
   * Resumes a paused BPE process.
   * POST /api/v1/process/resume
   */
  public resumeProcess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const { instanceId, id } = req.body;
      const targetId = instanceId || id;

      const processStart = Date.now();
      const instance = await this.bpe.resumeProcess(targetId);
      const processLatency = Date.now() - processStart;

      ApiMetrics.totalProcessLatency += processLatency;
      ApiMetrics.processLatencyCount++;

      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;

      res.json(ApiResponseFactory.createSuccess(instance, duration, processLatency));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  /**
   * Retries a specific failed process stage.
   * POST /api/v1/process/retry
   */
  public retryProcessStage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const { instanceId, id, stageId } = req.body;
      const targetId = instanceId || id;

      const processStart = Date.now();
      const instance = await this.bpe.retryStage(targetId, stageId);
      const processLatency = Date.now() - processStart;

      ApiMetrics.totalProcessLatency += processLatency;
      ApiMetrics.processLatencyCount++;

      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;

      res.json(ApiResponseFactory.createSuccess(instance, duration, processLatency));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  /**
   * Aborts and cancels an active BPE process.
   * POST /api/v1/process/cancel
   */
  public cancelProcess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const { instanceId, id } = req.body;
      const targetId = instanceId || id;

      const processStart = Date.now();
      const instance = await this.bpe.cancelProcess(targetId);
      const processLatency = Date.now() - processStart;

      ApiMetrics.totalProcessLatency += processLatency;
      ApiMetrics.processLatencyCount++;

      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;

      res.json(ApiResponseFactory.createSuccess(instance, duration, processLatency));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  /**
   * Gets a process instance's detailed state.
   * GET /api/v1/process/:id
   */
  public getProcessState = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const { id } = req.params;

      const instance = this.bpe.getInstance(id);
      if (!instance) {
        throw new Error(`Process instance not found: ${id}`);
      }

      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;

      res.json(ApiResponseFactory.createSuccess(instance, duration));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };
}

/**
 * SystemController handles standard monitoring and metadata.
 */
export class SystemController extends ApiController {
  private openApiGen = new OpenApiGenerator();

  public getHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.requestCount++;
    const duration = Date.now() - startTime;
    res.json(ApiResponseFactory.createSuccess({ status: "healthy", timestamp: new Date().toISOString() }, duration));
  };

  public getVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.requestCount++;
    const duration = Date.now() - startTime;
    res.json(ApiResponseFactory.createSuccess({ version: "1.0.0", apiVersion: "v1" }, duration));
  };

  public getBuild = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.requestCount++;
    const duration = Date.now() - startTime;
    res.json(
      ApiResponseFactory.createSuccess(
        { buildNumber: "20260719.1", commit: "sprint-21-release", environment: "production" },
        duration
      )
    );
  };

  public getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.requestCount++;
    const duration = Date.now() - startTime;
    res.json(ApiResponseFactory.createSuccess(ApiMetrics.getMetricsReport(), duration));
  };

  public getOpenApiSpec = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.requestCount++;
    const duration = Date.now() - startTime;
    res.json(this.openApiGen.generateSpec());
  };

  public getDocsHtml = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Aziz AI Unified Platform API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background: #070b14; color: #f1f5f9; font-family: sans-serif; }
    .top-banner { background: #04060b; border-bottom: 1px solid #1e293b; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; }
    .top-banner h1 { margin: 0; font-size: 16px; font-weight: 700; color: #818cf8; }
    .top-banner a { color: #38bdf8; text-decoration: none; font-size: 13px; margin-left: 16px; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui { background: #070b14; }
    .swagger-ui .scheme-container { background: #04060b; box-shadow: none; border-bottom: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="top-banner">
    <h1>Aziz AI Unified Platform API Specification (OpenAPI 3.1.0)</h1>
    <div>
      <a href="/api/v1/openapi.json" target="_blank">Download openapi.json</a>
      <a href="/">Return to Dashboard</a>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/v1/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`);
  };
}

/**
 * CareerSupervisorController manages Epic 0 Career Supervisor orchestration routes.
 */
export class CareerSupervisorController extends ApiController {
  public triggerCycle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const services = this.getServices();
      const result = await services.careerSupervisorService.runFullSupervisorCycle();
      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;
      res.json(ApiResponseFactory.createSuccess(result, duration));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  public getExecutiveSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const services = this.getServices();
      const summary = await services.careerSupervisorService.generateExecutiveSummary();
      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;
      res.json(ApiResponseFactory.createSuccess(summary, duration));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  public triggerApplication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const { jobId } = req.body;
      if (!jobId) {
        throw new Error("Missing required field: jobId");
      }
      const services = this.getServices();
      const result = await services.careerSupervisorService.triggerApplicationGeneration(jobId);
      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;
      res.json(ApiResponseFactory.createSuccess(result, duration));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };
}
