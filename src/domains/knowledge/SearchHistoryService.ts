import { IAppRepository } from "../shared/repository/IRepository";
import { Memory } from "../../types";

export class SearchHistoryService {
  constructor(private repo: IAppRepository) {}

  /**
   * Retrieves all memories
   */
  public async getMemories(): Promise<Memory[]> {
    return this.repo.getMemories();
  }

  /**
   * Adds memory after running security validation and censorship checks
   */
  public async addMemory(type: string, content: string): Promise<Memory> {
    // Security Check: Block passwords, private keys, financial info
    const lowercaseContent = content.toLowerCase();
    const hasSensitiveKeywords = ["password", "private_key", "secret_key", "credit_card", "cvv", "otp", "financial", "stripe_key"];
    const isDangerous = hasSensitiveKeywords.some(keyword => lowercaseContent.includes(keyword));

    if (isDangerous) {
      await this.repo.addSystemLog("error", "database", `REJECTED insecure memory [${type}] content containing sensitive credentials/keys.`);
      throw new Error("Security Violation: OpenClaw Memory Rules strictly forbid storing passwords, credentials, OTPs, or financial secrets in memories.");
    }

    const censoredContent = this.censorSensitiveData(content);

    const memory = await this.repo.addMemory({
      type,
      content: censoredContent
    });

    await this.repo.addSystemLog(
      "success",
      "database",
      `Added state memory context [${type.toUpperCase()}]: "${censoredContent.substring(0, 45)}${censoredContent.length > 45 ? "..." : ""}"`
    );

    return memory;
  }

  /**
   * Deletes memory by ID
   */
  public async deleteMemory(id: string): Promise<boolean> {
    const memories = await this.repo.getMemories();
    const target = memories.find(m => m.id === id);
    const success = await this.repo.deleteMemory(id);

    if (success && target) {
      await this.repo.addSystemLog(
        "warn",
        "database",
        `Deleted state memory ID ${id} [${target.type.toUpperCase()}]: "${target.content.substring(0, 30)}..."`
      );
    } else {
      await this.repo.addSystemLog("info", "database", `Delete memory requested for non-existent ID: ${id}`);
    }

    return success;
  }


  /**
   * Censors sensitive patterns like passwords or api keys
   */
  private censorSensitiveData(text: string): string {
    const passwordRegex = /(pass|password|pwd|secret|key|token|auth|credential|api[-_]?key)([\s:=]+)(["']?[a-zA-Z0-9_\-\.\/]+["']?)/gi;
    return text.replace(passwordRegex, (match, p1, p2, p3) => {
      return `${p1}${p2}"[REDACTED_SENSITIVE_DATA]"`;
    });
  }
}
