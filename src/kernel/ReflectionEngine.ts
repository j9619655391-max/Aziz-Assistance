/**
 * @file /src/kernel/ReflectionEngine.ts
 * @description Centralized, policy-routed Reflection Engine implementing IReflectionEngine.
 * Performs deep semantic criticism of task outcomes and verification reports.
 * Emits telemetry events, calculates risk matrices, and suggests remedial next-actions.
 */

import { IReflectionEngine, IModelRouter, IEventBus, ModelResponse } from "./types";

export interface ReflectionReport {
  passed: boolean;
  reasoning: string; // for backward compatibility
  confidenceScore: number; // for backward compatibility
  confidence: number;
  reasoning_summary: string;
  identified_issues: string[];
  recommended_actions: string[];
  risk_level: "low" | "medium" | "high";
  requires_human_review: boolean;
  reflection_version: string;
  model_version: string;
  evaluation_policy_version: string;
}

export interface ReflectionEngineOptions {
  modelRouter: IModelRouter;
  eventBus?: IEventBus;
}

export class ReflectionEngine implements IReflectionEngine {
  private readonly modelRouter: IModelRouter;
  private readonly eventBus?: IEventBus;

  constructor(options: ReflectionEngineOptions) {
    if (!options.modelRouter) {
      throw new Error("ReflectionEngine: modelRouter dependency is required.");
    }
    this.modelRouter = options.modelRouter;
    this.eventBus = options.eventBus;
  }

  /**
   * Reviews execution outcomes and verification scorecards.
   * Leverages the Model Router's reasoning capabilities to output structured risk reviews.
   */
  public async review(
    taskId: string,
    goal: string,
    result: string,
    verificationReport?: any
  ): Promise<ReflectionReport> {
    const startTime = Date.now();

    // Standardized prompt requesting clean JSON block
    const prompt = this.buildPrompt(goal, result, verificationReport);
    const systemInstruction = 
      "You are the Aziz Kernel Reflection Critic. You analyze execution and verification logs " +
      "to assess if the goal is truly met. You MUST respond with a single, strictly valid JSON object " +
      "matching the required schema, with NO markdown headers or conversational text outside of it.";

    let modelResponse: ModelResponse;
    try {
      modelResponse = await this.modelRouter.generate(prompt, "reasoning", systemInstruction);
    } catch (err: any) {
      // Graceful fallback on model invocation failure
      const fallback = this.generateFallbackReport(
        false,
        `Model Router execution failed during reflection: ${err.message || err}`
      );
      this.publishReflectionEvent(taskId, fallback, Date.now() - startTime);
      return fallback;
    }

    const report = this.parseResponse(modelResponse.content);
    const latencyMs = Date.now() - startTime;
    
    // Publish telemetry event to event bus
    this.publishReflectionEvent(taskId, report, latencyMs);

    return report;
  }

  /**
   * Constructs a semantic analysis prompt detailing user goal, execution results, and verification logs.
   */
  private buildPrompt(goal: string, result: string, verificationReport?: any): string {
    const reportStr = verificationReport 
      ? typeof verificationReport === "string" 
        ? verificationReport 
        : JSON.stringify(verificationReport, null, 2)
      : "No verification report provided.";

    return `
Analyze the execution result and verification logs against the goal.
Determine if the goal is satisfied, analyze risks, find issues, and recommend actions.

--- GOAL ---
${goal}

--- EXECUTION RESULT ---
${result}

--- VERIFICATION REPORT ---
${reportStr}

--- RESPONSE SCHEMA FORMAT ---
Respond with a single JSON object. Ensure all fields exist:
{
  "passed": boolean,
  "confidence": number, // floating point number between 0.0 and 1.0
  "reasoning_summary": "Detailed explanation of why it passed or failed.",
  "identified_issues": ["string of issue 1", "string of issue 2"],
  "recommended_actions": ["string of recommendation 1"],
  "risk_level": "low" | "medium" | "high",
  "requires_human_review": boolean
}
`;
  }

  /**
   * Parses the raw LLM output, extracting and validating JSON structures safely.
   */
  private parseResponse(content: string): ReflectionReport {
    try {
      // Find JSON block if wrapped inside markdown code fences
      let jsonString = content.trim();
      const match = /```(?:json)?\s*([\s\S]*?)\s*```/.exec(jsonString);
      if (match) {
        jsonString = match[1];
      }

      const parsed = JSON.parse(jsonString.trim());

      const passed = !!parsed.passed;
      const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;
      const reasoning_summary = parsed.reasoning_summary || "No reasoning summary provided.";
      const identified_issues = Array.isArray(parsed.identified_issues) ? parsed.identified_issues : [];
      const recommended_actions = Array.isArray(parsed.recommended_actions) ? parsed.recommended_actions : [];
      
      let risk_level: "low" | "medium" | "high" = "low";
      if (parsed.risk_level === "medium" || parsed.risk_level === "high" || parsed.risk_level === "low") {
        risk_level = parsed.risk_level;
      }

      const requires_human_review = !!parsed.requires_human_review;

      return {
        passed,
        reasoning: reasoning_summary, // compatibility mapping
        confidenceScore: confidence,   // compatibility mapping
        confidence,
        reasoning_summary,
        identified_issues,
        recommended_actions,
        risk_level,
        requires_human_review,
        reflection_version: "1.0.0-rc2",
        model_version: "gemini-3.5-flash",
        evaluation_policy_version: "policy-v1.0"
      };
    } catch (err) {
      // Fallback on JSON parse exception
      return this.generateFallbackReport(
        false,
        `Failed to parse Reflection output. Raw response content: "${content.substring(0, 200)}..."`
      );
    }
  }

  /**
   * Generates a safe, type-compliant reflection report on parsing or router failures.
   */
  private generateFallbackReport(passed: boolean, reasoning: string): ReflectionReport {
    return {
      passed,
      reasoning,
      confidenceScore: 0.5,
      confidence: 0.5,
      reasoning_summary: reasoning,
      identified_issues: ["Reflection parse error or model invocation failure occurred."],
      recommended_actions: ["Manually review system outputs and retry model routing."],
      risk_level: "high",
      requires_human_review: true,
      reflection_version: "1.0.0-rc2",
      model_version: "gemini-3.5-flash",
      evaluation_policy_version: "policy-v1.0"
    };
  }

  /**
   * Dispatches reflection telemetry frames over the EventBus system.
   */
  private publishReflectionEvent(taskId: string, report: ReflectionReport, durationMs: number): void {
    if (this.eventBus) {
      this.eventBus.publish({
        taskId,
        type: "ReflectionCompleted",
        payload: {
          passed: report.passed,
          confidence: report.confidence,
          risk_level: report.risk_level,
          requires_human_review: report.requires_human_review,
          durationMs,
          issuesCount: report.identified_issues.length,
          recommendationsCount: report.recommended_actions.length
        }
      });
    }
  }
}
