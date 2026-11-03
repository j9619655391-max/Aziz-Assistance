import { InMemoryStateStore } from "./StateStore";
import { InMemoryEventBus } from "./EventBus";
import { InMemoryToolRegistry } from "./ToolRegistry";
import { AgentRuntime } from "./AgentRuntime";
import { Planner } from "./Planner";
import { ContextBuilder } from "./ContextBuilder";
import { VerificationEngine } from "./VerificationEngine";
import { ReflectionEngine } from "./ReflectionEngine";
import { ModelRouter, MockLLMProvider } from "./ModelRouter";
import { GoogleGenAI } from "@google/genai";
import { ILLMProvider, ProviderResponse } from "./ModelRouter";

export class GeminiLLMProvider implements ILLMProvider {
  public readonly id = "gemini-provider";
  public readonly name = "Official Gemini API Provider";
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  public async generate(
    prompt: string,
    model: string,
    options?: { systemInstruction?: string; temperature?: number }
  ): Promise<ProviderResponse> {
    const start = Date.now();
    if (!this.ai) {
      // Fallback to high-fidelity mock responses if key is missing to keep the dev loop smooth and stable!
      const mockResponse = `[Mocked Gemini - No GEMINI_API_KEY] Processed request using model ${model}.\nOptions: ${JSON.stringify(options)}\nPrompt length: ${prompt.length}`;
      return {
        content: mockResponse,
        inputTokens: Math.ceil(prompt.length / 4),
        outputTokens: Math.ceil(mockResponse.length / 4),
        latencyMs: Date.now() - start
      };
    }

    try {
      // Use gemini-3.5-flash as the fast, cost-efficient, and reliable text model by default
      const response = await this.ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: options?.systemInstruction,
          temperature: options?.temperature ?? 0.7,
        }
      });

      const latencyMs = Date.now() - start;
      const text = response.text || "";
      return {
        content: text,
        inputTokens: response.usageMetadata?.promptTokenCount || Math.ceil(prompt.length / 4),
        outputTokens: response.usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4),
        latencyMs
      };
    } catch (err: any) {
      console.error("GeminiLLMProvider error:", err);
      // Fallback on transient/network error
      const mockText = `[Fallback Response] Service temporarily offline: ${err.message || err}`;
      return {
        content: mockText,
        inputTokens: Math.ceil(prompt.length / 4),
        outputTokens: Math.ceil(mockText.length / 4),
        latencyMs: Date.now() - start
      };
    }
  }
}

