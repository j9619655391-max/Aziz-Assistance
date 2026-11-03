/**
 * @file /src/kernel/ContextBuilder.ts
 * @description Pure, deterministic context compilation engine implementing IContextBuilder.
 * Gathers relevant workspace files, enforces token budgets, applies whitespace and comment
 * pruning, maps a dependency graph, and compiles exact size and token metrics.
 */

import { IContextBuilder, WorkspaceContext } from "./types";
import * as fs from "fs";
import * as path from "path";

export interface ContextMetrics {
  totalBytesBefore: number;
  totalBytesAfter: number;
  compressionRatio: number; // Percentage of size saved
  estimatedTokensBefore: number;
  estimatedTokensAfter: number;
  tokenReductionRatio: number; // Percentage of tokens saved
}

export interface ContextPackage extends WorkspaceContext {
  metrics: ContextMetrics;
  budgetEnforced: boolean;
  truncatedFiles: string[];
}

export interface ContextBuilderOptions {
  /** In-memory virtual file system for isolated deterministic unit testing */
  vfs?: Record<string, string>;
  /** Configurable maximum token budget (approx. 4 characters per token). Defaults to 8000 */
  tokenBudget?: number;
  /** Strip JS/TS comments to reduce size and redundant info. Defaults to true */
  stripComments?: boolean;
}

export class ContextBuilder implements IContextBuilder {
  public static readonly context_policy_version = "policy-v1.0";
  public readonly context_policy_version = ContextBuilder.context_policy_version;

  private readonly vfs?: Record<string, string>;
  private readonly tokenBudget: number;
  private readonly stripComments: boolean;

  constructor(options: ContextBuilderOptions = {}) {
    this.vfs = options.vfs;
    // Bound token budget within safe positive range [1, 128000] to prevent overflow or negative budget loops
    const rawBudget = options.tokenBudget ?? 8000;
    this.tokenBudget = Number.isFinite(rawBudget) ? Math.min(Math.max(1, rawBudget), 128000) : 8000;
    this.stripComments = options.stripComments ?? true;
  }

