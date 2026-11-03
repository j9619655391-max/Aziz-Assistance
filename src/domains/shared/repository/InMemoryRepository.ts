import { JobProfile, FreelanceProfile, RecruiterContact, Memory, FreelanceGig } from "../../../types";
import { IAppRepository } from "./IRepository";
import { RepositoryHealth, SystemLog, HostingerConfig, TelegramConfig, GmailSession, ScanLog, MetricEntry } from "./types";
import { INITIAL_RECRUITER_CONTACTS, INITIAL_SAMPLE_GIGS } from "../../../data/seedData";

// Re-export the types so we do not break any existing imports in other services
export type { SystemLog, HostingerConfig, TelegramConfig, GmailSession, ScanLog, MetricEntry };

export class InMemoryRepository implements IAppRepository {
  private isInitialized = true;

  private memories: Memory[] = [
    { id: "1", type: "preference", content: "Preferred Language: TypeScript (strict type safety)", timestamp: new Date().toISOString() },
    { id: "2", type: "style", content: "Coding Style: Production-quality, clean, minimal comments, no deprecated libraries", timestamp: new Date().toISOString() },
    { id: "3", type: "context", content: "Project Context: React 19 + Express full-stack running in Cloud Run", timestamp: new Date().toISOString() },
    { id: "4", type: "security", content: "System Hardening Level: MAXIMUM (Least privilege access enabled)", timestamp: new Date().toISOString() }
  ];

  private jobProfile: JobProfile & { currentRole?: string } = {
    currentRole: "Assistant Manager – Hardware & IT Support",
    experienceYears: 15,
    resume: "Result-driven Enterprise IT professional with over 15 years of deep expertise in Hardware, Desktop Support, Infrastructure, and Systems Administration. Currently serving as Assistant Manager – Hardware & IT Support. Highly competent in architecting and deploying dual-WAN routers, network firewalls, Active Directory domains, Microsoft 365 migrations, rack server hardware (including RAID, NAS configurations), and custom backup/troubleshooting. Actively leveraging modern AI agents, Python automation tooling, open-source LLMs, and containerized workflows to maximize infrastructure reliability and optimize remote support procedures.",
    preferredCountries: ["India", "USA", "Canada", "Germany", "Singapore", "UK", "Australia", "New Zealand", "Netherlands", "Ireland", "UAE", "Saudi Arabia", "Qatar", "Oman", "Kuwait", "Bahrain"],
    skills: [
      "Windows 10/11", "Windows Server", "Active Directory", "Group Policy", "DNS", "DHCP", "RDS", "Hyper-V",
      "Microsoft 365", "Exchange Online", "Outlook", "Teams", "OneDrive", "SharePoint",
      "IT Infrastructure", "Enterprise Desktop Support", "Server Installation", "Hardware Troubleshooting", "Storage", "RAID", "NAS", "Backup", "Printer", "CCTV", "Wi-Fi Deployment",
      "Cisco", "MikroTik", "Ubiquiti", "UniFi", "VPN", "Firewall", "RADIUS", "TACACS",
      "Ubuntu", "Rocky Linux", "Docker (Working Knowledge)",
      "Azure (Working Knowledge)", "AWS (Working Knowledge)",
      "AI-assisted IT automation", "Python (Working Knowledge)", "Laravel/PHP (Working Knowledge)", "Docker", "Open-source LLMs", "AI Agent workflows",
      "Hardware Support", "Network Administration", "Firewalls", "Desktop Support", "Server Administration", "OS Deployment", "Workstations", "Troubleshooting", "AI-Assisted Development"
    ],
    visaPreference: "No Sponsorship Needed"
  };

