import { IAppRepository } from "../shared/repository/IRepository";
import { MatchingService, EvaluatedJob } from "./MatchingService";
import { ProviderManager } from "../../kernel/provider/ProviderManager";
import { ResponseProvenance } from "../../kernel/provider/types";

export interface JobSearchResult {
  jobs: EvaluatedJob[];
  status: string;
  provenance: ResponseProvenance;
}

export class JobSearchService {
  constructor(
    private repo: IAppRepository,
    private matchingService: MatchingService,
    private providerManager: ProviderManager
  ) {}

  /**
   * Search jobs with full failover, scoring, and telemetry tracking
   */
  public async searchJobs(
    query: string,
    options?: { page?: number; limit?: number; requestId?: string }
  ): Promise<JobSearchResult> {
    const profile = await this.repo.getJobProfile();
    
    // Fetch live data with automatic priority failover
    const result = await this.providerManager.fetchJobsWithFailover(
      query,
      profile.skills,
      profile.preferredCountries,
      profile.visaPreference,
      options
    );


    // Score matches according to candidate profile criteria
    const evaluatedJobs = result.jobs.map(job => 
      this.matchingService.evaluateJob(job, profile)
    ).sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    const clientStatus = result.provenance.origin === "UNAVAILABLE" ? "Live source unavailable" : result.provenance.origin;

    return {
      jobs: evaluatedJobs,
      status: clientStatus,
      provenance: result.provenance
    };
  }
}