  /**
   * Deterministically compiles the workspace context based on query keywords and priority file inputs.
   */
  public async buildContext(query: string, impactedFiles: string[]): Promise<ContextPackage> {
    const rawFiles: Record<string, string> = {};

    // 1. Gather all candidate source files (either from VFS mock or actual workspace filesystem)
    if (this.vfs) {
      for (const [file, content] of Object.entries(this.vfs)) {
        rawFiles[file] = content;
      }
    } else {
      const kernelDir = path.join(process.cwd(), "src", "kernel");
      try {
        if (fs.existsSync(kernelDir)) {
          const files = this.scanDirRecursive(kernelDir);
          for (const file of files) {
            const relativePath = path.relative(process.cwd(), file);
            rawFiles[relativePath] = fs.readFileSync(file, "utf-8");
          }
        }
      } catch (err) {
        // Fallback for isolated environments or read errors
        rawFiles["src/kernel/placeholder.ts"] = `// Placeholder due to reading failure\nconst status = "ok";`;
      }
    }

    // 2. Compute Keyword/Relevance Scores
    const queryTerms = this.tokenizeQuery(query);
    const scoredFiles = Object.keys(rawFiles).map(filePath => {
      const originalContent = rawFiles[filePath];
      let score = 0;

      // Base weight: explicit impacted files get top priority
      if (impactedFiles.includes(filePath)) {
        score += 1000;
      }

      // Keyword weights
      const contentLower = originalContent.toLowerCase();
      const pathLower = filePath.toLowerCase();
      for (const term of queryTerms) {
        if (pathLower.includes(term)) {
          score += 100;
        }
        // Count term occurrences
        const matches = contentLower.split(term).length - 1;
        score += matches * 10;
      }

      return { filePath, originalContent, score };
    });

    // Sort files descending by score to prioritize high-relevance items
    scoredFiles.sort((a, b) => b.score - a.score);

    // 3. Process, Compress and Prune Contents
    let totalBytesBefore = 0;
    let totalBytesAfter = 0;
    let estimatedTokensBefore = 0;
    let estimatedTokensAfter = 0;

    const finalFilesList: string[] = [];
    const processedFiles: Record<string, string> = {};
    const truncatedFiles: string[] = [];
    let budgetEnforced = false;
    let remainingTokenBudget = this.tokenBudget;

    for (const { filePath, originalContent } of scoredFiles) {
      const bytesOrig = Buffer.byteLength(originalContent, "utf-8");
      const tokensOrig = Math.ceil(originalContent.length / 4);

      totalBytesBefore += bytesOrig;
      estimatedTokensBefore += tokensOrig;

      if (remainingTokenBudget <= 0) {
        budgetEnforced = true;
        continue; // Fully skip lower-priority files when budget is exhausted
      }

      // Perform Deterministic Lossless & Lossy Redundancy Compression
      let compressed = originalContent;

      if (this.stripComments) {
        // Strip block comments
        compressed = compressed.replace(/\/\*[\s\S]*?\*\//g, "");
        // Strip single line comments (keeping newline to avoid joining statements)
        compressed = compressed.split("\n").map(line => {
          // Keep line but remove comments starting with // (be careful with URLs)
          if (line.includes("//") && !line.includes("http://") && !line.includes("https://")) {
            return line.split("//")[0];
          }
          return line;
        }).join("\n");
      }

      // Compress excessive vertical whitespace
      compressed = compressed
        .split("\n")
        .map(line => line.trimEnd())
        .filter((line, i, arr) => line !== "" || (i > 0 && arr[i - 1] !== "")) // Max 1 consecutive blank line
        .join("\n")
        .trim();

      const tokensCompressed = Math.ceil(compressed.length / 4);

      // Check budget constraint
      if (tokensCompressed > remainingTokenBudget) {
        budgetEnforced = true;
        truncatedFiles.push(filePath);

        // Deterministically truncate to remaining budget limit
        const charLimit = remainingTokenBudget * 4;
        compressed = compressed.slice(0, charLimit) + "\n\n// [TRUNCATED TO RESPECT MAXIMUM TOKEN BUDGET]";
        const tokensFinal = Math.ceil(compressed.length / 4);
        remainingTokenBudget = 0;

        const bytesFinal = Buffer.byteLength(compressed, "utf-8");
        totalBytesAfter += bytesFinal;
        estimatedTokensAfter += tokensFinal;
        processedFiles[filePath] = compressed;
        finalFilesList.push(filePath);
      } else {
        remainingTokenBudget -= tokensCompressed;
        const bytesFinal = Buffer.byteLength(compressed, "utf-8");
        totalBytesAfter += bytesFinal;
        estimatedTokensAfter += tokensCompressed;
        processedFiles[filePath] = compressed;
        finalFilesList.push(filePath);
      }
    }

    // Sort final files alphabetically to keep outputs deterministic regardless of scoring sorts
    finalFilesList.sort();

    // 4. Build Structured Deterministic Dependency Graph
    const symbolsGraph: Record<string, string[]> = {};
    for (const filePath of finalFilesList) {
      symbolsGraph[filePath] = this.parseImports(filePath, processedFiles[filePath]);
    }

    // 5. Generate Consolidated Compressed Summary
    const summaryHeader = `=== AZIZ CONTEXT PACKAGE (BUDGET: ${this.tokenBudget} TOKENS) ===\n`;
    const filesSection = finalFilesList.map(f => {
      const status = truncatedFiles.includes(f) ? " [TRUNCATED]" : "";
      return `--- FILE: ${f}${status} ---\n${processedFiles[f]}`;
    }).join("\n\n");
    const compressedSummary = `${summaryHeader}\n${filesSection}`;

    // 6. Compute Size, Token & Compression Analytics
    const compressionRatio = totalBytesBefore > 0
      ? parseFloat(((totalBytesBefore - totalBytesAfter) / totalBytesBefore).toFixed(4))
      : 0;
    const tokenReductionRatio = estimatedTokensBefore > 0
      ? parseFloat(((estimatedTokensBefore - estimatedTokensAfter) / estimatedTokensBefore).toFixed(4))
      : 0;

    const metrics: ContextMetrics = {
      totalBytesBefore,
      totalBytesAfter,
      compressionRatio,
      estimatedTokensBefore,
      estimatedTokensAfter,
      tokenReductionRatio
    };

    return {
      files: finalFilesList,
      compressedSummary,
      symbolsGraph,
      metrics,
      budgetEnforced,
      truncatedFiles,
      context_policy_version: this.context_policy_version
    };
  }

  /**
   * Helper to scan a directory recursively for JS/TS/JSON source files.
   */
  private scanDirRecursive(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(this.scanDirRecursive(fullPath));
      } else if (file.endsWith(".ts") || file.endsWith(".js") || file.endsWith(".json")) {
        results.push(fullPath);
      }
    }
    return results;
  }

  /**
   * Helper to tokenize a query and extract key alphanumeric term keywords (filtering out trivial stopwords).
   */
  private tokenizeQuery(query: string): string[] {
    const stopwords = new Set([
      "a", "an", "the", "and", "or", "but", "if", "then", "else", "of", "to", "for", "in", "on", "at", "by", "with",
      "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does", "did", "please", "run", "verify"
    ]);

    return query
      .toLowerCase()
      .replace(/[^a-z0-9_\-\s]/g, "")
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopwords.has(word));
  }

  /**
   * Helper to extract relative import pathways from file content.
   */
  private parseImports(currentFile: string, content: string): string[] {
    const imports: string[] = [];
    const currentDir = path.dirname(currentFile);

    // Matches standard imports: import { ... } from "./Path" or import * as X from "../Path"
    const importRegex = /from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      let relativePath = match[1];
      // Normalize extensions
      if (!relativePath.endsWith(".ts") && !relativePath.endsWith(".js") && !relativePath.endsWith(".json")) {
        relativePath += ".ts"; // Default heuristic extension
      }

      // Resolve relative mapping
      const resolved = path.normalize(path.join(currentDir, relativePath)).replace(/\\/g, "/");
      imports.push(resolved);
    }

    return imports.sort();
  }
}
