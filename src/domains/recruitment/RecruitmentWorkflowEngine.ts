import { RecruitmentIntelligenceModule, CandidateProfile, JobDescription, RecruitmentAssessment } from "./RecruitmentIntelligenceModule";

export interface CandidateSubmission {
  candidate: CandidateProfile;
  version?: number;
  recruiterNotes?: string;
}

export interface CandidateRankingEntry {
  candidateName: string;
  score: number;
  rank: number;
  assessment: RecruitmentAssessment;
  version: number;
  duplicateDetected: boolean;
  duplicateOf?: string;
  interviewRecommendation: "STRONGLY_RECOMMENDED" | "RECOMMENDED" | "MAYBE_STAGE" | "REJECTED";
  recruiterNotes?: string;
}

export interface RecruitmentWorkflowResult {
  workflowId: string;
  jobTitle: string;
  workflowStatus: "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED";
  candidateRanking: CandidateRankingEntry[];
  shortlistedCandidates: CandidateRankingEntry[];
  assessmentHistory: Record<string, RecruitmentAssessment[]>;
  recommendations: {
    primaryCandidate?: string;
    interviewPanelFocusAreas: Record<string, string[]>;
  };
  auditTrail: string[];
}

export interface WorkflowOptions {
  correlationId?: string;
  shortlistThreshold?: number; // defaults to 70
  timeoutMs?: number;
}

export class RecruitmentWorkflowEngine {
  // Global memory storage of historical assessments per candidate name to manage versioning and history across runs.
  // Thread-safe since we operate on standard read-writes and do not block.
  private static globalAssessmentHistory: Record<string, RecruitmentAssessment[]> = {};
  private static globalResumeVersions: Record<string, Record<number, CandidateProfile>> = {};

  constructor(private recruitmentModule: RecruitmentIntelligenceModule) {
    if (!this.recruitmentModule) {
      throw new Error("RecruitmentIntelligenceModule is required for RecruitmentWorkflowEngine.");
    }
  }

  /**
   * Resets the static historical state. Excellent for test isolation.
   */
  public static resetGlobalState(): void {
    RecruitmentWorkflowEngine.globalAssessmentHistory = {};
    RecruitmentWorkflowEngine.globalResumeVersions = {};
  }