  private freelanceProfile: FreelanceProfile & { fewShotExamples?: Array<{ id: string; gigTitle: string; pitchText: string; addedAt: string }> } = {
    hourlyRate: 50,
    offerings: ["Computer Hardware & Workstation Setup", "Server Administration & OS Deployment", "Network Basics & Firewall Installation", "AI-Assisted Scripting & Automation"],
    portfolioUrl: "https://github.com/aziz-dev",
    customPitchPrompt: "Highlight hands-on reliability in setting up laptops, desktops, and firewalls, and explain how I leverage AI Agents to rapidly deliver custom backend scripting and automation safely.",
    projects: [
      {
        id: "proj-1",
        title: "Active Directory & Dual-WAN Router Deployments",
        techStack: ["Network Administration", "Firewalls", "Active Directory", "Server Administration"],
        description: "Implemented a local server domain controller with failover DNS, basic firewall traffic filtering, and configured workstations/laptops for 45 active local users.",
        projectUrl: ""
      },
      {
        id: "proj-2",
        title: "Automated Backup and Storage Syncer (AI-assisted)",
        techStack: ["Troubleshooting", "Docker (AI-assisted)", "AI-Assisted Development", "OS Deployment"],
        description: "Deployed localized backup software across workstation fleets. Co-developed a custom Python data backup synchronization script in record time with help from an AI coding assistant.",
        projectUrl: ""
      }
    ],
    fewShotExamples: [
      {
        id: "ex-1",
        gigTitle: "Office Network Setup & Firewall Routing",
        pitchText: "Hello! I saw your requirement for configuring the office dual-WAN networks and firewall configurations. I have hands-on experience deploying Fortinet, Sophos, and Ubiquiti switches/gateways. In a similar contract, I completed the setup of redundant internet links and restricted VLAN networks for a 35-workstation office in under 5 business days, ensuring zero packet loss and configuring local security guidelines. I can help streamline your workstation setup and ensure secure internet traffic. Let's chat to map your topology. Best regards, Aziz",
        addedAt: new Date(Date.now() - 500 * 3600 * 1000).toISOString()
      },
      {
        id: "ex-2",
        gigTitle: "Windows Server AD & Workstation Provisioning",
        pitchText: "Hello, I can assist with provisioning your corporate workstation fleet and setting up Active Directory policies. I specialize in deploying automated Windows images via WDS, configuring group policies for strict access controls, and establishing local automated network backups. For my previous client, I successfully imaged and joined 45 laptops to their local AD domain controller in 3 days. I also co-developed a lightweight Python syncer script for local storage file backup. Let's discuss your hardware and domain controller needs. Best regards, Aziz",
        addedAt: new Date(Date.now() - 200 * 3600 * 1000).toISOString()
      }
    ]
  };

  private sampleGigs: FreelanceGig[] = [...INITIAL_SAMPLE_GIGS];

  private recruiterContacts: RecruiterContact[] = [...INITIAL_RECRUITER_CONTACTS];

  private systemLogs: SystemLog[] = [
    { id: "1", timestamp: new Date(Date.now() - 50000).toISOString(), level: "success", type: "daemon", message: "Aziz Assistant Daemon system loaded successfully" },
    { id: "2", timestamp: new Date(Date.now() - 40000).toISOString(), level: "info", type: "security", message: "Active DevOps Posture Auditing service initialized" },
    { id: "3", timestamp: new Date(Date.now() - 30000).toISOString(), level: "info", type: "database", message: "In-memory state memories database synchronized" }
  ];

  private hostingerConfig: HostingerConfig = {
    smtpHost: "smtp.hostinger.com",
    smtpPort: 465,
    secure: true,
    username: "info@aaditechs.in",
    emailFrom: "info@aaditechs.in",
    smtpUser: "info@aaditechs.in",
    brandName: "Aaditech Solution",
    websiteUrl: "aaditechs.in",
    notificationTriggerEmail: "shaikhaziz267@hotmail.com",
    smtpPassword: "",
    hasPassword: false,
    isConfigured: false,
    lastTriggerStatus: "Idle"
  };

  private telegramConfig: TelegramConfig = {
    botToken: "",
    chatId: "",
    enabled: false,
    autoAlertOnScrape: true,
    autoAlertOnHighMatch: true,
    autoAlertOnRecruiterFollowup: true,
    minMatchScore: 80,
    botUsername: "",
    lastStatus: "Idle",
    lastCheckedAt: ""
  };

