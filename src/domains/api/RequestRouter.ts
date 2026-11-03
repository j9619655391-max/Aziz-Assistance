import { Router } from "express";
import { RecruitmentController, ProcessController, SystemController, CareerSupervisorController } from "./ApiController";
import { IdentityController } from "./IdentityController";
import { ObservabilityController } from "./ObservabilityController";
import { ValidationMiddleware } from "./ValidationMiddleware";
import { AuthenticationMiddleware } from "./AuthenticationMiddleware";

export class RequestRouter {
  private router = Router();
  private recruitmentCtrl = new RecruitmentController();
  private processCtrl = new ProcessController();
  private systemCtrl = new SystemController();
  private identityCtrl = new IdentityController();
  private observabilityCtrl = new ObservabilityController();
  private supervisorCtrl = new CareerSupervisorController();
  private authMiddleware = new AuthenticationMiddleware();

  constructor() {
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Authenticate and propagate stub user context on all requested API endpoints
    const auth = (req: any, res: any, next: any) => this.authMiddleware.handle(req, res, next);

    // ----------------- SYSTEM ENDPOINTS -----------------
    this.router.get("/health", this.systemCtrl.getHealth);
    this.router.get("/version", this.systemCtrl.getVersion);
    this.router.get("/build", this.systemCtrl.getBuild);
    this.router.get("/status", this.systemCtrl.getStatus);
    this.router.get("/openapi.json", this.systemCtrl.getOpenApiSpec);
    this.router.get("/docs", this.systemCtrl.getDocsHtml);
    this.router.get("/swagger", this.systemCtrl.getDocsHtml);

    // ----------------- RECRUITMENT ENDPOINTS -----------------
    this.router.post(
      "/recruitment/assess",
      auth,
      ValidationMiddleware.validate("recruitment/assess"),
      this.recruitmentCtrl.assessCandidate
    );
    this.router.post(
      "/recruitment/workflow/start",
      auth,
      ValidationMiddleware.validate("recruitment/workflow/start"),
      this.recruitmentCtrl.startWorkflow
    );
    this.router.post(
      "/recruitment/workflow/pause",
      auth,
      ValidationMiddleware.validate("recruitment/workflow/action"),
      this.recruitmentCtrl.pauseWorkflow
    );
    this.router.post(
      "/recruitment/workflow/resume",
      auth,
      ValidationMiddleware.validate("recruitment/workflow/action"),
      this.recruitmentCtrl.resumeWorkflow
    );
    this.router.post(
      "/recruitment/workflow/cancel",
      auth,
      ValidationMiddleware.validate("recruitment/workflow/action"),
      this.recruitmentCtrl.cancelWorkflow
    );
    this.router.get(
      "/recruitment/workflow/:id",
      auth,
      this.recruitmentCtrl.getWorkflowState
    );

    // ----------------- PROCESS ENDPOINTS -----------------
    this.router.post(
      "/process/start",
      auth,
      ValidationMiddleware.validate("process/start"),
      this.processCtrl.startProcess
    );
    this.router.post(
      "/process/pause",
      auth,
      ValidationMiddleware.validate("process/action"),
      this.processCtrl.pauseProcess
    );
    this.router.post(
      "/process/resume",
      auth,
      ValidationMiddleware.validate("process/action"),
      this.processCtrl.resumeProcess
    );
    this.router.post(
      "/process/retry",
      auth,
      ValidationMiddleware.validate("process/retry"),
      this.processCtrl.retryProcessStage
    );
    this.router.post(
      "/process/cancel",
      auth,
      ValidationMiddleware.validate("process/action"),
      this.processCtrl.cancelProcess
    );
    this.router.get(
      "/process/:id",
      auth,
      this.processCtrl.getProcessState
    );

    // ----------------- IDENTITY PLATFORM ENDPOINTS -----------------
    this.router.post("/auth/login", this.identityCtrl.login);
    this.router.post("/auth/logout", this.identityCtrl.logout);
    this.router.post("/auth/refresh", this.identityCtrl.refresh);

    this.router.get("/users", auth, this.identityCtrl.getUsers);
    this.router.post("/users", auth, this.identityCtrl.createUser);

    this.router.get("/organizations", auth, this.identityCtrl.getOrganizations);
    this.router.post("/organizations", auth, this.identityCtrl.createOrganization);

    this.router.get("/workspaces", auth, this.identityCtrl.getWorkspaces);
    this.router.post("/workspaces", auth, this.identityCtrl.createWorkspace);

    this.router.get("/roles", auth, this.identityCtrl.getRoles);
    this.router.post("/roles", auth, this.identityCtrl.createRole);

    this.router.get("/permissions", auth, this.identityCtrl.getPermissions);

    // ----------------- ENTERPRISE OBSERVABILITY ENDPOINTS -----------------
    this.router.get("/metrics", auth, this.observabilityCtrl.getMetrics);
    this.router.get("/diagnostics", auth, this.observabilityCtrl.getDiagnostics);
    this.router.get("/health/full", auth, this.observabilityCtrl.getFullHealth);
    this.router.get("/traces/:traceId", auth, this.observabilityCtrl.getTrace);
    this.router.get("/alerts", auth, this.observabilityCtrl.getAlerts);
    this.router.post("/alerts/resolve", auth, this.observabilityCtrl.resolveAlert);
    this.router.post("/alerts/clear", auth, this.observabilityCtrl.clearAlerts);

    // ----------------- CAREER SUPERVISOR ENDPOINTS -----------------
    this.router.post("/supervisor/cycle", auth, this.supervisorCtrl.triggerCycle);
    this.router.get("/supervisor/summary", auth, this.supervisorCtrl.getExecutiveSummary);
    this.router.post("/supervisor/application", auth, this.supervisorCtrl.triggerApplication);
  }

  /**
   * Retrieves the fully-mapped Express router instance.
   */
  public getRouter(): Router {
    return this.router;
  }
}
