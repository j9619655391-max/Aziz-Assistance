import fs from "fs";
import path from "path";

/**
 * Durable Local File Storage Abstraction representing production local mount.
 * Resolves to /data/storage by default with safe fallback to the current workspace's 'storage'
 * directory for testing and isolated dev environments.
 */
export class FileStorageService {
  private baseDir: string;

  constructor() {
    // Mapping to /data/storage according to the mandated production guidelines, falling back gracefully to workspace relative storage.
    const productionPath = "/data/storage";
    try {
      if (!fs.existsSync(productionPath)) {
        fs.mkdirSync(productionPath, { recursive: true });
      }
      this.baseDir = productionPath;
    } catch {
      // Fallback for limited permission environments (like development/sandboxes)
      const devPath = path.join(process.cwd(), "data-storage");
      if (!fs.existsSync(devPath)) {
        fs.mkdirSync(devPath, { recursive: true });
      }
      this.baseDir = devPath;
    }
    console.log(`[FileStorageService] Initialized storage engine at: ${this.baseDir}`);
  }

  /**
   * Saves a file given its name and content (as base64 string or binary Buffer)
   */
  public async saveFile(fileName: string, base64Data: string): Promise<string> {
    const safeName = path.basename(fileName);
    const targetPath = path.join(this.baseDir, safeName);
    const buffer = Buffer.from(base64Data, "base64");
    
    await fs.promises.writeFile(targetPath, buffer);
    console.log(`[FileStorageService] File written successfully: ${targetPath} (${buffer.length} bytes)`);
    return targetPath;
  }

  /**
   * Reads a file from storage returning it as base64 string
   */
  public async readFile(fileName: string): Promise<string> {
    const safeName = path.basename(fileName);
    const targetPath = path.join(this.baseDir, safeName);
    
    if (!fs.existsSync(targetPath)) {
      throw new Error(`File not found in storage: ${safeName}`);
    }
    
    const buffer = await fs.promises.readFile(targetPath);
    return buffer.toString("base64");
  }

  /**
   * Deletes a file from storage
   */
  public async deleteFile(fileName: string): Promise<boolean> {
    const safeName = path.basename(fileName);
    const targetPath = path.join(this.baseDir, safeName);
    
    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath);
      console.log(`[FileStorageService] File deleted successfully: ${targetPath}`);
      return true;
    }
    return false;
  }

  /**
   * Lists all filenames currently stored
   */
  public async listFiles(): Promise<string[]> {
    const files = await fs.promises.readdir(this.baseDir);
    return files;
  }
}