  private activeGmailSessions: Record<string, GmailSession> = {};

  private backgroundScanLogs: ScanLog[] = [];

  private dynamicCollections: Record<string, any[]> = {};

  private metricsStore: Record<string, MetricEntry> = {
    "/api/jobs": { requests: 0, latencySamples: [], avgLatency: 0, errors: 0 },
    "/api/freelance/gigs": { requests: 0, latencySamples: [], avgLatency: 0, errors: 0 },
    "/api/chat": { requests: 0, latencySamples: [], avgLatency: 0, errors: 0 }
  };

  public async initialize(): Promise<void> {
    this.isInitialized = true;
  }

  public async shutdown(): Promise<void> {
    this.isInitialized = false;
  }

  public async health(): Promise<RepositoryHealth> {
    return {
      status: this.isInitialized ? "healthy" : "unhealthy",
      message: "InMemory repository fully operational.",
      latencyMs: 1,
      lastCheck: new Date().toISOString()
    };
  }

  // --- Generic, collection-based persistence methods ---
  public async findById<T = any>(collectionName: string, id: string): Promise<T | null> {
    const list = await this.findAll<T>(collectionName);
    return list.find((item: any) => item.id === id) || null;
  }

  public async findAll<T = any>(collectionName: string): Promise<T[]> {
    switch (collectionName.toLowerCase()) {
      case "memories":
        return this.memories as any;
      case "gigs":
      case "samplegigs":
        return this.sampleGigs as any;
      case "recruitercontacts":
        return this.recruiterContacts as any;
      case "systemlogs":
        return this.systemLogs as any;
      case "scanlogs":
      case "backgroundscanlogs":
        return this.backgroundScanLogs as any;
      default: {
        const key = collectionName.toLowerCase();
        if (!this.dynamicCollections[key]) {
          this.dynamicCollections[key] = [];
        }
        return this.dynamicCollections[key] as any;
      }
    }
  }

  public async search<T = any>(collectionName: string, query: string): Promise<T[]> {
    const list = await this.findAll<T>(collectionName);
    const q = query.toLowerCase();
    return list.filter((item: any) => {
      const content = JSON.stringify(item).toLowerCase();
      return content.includes(q);
    });
  }

  public async insert<T = any>(collectionName: string, item: any): Promise<T> {
    const list = await this.findAll<any>(collectionName);
    const newItem = {
      id: item.id || Math.random().toString(36).substring(2, 9),
      timestamp: item.timestamp || new Date().toISOString(),
      ...item
    };
    list.push(newItem);
    return newItem as T;
  }

