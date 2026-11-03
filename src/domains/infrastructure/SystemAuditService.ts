import { IAppRepository } from "../shared/repository/IRepository";
import { SystemLog } from "../shared/repository/types";
import { getRequestId } from "../../kernel/context";

export class SystemAuditService {
  constructor(private repo: IAppRepository) {}

  /**
   * Retrieves all audited system logs
   */
  public async getLogs(): Promise<SystemLog[]> {
    return this.repo.getSystemLogs();
  }

  /**
   * Records a structured audit entry with Request ID propagation
   */
  public async log(
    level: "info" | "warn" | "error" | "success",
    type: "api" | "security" | "daemon" | "database" | "ai",
    message: string
  ): Promise<void> {
    const reqId = getRequestId();
    const formattedMessage = reqId && reqId !== "REQ-SYSTEM-INIT" ? `[${reqId}] ${message}` : message;
    await this.repo.addSystemLog(level, type, formattedMessage);
  }
}

