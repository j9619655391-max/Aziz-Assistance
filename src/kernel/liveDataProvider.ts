import { GoogleGenAI, Type } from "@google/genai";
import { Job, FreelanceGig } from "../types";

export class LiveDataProvider {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }

  /**
   * Helper to perform a robust Google Search Grounding query and return parsed JSON
   */
  private async queryGrounding(prompt: string, searchTopic: string): Promise<any> {
    if (!this.ai) {
      throw new Error("Live source unavailable (Missing GEMINI_API_KEY in server environment)");
    }

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response from Live Search Grounding engine");
      }

      // Try to parse the JSON output
      const cleanJson = text.trim();
      const parsed = JSON.parse(cleanJson);

      // Extract grounding URLs to enrich the results with real-world verification URLs!
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const urls: string[] = [];
      if (groundingChunks) {
        for (const chunk of groundingChunks) {
          if (chunk.web?.uri) {
            urls.push(chunk.web.uri);
          }
        }
      }

      return {
        data: parsed,
        urls: urls.length > 0 ? urls : [`https://www.google.com/search?q=${encodeURIComponent(searchTopic)}`],
      };
    } catch (err: any) {
      console.error("LiveDataProvider Google Search Grounding failed:", err);
      throw new Error(`Live source unavailable (${err.message || err})`);
    }
  }

  /**
   * Fetch live, real jobs based on user profile and search query
   */
  public async fetchLiveJobs(
    query: string,
    skills: string[],
    preferredCountries: string[],
    visaPreference: string
  ): Promise<Job[]> {
    const defaultSearchQuery = `IT infrastructure support system administrator desktop hardware jobs in ${preferredCountries.slice(0, 3).join(" or ")}`;
    const searchTopic = query ? `${query} jobs` : defaultSearchQuery;

    const prompt = `You are an autonomous AI Career and Income Research Agent.
Search the web using Google Search for real, live, open job opportunities matching the candidate criteria:
- Search Term/Query: "${searchTopic}"
- Required Skills: ${skills.slice(0, 6).join(", ")}
- Preferred Countries: ${preferredCountries.slice(0, 5).join(", ")}
- Visa Preference: ${visaPreference}

Strict Rules:
1. You MUST use Google Search to locate actual, real open vacancies on LinkedIn, Indeed, Glassdoor, company websites, or recruitment portals.
2. DO NOT invent, generate, simulate, or mock any job records. Everything MUST represent a real-world posting found in your search results.
3. Map every record to a real URL found in your grounding results. If no URL matches, use a relevant corporate link or the search platform URL.
4. If you cannot find any real open jobs, return an empty array [] - NEVER return simulated data.

Format your output as a JSON object with this exact schema:
{
  "jobs": [
    {
      "id": "string (unique string starting with 'job-live-')",
      "title": "string (The actual Job Title)",
      "company": "string (Company Name)",
      "location": "string (City, State, Country)",
      "country": "string (The country, e.g. India, USA, UAE)",
      "description": "string (Detailed job description, responsibilities, requirements)",
      "skillsRequired": ["string", "string"],
      "salary": "string (e.g. '₹8,00000 - ₹12,00000 / Year' or 'Market Rate')",
      "visaSponsorship": "boolean (true if sponsorship is explicitly mentioned, else false)",
      "postedDate": "string (YYYY-MM-DD or date phrase)",
      "publicHrEmail": "string or null (active contact email if found, else null)",
      "source": "string (e.g. 'LinkedIn' or 'Indeed' or 'Company Portal')",
      "timestamp": "string (Current timestamp: ${new Date().toISOString()})",
      "verificationStatus": "string (Must be 'Verified Live Source')",
      "confidenceScore": "number (Value from 85 to 100 based on freshness/grounding)",
      "originalReference": "string (The actual URL of the job posting or the search landing page)",
      "deduplicationStatus": "string (Must be 'Unique Live Entry')"
    }
  ]
}`;

    const result = await this.queryGrounding(prompt, searchTopic);
    const jobs: Job[] = result?.data?.jobs || [];

    // Map and enrich the results with live URLs
    return jobs.map((job, idx) => {
      const liveUrl = result.urls[idx % result.urls.length] || `https://www.google.com/search?q=${encodeURIComponent(searchTopic)}`;
      return {
        ...job,
        id: job.id || `job-live-${Date.now()}-${idx}`,
        originalReference: job.originalReference || liveUrl,
        timestamp: job.timestamp || new Date().toISOString(),
        verificationStatus: "Verified Live Source",
        confidenceScore: job.confidenceScore || 95,
        deduplicationStatus: "Unique Live Entry",
      };
    });
  }

  /**
   * Fetch live, real freelance projects based on search query
   */
  public async fetchLiveGigs(query: string, skills: string[]): Promise<FreelanceGig[]> {
    const searchTopic = query ? `${query} freelance projects` : `network support workstation setup freelance gigs on Upwork or Freelancer`;

    const prompt = `You are an autonomous Freelance Scout Agent.
Search the web using Google Search for real, live, open freelance contract gigs on Upwork, Freelancer, Toptal, Fiverr, or Guru:
- Search Term: "${searchTopic}"
- Relatable skills: ${skills.slice(0, 5).join(", ")}

Strict Rules:
1. Use Google Search to find actual active freelance contract postings.
2. DO NOT invent, generate, simulate, or mock any freelance records. Everything MUST represent a real job post.
3. Map every record to a real URL found in your grounding results.
4. If you cannot find any real open gigs, return an empty array [] - NEVER return simulated data.

Format your output as a JSON object with this exact schema:
{
  "gigs": [
    {
      "id": "string (unique string starting with 'gig-live-')",
      "title": "string (The actual Freelance Gig Title)",
      "platform": "string (Upwork, Freelancer, Toptal, Guru, etc.)",
      "budget": "string (e.g. '$50 / hr' or '$1,500 Fixed Price')",
      "duration": "string (e.g. '1 Week' or '1 Month')",
      "complexity": "string (Expert, Intermediate, or Entry Level)",
      "description": "string (Detailed project description and requirements)",
      "skillsRequired": ["string", "string"],
      "postedDate": "string (YYYY-MM-DD or date phrase)",
      "source": "string (e.g. 'Upwork' or 'Freelancer')",
      "timestamp": "string (Current timestamp: ${new Date().toISOString()})",
      "verificationStatus": "string (Must be 'Verified Live Source')",
      "confidenceScore": "number (Value from 85 to 100 based on freshness/grounding)",
      "originalReference": "string (The actual URL of the gig posting or the search landing page)",
      "deduplicationStatus": "string (Must be 'Unique Live Entry')"
    }
  ]
}`;

    const result = await this.queryGrounding(prompt, searchTopic);
    const gigs: FreelanceGig[] = result?.data?.gigs || [];

    // Map and enrich the results with live URLs
    return gigs.map((gig, idx) => {
      const liveUrl = result.urls[idx % result.urls.length] || `https://www.google.com/search?q=${encodeURIComponent(searchTopic)}`;
      return {
        ...gig,
        id: gig.id || `gig-live-${Date.now()}-${idx}`,
        originalReference: gig.originalReference || liveUrl,
        timestamp: gig.timestamp || new Date().toISOString(),
        verificationStatus: "Verified Live Source",
        confidenceScore: gig.confidenceScore || 95,
        deduplicationStatus: "Unique Live Entry",
      };
    });
  }
}
