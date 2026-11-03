import { IAppRepository } from "../shared/repository/IRepository";
import { AIService } from "../infrastructure/AIService";
import { Type } from "@google/genai";
import {
  Job,
  JobProfile,
  SearchHistoryEntry,
  SavedJobEntry,
  ApplicationTrackerEntry,
  InterviewStageEntry,
  FollowupEntry,
  CompanyProfileEntry,
  RecruiterContactEntry,
  OpportunityScoreBreakdown
} from "../../types";

export class EmploymentDomainError extends Error {
  public readonly code: string;
  public readonly category: "NOT_FOUND" | "VALIDATION" | "INFRASTRUCTURE" | "OPERATION" | "UNAUTHORIZED";
  public readonly recoverability: boolean;
  public readonly suggestedAction: string;

  constructor(
    code: string,
    category: "NOT_FOUND" | "VALIDATION" | "INFRASTRUCTURE" | "OPERATION" | "UNAUTHORIZED",
    message: string,
    recoverability: boolean,
    suggestedAction: string
  ) {
    super(message);
    this.name = "EmploymentDomainError";
    this.code = code;
    this.category = category;
    this.recoverability = recoverability;
    this.suggestedAction = suggestedAction;
    Object.setPrototypeOf(this, EmploymentDomainError.prototype);
  }

  public toJSON() {
    return {
      error: true,
      name: this.name,
      code: this.code,
      category: this.category,
      message: this.message,
      recoverability: this.recoverability,
      suggestedAction: this.suggestedAction
    };
  }
}


export class EmploymentV2Service {
  constructor(
    private repo: IAppRepository,
    private aiService: AIService
  ) {}

  // ==========================================
  // 1. SEARCH HISTORY
  // ==========================================
  public async getSearchHistory(): Promise<SearchHistoryEntry[]> {
    return await this.repo.findAll<SearchHistoryEntry>("employment_search_history") || [];
  }

  public async addSearchHistory(entry: Omit<SearchHistoryEntry, "id" | "date">): Promise<SearchHistoryEntry> {
    const fullEntry: SearchHistoryEntry = {
      ...entry,
      id: "sh-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
      date: new Date().toISOString()
    };
    return await this.repo.insert<SearchHistoryEntry>("employment_search_history", fullEntry);
  }

  public async updateSearchHistoryNotes(id: string, notes: string): Promise<SearchHistoryEntry> {
    const existing = await this.repo.findById<SearchHistoryEntry>("employment_search_history", id);
    if (!existing) {
      throw new Error(`Search history entry with id ${id} not found.`);
    }
    return await this.repo.update<SearchHistoryEntry>("employment_search_history", id, { userNotes: notes });
  }

  public async clearSearchHistory(): Promise<boolean> {
    const all = await this.getSearchHistory();
    for (const entry of all) {
      await this.repo.delete("employment_search_history", entry.id);
    }
    return true;
  }

  // ==========================================
  // 2. SAVED JOBS & 3. JOB COLLECTIONS
  // ==========================================
  public async getSavedJobs(): Promise<SavedJobEntry[]> {
    return await this.repo.findAll<SavedJobEntry>("employment_saved_jobs") || [];
  }

  public async saveJob(job: Job, status: "saved" | "archived" | "favorite" = "saved", categories: string[] = [], notes = ""): Promise<SavedJobEntry> {
    // Check duplicate
    const allSaved = await this.getSavedJobs();
    const duplicate = allSaved.find(sj => this.isDuplicateJob(sj.job, job));
    if (duplicate) {
      // update status and categories instead of adding new duplicate
      const mergedCats = Array.from(new Set([...duplicate.categories, ...categories]));
      return await this.repo.update<SavedJobEntry>("employment_saved_jobs", duplicate.id, {
        status,
        categories: mergedCats,
        notes: notes || duplicate.notes
      });
    }

    const entry: SavedJobEntry = {
      id: "sj-" + (job.id || Math.random().toString(36).substring(2, 10).toUpperCase()),
      job,
      status,
      categories,
      notes,
      addedDate: new Date().toISOString()
    };
    return await this.repo.insert<SavedJobEntry>("employment_saved_jobs", entry);
  }

