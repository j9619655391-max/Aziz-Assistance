import { IReflectionPipeline, ExecutionResult, OrchestrationExecutionContext } from "./types";
import { GoogleGenAI } from "@google/genai";

export class ReflectionPipeline implements IReflectionPipeline {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      try {
        this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      } catch (err) {
        console.warn("[ReflectionPipeline] Failed to initialize GoogleGenAI:", err);
      }
    }
  }

  /**
   * Evaluates the completed workflow, checks execution times, errors, and provides detailed suggestions.
   */
  public async reflect(
    result: Partial<ExecutionResult>,
    context: OrchestrationExecutionContext
  ): Promise<{
    passed: boolean;
    confidence: number;
    reasoning: string;
    suggestions: string[];
  }> {
    const totalTasks = context.executionHistory.length;
    const failures = context.executionHistory.filter(h => h.status === "FAILED").length;
    const successes = context.executionHistory.filter(h => h.status === "COMPLETED").length;

    // 1. Try Gemini Reflection if active
    if (this.ai) {
      try {
        const prompt = `Reflect on the completion of the following orchestrated multi-agent task execution.
Goal: "${context.goal}"
Execution Metrics:
- Total Tasks: ${totalTasks}
- Successes: ${successes}
- Failures: ${failures}
- History Log: ${JSON.stringify(context.executionHistory)}

Evaluate whether the primary goal was successfully met, calculate a confidence score between 0.0 and 1.0, provide a detailed reasoning description, and list 2-3 suggestions for future improvement.

Response must be valid JSON in this exact structure:
{
  "passed": true,
  "confidence": 0.95,
  "reasoning": "Explain why here",
  "suggestions": ["Suggestion 1", "Suggestion 2"]
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
        if (typeof parsed.confidence === "number" && Array.isArray(parsed.suggestions)) {
          console.log("[ReflectionPipeline] Successfully reflected execution using Gemini.");
          return {
            passed: parsed.passed ?? (failures === 0),
            confidence: parsed.confidence,
            reasoning: parsed.reasoning,
            suggestions: parsed.suggestions,
          };
        }
      } catch (err) {
        console.warn("[ReflectionPipeline] Gemini reflection failed, falling back to heuristic critique:", err);
      }
    }

    // 2. Rule-based Heuristics Reflection (Fallback)
    const successRate = totalTasks > 0 ? successes / totalTasks : 1.0;
    const passed = failures === 0 && totalTasks > 0;
    const confidence = parseFloat((successRate * 0.95).toFixed(2)); // Cap slightly under 100% for safety

    let reasoning = `Execution completed with a ${Math.round(successRate * 100)}% task success rate. `;
    if (failures === 0) {
      reasoning += "All capabilities resolved successfully with no intermediate pipeline degradation.";
    } else {
      reasoning += `Encountered ${failures} task failures in active modules. Output data flow may be degraded.`;
    }

    const suggestions: string[] = [];
    if (failures > 0) {
      suggestions.push("Check dependent module logs and review connection pooling or API quotas.");
      suggestions.push("Provide fallback mock databases to prevent strict module degradation from blocking the pipeline.");
    } else {
      suggestions.push("Register specialized domain capabilities (e.g. TRADING_MARKET_INTEGRATION) to further increase scope.");
      suggestions.push("Configure direct workspace storage memory indexing to allow even faster task resume loops.");
    }

    return {
      passed,
      confidence,
      reasoning,
      suggestions,
    };
  }
}
export default ReflectionPipeline;
