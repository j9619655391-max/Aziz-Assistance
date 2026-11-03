import BaseModule from "../../kernel/module/BaseModule";
import { ModuleMetadata } from "../../kernel/module/types";
import { FreelanceService } from "./FreelanceService";

export class FreelanceModule extends BaseModule {
  public metadata: ModuleMetadata = {
    id: "freelance",
    name: "Freelance Module",
    version: "1.0.0",
    description: "Freelance contract discovery, automated proposal (pitch) builders, and short-term gig matching.",
    author: "Freelance Domain",
    capabilities: ["GIG_SEARCHING", "AUTOMATED_PROPOSAL_GENERATION"],
    dependencies: ["repository", "provider", "infrastructure", "employment"],
    requiredServices: ["FreelanceService"],
  };

  private freelanceService: FreelanceService | null = null;

  protected async startup(registry: any): Promise<void> {
    this.freelanceService = registry.freelanceService;
    if (!this.freelanceService) {
      throw new Error("Required dependency 'freelanceService' not available in service registry");
    }
  }
}
