import { IIntelligenceCoordinator } from "../../kernel/intelligence/types";

export interface CandidateProfile {
  name: string;
  skills: string[];
  experienceYears: number;
  experienceSummary?: string;
  resumeText?: string;
}

export interface JobDescription {
  title: string;
  requiredSkills: string[];
  minimumExperienceYears: number;
  descriptionText?: string;
  requirements?: string[];
}

export interface RecruitmentAssessment {
  candidateScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  transferableSkills: string[];
  semanticSimilarity: number;
  confidence: number;
  riskSummary: string;
  recommendation: string;
  explanation: string;
  decisionHistoryReference: string[];
}

export interface AssessmentOptions {
  correlationId?: string;
  timeoutMs?: number;
}

export class RecruitmentIntelligenceModule {
  constructor(private coordinator: IIntelligenceCoordinator) {
    if (!this.coordinator) {
      throw new Error("IntelligenceCoordinator is required for RecruitmentIntelligenceModule.");
    }
  }

  /**
   * Normalizes a CandidateProfile to ensure safe down-stream processing
   */
  private normalizeCandidate(candidate: CandidateProfile): Record<string, any> {
    const skills = (candidate.skills || []).map(s => s.trim().toLowerCase());
    const expSummary = candidate.experienceSummary || candidate.resumeText || "";
    return {
      name: candidate.name || "Anonymous Candidate",
      skills,
      experienceYears: Math.max(0, candidate.experienceYears || 0),
      experienceSummary: expSummary,
      displayText: `Candidate: ${candidate.name || "Anonymous"}\nSkills: ${skills.join(", ")}\nExperience: ${candidate.experienceYears || 0} years\nSummary: ${expSummary}`
    };
  }

  /**
   * Normalizes a JobDescription to ensure safe down-stream processing
   */
  private normalizeJob(job: JobDescription): Record<string, any> {
    const requiredSkills = (job.requiredSkills || []).map(s => s.trim().toLowerCase());
    const descText = job.descriptionText || (job.requirements || []).join("\n") || "";
    return {
      title: job.title || "Untitled Vacancy",
      requiredSkills,
      minimumExperienceYears: Math.max(0, job.minimumExperienceYears || 0),
      descriptionText: descText,
      displayText: `Job Title: ${job.title || "Untitled"}\nRequired Skills: ${requiredSkills.join(", ")}\nMin Experience: ${job.minimumExperienceYears || 0} years\nDescription: ${descText}`
    };
  }

  /**
   * Performs an end-to-end recruitment assessment by coordinating deep semantic, risk, and confidence intelligence.
   */
  public async assessCandidate(
    candidate: CandidateProfile,
    job: JobDescription,
    options?: AssessmentOptions
  ): Promise<RecruitmentAssessment> {
    // Fallback collections computed locally first for robust mapping
    const normalizedCandidate = this.normalizeCandidate(candidate);
    const normalizedJob = this.normalizeJob(job);

    const candSkillsSet = new Set(normalizedCandidate.skills);
    const matchingSkills = job.requiredSkills.filter(s => candSkillsSet.has(s.trim().toLowerCase()));
    const missingSkills = job.requiredSkills.filter(s => !candSkillsSet.has(s.trim().toLowerCase()));

    const coordinatorInput: Record<string, any> = {
      correlationId: options?.correlationId,
      timeoutMs: options?.timeoutMs || 8000,
      concept: normalizedCandidate.displayText,
      compareWith: normalizedJob.displayText,
      title: `Candidate Assessment: ${normalizedCandidate.name} vs ${normalizedJob.title}`,
      processedOutput: {
        candidateName: normalizedCandidate.name,
        jobTitle: normalizedJob.title,
        candidateSkills: normalizedCandidate.skills,
        jobSkills: normalizedJob.requiredSkills,
        matchingSkills,
        missingSkills,
        experienceYears: normalizedCandidate.experienceYears,
        minimumExperienceYears: normalizedJob.minimumExperienceYears
      },
      decisionContext: `Match appraisal of candidate '${normalizedCandidate.name}' for role '${normalizedJob.title}'`,
      historyLimit: 5,
      // Pass domain specifics to feed Risk Intelligence audits
      candidateExperience: normalizedCandidate.experienceYears,
      jobExperience: normalizedJob.minimumExperienceYears,
      candidateSkillsCount: normalizedCandidate.skills.length,
      requiredSkillsCount: normalizedJob.requiredSkills.length
    };

    try {
      const coordResult = await this.coordinator.coordinate(coordinatorInput);

      // Extract results from orchestrated output
      const semanticSimilarity = coordResult.semantic?.similarityScore ?? 0;
      const confidence = coordResult.confidence?.confidencePercentage ?? 0;
      const riskScore = coordResult.risk?.riskScore ?? coordResult.risk?.overallRiskScore ?? 0;
      const riskSummary = coordResult.risk?.explanation || coordResult.risk?.riskLevel || "No major compliance or security risks flagged.";
      const recommendation = coordResult.recommendations?.primaryRecommendation || 
                             coordResult.recommendations?.nextBestAction?.title || 
                             "Recommendation pending further interview stages.";
      const explanation = coordResult.explanation?.explanation || "Matching explanation compiled successfully.";
      const transferableSkills = coordResult.semantic?.transferableCapabilities || [];
      const decisionHistoryReference = coordResult.decisionHistory?.map((d: any) => d.decisionId || d.id).filter(Boolean) || [];

      // Calculate an overall strategic candidate score taking multiple intelligence vectors into account
      const skillRatio = job.requiredSkills.length > 0 ? (matchingSkills.length / job.requiredSkills.length) : 1.0;
      const expRatio = normalizedCandidate.experienceYears >= normalizedJob.minimumExperienceYears 
        ? 1.0 
        : (normalizedCandidate.experienceYears / Math.max(1, normalizedJob.minimumExperienceYears));
      
      const skillScore = skillRatio * 100;
      const expScore = expRatio * 100;
      const riskFactor = 100 - riskScore;

      const candidateScore = Math.round(
        (skillScore * 0.3) +
        (expScore * 0.2) +
        (semanticSimilarity * 0.3) +
        (confidence * 0.1) +
        (riskFactor * 0.1)
      );

      return {
        candidateScore: Math.max(0, Math.min(100, candidateScore)),
        matchingSkills,
        missingSkills,
        transferableSkills,
        semanticSimilarity,
        confidence,
        riskSummary,
        recommendation,
        explanation,
        decisionHistoryReference
      };

    } catch (err: any) {
      console.warn("[RecruitmentIntelligenceModule] Intelligence pipeline failed, reverting to local matching:", err.message || err);
      
      // Graceful local deterministic fallback
      const skillRatio = job.requiredSkills.length > 0 ? (matchingSkills.length / job.requiredSkills.length) : 1.0;
      const expRatio = normalizedCandidate.experienceYears >= normalizedJob.minimumExperienceYears 
        ? 1.0 
        : (normalizedCandidate.experienceYears / Math.max(1, normalizedJob.minimumExperienceYears));
      
      const candidateScore = Math.round((skillRatio * 60) + (expRatio * 40));

      return {
        candidateScore: Math.max(0, Math.min(100, candidateScore)),
        matchingSkills,
        missingSkills,
        transferableSkills: [],
        semanticSimilarity: 0,
        confidence: 0,
        riskSummary: "Coordinator offline. Local matching performed.",
        recommendation: "Conduct manual engineering screening.",
        explanation: "Strategic reasoning and context loading unavailable due to orchestration failure.",
        decisionHistoryReference: []
      };
    }
  }
}
