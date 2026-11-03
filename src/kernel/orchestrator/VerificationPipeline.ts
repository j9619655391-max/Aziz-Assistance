import { IVerificationPipeline, OrchestrationTask, OrchestrationExecutionContext } from "./types";

export class VerificationPipeline implements IVerificationPipeline {
  /**
   * Performs output integrity checks for the resolved tasks.
   */
  public async verifyTaskOutput(
    task: OrchestrationTask,
    context: OrchestrationExecutionContext
  ): Promise<{ passed: boolean; logs: string[] }> {
    const logs: string[] = [];
    logs.push(`[VerificationPipeline] Auditing output schema for task: '${task.name}' (${task.capability})`);

    // Guard: Verify output exists
    if (!task.output) {
      logs.push(`[VerificationPipeline] Output verification FAILED: No output data found.`);
      return { passed: false, logs };
    }

    // Heuristic Verification based on capability types
    switch (task.capability) {
      case "JOB_SEARCH":
        const listings = task.output.jobs || task.output.listings;
        if (!Array.isArray(listings)) {
          logs.push("[VerificationPipeline] Verification FAILED: 'jobs' output must be an array.");
          return { passed: false, logs };
        }
        logs.push(`[VerificationPipeline] Passed: Located ${listings.length} valid job items.`);
        break;

      case "RESUME_ANALYSIS":
        const matchScore = task.output.matchScore ?? task.output.score;
        if (typeof matchScore !== "number" || matchScore < 0 || matchScore > 100) {
          logs.push("[VerificationPipeline] Verification FAILED: 'matchScore' must be a numeric value between 0 and 100.");
          return { passed: false, logs };
        }
        logs.push(`[VerificationPipeline] Passed: Matching index verified successfully: ${matchScore}%`);
        break;

      case "ATS_ANALYSIS":
        const missingSkills = task.output.missingSkills;
        if (!Array.isArray(missingSkills)) {
          logs.push("[VerificationPipeline] Verification FAILED: Missing skills audit has an invalid non-array type.");
          return { passed: false, logs };
        }
        logs.push(`[VerificationPipeline] Passed: ATS gaps successfully checked. Gaps found: ${missingSkills.length}`);
        break;

      case "EMAIL_GENERATION":
        const body = task.output.body || task.output.emailBody || task.output.text;
        if (!body || typeof body !== "string" || body.trim().length < 20) {
          logs.push("[VerificationPipeline] Verification FAILED: Draft output must be a descriptive text body.");
          return { passed: false, logs };
        }
        logs.push("[VerificationPipeline] Passed: Email outreach document is structurally sound.");
        break;

      case "FOLLOWUP_AUTOMATION":
        const jobCreated = task.output.jobCreated ?? task.output.success;
        if (!jobCreated) {
          logs.push("[VerificationPipeline] Verification FAILED: Cron timer was not configured cleanly.");
          return { passed: false, logs };
        }
        logs.push("[VerificationPipeline] Passed: Automated background reminders scheduled.");
        break;

      default:
        logs.push("[VerificationPipeline] Default verification: Output successfully validated.");
        break;
    }

    return { passed: true, logs };
  }
}
export default VerificationPipeline;
