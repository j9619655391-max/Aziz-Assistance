import { Request, Response, NextFunction } from "express";
import { ApiResponseFactory } from "./ApiResponseFactory";

export class ErrorMiddleware {
  /**
   * Unified error mapper middleware.
   * Resolves appropriate HTTP semantic status codes based on error categories.
   */
  public static handle(err: any, req: Request, res: Response, next: NextFunction): void {
    const message = err.message || "An unexpected error occurred.";
    let status = 500;

    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes("not found") || lowerMsg.includes("definition lost") || lowerMsg.includes("corrupted")) {
      status = 404;
    } else if (lowerMsg.includes("already exists") || lowerMsg.includes("conflict") || lowerMsg.includes("duplicate")) {
      status = 409;
    } else if (lowerMsg.includes("unauthorized") || lowerMsg.includes("token is invalid") || lowerMsg.includes("authentication required")) {
      status = 401;
    } else if (lowerMsg.includes("forbidden") || lowerMsg.includes("invalid api key")) {
      status = 403;
    } else if (lowerMsg.includes("cannot pause") || lowerMsg.includes("cannot resume") || lowerMsg.includes("cannot cancel") || lowerMsg.includes("cannot retry") || lowerMsg.includes("can only retry")) {
      // Unprocessable requests due to invalid transition/status
      status = 422;
    } else if (lowerMsg.includes("invalid") || lowerMsg.includes("malformed") || lowerMsg.includes("validation")) {
      status = 400;
    } else if (lowerMsg.includes("too many requests") || lowerMsg.includes("rate limit") || lowerMsg.includes("limit exceeded")) {
      status = 429;
    } else if (lowerMsg.includes("unavailable") || lowerMsg.includes("timeout") || lowerMsg.includes("busy")) {
      status = 503;
    }

    const duration = (req as any).startTime ? (Date.now() - (req as any).startTime) : 0;
    res.status(status).json(ApiResponseFactory.createError([message], duration));
  }
}
