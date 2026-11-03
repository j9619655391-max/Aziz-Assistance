import fs from "fs";
import path from "path";
import { IAppRepository } from "../shared/repository/IRepository";

export interface DiagnosticBug {
  id: string;
  filePath: string;
  line: number;
  severity: "critical" | "warning" | "info" | string;
  category: "security" | "best_practice" | "network" | "rendering" | "syntax" | string;
  title: string;
  message: string;
  recommendation: string;
  snippet: string;
  remediationCode: string;
}

export interface DiagnosticReport {
  timestamp: string;
  scannedFilesCount: number;
  totalIssuesCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  qualityScore: number;
  qualityGrade: "A" | "B" | "C" | "D" | "F";
  bugs: DiagnosticBug[];
}

export class DiagnosticAgentService {
  constructor(private repo: IAppRepository) {}

  /**
   * Scans and analyzes project source files to locate potential bugs, resource leaks, or security vulnerabilities
   */
  public async analyzeCodebase(): Promise<DiagnosticReport> {
    // Get file list
    const codeFiles: string[] = [];
    this.walkDir(path.join(process.cwd(), "src"), codeFiles);
    const rootServer = path.join(process.cwd(), "server.ts");
    if (fs.existsSync(rootServer)) codeFiles.push(rootServer);
    
    const bugs: DiagnosticBug[] = [];
    let scannedFilesCount = 0;

    for (const filePath of codeFiles) {
      if (!fs.existsSync(filePath)) continue;
      scannedFilesCount++;
      const content = fs.readFileSync(filePath, "utf-8");
      const relativePath = path.relative(process.cwd(), filePath);
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Rule 1: Client-Side Secret Exposure (Only in frontend UI components in src/components or src/pages, not server-side domain services)
        const isFrontendComponent = filePath.includes("src/components/") || filePath.includes("src/pages/") || filePath.includes("src/App.tsx");
        if (isFrontendComponent && (line.includes("process.env.GEMINI_API_KEY") || line.includes("process.env.STRIPE_SECRET_KEY") || line.includes("process.env.SMTP_PASSWORD"))) {
          bugs.push({
            id: `leaked-secret-${relativePath}-${i}`,
            filePath: relativePath,
            line: i + 1,
            severity: "critical",
            category: "security",
            title: "Client-Side Secret Exposure",
            message: "A server-side secret environment variable is referenced inside a frontend UI component. This key will be undefined in browser environments or risk leaking if compiled.",
            recommendation: "Create a backend endpoint under /api/* to proxy requests and keep API keys hidden on the server.",
            snippet: lines[i],
            remediationCode: "/* Create a proxy route in server.ts and fetch /api/ instead */"
          });
        }

        // Rule 2: Leftover debug statements
        if (line.includes("debugger;") || (line.includes("console.log(") && !filePath.includes("server.ts") && !filePath.includes("utils.ts") && !filePath.includes("kernel/tests/") && !line.includes("console.error("))) {
          bugs.push({
            id: `debug-stmt-${relativePath}-${i}`,
            filePath: relativePath,
            line: i + 1,
            severity: "info",
            category: "best_practice",
            title: "Leftover Debugging Statement",
            message: "A console.log or debugger statement was found in production code, which can clutter output or halt execution.",
            recommendation: "Remove console logs or debugger statements before deploying.",
            snippet: lines[i],
            remediationCode: ""
          });
        }

        // Rule 3: Unchecked Fetch Response
        if (line.includes("fetch(") && !line.includes("res.ok") && !line.includes("response.ok") && !line.includes("res.status")) {
          let hasCheck = false;
          for (let k = i; k < Math.min(lines.length, i + 15); k++) {
            const nextLine = lines[k];
            if (nextLine.includes(".ok") || nextLine.includes(".status") || nextLine.includes("responseOk") || nextLine.includes("res.ok") || nextLine.includes("if (") || nextLine.includes("try") || nextLine.includes("catch")) {
              hasCheck = true;
              break;
            }
          }
          if (!hasCheck) {
            bugs.push({
              id: `unchecked-fetch-${relativePath}-${i}`,
              filePath: relativePath,
              line: i + 1,
              severity: "warning",
              category: "network",
              title: "Unchecked Fetch Response",
              message: "API response from fetch is parsed or used without validating res.ok or checking the HTTP status code.",
              recommendation: "Always verify `if (!res.ok) { throw new Error(...) }` before parsing the response body.",
              snippet: lines[i],
              remediationCode: "if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);"
            });
          }
        }

        // Rule 4: Missing unique key in JSX Map (Only when mapping directly into JSX elements)
        const isJsxMap = line.includes(".map(") && (line.includes("=> <") || line.includes("return <") || line.includes("=> (") || line.includes("return ("));
        const isStringJoin = line.includes(".join(") || line.includes(".join('") || line.includes('.join("');
        if (isJsxMap && !isStringJoin && !line.includes("key=") && !line.includes("return null") && filePath.endsWith(".tsx")) {
          let hasKey = false;
          for (let k = i; k < Math.min(lines.length, i + 12); k++) {
            if (lines[k].includes("key=")) {
              hasKey = true;
              break;
            }
          }
          if (!hasKey) {
            bugs.push({
              id: `missing-key-${relativePath}-${i}`,
              filePath: relativePath,
              line: i + 1,
              severity: "warning",
              category: "rendering",
              title: "Missing Key in JSX Map",
              message: "Rendering list items dynamically with .map() requires a unique 'key' prop on the outermost element for efficient React DOM updates.",
              recommendation: "Assign a unique key (like item.id or index) to the top-level element returned inside the .map loop.",
              snippet: lines[i],
              remediationCode: "items.map((item, index) => <div key={index}>{item.name}</div>)"
            });
          }
        }

        // Rule 5: Unresolved Relative Import (Ignore comments and test mockup strings)
        const isCommentOrTestString = line.startsWith("//") || line.startsWith("/*") || line.startsWith("*") || line.includes("import {") || filePath.includes("/tests/");
        const importRelativeMatch = !isCommentOrTestString ? line.match(/from\s+['"](\.\.?\/[^'"]+)['"]/) : null;
        if (importRelativeMatch && (filePath.endsWith(".ts") || filePath.endsWith(".tsx"))) {
          const relativeImportPath = importRelativeMatch[1];
          const fileDir = path.dirname(filePath);
          const resolvedPathWithoutExt = path.resolve(fileDir, relativeImportPath);
          
          const extensions = [".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", ""];
          let exists = false;
          for (const ext of extensions) {
            if (fs.existsSync(resolvedPathWithoutExt + ext)) {
              exists = true;
              break;
            }
          }
          if (!exists) {
            bugs.push({
              id: `broken-import-${relativePath}-${i}`,
              filePath: relativePath,
              line: i + 1,
              severity: "critical",
              category: "syntax",
              title: "Unresolved Relative Import",
              message: `The relative import '${relativeImportPath}' cannot be resolved to any file on disk.`,
              recommendation: `Check the file path and spelling. Ensure the file exists at '${resolvedPathWithoutExt}'.`,
              snippet: lines[i],
              remediationCode: ""
            });
          }
        }

        // Rule 6: Direct window size access without ResizeObserver
        if (filePath.endsWith(".tsx") && (line.includes("window.innerWidth") || line.includes("window.innerHeight")) && !line.includes("ResizeObserver")) {
          const hasResizeObserver = content.includes("ResizeObserver") || content.includes("ResizeListener") || content.includes("window.addEventListener(\"resize\"");
          if (!hasResizeObserver) {
            bugs.push({
              id: `window-size-${relativePath}-${i}`,
              filePath: relativePath,
              line: i + 1,
              severity: "warning",
              category: "rendering",
              title: "Direct Window-Size Dependency",
              message: "Direct reference to window.innerWidth/innerHeight without resize listener or ResizeObserver can cause non-responsive UI inside iframes.",
              recommendation: "Use a container ref and ResizeObserver to track actual dimensions reactively, or add an active window resize listener.",
              snippet: lines[i],
              remediationCode: "const observer = new ResizeObserver((entries) => { /* Update state */ });"
            });
          }
        }

        // Rule 7: React direct state setter in component body (Only flag if outside functions, hooks, callbacks, or useEffects)
        const setStateMatch = line.match(/(set[A-Z][a-zA-Z0-9_]*)\(/);
        const isHookDeclaration = line.includes("useState") || line.includes("useReducer");
        if (setStateMatch && !isHookDeclaration && filePath.endsWith(".tsx") && !line.includes("useEffect") && !line.includes("useCallback") && !line.includes("useMemo") && !line.includes("onClick") && !line.includes("onChange") && !line.includes("onSubmit") && !line.includes("=>") && !line.includes("function") && !line.includes("handle") && !line.includes("on")) {
          let isSafe = false;
          // Check backwards up to 150 lines for any function, async, arrow function, or event handler declaration
          for (let k = i - 1; k >= Math.max(0, i - 150); k--) {
            const prevLine = lines[k];
            if (prevLine.includes("=>") || prevLine.includes("function") || prevLine.includes("useEffect") || prevLine.includes("async") || prevLine.includes("then(") || prevLine.includes("catch(") || prevLine.includes("const handle") || prevLine.includes("function handle")) {
              isSafe = true;
              break;
            }
          }
          if (!isSafe) {
            bugs.push({
              id: `infinite-render-${relativePath}-${i}`,
              filePath: relativePath,
              line: i + 1,
              severity: "critical",
              category: "rendering",
              title: "Potential Infinite Render Loop",
              message: `A state modifier '${setStateMatch[1]}()' seems to be called directly in the component body. This triggers state updates on every render, causing an infinite loop.`,
              recommendation: "Wrap the state modifier in a useEffect hook or call it inside a user-triggered callback function.",
              snippet: lines[i],
              remediationCode: `useEffect(() => {\n  ${setStateMatch[1]}(newValue);\n}, []);`
            });
          }
        }

        // Rule 8: Unsafe Type Assertions (as any)
        if ((line.includes("as any") || line.includes("<any>")) && (filePath.endsWith(".ts") || filePath.endsWith(".tsx"))) {
          bugs.push({
            id: `unsafe-assertion-${relativePath}-${i}`,
            filePath: relativePath,
            line: i + 1,
            severity: "info",
            category: "best_practice",
            title: "Unsafe 'any' Type Assertion",
            message: "The codebase uses 'as any' to bypass TypeScript's type checker, which can mask potential bugs.",
            recommendation: "Replace 'any' with a strict, explicitly declared interface or the 'unknown' type with runtime checks.",
            snippet: lines[i],
            remediationCode: ""
          });
        }
      }
    }

    // Calculate Quality Score
    const criticalCount = bugs.filter(b => b.severity === "critical").length;
    const warningCount = bugs.filter(b => b.severity === "warning").length;
    const infoCount = bugs.filter(b => b.severity === "info").length;

    let qualityScore = 100 - (criticalCount * 20) - (warningCount * 1.5) - Math.min(10, infoCount * 0.05);
    qualityScore = Math.max(0, Math.min(100, Math.round(qualityScore)));

    let qualityGrade: "A" | "B" | "C" | "D" | "F" = "A";
    if (qualityScore < 60) qualityGrade = "F";
    else if (qualityScore < 70) qualityGrade = "D";
    else if (qualityScore < 80) qualityGrade = "C";
    else if (qualityScore < 90) qualityGrade = "B";

    const report: DiagnosticReport = {
      timestamp: new Date().toISOString(),
      scannedFilesCount,
      totalIssuesCount: bugs.length,
      criticalCount,
      warningCount,
      infoCount,
      qualityScore,
      qualityGrade,
      bugs
    };

    await this.repo.addSystemLog(
      "success",
      "api",
      `Codebug diagnostic run finished. Scanned ${scannedFilesCount} files. Detected ${bugs.length} issues.`
    );

    return report;
  }


  /**
   * Recursive directory walk helper
   */
  private walkDir(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        if (!["node_modules", "dist", ".git", ".github", "coverage", ".next"].includes(file)) {
          this.walkDir(filePath, fileList);
        }
      } else {
        if (/\.(ts|tsx|js|jsx)$/.test(file)) {
          fileList.push(filePath);
        }
      }
    }
    return fileList;
  }
}
