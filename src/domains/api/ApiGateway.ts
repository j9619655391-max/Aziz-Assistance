import { Express, Router } from "express";
import { RequestRouter } from "./RequestRouter";
import { ErrorMiddleware } from "./ErrorMiddleware";

export class ApiGateway {
  private requestRouter = new RequestRouter();

  /**
   * Mounts the Unified versioned API platform (/api/v1/) onto the Express application.
   */
  public mount(app: Express): void {
    // Mount the versioned endpoints
    app.use("/api/v1", this.requestRouter.getRouter());

    // Register unified error mapper middleware as the error fallback
    app.use((err: any, req: any, res: any, next: any) => {
      ErrorMiddleware.handle(err, req, res, next);
    });
  }

  /**
   * Exposes the v1 router directly for isolated orchestration and test environments.
   */
  public getV1Router(): Router {
    return this.requestRouter.getRouter();
  }
}
