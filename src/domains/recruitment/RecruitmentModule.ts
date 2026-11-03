import BaseModule from "../../kernel/module/BaseModule";
import { ModuleMetadata } from "../../kernel/module/types";
import { RecruiterService } from "./RecruiterService";

export class RecruitmentModule extends BaseModule {
  public metadata: ModuleMetadata = {
    id: "recruitment",
    name: "Recruitment Module",
    version: "1.0.0",
    description: "Recruiter CRM management, tracking potential recruitment agencies, contacts, and outreach pipelines.",
    author: "CRM & Recruitment Domain",
    capabilities: ["RECRUITER_CONTACT_CRM", "OUTREACH_TRACKING"],
    dependencies: ["repository"],
    requiredServices: ["RecruiterService"],
  };

  private recruiterService: RecruiterService | null = null;

  protected async startup(registry: any): Promise<void> {
    this.recruiterService = registry.recruiterService;
    if (!this.recruiterService) {
      throw new Error("Required dependency 'recruiterService' not available in service registry");
    }
  }

  protected async diagnostics() {
    const contacts = this.recruiterService ? await this.recruiterService.getContacts() : [];
    return {
      trackedRecruitersCount: contacts.length,
    };
  }
}
