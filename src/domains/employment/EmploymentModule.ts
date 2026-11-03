import BaseModule from "../../kernel/module/BaseModule";
import { ModuleMetadata } from "../../kernel/module/types";
import { JobSearchService } from "./JobSearchService";
import { ATSService } from "./ATSService";
import { MatchingService } from "./MatchingService";
import { ResumeService } from "./ResumeService";
import { EmploymentV2Service } from "./EmploymentV2Service";

export class EmploymentModule extends BaseModule {
  public metadata: ModuleMetadata = {
    id: "employment",
    name: "Employment Module",
    version: "1.0.0",
    description: "Full-time job listings fetching, ATS-friendly optimization, resume matchmaking, and cover letter generators.",
    author: "Employment & Career Domain",
    capabilities: ["JOB_SEARCHING", "ATS_RESUME_COMPARE", "CAREER_MATCHMAKING"],
    dependencies: ["repository", "provider", "infrastructure"],
    requiredServices: ["JobSearchService", "ATSService", "MatchingService", "ResumeService", "EmploymentV2Service"],
  };

  private jobSearchService: JobSearchService | null = null;
  private atsService: ATSService | null = null;
  private matchingService: MatchingService | null = null;
  private resumeService: ResumeService | null = null;
  private employmentV2Service: EmploymentV2Service | null = null;

  protected async startup(registry: any): Promise<void> {
    this.jobSearchService = registry.jobSearchService;
    this.atsService = registry.atsService;
    this.matchingService = registry.matchingService;
    this.resumeService = registry.resumeService;
    this.employmentV2Service = registry.employmentV2Service;

    if (!this.jobSearchService || !this.atsService || !this.matchingService || !this.resumeService || !this.employmentV2Service) {
      throw new Error("Missing required services for EmploymentModule startup");
    }
  }
}
