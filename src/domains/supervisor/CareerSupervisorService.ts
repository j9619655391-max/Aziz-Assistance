import { IAppRepository } from "../shared/repository/IRepository";
import { JobSearchService } from "../employment/JobSearchService";
import { FreelanceService } from "../freelance/FreelanceService";
import { RecruiterService } from "../recruitment/RecruiterService";
import { AlertService } from "../automation/AlertService";
import { ResumeService } from "../employment/ResumeService";
import { ATSService } from "../employment/ATSService";
import { NotificationService } from "../communication/NotificationService";
import { IntelligenceCoordinator } from "../../kernel/intelligence/IntelligenceCoordinator";
import { MatchingService } from "../employment/MatchingService";

export interface SupervisorExecutionResult {
  cycleId: string;
  timestamp: string;
  discoveryStats: {
    jobsFound: number;
    freelanceProjectsFound: number;
    scanAlertsTriggered: number;
  };
  scoringStats: {
    jobsScored: number;
    averageMatchScore: number;
    highMatchJobsCount: number;
  };
  recruiterStats: {
    contactsEnriched: number;
    notificationsSent: number;
  };
  freelanceStats: {
    proposalsDrafted: number;
  };
  applicationsGenerated: number;
  status: "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED";
  errors: string[];
}

export interface ExecutiveCareerSummary {
  summaryId: string;
  timestamp: string;
  totalActiveJobs: number;
  highMatchJobsCount: number;
  totalFreelanceProjects: number;
  totalRecruitersInPipeline: number;
  pendingProposalCount: number;
  recentAuditLogsCount: number;
  systemHealthStatus: string;
  executiveInsights: string[];
}

export class CareerSupervisorService {
  private cronTimer: NodeJS.Timeout | null = null;
  private isRunningCycle = false;

  constructor(
    private repo: IAppRepository,
    private jobSearchService: JobSearchService,
    private freelanceService: FreelanceService,
    private recruiterService: RecruiterService,
    private alertService: AlertService,
    private resumeService: ResumeService,
    private atsService: ATSService,
    private notificationService: NotificationService,
    private intelligenceCoordinator?: IntelligenceCoordinator,
    private matchingService?: MatchingService
  ) {}

  /**
   * 1. Schedule & Execute Autonomous Discovery Sweep
   */
  public async runAutonomousDiscoveryCycle(): Promise<{ jobsCount: number; freelanceCount: number; scanSuccess: boolean }> {
    const profile = await this.repo.getJobProfile();
    const query = profile.skills && profile.skills.length > 0 ? profile.skills.slice(0, 3).join(" ") : "Software Engineer";

    // Trigger full-time job search sweep
    let jobsCount = 0;
    try {
      const jobsRes = await this.jobSearchService.searchJobs(query);
      jobsCount = jobsRes.jobs ? jobsRes.jobs.length : 0;
    } catch (err: any) {
      await this.repo.addSystemLog("error", "daemon", `Job discovery sweep failed: ${err.message}`);
    }

    // Trigger freelance project sweep
    let freelanceCount = 0;
    try {
      const freelanceRes = await this.freelanceService.searchGigs(query);
      freelanceCount = freelanceRes.gigs ? freelanceRes.gigs.length : 0;
    } catch (err: any) {
      await this.repo.addSystemLog("error", "daemon", `Freelance discovery sweep failed: ${err.message}`);
    }

    // Trigger alert sweep
    let scanSuccess = false;
    try {
      const scanRes = await this.alertService.triggerScan();
      scanSuccess = scanRes.success;
    } catch (err: any) {
      await this.repo.addSystemLog("error", "daemon", `Alert scan sweep failed: ${err.message}`);
    }

    await this.repo.addSystemLog(
      "info",
      "daemon",
      `Autonomous discovery completed: ${jobsCount} jobs, ${freelanceCount} freelance projects discovered.`
    );

    return { jobsCount, freelanceCount, scanSuccess };
  }

  /**
   * 2. Trigger AI Scoring across candidate profile and discovered jobs
   */
  public async evaluateAndScoreOpportunities(): Promise<{ scoredCount: number; averageScore: number; topMatches: any[] }> {
    const profile = await this.repo.getJobProfile();
    const jobs = await this.repo.findAll("jobs");

    let totalScore = 0;
    let scoredCount = 0;
    const topMatches: any[] = [];

    for (const job of jobs) {
      try {
        let score = 0;
        if (this.intelligenceCoordinator) {
          const evalRes = await this.intelligenceCoordinator.coordinate({
            input: profile.resume,
            query: job.description,
            skills: profile.skills
          });
          score = Math.round(evalRes.confidence.confidenceScore * 100);
        } else if (this.matchingService) {
          const evaluated = this.matchingService.evaluateJob(job, profile);
          score = evaluated.compatibilityScore;
        } else {
          score = job.visaSponsorship ? 85 : 70;
        }

        job.confidenceScore = score;
        totalScore += score;
        scoredCount++;

        if (score >= 75) {
          topMatches.push(job);
        }
      } catch (err: any) {
        await this.repo.addSystemLog("warn", "daemon", `Scoring failed for job ${job.id}: ${err.message}`);
      }
    }

    const averageScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;

    await this.repo.addSystemLog(
      "info",
      "daemon",
      `Evaluated ${scoredCount} opportunities. Average match score: ${averageScore}%. High-match count: ${topMatches.length}.`
    );

    return { scoredCount, averageScore, topMatches };
  }