  /**
   * Runs the complete end-to-end multi-candidate recruitment assessment lifecycle.
   */
  public async executeWorkflow(
    submissions: CandidateSubmission[],
    job: JobDescription,
    options?: WorkflowOptions
  ): Promise<RecruitmentWorkflowResult> {
    const workflowId = options?.correlationId || "wf_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
    const threshold = options?.shortlistThreshold ?? 70;
    const auditTrail: string[] = [`Workflow [${workflowId}] started for Job: ${job.title || "Untitled"}`];
    
    auditTrail.push(`Received ${submissions.length} candidate submissions`);

    const rankings: CandidateRankingEntry[] = [];
    const localAssessedMap = new Map<string, CandidateProfile>();
    let successCount = 0;
    let failureCount = 0;

    // STEP 1: Process each submission in sequence or in parallel (fully stateless/thread-safe per request)
    for (const sub of submissions) {
      const candidate = sub.candidate;
      const cName = candidate.name || "Anonymous Candidate";
      
      auditTrail.push(`Processing candidate: ${cName}`);

      // 1.1 Resume Normalization and Versioning check
      if (!RecruitmentWorkflowEngine.globalResumeVersions[cName]) {
        RecruitmentWorkflowEngine.globalResumeVersions[cName] = {};
      }
      
      const versionsMap = RecruitmentWorkflowEngine.globalResumeVersions[cName];
      const existingVersions = Object.keys(versionsMap).map(Number);
      const currentVersion = sub.version || (existingVersions.length > 0 ? Math.max(...existingVersions) + 1 : 1);
      versionsMap[currentVersion] = candidate;
      auditTrail.push(`Assigned version ${currentVersion} to candidate: ${cName}`);

      // 1.2 Duplicate candidate detection
      // Detect if this candidate's resume/skills match an already processed candidate in this batch or previous versions
      let duplicateDetected = false;
      let duplicateOf: string | undefined = undefined;

      // Check local batch duplicates first
      if (localAssessedMap.has(cName)) {
        duplicateDetected = true;
        duplicateOf = cName;
        auditTrail.push(`Warning: Duplicate candidate name detected in local batch: ${cName}`);
      } else {
        // Deep structural duplicate comparison: check if skills and experience exactly match anyone else
        for (const [otherName, otherProfile] of localAssessedMap.entries()) {
          const isSkillsMatch = this.areSkillsIdentical(candidate.skills, otherProfile.skills);
          if (isSkillsMatch && candidate.experienceYears === otherProfile.experienceYears) {
            duplicateDetected = true;
            duplicateOf = otherName;
            auditTrail.push(`Warning: Deep profile match detected. ${cName} is a duplicate of ${otherName}`);
            break;
          }
        }
      }

      localAssessedMap.set(cName, candidate);

      // 1.3 Trigger assessment via RecruitmentIntelligenceModule
      let assessment: RecruitmentAssessment;
      try {
        assessment = await this.recruitmentModule.assessCandidate(candidate, job, {
          correlationId: workflowId,
          timeoutMs: options?.timeoutMs
        });
        successCount++;
        auditTrail.push(`Assessment succeeded for ${cName} with score: ${assessment.candidateScore}`);
      } catch (err: any) {
        failureCount++;
        auditTrail.push(`Error: Assessment failed for ${cName}: ${err.message}`);
        // Failsafe local matching
        assessment = {
          candidateScore: 0,
          matchingSkills: [],
          missingSkills: job.requiredSkills || [],
          transferableSkills: [],
          semanticSimilarity: 0,
          confidence: 0,
          riskSummary: "Orchestrator failed during workflow evaluation.",
          recommendation: "Hold evaluation.",
          explanation: "Pipeline processing failure occurred.",
          decisionHistoryReference: []
        };
      }

      // Record assessment history
      if (!RecruitmentWorkflowEngine.globalAssessmentHistory[cName]) {
        RecruitmentWorkflowEngine.globalAssessmentHistory[cName] = [];
      }
      RecruitmentWorkflowEngine.globalAssessmentHistory[cName].push(assessment);

      // 1.4 Interview Recommendation Engine
      let interviewRecommendation: "STRONGLY_RECOMMENDED" | "RECOMMENDED" | "MAYBE_STAGE" | "REJECTED";
      if (assessment.candidateScore >= 85) {
        interviewRecommendation = "STRONGLY_RECOMMENDED";
      } else if (assessment.candidateScore >= 70) {
        interviewRecommendation = "RECOMMENDED";
      } else if (assessment.candidateScore >= 50) {
        interviewRecommendation = "MAYBE_STAGE";
      } else {
        interviewRecommendation = "REJECTED";
      }

      rankings.push({
        candidateName: cName,
        score: assessment.candidateScore,
        rank: 0, // Assigned later
        assessment,
        version: currentVersion,
        duplicateDetected,
        duplicateOf,
        interviewRecommendation,
        recruiterNotes: sub.recruiterNotes
      });
    }

    // STEP 2: Candidate Ranking
    // Sort descending by candidateScore
    rankings.sort((a, b) => b.score - a.score);
    rankings.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });
    auditTrail.push("Candidate rankings computed and sorted.");

    // STEP 3: Shortlisting
    const shortlistedCandidates = rankings.filter(r => r.score >= threshold);
    auditTrail.push(`Shortlisted ${shortlistedCandidates.length} candidates meeting threshold >= ${threshold}`);

    // STEP 4: Determine overall workflow status
    let workflowStatus: "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED" = "SUCCESS";
    if (failureCount > 0) {
      if (successCount > 0) {
        workflowStatus = "PARTIAL_SUCCESS";
      } else {
        workflowStatus = "FAILED";
      }
    }
    auditTrail.push(`Workflow execution finished with status: ${workflowStatus}`);

    // STEP 5: Focus areas & primary candidate selection
    const primaryCandidate = rankings[0]?.score >= threshold ? rankings[0].candidateName : undefined;
    const interviewPanelFocusAreas: Record<string, string[]> = {};

    rankings.forEach(r => {
      // Focus interview panels on bridging missing skills and addressing risk summaries
      const focus: string[] = [];
      if (r.assessment.missingSkills.length > 0) {
        focus.push(`Bridge missing skills: ${r.assessment.missingSkills.slice(0, 3).join(", ")}`);
      }
      if (r.assessment.riskSummary && r.assessment.riskSummary !== "Low recruitment risk." && r.assessment.riskSummary !== "No major compliance or security risks flagged.") {
        focus.push(`Probe risks: ${r.assessment.riskSummary}`);
      }
      interviewPanelFocusAreas[r.candidateName] = focus.length > 0 ? focus : ["General technical alignment screen."];
    });

    // Capture global history records for all processed candidates to return to the recruiter
    const assessmentHistory: Record<string, RecruitmentAssessment[]> = {};
    rankings.forEach(r => {
      assessmentHistory[r.candidateName] = RecruitmentWorkflowEngine.globalAssessmentHistory[r.candidateName] || [];
    });

    return {
      workflowId,
      jobTitle: job.title || "Untitled Vacancy",
      workflowStatus,
      candidateRanking: rankings,
      shortlistedCandidates,
      assessmentHistory,
      recommendations: {
        primaryCandidate,
        interviewPanelFocusAreas
      },
      auditTrail
    };
  }

  /**
   * Deep structural array similarity utility
   */
  private areSkillsIdentical(skillsA: string[], skillsB: string[]): boolean {
    if (skillsA.length !== skillsB.length) return false;
    const setA = new Set(skillsA.map(s => s.trim().toLowerCase()));
    return skillsB.every(s => setA.has(s.trim().toLowerCase()));
  }

  /**
   * Generates a fully structured, exportable Markdown summary representation of the complete workflow assessment.
   */
  public generateExportReport(result: RecruitmentWorkflowResult): string {
    let report = `# RECRUITMENT ASSESSMENT WORKFLOW REPORT\n`;
    report += `**Workflow ID:** \`${result.workflowId}\`  \n`;
    report += `**Role:** ${result.jobTitle}  \n`;
    report += `**Execution Status:** ${result.workflowStatus}  \n`;
    report += `\n## CANDIDATE RANKINGS\n\n`;

    result.candidateRanking.forEach(r => {
      report += `### Rank #${r.rank}: ${r.candidateName}\n`;
      report += `- **Score:** ${r.score}/100\n`;
      report += `- **Version:** v${r.version}\n`;
      report += `- **Duplicate Status:** ${r.duplicateDetected ? `⚠️ YES (Duplicate of ${r.duplicateOf})` : "✅ NO"}\n`;
      report += `- **Interview Decision:** **${r.interviewRecommendation}**\n`;
      if (r.recruiterNotes) {
        report += `- **Recruiter Notes:** *"${r.recruiterNotes}"*\n`;
      }
      report += `- **Matching Skills:** ${r.assessment.matchingSkills.join(", ") || "None"}\n`;
      report += `- **Missing Skills:** ${r.assessment.missingSkills.join(", ") || "None"}\n`;
      report += `- **Transferable Skills:** ${r.assessment.transferableSkills.join(", ") || "None"}\n`;
      report += `- **Risk Summary:** ${r.assessment.riskSummary}\n`;
      report += `- **Recommendation Detail:** ${r.assessment.recommendation}\n`;
      report += `- **Explanation:** ${r.assessment.explanation}\n\n`;
    });

    report += `## AUDIT TRAIL\n\n`;
    result.auditTrail.forEach(step => {
      report += `- ${step}\n`;
    });

    return report;
  }
}