export class OpenRouterLLMProvider implements ILLMProvider {
  public readonly id = "openrouter-provider";
  public readonly name = "OpenRouter Free LLM Provider";
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || null;
  }

  public async generate(
    prompt: string,
    model: string,
    options?: { systemInstruction?: string; temperature?: number }
  ): Promise<ProviderResponse> {
    const start = Date.now();
    const targetModel = model.includes("/") ? model : "meta-llama/llama-3.3-70b-instruct:free";

    const messages: Array<{ role: string; content: string }> = [];
    if (options?.systemInstruction) {
      messages.push({ role: "system", content: options.systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey || "free-tier"}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Aziz Job & Freelance Intelligence Agent"
        },
        body: JSON.stringify({
          model: targetModel,
          messages,
          temperature: options?.temperature ?? 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API responded with [${response.status}]: ${errorText}`);
      }

      const data = await response.json() as any;
      const text = data.choices?.[0]?.message?.content || "";
      const usage = data.usage || {};
      const latencyMs = Date.now() - start;

      return {
        content: text,
        inputTokens: usage.prompt_tokens || Math.ceil(prompt.length / 4),
        outputTokens: usage.completion_tokens || Math.ceil(text.length / 4),
        latencyMs
      };
    } catch (err: any) {
      console.warn("OpenRouterLLMProvider error:", err.message);
      const mockText = `[OpenRouter Fallback] ${err.message}`;
      return {
        content: mockText,
        inputTokens: Math.ceil(prompt.length / 4),
        outputTokens: Math.ceil(mockText.length / 4),
        latencyMs: Date.now() - start
      };
    }
  }
}

class KernelInstance {
  public stateStore: InMemoryStateStore;
  public eventBus: InMemoryEventBus;
  public toolRegistry: InMemoryToolRegistry;
  public agentRuntime: AgentRuntime;
  public planner: Planner;
  public contextBuilder: ContextBuilder;
  public verificationEngine: VerificationEngine;
  public reflectionEngine: ReflectionEngine;
  public modelRouter: ModelRouter;

  constructor() {
    this.stateStore = new InMemoryStateStore();
    this.eventBus = new InMemoryEventBus();
    
    // Low-privilege math and coding tool permissions granted by default
    this.toolRegistry = new InMemoryToolRegistry({
      eventBus: this.eventBus,
      stateStore: this.stateStore,
      grantedPermissions: ["math_allowed", "filesystem_allowed"]
    });

    this.agentRuntime = new AgentRuntime(this.stateStore, this.eventBus);

    // Set up model router with real Gemini and OpenRouter free LLM reciprocal fallback
    const isProduction = process.env.NODE_ENV === "production";
    const geminiProvider = new GeminiLLMProvider();
    const openRouterProvider = new OpenRouterLLMProvider();
    const providers: ILLMProvider[] = [geminiProvider, openRouterProvider];
    const fallbacks: Record<string, string[]> = {
      "gemini-provider": ["openrouter-provider"],
      "openrouter-provider": ["gemini-provider"]
    };
    
    if (!isProduction) {
      // In development/test, instantiate high-fidelity mocks to support offline loops and fast iterations
      const mockFast = new MockLLMProvider("mock-fast", "Mock Fast Engine", { latencyMs: 50 });
      const mockReasoning = new MockLLMProvider("mock-reasoning", "Mock Reasoning Engine", { latencyMs: 200 });
      providers.push(mockFast, mockReasoning);
      fallbacks["gemini-provider"].push("mock-fast", "mock-reasoning");
    } else {
      console.log("[KernelInstance] Booting in PRODUCTION mode. High-fidelity mocks disabled.");
    }
    
    this.modelRouter = new ModelRouter({
      providers,
      fallbacks,
      maxRetries: 2
    });

    this.planner = new Planner(this.toolRegistry, this.eventBus);
    this.contextBuilder = new ContextBuilder({ tokenBudget: 4000 });
    this.verificationEngine = new VerificationEngine({ eventBus: this.eventBus });
    this.reflectionEngine = new ReflectionEngine({
      modelRouter: this.modelRouter,
      eventBus: this.eventBus
    });

    this.initializeStandardTools();
    this.initializeStandardAgents();
  }

  private initializeStandardTools() {
    // 1. Calculator Tool
    this.toolRegistry.registerTool({
      id: "calculator",
      name: "Calculator",
      description: "Applies arithmetic operations: add, subtract, multiply, divide",
      permissions: ["math_allowed"],
      riskLevel: "low",
      timeoutMs: 500,
      maxRetries: 2,
      inputSchema: {
        type: "object",
        required: ["a", "b", "op"],
        properties: {
          a: { type: "number" },
          b: { type: "number" },
          op: { type: "string", enum: ["add", "subtract", "multiply", "divide"] }
        }
      },
      outputSchema: {
        type: "object",
        required: ["result"],
        properties: {
          result: { type: "number" }
        }
      }
    }, async (args) => {
      const { a, b, op } = args;
      if (op === "add") return { result: a + b };
      if (op === "subtract") return { result: a - b };
      if (op === "multiply") return { result: a * b };
      if (op === "divide") {
        if (b === 0) throw new Error("Division by zero");
        return { result: a / b };
      }
      throw new Error(`Unsupported operator: ${op}`);
    });

    // 2. Tokenizer Tool
    this.toolRegistry.registerTool({
      id: "tokenizer",
      name: "Tokenizer",
      description: "Prunes text, extracts word frequency and counts tokens",
      permissions: ["math_allowed"],
      riskLevel: "low",
      timeoutMs: 500,
      maxRetries: 1,
      inputSchema: {
        type: "object",
        required: ["text"],
        properties: {
          text: { type: "string" }
        }
      },
      outputSchema: {
        type: "object",
        required: ["tokens", "wordCount"],
        properties: {
          tokens: { type: "number" },
          wordCount: { type: "number" }
        }
      }
    }, async (args) => {
      const { text } = args;
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      const tokens = Math.ceil(text.length / 4);
      return { tokens, wordCount };
    });
  }

  private initializeStandardAgents() {
    // 1. Math Specialist Agent
    this.agentRuntime.registerAgent({
      id: "math_agent",
      name: "Math Specialist",
      description: "Executes mathematical tasks, financial audits, and telemetry algorithms.",
      capabilityTags: ["math", "calculator", "telemetry"],
      maxExecutionTimeMs: 10000
    }, async (ctx) => {
      ctx.log("Booting Math Specialist workflow...");
      ctx.stateStore.updateStep(ctx.taskId, "step_1", {
        name: "Analyze Math Equation",
        status: "running"
      });
      
      const calcResult = await this.toolRegistry.executeTool("calculator", { a: 450, b: 78, op: "multiply" }, ctx.taskId);
      ctx.log(`Calculator Invoked: 450 * 78 = ${calcResult.result}`);
      
      ctx.recordStepCompleted("step_1", 120, [`Calculated partial multiplication: ${calcResult.result}`]);
      
      ctx.stateStore.updateStep(ctx.taskId, "step_2", {
        name: "Telemetry Token Estimation",
        status: "running"
      });
      
      const tokenResult = await this.toolRegistry.executeTool("tokenizer", { text: `Output total: ${calcResult.result}` }, ctx.taskId);
      ctx.log(`Tokenizer completed. Token count: ${tokenResult.tokens}`);
      
      ctx.recordStepCompleted("step_2", 80, [`Estimated size of final computation: ${tokenResult.tokens} tokens`]);
      ctx.recordTelemetry(320, 0.0024);
      
      return { finalComputation: calcResult.result, expectedTokens: tokenResult.tokens };
    });

    // 2. DevOps Auditing Agent
    this.agentRuntime.registerAgent({
      id: "coding_agent",
      name: "SecOps Code Auditor",
      description: "Analyzes file architectures, performs static safety checks, and builds reflection scorecards.",
      capabilityTags: ["coding", "sre", "testing"],
      maxExecutionTimeMs: 15000
    }, async (ctx) => {
      ctx.log("SecOps Code Auditor initialized.");
      ctx.stateStore.updateStep(ctx.taskId, "audit_1", {
        name: "Compile Directory Context",
        status: "running"
      });
      
      ctx.log("Scanning workspace files...");
      const context = await this.contextBuilder.buildContext("security policy", ["package.json"]);
      ctx.log(`Workspace context compiled. Compression Saved: ${context.metrics.compressionRatio}%`);
      
      ctx.recordStepCompleted("audit_1", 150, [
        `Parsed ${context.files.length} active files.`,
        `Estimated tokens saved: ${context.metrics.estimatedTokensBefore - context.metrics.estimatedTokensAfter}`
      ]);
      
      ctx.stateStore.updateStep(ctx.taskId, "audit_2", {
        name: "Perform Structural Vulnerability Analysis",
        status: "running"
      });
      
      // Execute security audit verification
      const verifyResult = await this.verificationEngine.verify(ctx.taskId, ["package.json"]);
      ctx.log(`Verification engine complete. Status: ${verifyResult.success ? "PASSED" : "FAILED"}`);
      
      const passed = verifyResult.report?.telemetry?.passedRules ?? 0;
      const total = verifyResult.report?.telemetry?.totalRules ?? 0;
      const warnings = verifyResult.report?.telemetry?.warningsCount ?? 0;

      ctx.recordStepCompleted("audit_2", 300, [
        `Rules passed: ${passed}/${total}`,
        `Warnings found: ${warnings}`
      ]);
      
      ctx.recordTelemetry(650, 0.015);
      return { 
        filesAudited: context.files, 
        securityVerified: verifyResult.success,
        policyVersion: verifyResult.verification_policy_version
      };
    });
  }
}

export const kernel = new KernelInstance();
