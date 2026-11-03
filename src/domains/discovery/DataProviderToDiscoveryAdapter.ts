/**
 * @file /src/domains/discovery/DataProviderToDiscoveryAdapter.ts
 * @description Adapter that converts any kernel IDataProvider into a unified IDiscoveryProvider.
 * Bridges legacy job/gig providers directly into the Discovery Provider Framework.
 */

import { IDataProvider, HealthStatus, ProviderDiagnostics, ResponseProvenance } from "../../kernel/provider/types";
import { Job, FreelanceGig } from "../../types";
import { 
  IDiscoveryProvider, 
  DiscoveryProviderMetadata, 
  DiscoveryQuery, 
  DiscoveryExecutionOptions, 
  DiscoveredOpportunity, 
  OpportunityType 
} from "./types";
import { generateOpportunityHash, parseRawCompensation } from "./utils";

export class DataProviderToDiscoveryAdapter implements IDiscoveryProvider {
  public metadata: DiscoveryProviderMetadata;
  private dataProvider: IDataProvider;

  constructor(dataProvider: IDataProvider) {
    this.dataProvider = dataProvider;
    const baseMeta = dataProvider.metadata;

    const supportedTypes: OpportunityType[] = [];
    if (baseMeta.capabilities.supportedJobTypes.includes("Full-time")) supportedTypes.push("FULL_TIME");
    if (baseMeta.capabilities.supportedJobTypes.includes("Contract")) supportedTypes.push("CONTRACT");
    if (baseMeta.capabilities.supportedJobTypes.includes("Freelance") || baseMeta.capabilities.supportedFreelancePlatforms.length > 0) {
      supportedTypes.push("FREELANCE");
      supportedTypes.push("PROJECT");
    }
    if (baseMeta.capabilities.supportsRemoteJobs) supportedTypes.push("REMOTE_ONLY");

    this.metadata = {
      id: baseMeta.id,
      name: baseMeta.name,
      version: baseMeta.version,
      priority: baseMeta.priority,
      authenticationRequired: baseMeta.authenticationRequired,
      capabilities: {
        supportedOpportunityTypes: supportedTypes.length > 0 ? supportedTypes : ["FULL_TIME", "CONTRACT", "FREELANCE"],
        supportedCountries: baseMeta.capabilities.supportedCountries,
        supportsRealtimeSearch: baseMeta.capabilities.supportsSearch,
        supportsSalaryFilters: baseMeta.capabilities.supportsSalary,
        supportsRemoteFilters: baseMeta.capabilities.supportsRemoteJobs,
        supportsVisaFilters: baseMeta.capabilities.supportsVisaJobs,
        supportsPagination: baseMeta.capabilities.supportsPagination,
        rateLimitRpm: baseMeta.rateLimits.requestsPerMinute,
      }
    };
  }

  public async getHealth(): Promise<HealthStatus> {
    return this.dataProvider.getHealth();
  }

  public getDiagnostics(): ProviderDiagnostics {
    return this.dataProvider.getDiagnostics();
  }

  public async discover(
    query: DiscoveryQuery,
    options?: DiscoveryExecutionOptions
  ): Promise<{ opportunities: DiscoveredOpportunity[]; provenance: ResponseProvenance }> {
    const skills = query.skills || [];
    const countries = query.countries || ["Global", "India", "USA", "UK"];
    const visaPref = query.visaRequired ? "Yes, Visa Sponsorship Needed" : "Any";
    const requestedTypes = query.opportunityTypes || ["FULL_TIME", "CONTRACT"];
    const requestId = options?.providers ? options.providers.join("-") : query.requestId || `disc-${Date.now()}`;

    const opportunities: DiscoveredOpportunity[] = [];
    let lastProvenance: ResponseProvenance = {
      origin: "LIVE",
      providerId: this.metadata.id,
      providerName: this.metadata.name,
      providerVersion: this.metadata.version,
      durationMs: 0,
      requestId,
      cacheUsed: false,
      retryCount: 0,
      healthStatus: "healthy",
      finalStatus: "Adapter executed successfully"
    };

    const needsJobs = requestedTypes.some(t => t === "FULL_TIME" || t === "CONTRACT" || t === "REMOTE_ONLY" || t === "INTERNSHIP");
    const needsGigs = requestedTypes.some(t => t === "FREELANCE" || t === "PROJECT");

    // 1. Fetch jobs if requested
    if (needsJobs) {
      try {
        const jobResult = await this.dataProvider.fetchJobs(
          query.keywords || "",
          skills,
          countries,
          visaPref,
          { limit: query.limit, page: query.page, requestId }
        );
        lastProvenance = jobResult.provenance;
        for (const job of jobResult.jobs) {
          opportunities.push(this.transformJobToOpportunity(job, jobResult.provenance));
        }
      } catch (err: any) {
        console.warn(`[DataProviderAdapter] Failed to fetch jobs via ${this.metadata.name}:`, err);
      }
    }

    // 2. Fetch gigs if requested
    if (needsGigs) {
      try {
        const gigResult = await this.dataProvider.fetchGigs(
          query.keywords || "",
          skills,
          { limit: query.limit, page: query.page, requestId }
        );
        lastProvenance = gigResult.provenance;
        for (const gig of gigResult.gigs) {
          opportunities.push(this.transformGigToOpportunity(gig, gigResult.provenance));
        }
      } catch (err: any) {
        console.warn(`[DataProviderAdapter] Failed to fetch gigs via ${this.metadata.name}:`, err);
      }
    }

    return {
      opportunities,
      provenance: lastProvenance
    };
  }

