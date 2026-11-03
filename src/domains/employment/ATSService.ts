import { IAppRepository } from "../shared/repository/IRepository";
import { AIService } from "../infrastructure/AIService";
import { Type } from "@google/genai";

export interface CompareResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  experienceMatch: boolean;
  recommendation: string;
  coverLetterDraft: string;
  engine: "Gemini-3.5" | "Local-Rule-Engine";
}

export class ATSService {
  constructor(
    private repo: IAppRepository,
    private aiService: AIService
  ) {}

  /**
   * Compares a job description with candidate profile and returns complete scored match & draft cover letter
   */
  public async compareJobDescription(
    jobId?: string,
    customJd?: string,
    customTitle?: string,
    customCompany?: string,
    customLocation?: string,
    customSkills?: string[]
  ): Promise<CompareResult> {
    let targetTitle = customTitle || "";
    let targetCompany = customCompany || "Selected Company";
    let targetLocation = customLocation || "Remote";
    let targetSkills: string[] = customSkills || [];
    let targetDescription = customJd || "";

    // If jobId is provided, lookup from repo
    if (jobId) {
      // Look up in static sample jobs or other job datasets
      // Let's look up using repo's sampleJobs
      const jobs = [
        {
          id: "job-1",
          title: "Enterprise IT Systems & AMC Specialist",
          company: "Indus Global Commerce Ltd.",
          location: "Mumbai, India (Onsite / AMC Contract)",
          skillsRequired: ["Active Directory", "Windows Server", "VPN", "Firewall", "Cisco", "IT Infrastructure", "Backup"],
          description: "We are looking for a senior systems administrator to take on an annual maintenance contract (AMC) for our headquarters. Responsibilities include routine maintenance of 65 workstations (Windows 11), troubleshooting Active Directory & Group Policies, administering a dual-WAN VPN network setup via Cisco/MikroTik firewalls, and managing server back-ups. Weekend and emergency support options are highly valued.",
          visaSponsorship: false
        }
      ];
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        targetTitle = job.title;
        targetCompany = job.company;
        targetLocation = job.location;
        targetSkills = job.skillsRequired;
        targetDescription = job.description;
      }
    }

    if (!targetDescription) {
      throw new Error("Missing Job Description to perform comparison.");
    }

    const jobProfile = await this.repo.getJobProfile();
    const aiClient = this.aiService.getClient();


    // 1. Prepare local fallback logic first (always guaranteed to run)
    const matchedSkills = targetSkills.filter(skill => 
      jobProfile.skills.some(ps => ps.toLowerCase() === skill.toLowerCase()) ||
      jobProfile.resume.toLowerCase().includes(skill.toLowerCase())
    );
    const missingSkills = targetSkills.filter(skill => !matchedSkills.includes(skill));
    
    let score = Math.round((matchedSkills.length / Math.max(1, targetSkills.length)) * 45);
    const experienceMatch = jobProfile.experienceYears >= 3;
    score += experienceMatch ? 25 : 10;

    const countryMatch = jobProfile.preferredCountries.some(c => 
      targetLocation.toLowerCase().includes(c.toLowerCase())
    );
    if (countryMatch) score += 15;
    
    const visaMatch = jobProfile.visaPreference === "No Sponsorship Needed" || !jobId;
    score += visaMatch ? 15 : 5;
    score = Math.min(100, Math.max(10, score));

    const recommendation = `Your profile matches ${matchedSkills.length} of ${targetSkills.length} key required technical keywords. Focus on adding references to missing skills like: ${missingSkills.join(", ")} inside your resume. Ensure your operational history highlights measurable performance optimization.`;

    const coverLetterDraft = `Dear Hiring Manager,

I am writing to express my strong interest in the ${targetTitle} position at ${targetCompany}. With over ${jobProfile.experienceYears} years of experience as an IT specialist and my dedicated technical expertise in ${jobProfile.skills.slice(0, 3).join(", ")}, I am excited to apply my background in systems design and infrastructure efficiency to your team.

In reviewing your requirements, your focus on ${targetSkills.slice(0, 3).join(", ")} aligns perfectly with my proven track record. I have consistently delivered robust setups using identical paradigms to streamline operations, bolster infrastructure security, and accelerate development loops.

I look forward to discussing how my results-oriented mindset can support ${targetCompany}'s goals. Thank you for your time and professional consideration.

Sincerely,
Aziz`;

    // 2. Attempt to evaluate via Gemini AI if key exists
    if (aiClient) {
      try {
        const prompt = `Perform a thorough applicant tracking system (ATS) matching analysis. Compare this profile and CV against the job description below.
        
        CANDIDATE RECOGNIZED VALUES:
        Experience: ${jobProfile.experienceYears} years
        Skills List: ${jobProfile.skills.join(", ")}
        Countries Preferred: ${jobProfile.preferredCountries.join(", ")}
        Visa requirement: ${jobProfile.visaPreference}
        CV text: "${jobProfile.resume}"

        JOB OPENING SUMMARY:
        Title: "${targetTitle}"
        Company: "${targetCompany}"
        Location: "${targetLocation}"
        Target skills requested: ${targetSkills.join(", ")}
        Description text: "${targetDescription}"

        Evaluate skills keyword overlapping, years of experience matching, and candidate suitability. Write a custom cover letter draft matching their resume and this JD.
        Output your exact evaluation in the requested JSON structure.`;

        const response = await this.aiService.generateContentWithFallback({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            temperature: 0.0,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER, description: "ATS score out of 100 based on matching keyword skills, experience alignment, and preferences" },
                matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Skills that the candidate possesses which align with the JD requirements" },
                missingSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Important technical terms, systems, or frameworks listed in the JD that are missing from candidate profile" },
                experienceMatch: { type: Type.BOOLEAN, description: "Whether the candidate's experience years align with the role seniority" },
                recommendation: { type: Type.STRING, description: "Highly constructive tips for how the candidate can edit their resume or skills to secure a higher match rate" },
                coverLetterDraft: { type: Type.STRING, description: "A beautifully written, tailored, professional cover letter draft under 180 words referencing their shared CV details" }
              },
              required: ["score", "matchedSkills", "missingSkills", "experienceMatch", "recommendation", "coverLetterDraft"]
            }
          }
        });

        if (response && response.text) {
          const parsed = JSON.parse(response.text.trim());
          return {
            score: parsed.score,
            matchedSkills: parsed.matchedSkills,
            missingSkills: parsed.missingSkills,
            experienceMatch: parsed.experienceMatch,
            recommendation: parsed.recommendation,
            coverLetterDraft: parsed.coverLetterDraft,
            engine: "Gemini-3.5"
          };
        }
      } catch (err) {
        console.warn("Gemini compare failed, proceeding with smart local evaluation fallback:", err);
      }
    }

    return {
      score,
      matchedSkills,
      missingSkills,
      experienceMatch,
      recommendation,
      coverLetterDraft,
      engine: "Local-Rule-Engine"
    };
  }
}