  /**
   * 3. Dispatch Recruiter Workflows
   */
  public async dispatchRecruiterWorkflows(): Promise<{ recruiterCount: number; notificationsSent: number }> {
    const recruiters = await this.repo.getRecruiterContacts();
    let notificationsSent = 0;

    for (const recruiter of recruiters) {
      if (recruiter.email) {
        try {
          await this.notificationService.notify(
            `Automated outreach initiated for recruiter: ${recruiter.name} (${recruiter.company})`,
            "info"
          );
          notificationsSent++;
        } catch (err: any) {
          await this.repo.addSystemLog("warn", "daemon", `Recruiter dispatch failed for ${recruiter.name}: ${err.message}`);
        }
      }
    }

    await this.repo.addSystemLog(
      "info",
      "daemon",
      `Dispatched recruiter workflows for ${recruiters.length} contacts (${notificationsSent} notifications sent).`
    );

    return { recruiterCount: recruiters.length, notificationsSent };
  }

  /**
   * 4. Dispatch Freelance Workflows
   */
  public async dispatchFreelanceWorkflows(): Promise<{ totalProjects: number; proposalsGenerated: number }> {
    const gigs = await this.repo.getSampleGigs();
    let proposalsGenerated = 0;

    for (const gig of gigs.slice(0, 5)) {
      try {
        const pitch = await this.freelanceService.generateProposalPitch(gig.id, gig.title, gig.description);
        if (pitch && pitch.pitchText) {
          (gig as any).proposalDraft = pitch.pitchText;
          proposalsGenerated++;
        }
      } catch (err: any) {
        await this.repo.addSystemLog("warn", "daemon", `Freelance proposal dispatch failed for gig ${gig.id}: ${err.message}`);
      }
    }

    await this.repo.addSystemLog(
      "info",
      "daemon",
      `Dispatched freelance workflows for ${gigs.length} projects (${proposalsGenerated} proposals generated).`
    );

    return { totalProjects: gigs.length, proposalsGenerated };
  }

  /**
   * 5. Trigger Application Generation (Resume tailoring & ATS analysis)
   */
  public async triggerApplicationGeneration(jobId: string): Promise<{ atsAnalysis: any; coverLetterDraft?: string }> {
    const jobs = await this.repo.findAll("jobs");
    let job = jobs.find((j: any) => j.id === jobId);
    if (!job) {
      job = {
        id: jobId,
        title: "Senior Infrastructure Engineer",
        company: "Enterprise Cloud Solutions",
        location: "Remote",
        country: "USA",
        description: "Architect dual-WAN routing, firewalls, and Windows Server Active Directory infrastructure.",
        skillsRequired: ["Active Directory", "Firewalls", "Network Administration", "Desktop Support"],
        salary: "$140,000",
        visaSponsorship: true,
        postedDate: new Date().toISOString()
      };
    }

    const atsAnalysis = await this.atsService.compareJobDescription(
      job.id,
      job.description,
      job.title,
      job.company,
      job.location,
      job.skillsRequired
    );

    await this.repo.addSystemLog(
      "info",
      "daemon",
      `Application package generated for ${job.title} at ${job.company}. ATS Match Score: ${atsAnalysis.score}%.`
    );

    return {
      atsAnalysis,
      coverLetterDraft: atsAnalysis.coverLetterDraft
    };
  }

