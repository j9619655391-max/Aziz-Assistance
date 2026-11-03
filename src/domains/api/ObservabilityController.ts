import { Request, Response, NextFunction } from "express";
import { ApiController, ApiMetrics } from "./ApiController";
import { ApiResponseFactory } from "./ApiResponseFactory";

export class ObservabilityController extends ApiController {
  
  /**
   * GET /api/v1/metrics
   */
  public getMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const services = this.getServices();
      const metricsSummary = services.metricsService.getMetricsSummary();
      const apiMetricsReport = ApiMetrics.getMetricsReport();
      
      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;

      res.json(ApiResponseFactory.createSuccess({
        ...metricsSummary,
        apiGatewayMetrics: apiMetricsReport
      }, duration));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  /**
   * GET /api/v1/diagnostics
   */
  public getDiagnostics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const services = this.getServices();
      const diagnosticDump = await services.diagnosticsService.getDiagnosticDump();
      
      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;

      res.json(ApiResponseFactory.createSuccess(diagnosticDump, duration));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  /**
   * GET /api/v1/health/full
   */
  public getFullHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const services = this.getServices();
      const healthReport = await services.healthService.getFullHealthReport();
      
      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;

      res.json(ApiResponseFactory.createSuccess(healthReport, duration));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  /**
   * GET /api/v1/traces/:traceId
   */
  public getTrace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const services = this.getServices();
      const traceSpans = services.tracingService.getTrace(req.params.traceId);
      
      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;

      res.json(ApiResponseFactory.createSuccess({
        traceId: req.params.traceId,
        spansCount: traceSpans.length,
        spans: traceSpans
      }, duration));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  /**
   * GET /api/v1/alerts
   */
  public getAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const services = this.getServices();
      const alerts = services.observabilityAlertService.getAllAlerts();
      const active = services.observabilityAlertService.getActiveAlerts();
      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;
      res.json(ApiResponseFactory.createSuccess({ alerts, active }, duration));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  /**
   * POST /api/v1/alerts/resolve
   */
  public resolveAlert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const { ruleName } = req.body;
      const services = this.getServices();
      const resolved = services.observabilityAlertService.resolveAlert(ruleName || "Workflow Failure");
      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;
      res.json(ApiResponseFactory.createSuccess({ resolved }, duration));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  /**
   * POST /api/v1/alerts/clear
   */
  public clearAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const services = this.getServices();
      services.observabilityAlertService.clearAlerts();
      const duration = Date.now() - startTime;
      ApiMetrics.totalApiLatency += duration;
      res.json(ApiResponseFactory.createSuccess({ success: true }, duration));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };
}