  public async updateSavedJob(id: string, updates: Partial<SavedJobEntry>): Promise<SavedJobEntry> {
    return await this.repo.update<SavedJobEntry>("employment_saved_jobs", id, updates);
  }

  public async removeSavedJob(id: string): Promise<boolean> {
    return await this.repo.delete("employment_saved_jobs", id);
  }

  public async getJobCollections(): Promise<Array<{ name: string; count: number; type: "system" | "custom" }>> {
    const savedJobs = await this.getSavedJobs();
    const collectionsMap: Record<string, number> = {
      "Dream Companies": 0,
      "Applied": 0,
      "Remote Jobs": 0,
      "Germany": 0,
      "Canada": 0,
      "High Salary": 0,
      "Interview": 0,
      "Rejected": 0,
      "Offer Received": 0
    };

    // Calculate dynamic counts
    savedJobs.forEach(sj => {
      // Increment category-based counts
      (sj.categories || []).forEach(cat => {
        collectionsMap[cat] = (collectionsMap[cat] || 0) + 1;
      });

      // Quick heuristics to auto-populate default lists
      const titleLower = sj.job.title.toLowerCase();
      const locLower = sj.job.location.toLowerCase();
      const descLower = sj.job.description.toLowerCase();

      if (locLower.includes("remote") || descLower.includes("remote") || descLower.includes("work from home")) {
        collectionsMap["Remote Jobs"]++;
      }
      if (locLower.includes("germany") || sj.job.country?.toLowerCase() === "germany") {
        collectionsMap["Germany"]++;
      }
      if (locLower.includes("canada") || sj.job.country?.toLowerCase() === "canada") {
        collectionsMap["Canada"]++;
      }
      if (sj.job.salary && (sj.job.salary.includes("100") || sj.job.salary.includes("120") || sj.job.salary.includes("150") || sj.job.salary.includes("180") || sj.job.salary.includes("200") || sj.job.salary.includes("$"))) {
        collectionsMap["High Salary"]++;
      }
      if (sj.status === "favorite") {
        collectionsMap["Dream Companies"]++;
      }
    });

    const results = Object.keys(collectionsMap).map(name => {
      const isSystem = ["Dream Companies", "Applied", "Remote Jobs", "Germany", "Canada", "High Salary", "Interview", "Rejected", "Offer Received"].includes(name);
      return {
        name,
        count: collectionsMap[name],
        type: (isSystem ? "system" : "custom") as "system" | "custom"
      };
    });

    return results;
  }

  // ==========================================
  // 4. APPLICATION TRACKER
  // ==========================================
  public async getApplications(): Promise<ApplicationTrackerEntry[]> {
    return await this.repo.findAll<ApplicationTrackerEntry>("employment_applications") || [];
  }

  public async addApplication(app: Omit<ApplicationTrackerEntry, "id" | "appliedDate">): Promise<ApplicationTrackerEntry> {
    const entry: ApplicationTrackerEntry = {
      ...app,
      id: "app-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
      appliedDate: new Date().toISOString().split("T")[0]
    };

    const savedApp = await this.repo.insert<ApplicationTrackerEntry>("employment_applications", entry);

    // Also auto-add an entry into the Saved Jobs with "Applied" category
    try {
      const savedJobs = await this.getSavedJobs();
      const jobInSaved = savedJobs.find(sj => sj.job.company.toLowerCase() === app.company.toLowerCase() && sj.job.title.toLowerCase() === app.title.toLowerCase());
      if (jobInSaved) {
        if (!jobInSaved.categories.includes("Applied")) {
          await this.updateSavedJob(jobInSaved.id, {
            categories: [...jobInSaved.categories, "Applied"]
          });
        }
      } else {
        const mockJob: Job = {
          id: app.jobId || "job-" + Math.random().toString(36).substring(2, 6),
          title: app.title,
          company: app.company,
          location: "Applied Tracked",
          country: "Unknown",
          description: "Manually tracked via Application Tracker: " + app.notes,
          skillsRequired: [],
          salary: "Not specified",
          visaSponsorship: false,
          postedDate: new Date().toISOString().split("T")[0]
        };
        await this.saveJob(mockJob, "saved", ["Applied"], app.notes);
      }
    } catch (err) {
      console.warn("Non-blocking error syncing application to saved jobs:", err);
    }

    return savedApp;
  }

