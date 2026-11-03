import { IGoalInterpreter } from "./types";
import { GoogleGenAI } from "@google/genai";

export class GoalInterpreter implements IGoalInterpreter {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      try {
        this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      } catch (err) {
        console.warn("[GoalInterpreter] Failed to initialize GoogleGenAI:", err);
      }
    }
  }

  /**
   * Translates a plain-text user goal into subgoals, capabilities, and initial variables.
   */
  public async interpret(goal: string): Promise<{
    subgoals: string[];
    requiredCapabilities: string[];
    contextVariables: Record<string, any>;
  }> {
    const lowercaseGoal = goal.toLowerCase();

    // 1. Try Gemini classification if the key is available
    if (this.ai) {
      try {
        const prompt = `Analyze this user goal and break it down into an ordered series of subtasks.
User Goal: "${goal}"

Available Capabilities in the platform:
- "JOB_SEARCH": Find job listings (remote, devops, engineering, etc.)
- "RESUME_ANALYSIS": Compare a resume with a job listing or build a custom profile/pitch comparison
- "ATS_ANALYSIS": Optimize a resume, check readability, identify missing skills
- "EMAIL_GENERATION": Draft or prepare application/follow-up email templates or messages
- "FOLLOWUP_AUTOMATION": Create schedules, cron trackers, alert triggers, or dispatch background jobs
- "PROFILE_UPDATE": Update user profiles, pitch details, or freelancing portfolios
- "SEARCH_HISTORY": Save memories, search queries, or index outcomes in history logs

Response must be valid JSON in this exact structure:
{
  "subgoals": ["Step 1 description", "Step 2 description", ...],
  "requiredCapabilities": ["JOB_SEARCH", "RESUME_ANALYSIS", ...],
  "contextVariables": { "jobQuery": "DevOps", "skillsRequired": ["Docker", "Kubernetes"] }
}`;
        const response = await this.ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });

        const text = response.text?.trim() || "";
        const parsed = JSON.parse(text);
        if (parsed.subgoals && parsed.requiredCapabilities) {
          console.log("[GoalInterpreter] Successfully parsed intent using Gemini.");
          return {
            subgoals: parsed.subgoals,
            requiredCapabilities: parsed.requiredCapabilities,
            contextVariables: parsed.contextVariables || {},
          };
        }
      } catch (err) {
        console.warn("[GoalInterpreter] LLM intent parsing failed, falling back to semantic heuristics:", err);
      }
    }

    // 2. Semantic Heuristic Parser (Extremely reliable fallback)
    const subgoals: string[] = [];
    const requiredCapabilities: string[] = [];
    const contextVariables: Record<string, any> = {};

    if (lowercaseGoal.includes("job") || lowercaseGoal.includes("listing") || lowercaseGoal.includes("find")) {
      subgoals.push("Scout open job openings");
      requiredCapabilities.push("JOB_SEARCH");
      contextVariables["jobQuery"] = lowercaseGoal.includes("devops") ? "DevOps" : "Software Engineer";
    }

    if (lowercaseGoal.includes("compare") || lowercaseGoal.includes("resume") || lowercaseGoal.includes("match")) {
      subgoals.push("Compare profile skills and qualifications against candidate matches");
      requiredCapabilities.push("RESUME_ANALYSIS");
    }

    if (lowercaseGoal.includes("ats") || lowercaseGoal.includes("missing skill") || lowercaseGoal.includes("improve") || lowercaseGoal.includes("optimize")) {
      subgoals.push("Audit matching profiles for ATS score and list missing skills");
      requiredCapabilities.push("ATS_ANALYSIS");
    }

    if (lowercaseGoal.includes("email") || lowercaseGoal.includes("draft") || lowercaseGoal.includes("message")) {
      subgoals.push("Draft personalized outreach message for recruiters");
      requiredCapabilities.push("EMAIL_GENERATION");
    }

    if (lowercaseGoal.includes("reminder") || lowercaseGoal.includes("alert") || lowercaseGoal.includes("automation") || lowercaseGoal.includes("schedule")) {
      subgoals.push("Configure automated follow-up trackers");
      requiredCapabilities.push("FOLLOWUP_AUTOMATION");
    }

    if (lowercaseGoal.includes("profile") || lowercaseGoal.includes("portfolio")) {
      subgoals.push("Update local profile parameters");
      requiredCapabilities.push("PROFILE_UPDATE");
    }

    if (lowercaseGoal.includes("history") || lowercaseGoal.includes("memory") || lowercaseGoal.includes("log")) {
      subgoals.push("Save session telemetry into local historical search memory logs");
      requiredCapabilities.push("SEARCH_HISTORY");
    }

    // Default catch-all steps if goal is generic
    if (subgoals.length === 0) {
      subgoals.push("Inspect workspace context elements");
      requiredCapabilities.push("SEARCH_HISTORY");
    }

    return {
      subgoals,
      requiredCapabilities,
      contextVariables,
    };
  }
}
export default GoalInterpreter;
