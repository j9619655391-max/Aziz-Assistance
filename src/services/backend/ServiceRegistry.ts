import { IAppRepository } from "../../domains/shared/repository/IRepository";
import { RepositoryRegistry } from "../../domains/shared/repository/RepositoryRegistry";
import { RepositoryFactory } from "../../domains/shared/repository/RepositoryFactory";
import { FirebaseRepositorySkeleton } from "../../domains/shared/repository/FirebaseRepositorySkeleton";
import { InMemoryRepository } from "../../domains/shared/repository/InMemoryRepository";
import { PostgresRepository } from "../../domains/shared/repository/PostgresRepository";
import { AIService } from "../../domains/infrastructure/AIService";
import { MatchingService } from "../../domains/employment/MatchingService";
import { ProfileService } from "../../domains/identity/ProfileService";
import { TenantManager } from "../../domains/identity/TenantManager";
import { OrganizationService } from "../../domains/identity/OrganizationService";
import { WorkspaceManager } from "../../domains/identity/WorkspaceManager";
import { UserService } from "../../domains/identity/UserService";
import { RoleService } from "../../domains/identity/RoleService";
import { PermissionService } from "../../domains/identity/PermissionService";
import { SessionService } from "../../domains/identity/SessionService";
import { AuditIdentityService } from "../../domains/identity/AuditIdentityService";
import { JobSearchService } from "../../domains/employment/JobSearchService";
import { FreelanceService } from "../../domains/freelance/FreelanceService";
import { ResumeService } from "../../domains/employment/ResumeService";
import { ATSService } from "../../domains/employment/ATSService";
import { EmploymentV2Service } from "../../domains/employment/EmploymentV2Service";
import { RecruiterService } from "../../domains/recruitment/RecruiterService";
import { RecruitmentIntelligenceModule } from "../../domains/recruitment/RecruitmentIntelligenceModule";
import { RecruitmentWorkflowEngine } from "../../domains/recruitment/RecruitmentWorkflowEngine";
import { NotificationService } from "../../domains/communication/NotificationService";
import { HostingerService } from "../../domains/communication/HostingerService";
import { TelegramBotService } from "../../domains/communication/TelegramBotService";
import { FollowUpService } from "../../domains/communication/FollowUpService";
import { AlertService } from "../../domains/automation/AlertService";
import { AutonomousScrapingService } from "../../domains/automation/AutonomousScrapingService";
import { ProviderDiagnosticService } from "../../domains/infrastructure/ProviderDiagnosticService";
import { SearchHistoryService } from "../../domains/knowledge/SearchHistoryService";
import { DocumentIngestionService } from "../../domains/knowledge/DocumentIngestionService";
import { FileStorageService } from "../../domains/shared/storage/FileStorageService";
import { SystemAuditService } from "../../domains/infrastructure/SystemAuditService";
import { SecurityService } from "../../domains/infrastructure/SecurityService";
import { IndexerService } from "../../domains/infrastructure/IndexerService";
import { DiagnosticAgentService } from "../../domains/infrastructure/DiagnosticAgentService";
import { TerminalService } from "../../domains/infrastructure/TerminalService";
import { CareerSupervisorService } from "../../domains/supervisor/CareerSupervisorService";
import { ProviderManager } from "../../kernel/provider/ProviderManager";
import {
  ExplainabilityService,
  ConfidenceService,
  SkillIntelligenceService,
  SemanticMatchingService,
  RiskIntelligenceService,
  DecisionLogService,
  RecommendationService,
  SemanticIntelligenceService,
  IntelligenceCoordinator
} from "../../kernel/intelligence";

// Module Lifecycle Imports
import { ModuleManager } from "../../kernel/module/ModuleManager";
import { RepositoryModule } from "../../domains/shared/module/RepositoryModule";
import { ProviderModule } from "../../domains/shared/module/ProviderModule";
import { SharedPlatformModule } from "../../domains/shared/module/SharedPlatformModule";
import { IdentityModule } from "../../domains/identity/IdentityModule";
import { KnowledgeModule } from "../../domains/knowledge/KnowledgeModule";
import { CommunicationModule } from "../../domains/communication/CommunicationModule";
import { RecruitmentModule } from "../../domains/recruitment/RecruitmentModule";
import { InfrastructureModule } from "../../domains/infrastructure/InfrastructureModule";
import { EmploymentModule } from "../../domains/employment/EmploymentModule";
import { FreelanceModule } from "../../domains/freelance/FreelanceModule";
import { AutomationModule } from "../../domains/automation/AutomationModule";

// Observability Platform Imports
import { MetricsService } from "../../domains/observability/MetricsService";
import { TracingService } from "../../domains/observability/TracingService";
import { HealthService } from "../../domains/observability/HealthService";
import { LogAggregationService } from "../../domains/observability/LogAggregationService";
import { DiagnosticsService } from "../../domains/observability/DiagnosticsService";
import { PerformanceProfiler } from "../../domains/observability/PerformanceProfiler";
import { AlertService as ObservabilityAlertService } from "../../domains/observability/AlertService";
import { DashboardAggregator } from "../../domains/observability/DashboardAggregator";
import { ObservabilityModule } from "../../domains/observability/ObservabilityModule";
import { DiscoveryProviderRegistry, DiscoveryExecutionPipeline, DiscoveryModule, DataProviderToDiscoveryAdapter } from "../../domains/discovery";

