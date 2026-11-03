import BaseModule from "../../kernel/module/BaseModule";
import { ModuleMetadata } from "../../kernel/module/types";
import { AlertService } from "./AlertService";

export class AutomationModule extends BaseModule {
  public metadata: ModuleMetadata = {
    id: "automation",
    name: "Automation Module",
    version: "1.0.0",
    description: "Autonomous alert dispatch, live cron-job execution, job scraper schedulers, and periodic diagnostic notifications.",
    author: "Automation & Background Agents",
    capabilities: ["BACKGROUND_CRON_JOBS", "ALERT_DISPATCHING", "PERIODIC_CRAWLERS"],
    dependencies: ["repository", "employment", "communication"],
    requiredServices: ["AlertService"],
  };

  private alertService: AlertService | null = null;

  protected async startup(registry: any): Promise<void> {
    this.alertService = registry.alertService;
    if (!this.alertService) {
      throw new Error("Required dependency 'alertService' not available in service registry");
    }
  }

  protected async shutdown(): Promise<void> {
    if (this.alertService) {
      this.alertService.shutdown();
    }
  }

  protected async diagnostics() {
    const logs = this.alertService ? await this.alertService.getLogs() : [];
    return {
      alertLogsCount: logs.length,
    };
  }
}
