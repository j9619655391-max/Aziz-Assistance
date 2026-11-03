import { IAppRepository } from "../shared/repository/IRepository";
import { MatchingService, EvaluatedGig } from "../employment/MatchingService";
import { ProviderManager } from "../../kernel/provider/ProviderManager";
import { AIService } from "../infrastructure/AIService";
import { ResponseProvenance } from "../../kernel/provider/types";
import { Type } from "@google/genai";

export interface FreelanceSearchResult {
  gigs: EvaluatedGig[];
  status: string;
  provenance: ResponseProvenance;
}

export interface OptimizeGigResult {
  recommendedTitle: string;
  topSkillsToHighlight: string[];
  projectsToPrioritize: string[];
  strategicTips: string[];
}

export interface ProposalPitchResult {
  pitchText: string;
  estimatedHours: number;
  totalCostEstimate: string;
  milestones: string[];
  engine: string;
}

export class FreelanceService {
  constructor(
    private repo: IAppRepository,
    private matchingService: MatchingService,
    private providerManager: ProviderManager,
    private aiService: AIService
  ) {}

  /**
   * Search freelance consulting opportunities across multiple providers with matching evaluation
   */
  public async searchGigs(
    query: string,
    options?: { page?: number; limit?: number; requestId?: string }
  ): Promise<FreelanceSearchResult> {
    const profile = await this.repo.getJobProfile();

    const result = await this.providerManager.fetchGigsWithFailover(
      query,
      profile.skills,
      options
    );

    const evaluatedGigs = result.gigs.map(gig => 
      this.matchingService.evaluateGig(gig, profile)
    ).sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    const clientStatus = result.provenance.origin === "UNAVAILABLE" ? "Live source unavailable" : result.provenance.origin;

    return {
      gigs: evaluatedGigs,
      status: clientStatus,
      provenance: result.provenance
    };
  }

