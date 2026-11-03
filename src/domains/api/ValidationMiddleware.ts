import { Request, Response, NextFunction } from "express";
import { ApiResponseFactory } from "./ApiResponseFactory";

export class ValidationMiddleware {
  /**
   * Centralized validation middleware.
   * Keeps controllers clean and avoids any inline validation logic there.
   */
  public static validate(schemaKey: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const errors: string[] = [];

      if (schemaKey === "recruitment/assess") {
        const { candidate, job } = req.body;
        if (!candidate) {
          errors.push("Missing required 'candidate' object in request body.");
        } else {
          if (!candidate.name) errors.push("Candidate name is required.");
          if (!Array.isArray(candidate.skills)) errors.push("Candidate skills must be an array of strings.");
          if (candidate.experienceYears === undefined) errors.push("Candidate experienceYears is required.");
        }

        if (!job) {
          errors.push("Missing required 'job' object in request body.");
        } else {
          if (!job.title) errors.push("Job title is required.");
          if (!Array.isArray(job.requiredSkills)) errors.push("Job requiredSkills must be an array of strings.");
          if (job.minimumExperienceYears === undefined) errors.push("Job minimumExperienceYears is required.");
        }
      }

      else if (schemaKey === "recruitment/workflow/start") {
        const { submissions, job } = req.body;
        if (!submissions || !Array.isArray(submissions)) {
          errors.push("Missing or invalid 'submissions' array in request body.");
        } else {
          submissions.forEach((sub, idx) => {
            if (!sub.candidate) {
              errors.push(`Submission at index ${idx} is missing candidate profile.`);
            } else {
              if (!sub.candidate.name) errors.push(`Candidate name at submission index ${idx} is required.`);
              if (!Array.isArray(sub.candidate.skills)) errors.push(`Candidate skills at submission index ${idx} must be an array.`);
            }
          });
        }

        if (!job) {
          errors.push("Missing required 'job' object in request body.");
        } else {
          if (!job.title) errors.push("Job title is required.");
        }
      }

      else if (schemaKey === "recruitment/workflow/action") {
        const { id, workflowId } = req.body;
        const finalId = id || workflowId || req.params.id;
        if (!finalId) {
          errors.push("Workflow ID ('id' or 'workflowId') is required.");
        }
      }

      else if (schemaKey === "process/start") {
        const { definitionId } = req.body;
        if (!definitionId) {
          errors.push("Process Definition ID ('definitionId') is required.");
        }
      }

      else if (schemaKey === "process/action") {
        const { instanceId, id } = req.body;
        const finalId = instanceId || id || req.params.id;
        if (!finalId) {
          errors.push("Process Instance ID ('instanceId' or 'id') is required.");
        }
      }

      else if (schemaKey === "process/retry") {
        const { instanceId, id, stageId } = req.body;
        const finalId = instanceId || id || req.params.id;
        if (!finalId) {
          errors.push("Process Instance ID ('instanceId' or 'id') is required.");
        }
        if (!stageId) {
          errors.push("Stage ID ('stageId') is required to retry.");
        }
      }

      if (errors.length > 0) {
        res.status(400).json(ApiResponseFactory.createError(errors, 0));
        return;
      }

      next();
    };
  }
}