export class ServiceRegistry {
  private static instance: ServiceRegistry | null = null;

  public static getInstance(): ServiceRegistry {
    if (!this.instance) {
      throw new Error("ServiceRegistry instance has not been initialized yet.");
    }
    return this.instance;
  }

  public repo: IAppRepository;
  public aiService: AIService;
  public matchingService: MatchingService;
  public profileService: ProfileService;
  public tenantManager: TenantManager;
  public organizationService: OrganizationService;
  public workspaceManager: WorkspaceManager;
  public userService: UserService;
  public roleService: RoleService;
  public permissionService: PermissionService;
  public sessionService: SessionService;
  public auditIdentityService: AuditIdentityService;
  public jobSearchService: JobSearchService;
  public freelanceService: FreelanceService;
  public resumeService: ResumeService;
  public atsService: ATSService;
  public employmentV2Service: EmploymentV2Service;
  public recruiterService: RecruiterService;
  public recruitmentIntelligenceModule: RecruitmentIntelligenceModule;
  public recruitmentWorkflowEngine: RecruitmentWorkflowEngine;
  public notificationService: NotificationService;
  public followUpService: FollowUpService;
  public alertService: AlertService;
  public autonomousScrapingService: AutonomousScrapingService;
  public providerDiagnosticService: ProviderDiagnosticService;
  public searchHistoryService: SearchHistoryService;
  public documentIngestionService: DocumentIngestionService;
  public fileStorageService: FileStorageService;
  public systemAuditService: SystemAuditService;
  public securityService: SecurityService;
  public hostingerService: HostingerService;
  public telegramService: TelegramBotService;
  public indexerService: IndexerService;
  public diagnosticAgentService: DiagnosticAgentService;
  public terminalService: TerminalService;
  public careerSupervisorService: CareerSupervisorService;

  // Enterprise Observability Platform Services
  public metricsService: MetricsService;
  public tracingService: TracingService;
  public healthService: HealthService;
  public logAggregationService: LogAggregationService;
  public diagnosticsService: DiagnosticsService;
  public performanceProfiler: PerformanceProfiler;
  public observabilityAlertService: ObservabilityAlertService;
  public dashboardAggregator: DashboardAggregator;

  // AI Kernel Intelligence Foundation Services
  public explainabilityService: ExplainabilityService;
  public confidenceService: ConfidenceService;
  public skillIntelligenceService: SkillIntelligenceService;
  public semanticMatchingService: SemanticMatchingService;
  public riskIntelligenceService: RiskIntelligenceService;
  public decisionLogService: DecisionLogService;
  public recommendationService: RecommendationService;
  public semanticIntelligenceService: SemanticIntelligenceService;
  public intelligenceCoordinator: IntelligenceCoordinator;

  // Autonomous Opportunity Discovery Engine (EPIC 1)
  public discoveryProviderRegistry: DiscoveryProviderRegistry;
  public discoveryPipelineService: DiscoveryExecutionPipeline;

