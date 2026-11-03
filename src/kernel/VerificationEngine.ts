/**
 * @file /src/kernel/VerificationEngine.ts
 * @description Pure, deterministic Verification Engine implementing IVerificationEngine.
 * Implements a strict rule-execution framework, severity classification, report generation,
 * validation pipeline, telemetry tracking, and event publication.
 */

import { IVerificationEngine, IEventBus } from "./types";
import * as fs from "fs";
import * as path from "path";

/**
 * Severity levels for verification rules.
 */
export type Severity = "info" | "warning" | "error";

/**
 * Single rule execution outcome.
 */
export interface RuleResult {
  passed: boolean;
  message: string;
  details?: any;
}

/**
 * Base interface for deterministic verification rules.
 */
export interface IVerificationRule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  execute(
    taskId: string,
    filePaths: string[],
    options: {
      workspaceRoot: string;
      readFileFn?: (filePath: string) => string;
      existsFileFn?: (filePath: string) => boolean;
    }
  ): Promise<RuleResult>;
}

/**
 * Verification telemetry collected per run.
 */
export interface VerificationTelemetry {
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warningsCount: number;
  errorsCount: number;
  latencyMs: number;
}

/**
 * Full structural verification report.
 */
export interface VerificationReport {
  taskId: string;
  success: boolean;
  timestamp: string;
  durationMs: number;
  telemetry: VerificationTelemetry;
  results: Array<{
    ruleId: string;
    ruleName: string;
    severity: Severity;
    passed: boolean;
    message: string;
    details?: any;
  }>;
  verification_policy_version?: string;
}

export interface VerificationEngineOptions {
  eventBus?: IEventBus;
  workspaceRoot?: string;
  rules?: IVerificationRule[];
  /** Allow injecting file readers for isolated memory-only unit tests */
  readFileFn?: (filePath: string) => string;
  existsFileFn?: (filePath: string) => boolean;
}

// ==========================================
// OUT-OF-THE-BOX RULES IMPLEMENTATION
// ==========================================

/**
 * Checks for banned syntactic features or constructs (e.g. 'const enum', which is forbidden by the style guide).
 */
export class BannedSyntaxRule implements IVerificationRule {
  public readonly id = "banned-syntax";
  public readonly name = "Banned Syntax Check";
  public readonly description = "Detects banned TypeScript/JavaScript structures like 'const enum'.";
  public readonly severity: Severity = "error";

  public async execute(
    taskId: string,
    filePaths: string[],
    options: { readFileFn?: (filePath: string) => string; existsFileFn?: (filePath: string) => boolean }
  ): Promise<RuleResult> {
    const reader = options.readFileFn ?? ((p) => fs.readFileSync(p, "utf-8"));
    const errors: string[] = [];

    for (const file of filePaths) {
      try {
        const content = reader(file);
        // Look for 'const enum' keywords
        if (/\bconst\s+enum\b/.test(content)) {
          errors.push(`File "${file}" contains banned construct 'const enum'. Use standard 'enum' instead.`);
        }
      } catch (err: any) {
        // Skip missing or unreadable files (other rules handles existence)
      }
    }

    return {
      passed: errors.length === 0,
      message: errors.length === 0 ? "No banned syntax constructs detected." : errors.join("\n"),
      details: { errors }
    };
  }
}

/**
 * Checks for hardcoded sensitive credentials or raw security tokens inside files.
 */
export class SecurityLeaksRule implements IVerificationRule {
  public readonly id = "security-leaks";
  public readonly name = "Hardcoded Secret Scanner";
  public readonly description = "Scans modified files for potential hardcoded secret keys or API tokens.";
  public readonly severity: Severity = "error";

