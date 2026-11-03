import BaseModule from "../../kernel/module/BaseModule";
import { ModuleMetadata } from "../../kernel/module/types";
import { DiagnosticAgentService } from "./DiagnosticAgentService";
import { SecurityService } from "./SecurityService";
import { SystemAuditService } from "./SystemAuditService";
import { IndexerService } from "./IndexerService";
import { TerminalService } from "./TerminalService";
import { AIService } from "./AIService";
import { ProviderDiagnosticService } from "./ProviderDiagnosticService";

export class InfrastructureModule extends BaseModule {
  public metadata: ModuleMetadata = {
    id: "infrastructure",
    name: "Infrastructure Module",
    version: "1.0.0",
    description: "DevOps diagnostics, Workspace security auditing, system logs, code indexing, secure bash execution, and LLM AI Gateway routing.",
    author: "Platform & Infrastructure Operations",
    capabilities: [
      "WORKSPACE_DIAGNOSTICS",
      "WORKSPACE_SECURITY",
      "SYSTEM_LOG_AUDITING",
      "BASH_TERMINAL_INTERPRETER",
      "AI_CORE_GATEWAY",
    ],
    dependencies: ["repository"],
    requiredServices: [
      "DiagnosticAgentService",
      "SecurityService",
      "SystemAuditService",
      "IndexerService",
      "TerminalService",
      "AIService",
      "ProviderDiagnosticService",
    ],
  };

  private diagnosticAgentService: DiagnosticAgentService | null = null;
  private securityService: SecurityService | null = null;
  private systemAuditService: SystemAuditService | null = null;
  private indexerService: IndexerService | null = null;
  private terminalService: TerminalService | null = null;
  private aiService: AIService | null = null;
  private providerDiagnosticService: ProviderDiagnosticService | null = null;

  protected async startup(registry: any): Promise<void> {
    this.diagnosticAgentService = registry.diagnosticAgentService;
    this.securityService = registry.securityService;
    this.systemAuditService = registry.systemAuditService;
    this.indexerService = registry.indexerService;
    this.terminalService = registry.terminalService;
    this.aiService = registry.aiService;
    this.providerDiagnosticService = registry.providerDiagnosticService;

    if (
      !this.diagnosticAgentService ||
      !this.securityService ||
      !this.systemAuditService ||
      !this.indexerService ||
      !this.terminalService ||
      !this.aiService ||
      !this.providerDiagnosticService
    ) {
      throw new Error("Missing required dependencies for InfrastructureModule startup");
    }
  }

  protected async diagnostics() {
    const logs = this.systemAuditService ? await this.systemAuditService.getLogs() : [];
    const audit = this.securityService ? await this.securityService.runInternalSecurityAudit() : null;
    return {
      loggedEventsCount: logs.length,
      securityScore: audit?.grade || 0,
      securityStatus: audit?.status || "Unknown",
    };
  }
}