  /**
   * Run profile-gig alignment optimization using Gemini AI
   */
  public async optimizeGig(
    gigId?: string,
    customTitle?: string,
    customDescription?: string
  ): Promise<OptimizeGigResult> {
    let targetTitle = customTitle || "";
    let targetDescription = customDescription || "";

    if (gigId) {
      const gig = await this.repo.findGigById(gigId);
      if (gig) {
        targetTitle = gig.title;
        targetDescription = gig.description;
      }
    }

    if (!targetDescription) {
      throw new Error("Missing contract details to run alignment optimization.");
    }

    const aiClient = this.aiService.getClient();
    const jobProfile = await this.repo.getJobProfile();
    const freelanceProfile = await this.repo.getFreelanceProfile();

    if (aiClient) {
      const prompt = `You are an elite IT freelance coaching specialist and resume consultant.
      Analyze the alignment between this freelance contract and the consultant's current profile. Give highly specific, non-generic, high-impact tactical advice to maximize their chances of winning this contract.

      CONTRACT DETAILS:
      - Title: "${targetTitle}"
      - Description: "${targetDescription}"

      CONSULTANT ACTIVE PROFILE:
      - Name: Aziz
      - Skills: ${jobProfile.skills.join(", ")}
      - Experience Years: ${jobProfile.experienceYears}
      - Hourly Rate: $${freelanceProfile.hourlyRate}/hr
      - Offerings: ${freelanceProfile.offerings.join(", ")}
      - Projects: ${(freelanceProfile.projects || []).map(p => `"${p.title}" (${p.description})`).join(" | ")}

      Provide a structured JSON output analyzing how the consultant can optimize their pitch or profile layout specifically for this contract. Keep tips completely professional and concise.`;

      const response = await this.aiService.generateContentWithFallback({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.0,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedTitle: { type: Type.STRING, description: "Highly tailored profile title, hook, or pitch headline designed to grab this specific client's attention." },
              topSkillsToHighlight: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 specific technical skills or capabilities from their profile they must lead with." },
              projectsToPrioritize: { type: Type.ARRAY, items: { type: Type.STRING }, description: "1-2 exact titles of the user's projects that are most relevant to this gig." },
              strategicTips: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 highly actionable, specific bidding or delivery strategy tips." }
            },
            required: ["recommendedTitle", "topSkillsToHighlight", "projectsToPrioritize", "strategicTips"]
          }
        }
      });

      if (response && response.text) {
        return JSON.parse(response.text.trim());
      } else {
        throw new Error("No response content from Gemini.");
      }
    }

    throw new Error("Gemini AI is not initialized.");
  }

  /**
   * Drafts a compelling custom pitch proposal
   */
  public async generateProposalPitch(
    gigId?: string,
    customTitle?: string,
    customDescription?: string,
    customPlatform?: string
  ): Promise<ProposalPitchResult> {
    let targetTitle = customTitle || "";
    let targetPlatform = customPlatform || "Upwork";
    let targetDescription = customDescription || "";

    if (gigId) {
      const gig = await this.repo.findGigById(gigId);
      if (gig) {
        targetTitle = gig.title;
        targetPlatform = gig.platform;
        targetDescription = gig.description;
      }
    }

    if (!targetDescription) {
      throw new Error("Missing contract description to draft a pitch proposal.");
    }

    const jobProfile = await this.repo.getJobProfile();
    const freelanceProfile = await this.repo.getFreelanceProfile();
    const aiClient = this.aiService.getClient();

    const matchedSkills = jobProfile.skills.filter(s => 
      targetDescription.toLowerCase().includes(s.toLowerCase())
    );

    if (aiClient) {
      const fewShotSection = (freelanceProfile.fewShotExamples || []).length > 0
        ? `\nSUCCESSFUL PROPOSAL EXAMPLES (Use these to mimic the exact tone, professional layout, conciseness, and structured milestone alignment!):\n${(freelanceProfile.fewShotExamples || []).map((ex, idx) => `Example ${idx + 1} [Job Title: ${ex.gigTitle}]:\n${ex.pitchText}`).join("\n\n")}`
        : "";

      const prompt = `Draft a compelling, professional freelance proposal pitch for a contract on ${targetPlatform}.
      
      CONTRACT DETAILS:
      Title: "${targetTitle}"
      Description: "${targetDescription}"
      
      FREELANCER PROFILE:
      Hourly Rate: $${freelanceProfile.hourlyRate}/hr
      Expert Offerings: ${freelanceProfile.offerings.join(", ")}
      Portfolio Link: "${freelanceProfile.portfolioUrl}"
      Additional pitching instructions: "${freelanceProfile.customPitchPrompt}"
      Technical Skills: ${jobProfile.skills.join(", ")}
      
      MY REGISTERED CASE STUDY PROJECTS (Mention or weave in references to 1 or 2 of these specific projects if their tech stacks or goals align beautifully with the client's contract! Use them as proof of your expert capability):
      ${(freelanceProfile.projects || []).map(p => `- Project: "${p.title}"\n  Technologies: ${p.techStack.join(", ")}\n  Details: ${p.description}\n  URL: ${p.projectUrl || ""}`).join("\n")}
      ${fewShotSection}
      
      CRITICAL FORMATTING & STYLE DIRECTIVES:
      1. Write a highly tailored, direct, and concise cover letter pitch (the 'pitchText' field).
      2. Keep the cover letter pitch STRICTLY under 180 words. Make it extremely punchy, start with a professional, humble greeting, and clearly state your match and solution.
      3. Calculate logical, realistic milestones and estimated hours required based on the description complexity. Make sure they are sensible and align with your profile's hourly rate of $${freelanceProfile.hourlyRate}/hr.
      4. DO NOT use generic marketing clichés or corporate fluff. Speak directly as an expert engineer.`;

      try {
        const response = await this.aiService.generateContentWithFallback({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                pitchText: { type: Type.STRING, description: "Highly persuasive, direct, and custom cover letter pitch under 180 words targeting this client's contract." },
                estimatedHours: { type: Type.INTEGER, description: "Estimated total duration hours." },
                totalCostEstimate: { type: Type.STRING, description: "Budget calculation." },
                milestones: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 structured milestones." }
              },
              required: ["pitchText", "estimatedHours", "totalCostEstimate", "milestones"]
            }
          }
        });

        if (response && response.text) {
          const parsed = JSON.parse(response.text.trim());
          await this.repo.addSystemLog("success", "ai", `AI Freelance proposal drafted successfully for: "${targetTitle}"`);
          return {
            ...parsed,
            engine: "Gemini-3.5"
          };
        }
      } catch (err: any) {
        console.warn("Freelance pitch generation failed, falling back:", err);
      }
    }

    // Fallback Local-Rule-Engine
    const hours = targetDescription.toLowerCase().includes("week") ? 25 : 75;
    const cost = `$${hours * freelanceProfile.hourlyRate}`;
    
    const alignedProj = (freelanceProfile.projects || []).find(p => 
      p.techStack.some(t => targetDescription.toLowerCase().includes(t.toLowerCase()))
    );
    const projectReference = alignedProj 
      ? `For instance, I built the "${alignedProj.title}" using ${alignedProj.techStack.join(", ")}, which solves similar challenges: ${alignedProj.description}`
      : `I have built several related frameworks. My main projects include: ${(freelanceProfile.projects || []).slice(0, 2).map(p => p.title).join(", ")}.`;

    const pitchText = `Hello,\n\nI noticed your contract opportunity for "${targetTitle}" on ${targetPlatform}. As an experienced specialist in ${freelanceProfile.offerings.slice(0, 3).join(", ")}, this matches my operational skill set perfectly.\n\nI possess hands-on expertise in ${matchedSkills.length > 0 ? matchedSkills.join(", ") : "automation pipelines and security configurations"}. ${projectReference}\n\nMy portfolio is available at ${freelanceProfile.portfolioUrl}.\n\nLet's schedule a brief discussion to map out your architecture goals.\n\nBest regards,\nAziz`;

    await this.repo.addSystemLog("info", "ai", `Drafted local-fallback proposal pitch for: "${targetTitle}"`);
    return {
      pitchText,
      estimatedHours: hours,
      totalCostEstimate: cost,
      milestones: [
        "Milestone 1: Requirement scoping & environment planning (15%)",
        "Milestone 2: Infrastructure automation & dry-runs (50%)",
        "Milestone 3: Deployment, logging, and security verification (35%)"
      ],
      engine: "Local-Rule-Engine"
    };
  }
}
