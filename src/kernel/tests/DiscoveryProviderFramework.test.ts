/**
 * @file /src/kernel/tests/DiscoveryProviderFramework.test.ts
 * @description Unit tests for EPIC 1 - Autonomous Opportunity Discovery Provider Framework.
 */

import { 
  DiscoveryProviderRegistry, 
  DiscoveryExecutionPipeline, 
  DataProviderToDiscoveryAdapter,
  IDiscoveryProvider,
  DiscoveryQuery,
  DiscoveredOpportunity,
  generateOpportunityHash,
  parseRawCompensation,
  deduplicateOpportunities
} from "../../domains/discovery";
import { IDataProvider, HealthStatus, ProviderDiagnostics } from "../../kernel/provider/types";
import { ServiceRegistry } from "../../services/backend/ServiceRegistry";
import { providerManager } from "../../kernel/provider";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${msg}`);
  }
}

class MockDiscoveryProvider implements IDiscoveryProvider {
  public metadata: any;
  public mockHealth: HealthStatus = "healthy";
  public mockItems: DiscoveredOpportunity[] = [];
  public shouldThrow = false;
  public delayMs = 0;

  constructor(id: string, name: string, priority: number, supportedTypes: any[] = ["FULL_TIME", "CONTRACT"]) {
    this.metadata = {
      id,
      name,
      version: "1.0.0",
      priority,
      authenticationRequired: false,
      capabilities: {
        supportedOpportunityTypes: supportedTypes,
        supportedCountries: ["Global", "India", "USA"],
        supportsRealtimeSearch: true,
        supportsSalaryFilters: true,
        supportsRemoteFilters: true,
        supportsVisaFilters: true,
        supportsPagination: true,
        rateLimitRpm: 60,
      }
    };
  }

  public async getHealth(): Promise<HealthStatus> {
    return this.mockHealth;
  }

  public getDiagnostics(): ProviderDiagnostics {
    return {
      version: "1.0.0",
      health: this.mockHealth,
      totalCalls: 1,
      failedCalls: 0,
      latencySamples: [10],
      averageLatencyMs: 10,
      cacheSize: 0,
      cacheHitRate: 1,
      authenticationStatus: "Authenticated"
    };
  }

  public async discover(query: DiscoveryQuery, options?: any) {
    if (this.delayMs > 0) {
      await new Promise(r => setTimeout(r, this.delayMs));
    }
    if (this.shouldThrow) {
      throw new Error(`Simulated failure in ${this.metadata.name}`);
    }

    return {
      opportunities: this.mockItems,
      provenance: {
        origin: "LIVE" as const,
        providerId: this.metadata.id,
        providerName: this.metadata.name,
        providerVersion: "1.0.0",
        durationMs: 12,
        requestId: query.requestId || "req-test",
        cacheUsed: false,
        retryCount: 0,
        healthStatus: this.mockHealth,
        finalStatus: "Mock success"
      }
    };
  }
}

class MockLegacyDataProvider implements IDataProvider {
  public metadata: any = {
    id: "mock-legacy-provider",
    name: "Mock Legacy Engine",
    version: "1.0.0",
    type: "API",
    priority: 80,
    authenticationRequired: false,
    capabilities: {
      supportedCountries: ["USA", "India"],
      supportedJobTypes: ["Full-time", "Contract", "Freelance"],
      supportedFreelancePlatforms: ["Upwork"],
      supportsSalary: true,
      supportsRecruiters: false,
      supportsRemoteJobs: true,
      supportsVisaJobs: true,
      supportsCompanyUrls: true,
      supportsPagination: false,
      supportsSearch: true,
    },
    rateLimits: { requestsPerMinute: 30 },
    retryPolicy: { maxRetries: 1, backoffFactorMs: 500 }
  };

  public async getHealth(): Promise<HealthStatus> {
    return "healthy";
  }

  public getDiagnostics(): ProviderDiagnostics {
    return {
      version: "1.0.0",
      health: "healthy",
      totalCalls: 0,
      failedCalls: 0,
      latencySamples: [],
      averageLatencyMs: 0,
      cacheSize: 0,
      cacheHitRate: 0,
      authenticationStatus: "Authenticated"
    };
  }

  public resetDiagnostics() {}

  public async fetchJobs(query: string, skills: string[], countries: string[], visa: string) {
    return {
      jobs: [
        {
          id: "job-legacy-1",
          title: "Senior Cloud Engineer",
          company: "CloudTech Systems",
          location: "Remote - USA",
          country: "USA",
          description: "Develop cloud native infrastructure",
          skillsRequired: ["AWS", "Kubernetes", "TypeScript"],
          salary: "$140,000 - $180,000 / Year",
          visaSponsorship: true,
          postedDate: "2026-08-01",
          publicHrEmail: "careers@cloudtech.example",
          source: "Indeed",
          timestamp: "2026-08-05T00:00:00.000Z",
          verificationStatus: "Verified Live Source",
          confidenceScore: 94,
          originalReference: "https://cloudtech.example/jobs/1",
          deduplicationStatus: "Unique Live Entry"
        }
      ],
      provenance: {
        origin: "LIVE" as const,
        providerId: "mock-legacy-provider",
        providerName: "Mock Legacy Engine",
        providerVersion: "1.0.0",
        durationMs: 25,
        requestId: "req-legacy",
        cacheUsed: false,
        retryCount: 0,
        healthStatus: "healthy" as const,
        finalStatus: "Success"
      }
    };
  }

  public async fetchGigs(query: string, skills: string[]) {
    return {
      gigs: [
        {
          id: "gig-legacy-1",
          title: "Docker Swarm to K8s Migration",
          platform: "Upwork",
          budget: "$75 / hr",
          duration: "1 Month",
          complexity: "Expert",
          description: "Migrate multi-tier enterprise workloads",
          skillsRequired: ["Docker", "Kubernetes"],
          postedDate: "2026-08-02",
          source: "Upwork",
          timestamp: "2026-08-05T00:00:00.000Z",
          verificationStatus: "Verified Live Source",
          confidenceScore: 92,
          originalReference: "https://upwork.example/gig/1",
          deduplicationStatus: "Unique Live Entry"
        }
      ],
      provenance: {
        origin: "LIVE" as const,
        providerId: "mock-legacy-provider",
        providerName: "Mock Legacy Engine",
        providerVersion: "1.0.0",
        durationMs: 20,
        requestId: "req-gig-legacy",
        cacheUsed: false,
        retryCount: 0,
        healthStatus: "healthy" as const,
        finalStatus: "Success"
      }
    };
  }
}

async function runTests() {
  console.log("==========================================================");
  console.log("  EPIC 1: Autonomous Opportunity Discovery Framework Tests ");
  console.log("==========================================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    process.stdout.write(`[TEST] Running: ${name}... `);
    try {
      await fn();
      console.log(" ✅ Passed");
      passed++;
    } catch (err: any) {
      console.log(" ❌ Failed!");
      console.error(`       Error: ${err.message}`);
      failed++;
    }
  }

  // 1. DiscoveryProviderRegistry tests
  await test("DiscoveryProviderRegistry - Registration, Querying, and Priority Sorting", async () => {
    const registry = new DiscoveryProviderRegistry();
    registry.reset();

    const p1 = new MockDiscoveryProvider("p1", "Low Priority Provider", 10);
    const p2 = new MockDiscoveryProvider("p2", "High Priority Provider", 90);
    const p3 = new MockDiscoveryProvider("p3", "Freelance Only Provider", 50, ["FREELANCE", "PROJECT"]);

    registry.registerProvider(p1);
    registry.registerProvider(p2);
    registry.registerProvider(p3);

    assert(registry.getAllProviders().length === 3, "Registry should contain 3 providers");

    const active = registry.getActiveProviders();
    assert(active.length === 3, "All 3 providers should be active by default");
    assert(active[0].metadata.id === "p2", "p2 (priority 90) must be first");
    assert(active[1].metadata.id === "p3", "p3 (priority 50) must be second");
    assert(active[2].metadata.id === "p1", "p1 (priority 10) must be third");

    // Test capability filtering
    const freelanceProviders = registry.getProvidersForQuery({ opportunityTypes: ["FREELANCE"] });
    assert(freelanceProviders.length === 1, "Only p3 supports freelance");
    assert(freelanceProviders[0].metadata.id === "p3", "Filtered provider should be p3");

    // Test disable / enable
    registry.setProviderEnabled("p2", false);
    assert(!registry.isProviderEnabled("p2"), "p2 should be disabled");
    assert(registry.getActiveProviders().length === 2, "Active providers should now be 2");
  });

  // 2. DataProviderToDiscoveryAdapter tests
  await test("DataProviderToDiscoveryAdapter - Adapting IDataProvider to IDiscoveryProvider", async () => {
    const legacy = new MockLegacyDataProvider();
    const adapter = new DataProviderToDiscoveryAdapter(legacy);

    assert(adapter.metadata.id === "mock-legacy-provider", "Adapter preserves provider ID");
    assert(adapter.metadata.priority === 80, "Adapter preserves priority");
    assert(adapter.metadata.capabilities.supportedOpportunityTypes.includes("FULL_TIME"), "Supports FULL_TIME");
    assert(adapter.metadata.capabilities.supportedOpportunityTypes.includes("FREELANCE"), "Supports FREELANCE");

    // Discover FULL_TIME
    const jobResult = await adapter.discover({
      opportunityTypes: ["FULL_TIME"],
      skills: ["AWS", "Kubernetes"],
      countries: ["USA"]
    });

    assert(jobResult.opportunities.length === 1, "Should discover 1 job opportunity");
    const jobOpp = jobResult.opportunities[0];
    assert(jobOpp.title === "Senior Cloud Engineer", "Title mapped correctly");
    assert(jobOpp.organization.name === "CloudTech Systems", "Organization mapped");
    assert(jobOpp.compensation?.min === 140000, "Min compensation parsed");
    assert(jobOpp.compensation?.max === 180000, "Max compensation parsed");
    assert(jobOpp.compensation?.period === "YEARLY", "Compensation period mapped");
    assert(jobOpp.requirements.visaSupport === true, "Visa support mapped");
    assert(!!jobOpp.metadata.deduplicationHash, "Deduplication hash generated");

    // Discover FREELANCE
    const gigResult = await adapter.discover({
      opportunityTypes: ["FREELANCE"],
      skills: ["Docker", "Kubernetes"]
    });

    assert(gigResult.opportunities.length === 1, "Should discover 1 freelance gig");
    const gigOpp = gigResult.opportunities[0];
    assert(gigOpp.type === "FREELANCE", "Opportunity type is FREELANCE");
    assert(gigOpp.title === "Docker Swarm to K8s Migration", "Gig title mapped");
    assert(gigOpp.compensation?.period === "HOURLY", "Gig period parsed as HOURLY");
    assert(gigOpp.compensation?.min === 75, "Gig rate parsed as 75");
  });

  // 3. Normalization and Deduplication utilities
  await test("Utilities - Hash generation, compensation parsing, and deduplication", async () => {
    const hash1 = generateOpportunityHash("Software Engineer", "Acme Corp", "San Francisco, CA", "FULL_TIME");
    const hash2 = generateOpportunityHash("software engineer", "acme corp", "san francisco, ca", "FULL_TIME");
    const hash3 = generateOpportunityHash("Lead Engineer", "Acme Corp", "San Francisco, CA", "FULL_TIME");

    assert(hash1 === hash2, "Hashes must be case/punctuation-insensitive identical");
    assert(hash1 !== hash3, "Different titles must produce different hashes");

    const comp1 = parseRawCompensation("₹12,00,000 - ₹18,00,000 / Year");
    assert(comp1?.currency === "INR", "INR currency parsed");
    assert(comp1?.min === 1200000, "INR min parsed");
    assert(comp1?.period === "YEARLY", "Period parsed as YEARLY");

    const comp2 = parseRawCompensation("$45/hr");
    assert(comp2?.currency === "USD", "USD currency parsed");
    assert(comp2?.min === 45, "Rate 45 parsed");
    assert(comp2?.period === "HOURLY", "Period parsed as HOURLY");

    const mockOpps: DiscoveredOpportunity[] = [
      {
        id: "opp-1",
        type: "FULL_TIME",
        title: "DevOps Engineer",
        organization: { name: "Apex Ltd" },
        location: { raw: "Remote" },
        description: { raw: "Desc 1" },
        requirements: { skills: ["Terraform"] },
        source: { providerId: "p1", providerName: "P1", originUrl: "url1", discoveredAt: "now" },
        metadata: { confidenceScore: 90, deduplicationHash: "hash-apex-devops", status: "NEW" }
      },
      {
        id: "opp-2",
        type: "FULL_TIME",
        title: "DevOps Engineer",
        organization: { name: "Apex Ltd" },
        location: { raw: "Remote" },
        description: { raw: "Desc duplicate" },
        requirements: { skills: ["Terraform"] },
        source: { providerId: "p2", providerName: "P2", originUrl: "url2", discoveredAt: "now" },
        metadata: { confidenceScore: 88, deduplicationHash: "hash-apex-devops", status: "NEW" }
      }
    ];

    const deduplicated = deduplicateOpportunities(mockOpps);
    assert(deduplicated.length === 1, "Deduplication must collapse duplicates");
    assert(deduplicated[0].id === "opp-1", "Keeps the first occurrence");
  });

  // 4. DiscoveryExecutionPipeline tests
  await test("DiscoveryExecutionPipeline - Multi-provider execution, resilience, and metrics", async () => {
    const registry = new DiscoveryProviderRegistry();
    registry.reset();

    const pGood1 = new MockDiscoveryProvider("p-good-1", "Good Provider 1", 100);
    pGood1.mockItems = [
      {
        id: "opp-g1",
        type: "FULL_TIME",
        title: "Site Reliability Engineer",
        organization: { name: "Stripe" },
        location: { raw: "Remote" },
        description: { raw: "SRE role" },
        requirements: { skills: ["Go", "Linux"] },
        source: { providerId: "p-good-1", providerName: "Good Provider 1", originUrl: "url-g1", discoveredAt: "now" },
        metadata: { confidenceScore: 95, deduplicationHash: "hash-sre-stripe", status: "NEW" }
      }
    ];

    const pFailing = new MockDiscoveryProvider("p-failing", "Failing Provider", 50);
    pFailing.shouldThrow = true;

    registry.registerProvider(pGood1);
    registry.registerProvider(pFailing);

    const pipeline = new DiscoveryExecutionPipeline(registry);
    const result = await pipeline.execute({
      keywords: "SRE",
      skills: ["Go", "Linux"]
    });

    assert(result.opportunities.length === 1, "Should retrieve opportunity from good provider despite other failure");
    assert(result.providerStats["p-good-1"].status === "SUCCESS", "Good provider marked as SUCCESS");
    assert(result.providerStats["p-failing"].status === "FAILED", "Failing provider recorded as FAILED without throwing");
    assert(result.durationMs >= 0, "Execution duration measured");
    assert(result.totalDiscovered === 1, "Total discovered recorded");
  });

  // 5. Failover mode test
  await test("DiscoveryExecutionPipeline - Priority Failover mode", async () => {
    const registry = new DiscoveryProviderRegistry();
    registry.reset();

    const pPrimaryOffline = new MockDiscoveryProvider("p-prim", "Primary Offline Provider", 100);
    pPrimaryOffline.mockHealth = "offline";

    const pSecondary = new MockDiscoveryProvider("p-sec", "Secondary Backup Provider", 80);
    pSecondary.mockItems = [
      {
        id: "opp-sec-1",
        type: "FULL_TIME",
        title: "Security Engineer",
        organization: { name: "Cloudflare" },
        location: { raw: "London, UK" },
        description: { raw: "AppSec" },
        requirements: { skills: ["Rust", "Security"] },
        source: { providerId: "p-sec", providerName: "Secondary", originUrl: "url-sec", discoveredAt: "now" },
        metadata: { confidenceScore: 92, deduplicationHash: "hash-sec-cf", status: "NEW" }
      }
    ];

    registry.registerProvider(pPrimaryOffline);
    registry.registerProvider(pSecondary);

    const pipeline = new DiscoveryExecutionPipeline(registry);
    const result = await pipeline.execute(
      { keywords: "Security" },
      { enableFailover: true }
    );

    assert(result.opportunities.length === 1, "Failover should successfully return opportunities from secondary");
    assert(result.providerStats["p-prim"].status === "SKIPPED", "Offline primary skipped");
    assert(result.providerStats["p-sec"].status === "SUCCESS", "Secondary succeeded");
  });

  // 6. ServiceRegistry Integration test
  await test("ServiceRegistry Integration - Discovery services wiring", async () => {
    const services = new ServiceRegistry(providerManager);

    assert(!!services.discoveryProviderRegistry, "discoveryProviderRegistry is registered in ServiceRegistry");
    assert(!!services.discoveryPipelineService, "discoveryPipelineService is registered in ServiceRegistry");

    const allProviders = services.discoveryProviderRegistry.getAllProviders();
    assert(allProviders.length >= 1, "At least 1 discovery provider registered (grounding adapter)");

    services.shutdown();
  });

  console.log("\n===========================================");
  console.log("Discovery Provider Framework Unit Tests Complete.");
  console.log(`Total Run: ${passed + failed}`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log("===========================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error("Discovery Framework test suite failed with error:", err);
  process.exit(1);
});