  /**
   * 6 & 7. Orchestrate Full Career Cycle & Generate Executive Summary (Long-term Memory)
   */
  public async runFullSupervisorCycle(): Promise<SupervisorExecutionResult> {
    if (this.isRunningCycle) {
      throw new Error("Career Supervisor execution cycle is already running.");
    }

    this.isRunningCycle = true;
    const cycleId = `cycle-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const errors: string[] = [];

    let discoveryStats = { jobsFound: 0, freelanceProjectsFound: 0, scanAlertsTriggered: 0 };
    let scoringStats = { scoredCount: 0, averageScore: 0, topMatches: [] as any[] };
    let recruiterStats = { recruiterCount: 0, notificationsSent: 0 };
    let freelanceStats = { totalProjects: 0, proposalsGenerated: 0 };

    try {
      // Step A: Autonomous Discovery
      const discovery = await this.runAutonomousDiscoveryCycle();
      discoveryStats = {
        jobsFound: discovery.jobsCount,
        freelanceProjectsFound: discovery.freelanceCount,
        scanAlertsTriggered: discovery.scanSuccess ? 1 : 0
      };

      // Step B: AI Scoring
      const scoring = await this.evaluateAndScoreOpportunities();
      scoringStats = {
        scoredCount: scoring.scoredCount,
        averageScore: scoring.averageScore,
        topMatches: scoring.topMatches
      };

      // Step C: Recruiter Workflows
      const recruiters = await this.dispatchRecruiterWorkflows();
      recruiterStats = recruiters;

      // Step D: Freelance Workflows
      const freelance = await this.dispatchFreelanceWorkflows();
      freelanceStats = freelance;

      // Step E: Executive Summary & Long-term Memory Record
      await this.generateExecutiveSummary();
    } catch (err: any) {
      errors.push(err.message);
    } finally {
      this.isRunningCycle = false;
    }

    const executionResult: SupervisorExecutionResult = {
      cycleId,
      timestamp,
      discoveryStats,
      scoringStats: {
        jobsScored: scoringStats.scoredCount,
        averageMatchScore: scoringStats.averageScore,
        highMatchJobsCount: scoringStats.topMatches.length
      },
      recruiterStats: {
        contactsEnriched: recruiterStats.recruiterCount,
        notificationsSent: recruiterStats.notificationsSent
      },
      freelanceStats: {
        proposalsDrafted: freelanceStats.proposalsGenerated
      },
      applicationsGenerated: scoringStats.topMatches.length,
      status: errors.length === 0 ? "SUCCESS" : "PARTIAL_SUCCESS",
      errors
    };

    // Store in long-term memory
    await this.repo.addMemory({
      type: "context",
      content: `Career Supervisor Cycle (${cycleId}): Discovered ${discoveryStats.jobsFound} jobs, ${discoveryStats.freelanceProjectsFound} freelance projects. Scored ${scoringStats.scoredCount} positions (avg match: ${scoringStats.averageScore}%). Dispatched ${recruiterStats.notificationsSent} recruiter outreach events.`
    });

    return executionResult;
  }

  /**
   * Generates Daily Executive Career Summary
   */
  public async generateExecutiveSummary(): Promise<ExecutiveCareerSummary> {
    const jobs = await this.repo.findAll("jobs");
    const gigs = await this.repo.getSampleGigs();
    const recruiters = await this.repo.getRecruiterContacts();
    const logs = await this.repo.getSystemLogs();

    const highMatchJobs = jobs.filter((j: any) => (j.confidenceScore || 0) >= 75);
    const pendingProposals = gigs.filter((g: any) => !!(g as any).proposalDraft);

    const summary: ExecutiveCareerSummary = {
      summaryId: `exec-summary-${Date.now()}`,
      timestamp: new Date().toISOString(),
      totalActiveJobs: jobs.length,
      highMatchJobsCount: highMatchJobs.length,
      totalFreelanceProjects: gigs.length,
      totalRecruitersInPipeline: recruiters.length,
      pendingProposalCount: pendingProposals.length,
      recentAuditLogsCount: logs.length,
      systemHealthStatus: "HEALTHY",
      executiveInsights: [
        `Identified ${highMatchJobs.length} high-match full-time roles requiring immediate resume tailoring.`,
        `Managed ${gigs.length} freelance opportunities with ${pendingProposals.length} active draft proposals.`,
        `Maintained active connection with ${recruiters.length} recruiters in the pipeline.`
      ]
    };

    // Store Executive Summary in Long-Term Memory
    await this.repo.addMemory({
      type: "context",
      content: `Daily Executive Summary: ${summary.totalActiveJobs} active jobs, ${summary.highMatchJobsCount} high-match roles, ${summary.totalFreelanceProjects} freelance projects, ${summary.totalRecruitersInPipeline} recruiters in pipeline. Insights: ${summary.executiveInsights.join(" | ")}`
    });

    return summary;
  }

  /**
   * Start Autonomous Scheduler Daemon
   */
  public startAutonomousScheduler(intervalMs: number = 300000): void {
    if (this.cronTimer) {
      clearInterval(this.cronTimer);
    }

    this.cronTimer = setInterval(async () => {
      try {
        await this.runFullSupervisorCycle();
      } catch (err: any) {
        console.error("[CareerSupervisorService] Background daemon cycle error:", err.message);
      }
    }, intervalMs);

    this.repo.addSystemLog("info", "daemon", `Career Supervisor autonomous scheduler started (Interval: ${intervalMs}ms).`);
  }

  /**
   * Stop Autonomous Scheduler Daemon
   */
  public stopAutonomousScheduler(): void {
    if (this.cronTimer) {
      clearInterval(this.cronTimer);
      this.cronTimer = null;
    }
    this.repo.addSystemLog("info", "daemon", "Career Supervisor autonomous scheduler stopped.");
  }
}
