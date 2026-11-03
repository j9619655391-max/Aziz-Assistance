/**
 * @file /src/domains/discovery/types.ts
 * @description Type definitions for the Autonomous Opportunity Discovery Engine (EPIC 1).
 * Defines unified opportunity models, discovery queries, provider capabilities, and execution pipelines.
 */

import { HealthStatus, ProviderDiagnostics, ResponseProvenance } from "../../kernel/provider/types";

export type OpportunityType = 
  | "FULL_TIME" 
  | "CONTRACT" 
  | "FREELANCE" 
  | "PROJECT" 
  | "INTERNSHIP" 
  | "REMOTE_ONLY";

export type RemoteType = "FULLY_REMOTE" | "HYBRID" | "ON_SITE";

export type CompensationPeriod = "YEARLY" | "MONTHLY" | "HOURLY" | "FIXED";

export type OpportunityStatus = "NEW" | "EVALUATED" | "APPLIED" | "ARCHIVED" | "DISQUALIFIED";

export interface OpportunityLocation {
  raw: string;
  country?: string;
  city?: string;
  state?: string;
  isRemote?: boolean;
  remoteType?: RemoteType;
}

export interface OpportunityCompensation {
  min?: number;
  max?: number;
  currency?: string;
  period?: CompensationPeriod;
  isDisclosed?: boolean;
  rawString?: string;
}

export interface OpportunityOrganization {
  name: string;
  domain?: string;
  logo?: string;
  url?: string;
  isVerified?: boolean;
  contactEmail?: string;
}

export interface OpportunityRequirements {
  skills: string[];
  experienceYears?: number;
  education?: string;
  certifications?: string[];
  visaSupport?: boolean;
  securityClearance?: boolean;
}

export interface OpportunityDescription {
  raw: string;
  summary?: string;
  highlights?: string[];
}

export interface OpportunitySource {
  providerId: string;
  providerName: string;
  originUrl: string;
  platform?: string;
  postedDate?: string;
  discoveredAt: string;
}

export interface OpportunityMetadata {
  provenance?: ResponseProvenance;
  confidenceScore: number;
  tags?: string[];
  deduplicationHash: string;
  status: OpportunityStatus;
  customAttributes?: Record<string, any>;
}

/**
 * Canonical Unified Opportunity Model
 */
export interface DiscoveredOpportunity {
  id: string;
  externalId?: string;
  type: OpportunityType;
  title: string;
  organization: OpportunityOrganization;
  location: OpportunityLocation;
  compensation?: OpportunityCompensation;
  description: OpportunityDescription;
  requirements: OpportunityRequirements;
  source: OpportunitySource;
  metadata: OpportunityMetadata;
  rawPayload?: any;
}

/**
 * Standard Discovery Search Query
 */
export interface DiscoveryQuery {
  keywords?: string;
  skills?: string[];
  targetRoles?: string[];
  countries?: string[];
  opportunityTypes?: OpportunityType[];
  visaRequired?: boolean;
  remoteOnly?: boolean;
  minSalary?: number;
  limit?: number;
  page?: number;
  requestId?: string;
}

/**
 * Discovery Execution Configuration Options
 */
export interface DiscoveryExecutionOptions {
  providers?: string[]; // Specific provider IDs to use
  timeoutMs?: number;
  enableFailover?: boolean;
  deduplicate?: boolean;
  minConfidenceThreshold?: number;
  parallelExecution?: boolean;
}

/**
 * Capabilities Matrix for Discovery Providers
 */
export interface DiscoveryProviderCapabilities {
  supportedOpportunityTypes: OpportunityType[];
  supportedCountries: string[];
  supportsRealtimeSearch: boolean;
  supportsSalaryFilters: boolean;
  supportsRemoteFilters: boolean;
  supportsVisaFilters: boolean;
  supportsPagination: boolean;
  rateLimitRpm: number;
}

export interface DiscoveryProviderMetadata {
  id: string;
  name: string;
  version: string;
  priority: number; // Higher number = higher priority
  authenticationRequired: boolean;
  capabilities: DiscoveryProviderCapabilities;
}

export interface ProviderExecutionStats {
  providerId: string;
  providerName: string;
  durationMs: number;
  count: number;
  status: "SUCCESS" | "FAILED" | "DEGRADED" | "SKIPPED";
  error?: string;
}

export interface DiscoveryExecutionResult {
  executionId: string;
  query: DiscoveryQuery;
  opportunities: DiscoveredOpportunity[];
  totalDiscovered: number;
  deduplicatedCount: number;
  providerStats: Record<string, ProviderExecutionStats>;
  timestamp: string;
  durationMs: number;
  provenanceChain: ResponseProvenance[];
}

/**
 * Standard interface for all Opportunity Discovery Providers
 */
export interface IDiscoveryProvider {
  metadata: DiscoveryProviderMetadata;
  getHealth(): Promise<HealthStatus>;
  getDiagnostics(): ProviderDiagnostics;
  discover(
    query: DiscoveryQuery, 
    options?: DiscoveryExecutionOptions
  ): Promise<{ opportunities: DiscoveredOpportunity[]; provenance: ResponseProvenance }>;
}