  public async update<T = any>(collectionName: string, id: string, item: any): Promise<T> {
    const list = await this.findAll<any>(collectionName);
    const idx = list.findIndex((x: any) => x.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...item };
      return list[idx] as T;
    }
    throw new Error(`Item with id ${id} not found in collection ${collectionName}`);
  }

  public async delete(collectionName: string, id: string): Promise<boolean> {
    const list = await this.findAll<any>(collectionName);
    const idx = list.findIndex((x: any) => x.id === id);
    if (idx !== -1) {
      list.splice(idx, 1);
      return true;
    }
    return false;
  }

  public async count(collectionName: string): Promise<number> {
    const list = await this.findAll<any>(collectionName);
    return list.length;
  }

  public async exists(collectionName: string, id: string): Promise<boolean> {
    const list = await this.findAll<any>(collectionName);
    return list.some((x: any) => x.id === id);
  }

  // --- Memories DAO ---
  public async getMemories(): Promise<Memory[]> {
    return this.memories;
  }

  public async addMemory(memory: Omit<Memory, "id" | "timestamp">): Promise<Memory> {
    const newMem: Memory = {
      ...memory,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString()
    };
    this.memories.push(newMem);
    return newMem;
  }

  public async deleteMemory(id: string): Promise<boolean> {
    const index = this.memories.findIndex(m => m.id === id);
    if (index !== -1) {
      this.memories.splice(index, 1);
      return true;
    }
    return false;
  }

  // --- Job Profile DAO ---
  public async getJobProfile(): Promise<JobProfile & { currentRole?: string }> {
    return this.jobProfile;
  }

  public async updateJobProfile(profile: Partial<JobProfile & { currentRole?: string }>): Promise<JobProfile & { currentRole?: string }> {
    this.jobProfile = {
      ...this.jobProfile,
      ...profile
    };
    return this.jobProfile;
  }

  // --- Freelance Profile DAO ---
  public async getFreelanceProfile(): Promise<FreelanceProfile & { fewShotExamples?: Array<{ id: string; gigTitle: string; pitchText: string; addedAt: string }> }> {
    return this.freelanceProfile;
  }

  public async updateFreelanceProfile(profile: Partial<FreelanceProfile>): Promise<FreelanceProfile> {
    this.freelanceProfile = {
      ...this.freelanceProfile,
      ...profile
    };
    return this.freelanceProfile;
  }

  public async addFewShotExample(example: { gigTitle: string; pitchText: string }): Promise<any> {
    if (!this.freelanceProfile.fewShotExamples) {
      this.freelanceProfile.fewShotExamples = [];
    }
    const newEx = {
      id: Math.random().toString(36).substring(2, 9),
      gigTitle: example.gigTitle,
      pitchText: example.pitchText,
      addedAt: new Date().toISOString()
    };
    this.freelanceProfile.fewShotExamples.push(newEx);
    return newEx;
  }

  public async deleteFewShotExample(id: string): Promise<boolean> {
    if (!this.freelanceProfile.fewShotExamples) return false;
    const initialLen = this.freelanceProfile.fewShotExamples.length;
    this.freelanceProfile.fewShotExamples = this.freelanceProfile.fewShotExamples.filter(ex => ex.id !== id);
    return this.freelanceProfile.fewShotExamples.length < initialLen;
  }

  // --- Sample Gigs DAO ---
  public async getSampleGigs(): Promise<FreelanceGig[]> {
    return this.sampleGigs;
  }

  public async findGigById(id: string): Promise<FreelanceGig | undefined> {
    return this.sampleGigs.find(g => g.id === id);
  }

  // --- Recruiter Contacts DAO ---
  public async getRecruiterContacts(): Promise<RecruiterContact[]> {
    return this.recruiterContacts;
  }

  public async addRecruiterContact(contact: Omit<RecruiterContact, "id" | "dateAdded">): Promise<RecruiterContact> {
    const newContact: RecruiterContact = {
      ...contact,
      id: `rec-${Math.random().toString(36).substring(2, 9)}`,
      dateAdded: new Date().toISOString()
    };
    this.recruiterContacts.push(newContact);
    return newContact;
  }

  public async deleteRecruiterContact(id: string): Promise<boolean> {
    const index = this.recruiterContacts.findIndex(r => r.id === id);
    if (index !== -1) {
      this.recruiterContacts.splice(index, 1);
      return true;
    }
    return false;
  }

  // --- System Logs DAO ---
  public async getSystemLogs(): Promise<SystemLog[]> {
    return this.systemLogs;
  }

  public async addSystemLog(level: "info" | "warn" | "error" | "success", type: "api" | "security" | "daemon" | "database" | "ai", message: string): Promise<void> {
    this.systemLogs.unshift({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      level,
      type,
      message
    });
    if (this.systemLogs.length > 150) {
      this.systemLogs = this.systemLogs.slice(0, 150);
    }
  }

  // --- Hostinger Config DAO ---
  public async getHostingerConfig(): Promise<HostingerConfig> {
    const user = this.hostingerConfig.smtpUser || this.hostingerConfig.username || this.hostingerConfig.emailFrom || "info@aaditechs.in";
    const hasPassword = Boolean(this.hostingerConfig.smtpPassword && this.hostingerConfig.smtpPassword.length > 0);
    const isConfigured = Boolean(this.hostingerConfig.smtpHost && user && hasPassword);
    return {
      ...this.hostingerConfig,
      username: user,
      emailFrom: user,
      smtpUser: user,
      hasPassword,
      isConfigured: this.hostingerConfig.isConfigured !== undefined ? this.hostingerConfig.isConfigured : isConfigured
    };
  }

  public async updateHostingerConfig(config: Partial<HostingerConfig>): Promise<HostingerConfig> {
    const user = config.smtpUser || config.username || config.emailFrom || this.hostingerConfig.smtpUser || this.hostingerConfig.username || "info@aaditechs.in";
    let password = config.smtpPassword;
    if (!password || password === "••••••••" || password.trim() === "") {
      password = this.hostingerConfig.smtpPassword || "";
    }
    const hasPassword = Boolean(password && password.length > 0);
    const isConfigured = Boolean((config.smtpHost || this.hostingerConfig.smtpHost) && user && hasPassword);

    this.hostingerConfig = {
      ...this.hostingerConfig,
      ...config,
      smtpHost: config.smtpHost || this.hostingerConfig.smtpHost || "smtp.hostinger.com",
      smtpPort: config.smtpPort || this.hostingerConfig.smtpPort || 465,
      username: user,
      emailFrom: user,
      smtpUser: user,
      smtpPassword: password,
      brandName: config.brandName || this.hostingerConfig.brandName || "Aaditech Solution",
      websiteUrl: config.websiteUrl || this.hostingerConfig.websiteUrl || "aaditechs.in",
      notificationTriggerEmail: config.notificationTriggerEmail || this.hostingerConfig.notificationTriggerEmail || "shaikhaziz267@hotmail.com",
      hasPassword,
      isConfigured,
      lastTriggerStatus: config.lastTriggerStatus || (isConfigured ? "Authenticated" : "Idle")
    };
    return this.hostingerConfig;
  }

  // --- Telegram Config DAO ---
  public async getTelegramConfig(): Promise<TelegramConfig> {
    return { ...this.telegramConfig };
  }

  public async updateTelegramConfig(config: Partial<TelegramConfig>): Promise<TelegramConfig> {
    this.telegramConfig = {
      ...this.telegramConfig,
      ...config,
      enabled: config.enabled !== undefined ? config.enabled : (Boolean(config.botToken || this.telegramConfig.botToken) && Boolean(config.chatId || this.telegramConfig.chatId))
    };
    return { ...this.telegramConfig };
  }

  // --- Gmail Sessions DAO ---
  public async getGmailSession(userId: string): Promise<GmailSession | undefined> {
    return this.activeGmailSessions[userId];
  }

  public async setGmailSession(userId: string, session: GmailSession): Promise<void> {
    this.activeGmailSessions[userId] = session;
  }

  public async clearGmailSession(userId: string): Promise<void> {
    delete this.activeGmailSessions[userId];
  }

  // --- Background Scan Logs DAO ---
  public async getScanLogs(): Promise<ScanLog[]> {
    return this.backgroundScanLogs;
  }

  public async addScanLog(log: Omit<ScanLog, "id" | "timestamp">): Promise<ScanLog> {
    const newLog: ScanLog = {
      ...log,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString()
    };
    this.backgroundScanLogs.unshift(newLog);
    if (this.backgroundScanLogs.length > 100) {
      this.backgroundScanLogs.pop();
    }
    return newLog;
  }

  // --- Metrics DAO ---
  public async getMetrics(): Promise<Record<string, MetricEntry>> {
    return this.metricsStore;
  }

  public async recordMetric(endpoint: string, latencyMs: number, hasError: boolean): Promise<void> {
    if (!this.metricsStore[endpoint]) {
      this.metricsStore[endpoint] = { requests: 0, latencySamples: [], avgLatency: 0, errors: 0 };
    }
    const store = this.metricsStore[endpoint];
    store.requests++;
    if (hasError) store.errors++;
    store.latencySamples.push(latencyMs);
    if (store.latencySamples.length > 50) {
      store.latencySamples.shift();
    }
    const sum = store.latencySamples.reduce((a, b) => a + b, 0);
    store.avgLatency = Math.round(sum / Math.max(1, store.latencySamples.length));
  }
}