  constructor(providerManager: ProviderManager) {
    ServiceRegistry.instance = this;
    // 1. Instantiation and registration of repositories & utilities
    const registry = RepositoryRegistry.getInstance();
    registry.register("INMEMORY", new InMemoryRepository());
    registry.register("FIREBASE", new FirebaseRepositorySkeleton());
    registry.register("POSTGRES", new PostgresRepository());

    // Resolve the active repository based on system configuration
    this.repo = RepositoryFactory.getActiveRepository();

    this.aiService = new AIService(this.repo);
    this.matchingService = new MatchingService();

    // 2. Instantiation of core domain-services depending on repo / utilities
    this.profileService = new ProfileService(this.repo);
    this.tenantManager = new TenantManager(this.repo);
    this.organizationService = new OrganizationService(this.repo);
    this.workspaceManager = new WorkspaceManager(this.repo);
    this.userService = new UserService(this.repo);
    this.roleService = new RoleService(this.repo);
    this.permissionService = new PermissionService(this.roleService);
    this.sessionService = new SessionService(this.repo);
    this.auditIdentityService = new AuditIdentityService(this.repo);
    this.recruiterService = new RecruiterService(this.repo);
    this.notificationService = new NotificationService(this.repo);
    this.searchHistoryService = new SearchHistoryService(this.repo);
    this.documentIngestionService = new DocumentIngestionService(this.repo, this.aiService);
    this.fileStorageService = new FileStorageService();
    this.systemAuditService = new SystemAuditService(this.repo);
    this.securityService = new SecurityService(this.repo);
    this.hostingerService = new HostingerService(this.repo);
    this.telegramService = new TelegramBotService(
      this.repo,
      () => this.autonomousScrapingService,
      () => this.jobSearchService,
      () => this.freelanceService
    );
    this.indexerService = new IndexerService(this.repo);
    this.diagnosticAgentService = new DiagnosticAgentService(this.repo);
    this.terminalService = new TerminalService(this.repo);
    this.resumeService = new ResumeService(this.aiService);

    // Instantiate AI Kernel Intelligence Foundation Services
    this.explainabilityService = new ExplainabilityService(this.aiService);
    this.confidenceService = new ConfidenceService(this.aiService);
    this.skillIntelligenceService = new SkillIntelligenceService(this.aiService);
    this.semanticMatchingService = new SemanticMatchingService(this.aiService);
    this.riskIntelligenceService = new RiskIntelligenceService(this.aiService);
    this.decisionLogService = new DecisionLogService(this.repo);
    this.recommendationService = new RecommendationService(this.aiService);
    this.semanticIntelligenceService = new SemanticIntelligenceService(this.aiService);
    this.intelligenceCoordinator = new IntelligenceCoordinator(
      this.semanticIntelligenceService,
      this.confidenceService,
      this.riskIntelligenceService,
      this.explainabilityService,
      this.decisionLogService,
      this.recommendationService
    );
    this.atsService = new ATSService(this.repo, this.aiService);
    this.recruitmentIntelligenceModule = new RecruitmentIntelligenceModule(this.intelligenceCoordinator);
    this.recruitmentWorkflowEngine = new RecruitmentWorkflowEngine(this.recruitmentIntelligenceModule);
    this.employmentV2Service = new EmploymentV2Service(this.repo, this.aiService);

    // 3. Instantiation of services with external dependencies (e.g. ProviderManager)
    this.jobSearchService = new JobSearchService(this.repo, this.matchingService, providerManager);
    this.freelanceService = new FreelanceService(this.repo, this.matchingService, providerManager, this.aiService);
    this.providerDiagnosticService = new ProviderDiagnosticService(providerManager);

    // Opportunity Discovery Provider Framework (EPIC 1)
    this.discoveryProviderRegistry = new DiscoveryProviderRegistry();
    for (const p of providerManager.getAllProviders()) {
      this.discoveryProviderRegistry.registerProvider(new DataProviderToDiscoveryAdapter(p));
    }
    this.discoveryPipelineService = new DiscoveryExecutionPipeline(this.discoveryProviderRegistry);

    // 4. Instantiation of higher-level services requiring cross-service coordination
    this.followUpService = new FollowUpService(this.repo, this.notificationService);
    this.alertService = new AlertService(this.repo, this.matchingService, this.notificationService);
    this.autonomousScrapingService = new AutonomousScrapingService(this.repo);
    this.autonomousScrapingService.setNotificationServices(this.notificationService, this.telegramService);
    this.careerSupervisorService = new CareerSupervisorService(
      this.repo,
      this.jobSearchService,
      this.freelanceService,
      this.recruiterService,
      this.alertService,
      this.resumeService,
      this.atsService,
      this.notificationService,
      this.intelligenceCoordinator,
      this.matchingService
    );

    // Instantiation of Observability Platform Services
    this.metricsService = new MetricsService();
    this.logAggregationService = new LogAggregationService();
    this.tracingService = new TracingService();
    this.healthService = new HealthService(this);
    this.observabilityAlertService = new ObservabilityAlertService(this.metricsService, this.logAggregationService);
    this.diagnosticsService = new DiagnosticsService(this.healthService, this.metricsService, this.observabilityAlertService, this.logAggregationService);
    this.performanceProfiler = new PerformanceProfiler(this.metricsService, this.logAggregationService);
    this.dashboardAggregator = new DashboardAggregator(this.healthService, this.metricsService, this.observabilityAlertService, this.logAggregationService, this.tracingService);

    // 5. Initialize the Module Lifecycle Engine
    const moduleManager = ModuleManager.getInstance();
    moduleManager.register(new RepositoryModule());
    moduleManager.register(new ProviderModule());
    moduleManager.register(new SharedPlatformModule());
    moduleManager.register(new IdentityModule());
    moduleManager.register(new KnowledgeModule());
    moduleManager.register(new CommunicationModule());
    moduleManager.register(new RecruitmentModule());
    moduleManager.register(new InfrastructureModule());
    moduleManager.register(new EmploymentModule());
    moduleManager.register(new FreelanceModule());
    moduleManager.register(new AutomationModule());
    moduleManager.register(new ObservabilityModule());
    moduleManager.register(new DiscoveryModule());

    // Start all modules asynchronously with the current registry instance
    moduleManager.startupAll(this).then(() => {
      console.log("[ServiceRegistry] Module Lifecycle Engine successfully booted.");
    }).catch((err) => {
      console.error("[ServiceRegistry] Module Lifecycle Engine boot failed:", err);
    });
  }

  /**
   * Helper destructor to safely clean up running intervals/daemons
   */
  public shutdown(): void {
    if (this.alertService) {
      this.alertService.shutdown();
    }
    if (this.careerSupervisorService) {
      this.careerSupervisorService.stopAutonomousScheduler();
    }
    ModuleManager.getInstance().shutdownAll().then(() => {
      console.log("[ServiceRegistry] Module Lifecycle Engine shut down all modules.");
    }).catch((err) => {
      console.error("[ServiceRegistry] Error shutting down modules:", err);
    });
  }
}
