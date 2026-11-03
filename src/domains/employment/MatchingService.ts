import { Job, FreelanceGig, JobProfile } from "../../types";

export interface EvaluatedJob extends Job {
  compatibilityScore: number;
  skillsMatched: string[];
}

export interface EvaluatedGig extends FreelanceGig {
  compatibilityScore: number;
  skillsMatched: string[];
}

export class MatchingService {
  /**
   * Evaluates compatibility score for a Job based on candidate JobProfile
   */
  public evaluateJob(job: Job, profile: JobProfile): EvaluatedJob {
    const matchedSkills = job.skillsRequired.filter(s => 
      profile.skills.some(ps => ps.toLowerCase() === s.toLowerCase())
    );
    const countryMatch = profile.preferredCountries.some(c => c.toLowerCase() === job.country.toLowerCase());
    const visaMatch = !profile.visaPreference || profile.visaPreference === "No Sponsorship Needed" || job.visaSponsorship;

    let compatibilityScore = Math.round((matchedSkills.length / Math.max(1, job.skillsRequired.length)) * 50);
    if (countryMatch) compatibilityScore += 25;
    if (visaMatch) compatibilityScore += 25;

    return {
      ...job,
      compatibilityScore: Math.min(100, Math.max(15, compatibilityScore)),
      skillsMatched: matchedSkills
    };
  }

  /**
   * Evaluates compatibility score for a FreelanceGig based on candidate JobProfile
   */
  public evaluateGig(gig: FreelanceGig, profile: JobProfile): EvaluatedGig {
    const matchedSkills = gig.skillsRequired.filter(s => 
      profile.skills.some(ps => ps.toLowerCase() === s.toLowerCase())
    );
    let score = Math.round((matchedSkills.length / Math.max(1, gig.skillsRequired.length)) * 100);
    
    if (gig.complexity === "Expert" && profile.experienceYears >= 5) {
      score = Math.min(100, score + 15);
    }

    return {
      ...gig,
      compatibilityScore: Math.min(100, Math.max(25, score)),
      skillsMatched: matchedSkills
    };
  }
}
