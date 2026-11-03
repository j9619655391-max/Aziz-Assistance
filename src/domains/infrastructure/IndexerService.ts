import fs from "fs";
import path from "path";
import { IAppRepository } from "../shared/repository/IRepository";

export interface ParsedFile {
  filePath: string;
  fileName: string;
  imports: string[];
  exports: string[];
  functions: string[];
  components: string[];
  loc: number;
}

export class IndexerService {
  constructor(private repo: IAppRepository) {}

  /**
   * Scans workspace directories and parses code files to generate structured index metadata
   */
  public async scanWorkspace(): Promise<{ files: ParsedFile[]; totalFiles: number; totalLoc: number }> {
    const fileList: string[] = [];
    this.walkDir(process.cwd(), fileList);

    const parsedFiles: ParsedFile[] = [];
    let totalLoc = 0;

    for (const filePath of fileList) {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
          const parsed = this.parseCodeFile(content, path.basename(filePath));
          const loc = content.split("\n").length;
          totalLoc += loc;

          parsedFiles.push({
            filePath: path.relative(process.cwd(), filePath),
            fileName: path.basename(filePath),
            ...parsed,
            loc
          });
        }
      } catch (err) {
        console.warn(`Indexer failed to parse file: ${filePath}`, err);
      }
    }

    await this.repo.addSystemLog(
      "success",
      "daemon",
      `High-precision index scanner successfully indexed ${parsedFiles.length} source files (${totalLoc} LOC).`
    );

    return {
      files: parsedFiles,
      totalFiles: parsedFiles.length,
      totalLoc
    };
  }


  /**
   * Recursively walks directory tree excluding common build/dependency targets
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
        if (/\.(ts|tsx|js|jsx|json|css|html)$/.test(file)) {
          fileList.push(filePath);
        }
      }
    }
    return fileList;
  }

  /**
   * Parses standard javascript/typescript code lines to discover structure metadata
   */
  private parseCodeFile(content: string, fileName: string) {
    const lines = content.split("\n");
    const importsSet = new Set<string>();
    const exportsSet = new Set<string>();
    const functionsSet = new Set<string>();
    const componentsSet = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith("//") || line.startsWith("/*") || line.startsWith("*")) continue;

      // 1. Imports
      const importMatch = line.match(/^import\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/);
      if (importMatch) {
        importsSet.add(importMatch[1]);
      }

      // 2. Exports
      const exportMatch = line.match(/^export\s+(?:const|let|function|interface|type|class|enum)\s+([a-zA-Z0-9_]+)/);
      if (exportMatch) {
        const expName = exportMatch[1];
        exportsSet.add(expName);
        if (/^[A-Z]/.test(expName)) {
          componentsSet.add(expName);
        }
      }

      // 3. Functions
      const funcMatch1 = line.match(/function\s+([a-zA-Z0-9_]+)\s*\(/);
      const funcMatch2 = line.match(/(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/);
      if (funcMatch1) {
        const fName = funcMatch1[1];
        functionsSet.add(fName);
        if (/^[A-Z]/.test(fName) && !["App", "Layout", "Page"].includes(fName)) {
          componentsSet.add(fName);
        }
      } else if (funcMatch2) {
        const fName = funcMatch2[1];
        functionsSet.add(fName);
        if (/^[A-Z]/.test(fName)) {
          componentsSet.add(fName);
        }
      }
    }

    return {
      imports: Array.from(importsSet),
      exports: Array.from(exportsSet),
      functions: Array.from(functionsSet),
      components: Array.from(componentsSet)
    };
  }
}