  public async execute(
    taskId: string,
    filePaths: string[],
    options: { readFileFn?: (filePath: string) => string }
  ): Promise<RuleResult> {
    const reader = options.readFileFn ?? ((p) => fs.readFileSync(p, "utf-8"));
    const issues: string[] = [];

    // Simple patterns to identify potential high-risk credential definitions
    const leakPatterns = [
      { pattern: /AIzaSy[A-Za-z0-9-_]{35}/, name: "Google API Key" },
      { pattern: /sk-proj-[A-Za-z0-9]{40}/, name: "OpenAI Project Key" },
      { pattern: /const\s+\w*(secret|key|password|token)\w*\s*=\s*["'][A-Za-z0-9+/=]{16,}["']/i, name: "Hardcoded Credential String" }
    ];

    for (const file of filePaths) {
      try {
        const content = reader(file);
        for (const lp of leakPatterns) {
          if (lp.pattern.test(content)) {
            issues.push(`File "${file}" contains a highly suspicious pattern matching ${lp.name}. Use environment variables instead.`);
          }
        }
      } catch {
        // Safe skip
      }
    }

    return {
      passed: issues.length === 0,
      message: issues.length === 0 ? "No hardcoded credentials or security leaks detected." : issues.join("\n"),
      details: { leaksDetected: issues }
    };
  }
}

/**
 * Validates file scale boundaries, ensuring files remain modular and do not exceed length recommendations.
 */
export class FileScaleRule implements IVerificationRule {
  public readonly id = "file-scale-limit";
  public readonly name = "File Scale Analyzer";
  public readonly description = "Enforces modularity by validating that files do not exceed length limits.";
  public readonly severity: Severity = "warning";

  constructor(private readonly maxLines: number = 1000) {}

  public async execute(
    taskId: string,
    filePaths: string[],
    options: { readFileFn?: (filePath: string) => string }
  ): Promise<RuleResult> {
    const reader = options.readFileFn ?? ((p) => fs.readFileSync(p, "utf-8"));
    const excessiveFiles: string[] = [];

    for (const file of filePaths) {
      try {
        const content = reader(file);
        const lines = content.split(/\r?\n/).length;
        if (lines > this.maxLines) {
          excessiveFiles.push(`File "${file}" has ${lines} lines, exceeding the recommended limit of ${this.maxLines} lines.`);
        }
      } catch {
        // Skip unreadable files
      }
    }

    return {
      passed: excessiveFiles.length === 0,
      message: excessiveFiles.length === 0 
        ? `All files are within size thresholds (<= ${this.maxLines} lines).` 
        : excessiveFiles.join("\n"),
      details: { excessiveFiles }
    };
  }
}

/**
 * Ensures code conforms to baseline style regulations like vertical empty line limits.
 */
export class FormattingRule implements IVerificationRule {
  public readonly id = "formatting-guard";
  public readonly name = "Vertical Formatting Check";
  public readonly description = "Validates clean spacing structure and vertical whitespace rules.";
  public readonly severity: Severity = "warning";

  public async execute(
    taskId: string,
    filePaths: string[],
    options: { readFileFn?: (filePath: string) => string }
  ): Promise<RuleResult> {
    const reader = options.readFileFn ?? ((p) => fs.readFileSync(p, "utf-8"));
    const issues: string[] = [];

    for (const file of filePaths) {
      try {
        const content = reader(file);
        // Matches three or more consecutive line breaks (i.e. more than one blank line between logical lines)
        if (/\n\s*\n\s*\n/.test(content)) {
          issues.push(`File "${file}" contains excessive vertical whitespace (multiple consecutive empty lines).`);
        }
      } catch {
        // Safe skip
      }
    }

    return {
      passed: issues.length === 0,
      message: issues.length === 0 ? "Clean vertical whitespace matches formatting specifications." : issues.join("\n"),
      details: { issues }
    };
  }
}

/**
 * Verifies that code is covered by tests, ensuring matching test files exist for core logic modifications.
 */
export class TestCoveragePresenceRule implements IVerificationRule {
  public readonly id = "test-coverage-presence";
  public readonly name = "Test Coverage Presence Scan";
  public readonly description = "Detects whether modified source files have corresponding test suites.";
  public readonly severity: Severity = "info";

  public async execute(
    taskId: string,
    filePaths: string[],
    options: { existsFileFn?: (filePath: string) => boolean }
  ): Promise<RuleResult> {
    const exists = options.existsFileFn ?? ((p) => fs.existsSync(p));
    const unmapped: string[] = [];

    for (const file of filePaths) {
      // Only require tests for source code, excluding existing tests or configurations
      if (
        file.startsWith("src/") && 
        file.endsWith(".ts") && 
        !file.endsWith(".test.ts") && 
        !file.endsWith("types.ts") &&
        !file.includes("/tests/")
      ) {
        const dir = path.dirname(file);
        const base = path.basename(file, ".ts");
        
        // Check standard side-by-side or /tests/ sub-folder locations
        const candidate1 = path.join(dir, `${base}.test.ts`);
        const candidate2 = path.join(dir, "tests", `${base}.test.ts`);

        if (!exists(candidate1) && !exists(candidate2)) {
          unmapped.push(`No corresponding test file found for "${file}". Consider creating a test module.`);
        }
      }
    }

    return {
      passed: unmapped.length === 0,
      message: unmapped.length === 0 ? "Every modified source file has an active test coverage file." : unmapped.join("\n"),
      details: { unmapped }
    };
  }
}

// ==========================================
// CORE VERIFICATION ENGINE
// ==========================================

export class VerificationEngine implements IVerificationEngine {
  public static readonly verification_policy_version = "policy-v1.0";
  public readonly verification_policy_version = VerificationEngine.verification_policy_version;

  private readonly eventBus?: IEventBus;
  private readonly workspaceRoot: string;
  private readonly rules: IVerificationRule[] = [];
  private readonly readFileFn?: (filePath: string) => string;
  private readonly existsFileFn?: (filePath: string) => boolean;

  constructor(options: VerificationEngineOptions = {}) {
    this.eventBus = options.eventBus;
    this.workspaceRoot = options.workspaceRoot ?? process.cwd();
    this.readFileFn = options.readFileFn;
    this.existsFileFn = options.existsFileFn;

    // Use default baseline rules if custom set not provided
    if (options.rules) {
      this.rules = options.rules;
    } else {
      this.rules = [
        new BannedSyntaxRule(),
        new SecurityLeaksRule(),
        new FileScaleRule(1000),
        new FormattingRule(),
        new TestCoveragePresenceRule()
      ];
    }
  }

  /**
   * Evaluates the objective workspace metrics against all registered rules.
   * Generates a structural report, publishes events, and tracks runtime telemetry.
   */
  public async verify(
    taskId: string,
    filePaths: string[]
  ): Promise<{
    success: boolean;
    logs: string[];
    errors: string[];
    report?: VerificationReport;
    verification_policy_version?: string;
  }> {
    const startTime = Date.now();
    const logs: string[] = [];
    const errors: string[] = [];
    const results: VerificationReport["results"] = [];

    let passedRules = 0;
    let failedRules = 0;
    let warningsCount = 0;
    let errorsCount = 0;

    logs.push(`[VerificationEngine] Initializing objective verification pipeline for task "${taskId}"`);
    logs.push(`[VerificationEngine] Target file validation queue size: ${filePaths.length}`);

    // Deterministically execute each rule sequentially
    for (const rule of this.rules) {
      logs.push(`[VerificationEngine] Running rule: [${rule.id}] "${rule.name}"`);
      
      try {
        const result = await rule.execute(taskId, filePaths, {
          workspaceRoot: this.workspaceRoot,
          readFileFn: this.readFileFn,
          existsFileFn: this.existsFileFn
        });

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          passed: result.passed,
          message: result.message,
          details: result.details
        });

        if (result.passed) {
          passedRules++;
          logs.push(`  ✅ Rule [${rule.id}] passed: ${result.message}`);
        } else {
          failedRules++;
          if (rule.severity === "error") {
            errorsCount++;
            errors.push(`[Rule Failure] [${rule.id}]: ${result.message}`);
            logs.push(`  ❌ Rule [${rule.id}] failed (ERROR severity): ${result.message}`);
          } else if (rule.severity === "warning") {
            warningsCount++;
            logs.push(`  ⚠️ Rule [${rule.id}] failed (WARNING severity): ${result.message}`);
          } else {
            logs.push(`  ℹ️ Rule [${rule.id}] reported feedback (INFO severity): ${result.message}`);
          }
        }
      } catch (err: any) {
        failedRules++;
        errorsCount++;
        const failureMsg = `Crash during execution of rule "${rule.id}": ${err.message || err}`;
        errors.push(`[Rule Crash] [${rule.id}]: ${failureMsg}`);
        logs.push(`  💥 Rule [${rule.id}] crashed during evaluation: ${failureMsg}`);

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          passed: false,
          message: failureMsg,
          details: { error: err.message || String(err) }
        });
      }
    }

    const durationMs = Date.now() - startTime;
    // The pipeline succeeds if there are zero failed rules with 'error' severity
    const success = errorsCount === 0;

    const telemetry: VerificationTelemetry = {
      totalRules: this.rules.length,
      passedRules,
      failedRules,
      warningsCount,
      errorsCount,
      latencyMs: durationMs
    };

    const report: VerificationReport = {
      taskId,
      success,
      timestamp: new Date().toISOString(),
      durationMs,
      telemetry,
      results,
      verification_policy_version: this.verification_policy_version
    };

    logs.push(`[VerificationEngine] Verification complete. Final Verdict: ${success ? "PASSED" : "FAILED"}`);
    logs.push(`[VerificationEngine] Stats: Passed=${passedRules}, Failed=${failedRules} (Errors=${errorsCount}, Warnings=${warningsCount})`);

    // Publish lifecycle events on the EventBus spine
    if (this.eventBus) {
      const eventType = success ? "VerificationPassed" : "VerificationFailed";
      this.eventBus.publish({
        taskId,
        type: eventType,
        payload: {
          success,
          durationMs,
          telemetry,
          verification_policy_version: this.verification_policy_version,
          reportSummary: results.map((r) => ({ id: r.ruleId, passed: r.passed, severity: r.severity }))
        }
      });
    }

    return {
      success,
      logs,
      errors,
      report,
      verification_policy_version: this.verification_policy_version
    };
  }

  /**
   * Registers a new deterministic rule into the validation framework.
   */
  public registerRule(rule: IVerificationRule): void {
    if (this.rules.some((r) => r.id === rule.id)) {
      throw new Error(`VerificationEngine: Rule with ID "${rule.id}" is already registered.`);
    }
    this.rules.push(rule);
  }
}