  private transformJobToOpportunity(job: Job, prov: ResponseProvenance): DiscoveredOpportunity {
    const oppType: OpportunityType = job.location?.toLowerCase().includes("remote") ? "REMOTE_ONLY" : "FULL_TIME";
    const compensation = parseRawCompensation(job.salary);
    const hash = generateOpportunityHash(job.title, job.company, job.location, oppType);

    return {
      id: job.id,
      externalId: job.id,
      type: oppType,
      title: job.title,
      organization: {
        name: job.company || "Confidential Organization",
        contactEmail: job.publicHrEmail || undefined,
        url: job.originalReference || undefined
      },
      location: {
        raw: job.location || "Remote / Global",
        country: job.country || "Global",
        isRemote: job.location?.toLowerCase().includes("remote") || false,
        remoteType: job.location?.toLowerCase().includes("remote") ? "FULLY_REMOTE" : "HYBRID"
      },
      compensation,
      description: {
        raw: job.description || "No description provided."
      },
      requirements: {
        skills: job.skillsRequired || [],
        visaSupport: job.visaSponsorship || false
      },
      source: {
        providerId: this.metadata.id,
        providerName: this.metadata.name,
        originUrl: job.originalReference || "",
        platform: job.source || "Web Search",
        postedDate: job.postedDate || new Date().toISOString().split("T")[0],
        discoveredAt: job.timestamp || new Date().toISOString()
      },
      metadata: {
        provenance: prov,
        confidenceScore: job.confidenceScore || 90,
        deduplicationHash: hash,
        status: "NEW",
        tags: [oppType, job.country || "Global"]
      },
      rawPayload: job
    };
  }

  private transformGigToOpportunity(gig: FreelanceGig, prov: ResponseProvenance): DiscoveredOpportunity {
    const compensation = parseRawCompensation(gig.budget);
    const hash = generateOpportunityHash(gig.title, gig.platform || "Freelance Platform", "Remote", "FREELANCE");

    return {
      id: gig.id,
      externalId: gig.id,
      type: "FREELANCE",
      title: gig.title,
      organization: {
        name: gig.platform || "Freelance Platform",
        url: gig.originalReference || undefined
      },
      location: {
        raw: "Remote",
        country: "Global",
        isRemote: true,
        remoteType: "FULLY_REMOTE"
      },
      compensation,
      description: {
        raw: gig.description || "No description provided."
      },
      requirements: {
        skills: gig.skillsRequired || [],
        experienceYears: gig.complexity === "Expert" ? 5 : gig.complexity === "Intermediate" ? 2 : 0
      },
      source: {
        providerId: this.metadata.id,
        providerName: this.metadata.name,
        originUrl: gig.originalReference || "",
        platform: gig.platform || gig.source || "Upwork",
        postedDate: gig.postedDate || new Date().toISOString().split("T")[0],
        discoveredAt: gig.timestamp || new Date().toISOString()
      },
      metadata: {
        provenance: prov,
        confidenceScore: gig.confidenceScore || 90,
        deduplicationHash: hash,
        status: "NEW",
        tags: ["FREELANCE", gig.platform || "Platform"]
      },
      rawPayload: gig
    };
  }
}
