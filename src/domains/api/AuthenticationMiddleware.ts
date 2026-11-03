import { Request, Response, NextFunction } from "express";
import { ApiResponseFactory } from "./ApiResponseFactory";

export class AuthenticationMiddleware {
  /**
   * Stub authentication handler supporting Bearer Token, API Key, and future JWTs.
   */
  public handle(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers["x-api-key"] || req.headers["api-key"];

    // Basic Stub rules for testing:
    // 1. If "Authorization: Bearer invalid-token" is provided, deny access.
    if (authHeader) {
      if (!authHeader.startsWith("Bearer ")) {
        res.status(401).json(
          ApiResponseFactory.createError(["Invalid Authorization header format. Must use Bearer token."], 0)
        );
        return;
      }
      const token = authHeader.substring(7);
      if (token === "invalid-token" || token === "expired-token") {
        res.status(401).json(ApiResponseFactory.createError(["Unauthorized: Token is invalid or expired."], 0));
        return;
      }
      (req as any).user = { id: "user-123", role: "recruiter", authType: "Bearer" };
      (req as any).authenticated = true;
      next();
      return;
    }

    // 2. If "x-api-key: invalid-key" is provided, deny access.
    if (apiKeyHeader) {
      const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
      if (apiKey === "invalid-key") {
        res.status(403).json(ApiResponseFactory.createError(["Forbidden: Invalid API Key."], 0));
        return;
      }
      (req as any).user = { id: "api-client", role: "integration", authType: "APIKey" };
      (req as any).authenticated = true;
      next();
      return;
    }

    // 3. For public/stub nature, allow if no headers are sent, but tag as anonymous
    (req as any).user = { id: "anonymous", role: "guest", authType: "None" };
    (req as any).authenticated = false;
    next();
  }

  /**
   * Guard for strictly protected routes requiring authentication
   */
  public requireAuth(req: Request, res: Response, next: NextFunction): void {
    if (!(req as any).authenticated || (req as any).user?.id === "anonymous") {
      res.status(401).json(ApiResponseFactory.createError(["Authentication required."], 0));
      return;
    }
    next();
  }
}
