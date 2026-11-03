import fs from "fs";
import path from "path";
import { IAppRepository } from "../shared/repository/IRepository";

export interface TerminalExecutionResult {
  securityRequired?: boolean;
  threatType?: string;
  message?: string;
  output?: string;
  status?: string;
}

export class TerminalService {
  constructor(private repo: IAppRepository) {}

  /**
   * Executes a simulated DevOps command within our sandboxed container environment with strict security policies
   */
  public async executeCommand(command: string): Promise<TerminalExecutionResult> {
    const trimmedCmd = command.trim();

    // Guard rules check
    const dangerousCommands = [
      { pattern: /\brm\b\s+-(?:rf|fr|r)\b/, name: "rm -rf (Recursive Directory Deletion)" },
      { pattern: /\bsudo\b/, name: "sudo (Superuser Execution)" },
      { pattern: /\b(?:mkfs|fdisk|parted|dd)\b/, name: "disk formatting / partitioning" },
      { pattern: /\b(?:shutdown|reboot|poweroff)\b/, name: "system power actions" },
      { pattern: />\s*\/dev\/(?:sd[a-z]|hd[a-z]|nvme\d+n\d+)/, name: "direct raw disk write" }
    ];

    for (const dangerous of dangerousCommands) {
      if (dangerous.pattern.test(trimmedCmd)) {
        await this.repo.addSystemLog("warn", "security", `DevOps Command Intercepted (High Risk): "${trimmedCmd}" (Type: ${dangerous.name})`);
        return {
          securityRequired: true,
          threatType: dangerous.name,
          message: `High risk command detected: '${trimmedCmd}'. OpenClaw terminal policies require multi-factor manual verification for executing '${dangerous.name}' operations.`
        };
      }
    }

    const cmdLower = trimmedCmd.toLowerCase();
    let output = "";
    let status = "success";

    if (cmdLower === "help") {
      output = `Aziz Assistant Secure DevOps Terminal - Command List:
- help                       Show this help menu
- status                     Show assistant and container environment status
- audit                      Run a repository security and vulnerability scan
- list-memories              Display memories stored in the AI brain
- system-info                Retrieve system utilization metrics (RAM, Uptime, CPU load)
- lsof                       List open files and network bindings
- iptables                   Display simulated firewall configuration
- docker ps                  Display active simulated containers
- kubectl get pods           List active Kubernetes pod states
- terraform plan             Show infrastructure-as-code matching states
- env                        Display safe sanitized workspace environment variables
- cat <filename>             View file content securely (readonly)
- ls                         List files in the current workspace directory`;
    } else if (cmdLower === "status") {
      output = `Aziz Assistant Status: ACTIVE
Security Hardening: MAXIMUM
Authentication Status: VERIFIED (Least-privilege role)
Active Workspace: /workspace
Firewall Policy: STRICT (Port 3000 only)
HMR Watcher: DISABLED (Optimized for agent execution)
Container Engine: Cloud Run Sandbox v3.4.1`;
    } else if (cmdLower === "system-info") {
      const uptimeHrs = (Math.random() * 24).toFixed(2);
      const ramPercent = Math.floor(Math.random() * 20) + 15; // 15-35%
      output = `System Utilization Metrics:
----------------------------
Uptime: ${uptimeHrs} hours
Memory Usage: ${ramPercent}% (Total 4.0 GB / Available 3.2 GB)
CPU Load: 0.04, 0.02, 0.01 (Core active)
Disk Space: /workspace: 12% utilized (18GB available)
Least Privilege Enforcement: OK`;
    } else if (cmdLower === "list-memories") {
      const memories = await this.repo.getMemories();
      output = `Current Memorized Contexts:\n` + memories.map((m, i) => `${i+1}. [${m.type.toUpperCase()}] ${m.content}`).join("\n");
    } else if (cmdLower === "ls") {
      try {
        const files = fs.readdirSync(process.cwd());
        output = files.map(file => {
          const stats = fs.statSync(path.join(process.cwd(), file));
          const mode = (stats.mode & parseInt("777", 8)).toString(8);
          return `${stats.isDirectory() ? "d" : "-"}rwxr-xr-x  ${stats.size.toString().padStart(6)} B  chmod ${mode}  ${file}`;
        }).join("\n");
      } catch (e: any) {
        output = `Error listing files: ${e.message}`;
        status = "error";
      }
    } else if (cmdLower.startsWith("cat ")) {
      const targetFile = trimmedCmd.substring(4).trim();
      if (targetFile.includes("..") || targetFile.startsWith("/")) {
        output = "Security Error: Traversal or absolute paths strictly blocked by Aziz Assistant secure file sandbox.";
        status = "error";
      } else {
        try {
          const fullPath = path.join(process.cwd(), targetFile);
          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            const content = fs.readFileSync(fullPath, "utf-8");
            output = this.censorSensitiveData(content);
          } else {
            output = `Error: File '${targetFile}' does not exist or is a directory.`;
            status = "error";
          }
        } catch (e: any) {
          output = `Error reading file: ${e.message}`;
          status = "error";
        }
      }
    } else if (cmdLower === "iptables") {
      output = `Simulated Security Firewall Rules (iptables -L -n):
Chain INPUT (policy DROP)
target     prot opt source               destination         
ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:3000 state NEW,ESTABLISHED
ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            state RELATED,ESTABLISHED

Chain FORWARD (policy DROP)

Chain OUTPUT (policy ACCEPT)
ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp spt:3000 state ESTABLISHED`;
    } else if (cmdLower === "lsof") {
      output = `Simulated Network Connection Port Bindings:
COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node      3000 root   12u  IPv4  20485      0t0  TCP *:3000 (LISTEN)
nginx     3000 root    6u  IPv4  20486      0t0  TCP 127.0.0.1:3000->127.0.0.1:44321 (ESTABLISHED)`;
    } else if (cmdLower === "docker ps" || cmdLower === "docker") {
      output = `CONTAINER ID   IMAGE                  COMMAND                  CREATED         STATUS         PORTS                    NAMES
8df92a7402a1   node:20-alpine         "docker-entrypoint.s…"   2 hours ago     Up 2 hours     0.0.0.0:3000->3000/tcp   aziz-assistant-backend
4fa1d7c0f135   redis:7.2-alpine       "docker-entrypoint.s…"   2 hours ago     Up 2 hours     6379/tcp                 aziz-assistant-cache`;
    } else if (cmdLower === "kubectl get pods" || cmdLower.startsWith("kubectl")) {
      output = `NAME                                        READY   STATUS    RESTARTS   AGE
aziz-assistant-deployment-85947bcfd-fgh8s   1/1     Running   0          4h12m
aziz-assistant-deployment-85947bcfd-zklmn   1/1     Running   0          4h12m
aziz-postgres-statefulset-0                 1/1     Running   0          18d`;
    } else if (cmdLower === "terraform plan" || cmdLower.startsWith("terraform")) {
      output = `Terraform used the selected providers to generate the following execution plan:
No changes. Your infrastructure matches the configuration.
Terraform has compared your real infrastructure against your configuration and found no differences.`;
    } else if (cmdLower === "env") {
      output = `USER=aziz
HOME=/home/aziz
SHELL=/bin/bash
PLATFORM=AI_Studio_Cloud_Run
WORKSPACE_SECURE_GUARD=ACTIVE
GEMINI_MODEL=gemini-3.5-flash
SYSTEM_PORT=3000
FIREWALL_STATE=ENFORCED
DB_ADAPTER=in-memory-state-sync`;
    } else if (cmdLower === "audit") {
      // Handled at the router level by redirecting to audit
      return { status: "redirect" };
    } else {
      output = `$ ${trimmedCmd}\nCommand run simulation successfully. (Executed securely in sandboxed environment)`;
    }

    await this.repo.addSystemLog(
      status === "error" ? "error" : "info",
      "security",
      `DevOps Command Executed: "${trimmedCmd}" (Status: ${status.toUpperCase()})`
    );

    return { output, status };
  }


  /**
   * Censors credentials and keys
   */
  private censorSensitiveData(text: string): string {
    const passwordRegex = /(pass|password|pwd|secret|key|token|auth|credential|api[-_]?key)([\s:=]+)(["']?[a-zA-Z0-9_\-\.\/]+["']?)/gi;
    return text.replace(passwordRegex, (match, p1, p2, p3) => {
      return `${p1}${p2}"[REDACTED_SENSITIVE_DATA]"`;
    });
  }
}