  public async updateApplicationStatus(id: string, status: ApplicationTrackerEntry["currentStatus"], notes?: string): Promise<ApplicationTrackerEntry> {
    const existing = await this.repo.findById<ApplicationTrackerEntry>("employment_applications", id);
    if (!existing) {
      throw new Error(`Application ${id} not found.`);
    }
    const updates: Partial<ApplicationTrackerEntry> = { currentStatus: status };
    if (notes) updates.notes = notes;
    
    const updatedApp = await this.repo.update<ApplicationTrackerEntry>("employment_applications", id, updates);

    // If status transitioned to Interview, Offer, Rejected, let's sync to saved jobs
    try {
      const savedJobs = await this.getSavedJobs();
      const jobInSaved = savedJobs.find(sj => sj.job.company.toLowerCase() === existing.company.toLowerCase() && sj.job.title.toLowerCase() === existing.title.toLowerCase());
      if (jobInSaved) {
        let categoryToSync = "";
        if (status === "Interview") categoryToSync = "Interview";
        if (status === "Offer") categoryToSync = "Offer Received";
        if (status === "Rejected") categoryToSync = "Rejected";

        if (categoryToSync && !jobInSaved.categories.includes(categoryToSync)) {
          await this.updateSavedJob(jobInSaved.id, {
            categories: [...jobInSaved.categories, categoryToSync]
          });
        }
      }
    } catch (err) {
      console.warn("Non-blocking error syncing status updates to saved jobs:", err);
    }

    return updatedApp;
  }

  public async deleteApplication(id: string): Promise<boolean> {
    return await this.repo.delete("employment_applications", id);
  }

  // ==========================================
  // 5. INTERVIEW PIPELINE
  // ==========================================
  public async getInterviewStages(): Promise<InterviewStageEntry[]> {
    return await this.repo.findAll<InterviewStageEntry>("employment_interview_pipeline") || [];
  }

  public async addInterviewStage(stage: Omit<InterviewStageEntry, "id">): Promise<InterviewStageEntry> {
    const entry: InterviewStageEntry = {
      ...stage,
      id: "int-" + Math.random().toString(36).substring(2, 10).toUpperCase()
    };
    const savedStage = await this.repo.insert<InterviewStageEntry>("employment_interview_pipeline", entry);

    // Automatically transition the main application tracker currentStatus to 'Interview' if it isn't already
    try {
      const app = await this.repo.findById<ApplicationTrackerEntry>("employment_applications", stage.applicationId);
      if (app && app.currentStatus !== "Interview" && app.currentStatus !== "Offer" && app.currentStatus !== "Accepted") {
        await this.updateApplicationStatus(stage.applicationId, "Interview", `Auto-promoted via scheduled interview: ${stage.stage}`);
      }
    } catch (err) {
      console.warn("Non-blocking application promote failed:", err);
    }

    return savedStage;
  }

  public async updateInterviewStage(id: string, updates: Partial<InterviewStageEntry>): Promise<InterviewStageEntry> {
    return await this.repo.update<InterviewStageEntry>("employment_interview_pipeline", id, updates);
  }

  public async deleteInterviewStage(id: string): Promise<boolean> {
    return await this.repo.delete("employment_interview_pipeline", id);
  }

  // ==========================================
  // 6. FOLLOW-UP MANAGER
  // ==========================================
  public async getFollowups(): Promise<FollowupEntry[]> {
    return await this.repo.findAll<FollowupEntry>("employment_followups") || [];
  }

  public async addFollowup(followup: Omit<FollowupEntry, "id" | "nextFollowupDate">): Promise<FollowupEntry> {
    // Automatically calculate next follow-up date
    const nextFollowupDate = this.calculateNextFollowup(followup.lastContactDate, followup.recruiterResponse);

    const entry: FollowupEntry = {
      ...followup,
      id: "fup-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
      nextFollowupDate
    };
    return await this.repo.insert<FollowupEntry>("employment_followups", entry);
  }

