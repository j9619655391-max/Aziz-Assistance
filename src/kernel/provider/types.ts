import { Job, FreelanceGig } from "../../types";

export type ProviderType = "GoogleSearchGrounding" | "API" | "RSS" | "WebScraper" | "Mock" | "Database";
export type HealthStatus = "healthy" | "degraded" | "offline" | "rate-limited" | "maintenance" | "auth-failed";
export type ResponseOrigin = "LIVE" | "CACHE" | "DEGRADED" | "UNAVAILABLE";

export interface ProviderCapabilityMatrix {
  supportedCountries: string[]; // e.g. ["India", "USA", "UK", "UAE", "Global"]
  supportedJobTypes: string[]; // e.g. ["Full-time", "Part-time", "Contract", "Freelance"]
  supportedFreelancePlatforms: string[]; // e.g. ["Upwork", "Freelancer", "Toptal", "Fiverr", "Guru"]
  supportsSalary: boolean;
  supportsRecruiters: boolean;
  supportsRemoteJobs: boolean;
  supportsVisaJobs: boolean;
  supportsCompanyUrls: boolean;
  supportsPagination: boolean;
  supportsSearch: boolean;
}

export interface ProviderRateLimits {
  requestsPerMinute: number;
  burstLimit?: number;
}

export interface ProviderRetryPolicy {
  maxRetries: number;
  backoffFactorMs: number;
}

export interface ProviderMetadata {
  id: string;
  name: string;
  version: string;
  type: ProviderType;
  authenticationRequired: boolean;
  capabilities: ProviderCapabilityMatrix;
  rateLimits: ProviderRateLimits;
  retryPolicy: ProviderRetryPolicy;
  priority: number; // Higher number = higher priority
}

export interface ProviderDiagnostics {
  version: string;
  health: HealthStatus;
  lastActive?: Date;
  lastSuccess?: Date;
  lastFailure?: Date;
  lastError?: string;
  totalCalls: number;
  failedCalls: number;
  latencySamples: number[];
  averageLatencyMs: number;
  cacheSize: number;
  cacheHitRate: number;
  rateLimitRemaining?: number;
  authenticationStatus: string;
}

export interface CacheMetadata {
  cacheCreated: string;
  lastRefresh: string;
  expiresAt: string;
  provider: string;
  originalQuery: string;
  providerVersion: string;
  originalFetchTimestamp: string;
  cacheAgeSeconds: number;
  cacheExpirationSeconds: number;
}

export interface DegradedMetadata {
  reason: string;
  lastSuccessfulFetchTime?: string;
}

export interface ResponseProvenance {
  origin: ResponseOrigin;
  providerId: string;
  providerName: string;
  providerVersion: string;
  durationMs: number;
  requestId: string;
  cacheUsed: boolean;
  retryCount: number;
  healthStatus: HealthStatus;
  finalStatus: string;
  cacheMetadata?: CacheMetadata;
  degradedMetadata?: DegradedMetadata;
}

export interface ProviderFetchJobsResult {
  jobs: Job[];
  provenance: ResponseProvenance;
}

export interface ProviderFetchGigsResult {
  gigs: FreelanceGig[];
  provenance: ResponseProvenance;
}

export interface IDataProvider {
  metadata: ProviderMetadata;
  getHealth(): Promise<HealthStatus>;
  getDiagnostics(): ProviderDiagnostics;
  resetDiagnostics(): void;
  
  fetchJobs(
    query: string,
    skills: string[],
    preferredCountries: string[],
    visaPreference: string,
    options?: { page?: number; limit?: number; requestId?: string }
  ): Promise<ProviderFetchJobsResult>;

  fetchGigs(
    query: string,
    skills: string[],
    options?: { page?: number; limit?: number; requestId?: string }
  ): Promise<ProviderFetchGigsResult>;
}

