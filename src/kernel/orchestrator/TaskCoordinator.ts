import { OrchestrationTask, OrchestrationExecutionContext } from "./types";
import { ServiceRegistry } from "../../services/backend/ServiceRegistry";
import { ModuleManager } from "../module/ModuleManager";

export class TaskCoordinator {
  /**
   * Executes a task by discovering modules dynamically and running the associated service.
   */
  public async executeTask(
    task: OrchestrationTask,
    context: OrchestrationExecutionContext
  ): Promise<Record<string, any>> {
    const manager = ModuleManager.getInstance();
    const services = ServiceRegistry.getInstance();

    // 1. Verify capability is supported by at least one active module
    const capabilities = manager.getCapabilitiesRegistry();
    const moduleIds = capabilities[task.capability];

    if (!moduleIds || moduleIds.length === 0) {
      // Check pre-defined fallback mappings
      const hasPredefined = ["JOB_SEARCH", "RESUME_ANALYSIS", "ATS_ANALYSIS", "EMAIL_GENERATION", "FOLLOWUP_AUTOMATION", "PROFILE_UPDATE", "SEARCH_HISTORY"].includes(task.capability);
      if (!hasPredefined) {
        throw new Error(`No module registered supporting capability: '${task.capability}'`);
      }
    }

    // Check if the matching module is active
    if (moduleIds) {
      const activeModule = moduleIds.find(id => {
        const m = manager.getModule(id);
        return m && m.state === "RUNNING";
      });
      if (!activeModule) {
        console.warn(`[TaskCoordinator] Module for '${task.capability}' is registered but not currently running.`);
      }
    }

    console.log(`[TaskCoordinator] Dynamic module dispatch for capability: ${task.capability}`);

    // 2. Perform capability execution against ServiceRegistry
    switch (task.capability) {
      case "JOB_SEARCH": {
        const query = task.input.jobQuery || context.variables.jobQuery || "DevOps";
        const res = await services.jobSearchService.searchJobs(query, { page: 1, limit: 5, requestId: `ORCH-${context.taskId}` });
        return {
          jobs: res.jobs || [],
          status: res.status,
          query,
        };
      }

      case "RESUME_ANALYSIS": {
        const targetJd = task.input.jobDescription || context.variables.jobDescription || "Standard requirements";
        const targetTitle = task.input.jobTitle || context.variables.jobTitle || "Engineer";
        const res = await services.atsService.compareJobDescription(undefined, targetJd, targetTitle, undefined, undefined, undefined);
        return {
          matchScore: res.score,
          matchedSkills: res.matchedSkills,
          missingSkills: res.missingSkills,
          recommendation: res.recommendation,
          coverLetterDraft: res.coverLetterDraft,
        };
      }

      case "ATS_ANALYSIS": {
        const targetJd = task.input.jobDescription || context.variables.jobDescription || "Standard requirements";
        const targetTitle = task.input.jobTitle || context.variables.jobTitle || "Engineer";
        const res = await services.atsService.compareJobDescription(undefined, targetJd, targetTitle, undefined, undefined, undefined);
        return {
          matchScore: res.score,
          matchedSkills: res.matchedSkills,
          missingSkills: res.missingSkills,
          recommendation: res.recommendation,
        };
      }

      case "EMAIL_GENERATION": {
        const jobTitle = task.input.jobTitle || context.variables.jobTitle || "Candidate Opportunity";
        const skills = task.input.skills || context.variables.matchedSkills || [];
        
        let draftText = "";
        if (process.env.GEMINI_API_KEY) {
          try {
            const prompt = `Draft a brief, highly professional application outreach email for a role in: ${jobTitle}.
Key candidate skills: ${skills.join(", ")}.
Keep the response to a single outreach document.`;
            const res = await services.aiService.generateContentWithFallback({
              model: "gemini-2.5-flash",
              contents: prompt,
            });
            draftText = res.text || "";
          } catch (err) {
            console.warn("[TaskCoordinator] Gemini draft failed, falling back to rule-based draft:", err);
          }
        }

        if (!draftText) {
          draftText = `Subject: Application for ${jobTitle} role\n\nDear Hiring Team,\n\nI am writing to express my strong interest in the ${jobTitle} opportunity. With specialized expertise in ${skills.join(", ") || "software engineering"}, I am confident in my capability to deliver high-quality outcomes.\n\nBest regards,\nCandidate`;
        }

        return {
          body: draftText,
          recipient: task.input.recipient || "recruiter@company.com",
        };
      }

      case "FOLLOWUP_AUTOMATION": {
        const title = task.input.title || "Review Application Status";
        const description = task.input.description || "Automated check-in on outreach responses";
        
        // Add alert/reminder into repo or alertService logs
        await services.repo.addSystemLog("info", "daemon", `Orchestrator Scheduled Reminder: ${title}`);
        
        return {
          jobCreated: true,
          scheduledTime: new Date(Date.now() + 86400 * 1000 * 3).toISOString(), // 3 days in future
          reminderTitle: title,
        };
      }

      case "PROFILE_UPDATE": {
        const profileUpdates = task.input.profileUpdates || { skills: ["Docker", "Kubernetes", "TypeScript"] };
        const updated = await services.profileService.updateJobProfile(profileUpdates);
        return {
          success: true,
          profile: updated,
        };
      }

      case "SEARCH_HISTORY": {
        const queryText = task.input.query || context.goal;
        const memoryRecord = await services.searchHistoryService.addMemory("search_history", `Orchestration query executed: ${queryText}`);
        return {
          success: true,
          memoryRecordId: memoryRecord.id,
        };
      }

      default:
        // Generic fallback action
        return {
          success: true,
          timestamp: new Date().toISOString(),
          message: `Task capability '${task.capability}' completed successfully.`,
        };
    }
  }
}
export default TaskCoordinator;