  public async updateFollowup(id: string, updates: Partial<FollowupEntry>): Promise<FollowupEntry> {
    if (updates.lastContactDate || updates.recruiterResponse) {
      const existing = await this.repo.findById<FollowupEntry>("employment_followups", id);
      if (existing) {
        const lastContact = updates.lastContactDate || existing.lastContactDate;
        const response = updates.recruiterResponse || existing.recruiterResponse;
        updates.nextFollowupDate = this.calculateNextFollowup(lastContact, response);
      }
    }
    return await this.repo.update<FollowupEntry>("employment_followups", id, updates);
  }

  public async deleteFollowup(id: string): Promise<boolean> {
    return await this.repo.delete("employment_followups", id);
  }

  public calculateNextFollowup(lastContactDateStr: string, responseStatus: string): string {
    const lastContact = new Date(lastContactDateStr || new Date());
    let daysToAdd = 7; // default
    if (responseStatus === "No Response") daysToAdd = 5;
    else if (responseStatus === "Interested") daysToAdd = 3;
    else if (responseStatus === "Scheduled Interview") daysToAdd = 2;
    else if (responseStatus === "Hold") daysToAdd = 14;

    const nextDate = new Date(lastContact.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    return nextDate.toISOString().split("T")[0];
  }

  // ==========================================
  // 7. COMPANY PROFILE & 8. RECRUITER DIRECTORY
  // ==========================================
  public async getCompanies(): Promise<CompanyProfileEntry[]> {
    return await this.repo.findAll<CompanyProfileEntry>("employment_companies") || [];
  }

  public async addCompany(company: Omit<CompanyProfileEntry, "id">): Promise<CompanyProfileEntry> {
    const entry: CompanyProfileEntry = {
      ...company,
      id: "co-" + Math.random().toString(36).substring(2, 10).toUpperCase()
    };
    return await this.repo.insert<CompanyProfileEntry>("employment_companies", entry);
  }

  public async updateCompany(id: string, updates: Partial<CompanyProfileEntry>): Promise<CompanyProfileEntry> {
    return await this.repo.update<CompanyProfileEntry>("employment_companies", id, updates);
  }

  public async deleteCompany(id: string): Promise<boolean> {
    return await this.repo.delete("employment_companies", id);
  }

  public async getRecruiters(): Promise<RecruiterContactEntry[]> {
    return await this.repo.findAll<RecruiterContactEntry>("employment_recruiters") || [];
  }

  public async addRecruiter(rec: Omit<RecruiterContactEntry, "id">): Promise<RecruiterContactEntry> {
    const entry: RecruiterContactEntry = {
      ...rec,
      id: "rec-" + Math.random().toString(36).substring(2, 10).toUpperCase()
    };
    const savedRec = await this.repo.insert<RecruiterContactEntry>("employment_recruiters", entry);

    // Automatically sync company to Companies Profile
    try {
      const companies = await this.getCompanies();
      const existingCo = companies.find(c => c.name.toLowerCase() === rec.company.toLowerCase());
      if (existingCo) {
        if (!existingCo.recruiters.includes(savedRec.name)) {
          await this.updateCompany(existingCo.id, {
            recruiters: [...existingCo.recruiters, savedRec.name]
          });
        }
      } else {
        await this.addCompany({
          name: rec.company,
          industry: "Technology",
          website: "",
          country: "Unknown",
          location: "Unknown",
          notes: "Auto-created via recruiter contact directory insertion.",
          recruiters: [savedRec.name],
          interviewExperiences: []
        });
      }
    } catch (err) {
      console.warn("Non-blocking error syncing recruiter to companies directory:", err);
    }

    return savedRec;
  }

  public async updateRecruiter(id: string, updates: Partial<RecruiterContactEntry>): Promise<RecruiterContactEntry> {
    return await this.repo.update<RecruiterContactEntry>("employment_recruiters", id, updates);
  }

  public async deleteRecruiter(id: string): Promise<boolean> {
    return await this.repo.delete("employment_recruiters", id);
  }

  // ==========================================
  // 9. AI OPPORTUNITY SCORE
  // ==========================================
  public async calculateOpportunityScore(job: Job, profile?: JobProfile): Promise<OpportunityScoreBreakdown> {
    const jobProfile = profile || await this.repo.getJobProfile();
    const aiClient = this.aiService.getClient();

    // Standard local evaluation fallback
    const skillMatchScore = this.calculateLocalSkillMatchScore(job, jobProfile);
    const salaryScore = this.calculateLocalSalaryScore(job);
    const locationScore = this.calculateLocalLocationScore(job, jobProfile);
    const visaScore = this.calculateLocalVisaScore(job, jobProfile);
    
    // Growth/competition/learning heuristic estimators
    const careerGrowth = 75; // average default
    const competition = 60; // moderate default
    const companyRating = 70; // average rating
    const learningOpportunity = 80; // default

    const localOverallScore = Math.round(
      (skillMatchScore * 0.25) +
      (salaryScore * 0.15) +
      (locationScore * 0.15) +
      (visaScore * 0.15) +
      (careerGrowth * 0.10) +
      (competition * 0.10) +
      (companyRating * 0.05) +
      (learningOpportunity * 0.05)
    );

    const defaultRationales = {
      skillMatch: `Matches candidate skills list with job keywords.`,
      salary: `Estimated based on market standards for the role: ${job.salary || "Not specified"}.`,
      location: `Evaluated against preferred locations: ${job.location || "Remote"}.`,
      visa: `Sponsorship preference alignment with candidate.`,
      careerGrowth: `Title seniority progression estimation.`,
      competition: `Calculated from technical stack complexity.`,
      companyRating: `Assessed reputation for ${job.company}.`,
      learningOpportunity: `Based on tools required for operations.`,
      overallScore: `Weighted balance score for long-term suitability.`
    };

    if (aiClient) {
      try {
        const prompt = `Perform a highly detailed AI opportunity scoring analysis for this job:
        Job: "${job.title}" at "${job.company}"
        Location: "${job.location}" (${job.country})
        Salary specified: "${job.salary || "Not Specified"}"
        Skills required: ${job.skillsRequired.join(", ")}
        Description: "${job.description.substring(0, 1000)}"

        Candidate Profile:
        Experience: ${jobProfile.experienceYears} years
        Skills: ${jobProfile.skills.join(", ")}
        Preferred Countries: ${jobProfile.preferredCountries.join(", ")}
        Visa Preference: ${jobProfile.visaPreference}

        Calculate and return individual sub-scores (0 to 100) and short rationales for:
        - skillMatch (How well CV skills match JD required tech stacks)
        - salary (Scored out of 100; if missing, estimate market rate for title and score)
        - location (How well the country & remote status aligns with candidate's choices)
        - visa (How well sponsor policy matches candidate's requirements)
        - careerGrowth (Seniority and professional development value)
        - competition (Estimate applicant pool competition; lower competition gets higher score)
        - companyRating (Reputation of company)
        - learningOpportunity (Richness of technical stack learning)
        - overallScore (Weighted blend overall fit)

        Return the score values and rationales as a structured JSON object.`;

        const response = await this.aiService.generateContentWithFallback({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                skillMatch: { type: Type.INTEGER },
                salary: { type: Type.INTEGER },
                location: { type: Type.INTEGER },
                visa: { type: Type.INTEGER },
                careerGrowth: { type: Type.INTEGER },
                competition: { type: Type.INTEGER },
                companyRating: { type: Type.INTEGER },
                learningOpportunity: { type: Type.INTEGER },
                overallScore: { type: Type.INTEGER },
                rationales: {
                  type: Type.OBJECT,
                  properties: {
                    skillMatch: { type: Type.STRING },
                    salary: { type: Type.STRING },
                    location: { type: Type.STRING },
                    visa: { type: Type.STRING },
                    careerGrowth: { type: Type.STRING },
                    competition: { type: Type.STRING },
                    companyRating: { type: Type.STRING },
                    learningOpportunity: { type: Type.STRING },
                    overallScore: { type: Type.STRING }
                  },
                  required: ["skillMatch", "salary", "location", "visa", "careerGrowth", "competition", "companyRating", "learningOpportunity", "overallScore"]
                }
              },
              required: ["skillMatch", "salary", "location", "visa", "careerGrowth", "competition", "companyRating", "learningOpportunity", "overallScore", "rationales"]
            }
          }
        });

        if (response && response.text) {
          const parsed = JSON.parse(response.text.trim());
          return parsed as OpportunityScoreBreakdown;
        }
      } catch (err) {
        console.warn("[EmploymentV2Service] Gemini opportunity score generation failed. Falling back to local scoring:", err);
      }
    }

    return {
      skillMatch: skillMatchScore,
      salary: salaryScore,
      location: locationScore,
      visa: visaScore,
      careerGrowth,
      competition,
      companyRating,
      learningOpportunity,
      overallScore: localOverallScore,
      rationales: defaultRationales
    };
  }

  private calculateLocalSkillMatchScore(job: Job, profile: JobProfile): number {
    const jobSkills = job.skillsRequired || [];
    const profileSkills = profile.skills || [];
    if (jobSkills.length === 0) return 70;
    const matched = jobSkills.filter(s =>
      profileSkills.some(ps => (ps || "").toLowerCase() === (s || "").toLowerCase())
    );
    return Math.round((matched.length / jobSkills.length) * 100);
  }

  private calculateLocalSalaryScore(job: Job): number {
    if (!job.salary || job.salary.toLowerCase().includes("not specified") || job.salary.toLowerCase().includes("competitive")) {
      return 65; // fair average estimate
    }
    // Simple parser for salary digits
    const digits = job.salary.replace(/[^0-9]/g, "");
    if (digits) {
      const val = parseInt(digits);
      if (val > 120000 || (val > 120 && val < 1000)) return 95; // highly lucrative
      if (val > 80000 || (val > 80 && val < 1000)) return 85;
      if (val > 50000 || (val > 50 && val < 1000)) return 75;
    }
    return 70;
  }

  private calculateLocalLocationScore(job: Job, profile: JobProfile): number {
    const locLower = job.location.toLowerCase();
    const isRemote = locLower.includes("remote") || locLower.includes("telecommute") || locLower.includes("wfh");
    if (isRemote) return 95;

    const matchedCountry = profile.preferredCountries.some(c =>
      locLower.includes(c.toLowerCase()) || (job.country && job.country.toLowerCase().includes(c.toLowerCase()))
    );
    return matchedCountry ? 85 : 40;
  }

  private calculateLocalVisaScore(job: Job, profile: JobProfile): number {
    if (profile.visaPreference === "No Sponsorship Needed") return 100;
    if (job.visaSponsorship) return 95;
    return 30; // poor visa alignment if required but not offered
  }

  // ==========================================
  // 10. JOB DUPLICATE DETECTION
  // ==========================================
  public isDuplicateJob(jobA: Job, jobB: Job): boolean {
    if (jobA.id && jobB.id && jobA.id === jobB.id) return true;

    const cleanStr = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
    
    const titleA = cleanStr(jobA.title);
    const titleB = cleanStr(jobB.title);
    const companyA = cleanStr(jobA.company);
    const companyB = cleanStr(jobB.company);

    // If company and title are identical, they are considered duplicate
    if (titleA && titleB && companyA && companyB && titleA === titleB && companyA === companyB) {
      return true;
    }

    return false;
  }

  public deduplicateJobsList(jobs: Job[]): Job[] {
    const unique: Job[] = [];
    for (const job of jobs) {
      const isDupe = unique.some(u => this.isDuplicateJob(u, job));
      if (!isDupe) {
        unique.push(job);
      }
    }
    return unique;
  }

  // ==========================================
  // 11. SMART FILTERS
  // ==========================================
  public filterJobs(jobs: Job[], filters: {
    remoteOnly?: boolean;
    hybridOnly?: boolean;
    onsiteOnly?: boolean;
    visaRequired?: boolean;
    countries?: string[];
    minSalary?: number;
    experienceYears?: number;
    requiredSkills?: string[];
    companySize?: string;
  }): Job[] {
    return (jobs || []).filter(job => {
      const locLower = (job.location || "").toLowerCase();
      const descLower = (job.description || "").toLowerCase();
      const isRemote = locLower.includes("remote") || descLower.includes("remote") || descLower.includes("work from home") || descLower.includes("wfh");
      const isHybrid = locLower.includes("hybrid") || descLower.includes("hybrid");
      const isOnsite = !isRemote && !isHybrid;

      if (filters.remoteOnly && !isRemote) return false;
      if (filters.hybridOnly && !isHybrid) return false;
      if (filters.onsiteOnly && !isOnsite) return false;

      if (filters.visaRequired && !job.visaSponsorship) return false;

      if (filters.countries && filters.countries.length > 0) {
        const countryMatch = filters.countries.some(c =>
          locLower.includes(c.toLowerCase()) || ((job.country || "").toLowerCase().includes(c.toLowerCase()))
        );
        if (!countryMatch) return false;
      }

      // Skill matches filter
      if (filters.requiredSkills && filters.requiredSkills.length > 0) {
        const hasSkill = filters.requiredSkills.every(s =>
          (job.skillsRequired || []).some(js => (js || "").toLowerCase() === (s || "").toLowerCase()) ||
          descLower.includes(s.toLowerCase()) ||
          (job.title || "").toLowerCase().includes(s.toLowerCase())
        );
        if (!hasSkill) return false;
      }

      // Min salary filter
      if (filters.minSalary && filters.minSalary > 0) {
        const digits = job.salary ? job.salary.replace(/[^0-9]/g, "") : "";
        if (digits) {
          const val = parseInt(digits);
          // if it's stored in thousands (like 120 or 150)
          const adjustedVal = (val < 1000) ? val * 1000 : val;
          if (adjustedVal < filters.minSalary) return false;
        }
      }

      // Experience filter check
      if (filters.experienceYears !== undefined && filters.experienceYears > 0) {
        // extract years of experience from description using regex
        const expRegex = /(\d+)\+?\s*(?:years|yrs)\s*(?:of)?\s*experience/gi;
        const match = expRegex.exec(descLower);
        if (match && match[1]) {
          const requiredYrs = parseInt(match[1]);
          if (requiredYrs > filters.experienceYears) return false;
        }
      }

      return true;
    });
  }

  // ==========================================
  // 12. SEARCH ANALYTICS
  // ==========================================
  public async getSearchAnalytics(): Promise<{
    searchCount: number;
    jobsFound: number;
    applications: number;
    interviews: number;
    offers: number;
    responseRate: number;
    conversionRate: number;
    statusDistribution: Record<string, number>;
  }> {
    const history = await this.getSearchHistory();
    const apps = await this.getApplications();

    const searchCount = (history || []).length;
    const jobsFound = (history || []).reduce((sum, h) => sum + (h.resultsCount || 0), 0);
    const applications = (apps || []).length;

    const interviews = (apps || []).filter(a => {
      const s = (a.currentStatus || "").toLowerCase();
      return s === "interview" || s === "interviewing" || s === "accepted";
    }).length;

    const offers = (apps || []).filter(a => {
      const s = (a.currentStatus || "").toLowerCase();
      return s === "offer" || s === "offer received" || s === "accepted";
    }).length;

    const responseRate = applications > 0 ? Math.round((interviews / applications) * 100) : 0;
    const conversionRate = applications > 0 ? Math.round((offers / applications) * 100) : 0;

    const statusDistribution: Record<string, number> = {
      "Applied": 0,
      "Interview": 0,
      "Offer": 0,
      "Rejected": 0,
      "Accepted": 0,
      "Withdrawn": 0
    };

    (apps || []).forEach(a => {
      let s = a.currentStatus || "Applied";
      if (s === "Interviewing") s = "Interview";
      if (s === "Offer Received") s = "Offer";
      statusDistribution[s] = (statusDistribution[s] || 0) + 1;
    });

    return {
      searchCount,
      jobsFound,
      applications,
      interviews,
      offers,
      responseRate,
      conversionRate,
      statusDistribution
    };
  }
}
