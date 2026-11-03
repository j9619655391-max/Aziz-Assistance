import { IAppRepository } from "../shared/repository/IRepository";
import { IdentityAuditLog } from "../../types";

export class AuditIdentityService {
  private static logs: IdentityAuditLog[] = [];

  constructor(private repo: IAppRepository) {}

  /**
   * Tracks an identity or security permission change event.
   */
  public async logEvent(
    userId: string,
    action: "Login" | "Logout" | "Permission Changes" | "Role Changes" | "Workspace Changes" | "Organization Changes" | string,
    details: string,
    tenantId: string,
    organizationId?: string,
    workspaceId?: string,
    ipAddress?: string
  ): Promise<IdentityAuditLog> {
    const log: IdentityAuditLog = {
      id: `audit_${Math.random().toString(36).substring(2)}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      tenantId,
      organizationId,
      workspaceId,
      userId,
      action,
      details,
      ipAddress,
    };

    AuditIdentityService.logs.push(log);
    return log;
  }

  /**
   * Returns a filtered list of audit events for a specific tenant.
   */
  public async getTenantLogs(tenantId: string): Promise<IdentityAuditLog[]> {
    return AuditIdentityService.logs.filter((log) => log.tenantId === tenantId);
  }

  /**
   * Returns a filtered list of audit events for a specific organization under tenant isolation.
   */
  public async getOrganizationLogs(organizationId: string, tenantId: string): Promise<IdentityAuditLog[]> {
    return AuditIdentityService.logs.filter(
      (log) => log.organizationId === organizationId && log.tenantId === tenantId
    );
  }

  /**
   * Safely empties the audit logs.
   */
  public clearLogs(): void {
    AuditIdentityService.logs = [];
  }
}
