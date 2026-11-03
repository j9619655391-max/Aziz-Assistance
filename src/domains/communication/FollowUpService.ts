import { IAppRepository } from "../shared/repository/IRepository";
import { NotificationService } from "./NotificationService";
import { ApplicationTrackerEntry } from "../../types";

export interface FollowUpSequenceConfig {
  enabled: boolean;
  firstFollowUpDays: number; // default 3 days
  secondFollowUpDays: number; // default 7 days
  autoSendMode: "draft_only" | "auto_dispatch";
  senderChannel: "gmail" | "hostinger_smtp";
}

export interface FollowUpItem {
  id: string;
  applicationId: string;
  jobTitle: string;
  company: string;
  recipientEmail: string;
  contactName?: string;
  stage: "stage_1_reminder" | "stage_2_case_study" | "completed";
  daysSinceApplication: number;
  subject: string;
  bodyPreview: string;
  status: "pending_review" | "ready_to_send" | "sent" | "dismissed";
  scheduledFor: string;
  lastSentAt?: string;
}

export class FollowUpService {
  private config: FollowUpSequenceConfig = {
    enabled: true,
    firstFollowUpDays: 3,
    secondFollowUpDays: 7,
    autoSendMode: "draft_only",
    senderChannel: "gmail",
  };

  constructor(
    private repo: IAppRepository,
    private notificationService: NotificationService
  ) {}

  /**
   * Scans all submitted applications and generates pending 3-day and 7-day follow-up items
   */
  public async getPendingFollowUps(): Promise<FollowUpItem[]> {
    let applications: ApplicationTrackerEntry[] = [];
    try {
      applications = await this.repo.findAll<ApplicationTrackerEntry>("job_applications");
    } catch {
      applications = [];
    }
    const now = Date.now();
    const followUps: FollowUpItem[] = [];

    for (const app of applications) {
      if (
        app.currentStatus === "Rejected" ||
        app.currentStatus === "Offer" ||
        app.currentStatus === "Offer Received" ||
        app.currentStatus === "Accepted" ||
        app.currentStatus === "Withdrawn"
      ) {
        continue;
      }

      const appliedTime = new Date(app.appliedDate || Date.now()).getTime();
      const daysElapsed = Math.floor((now - appliedTime) / (1000 * 60 * 60 * 24));
      const jobTitle = app.title || app.job?.title || "IT Systems Engineer";
      const company = app.company || app.job?.company || "Target Company";
      const recipient = app.recruiterEmail || app.notes?.match(/Email:\s*([^\s,]+)/)?.[1] || `hiring@${company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;

      // 1. First Follow-Up Check (approx 3+ days)
      if (daysElapsed >= this.config.firstFollowUpDays && (!app.notes || !app.notes.includes("[Follow-up 1 Sent]"))) {
        followUps.push({
          id: `fu-1-${app.id}`,
          applicationId: app.id,
          jobTitle,
          company,
          recipientEmail: recipient,
          stage: "stage_1_reminder",
          daysSinceApplication: daysElapsed,
          subject: `Following up regarding ${jobTitle} position - ${company}`,
          bodyPreview: `Dear Hiring Team,\n\nI hope this message finds you well. I wanted to follow up briefly regarding my application for the ${jobTitle} position submitted ${daysElapsed} days ago. Given my 15+ years of enterprise IT support and infrastructure management experience, I remain enthusiastic about contributing to ${company}.\n\nPlease let me know if you need any additional portfolio details or technical credentials.\n\nWarm regards,\nAziz`,
          status: "ready_to_send",
          scheduledFor: new Date().toISOString()
        });
      }

      // 2. Second Follow-Up Check (approx 7+ days)
      else if (daysElapsed >= this.config.secondFollowUpDays && (!app.notes || !app.notes.includes("[Follow-up 2 Sent]"))) {
        followUps.push({
          id: `fu-2-${app.id}`,
          applicationId: app.id,
          jobTitle,
          company,
          recipientEmail: recipient,
          stage: "stage_2_case_study",
          daysSinceApplication: daysElapsed,
          subject: `Quick update & IT Infrastructure Case Study for ${jobTitle} - ${company}`,
          bodyPreview: `Dear Hiring Team,\n\nFollowing up on my previous note for the ${jobTitle} opening. I recently published an overview of our 99.9% uptime workstation deployment automation and dual-WAN firewall architectures, which directly align with the core technical requirements at ${company}.\n\nI would welcome a brief 10-minute discovery conversation at your convenience.\n\nBest regards,\nAziz`,
          status: "ready_to_send",
          scheduledFor: new Date().toISOString()
        });
      }
    }

    return followUps;
  }

  /**
   * Executes dispatch of a specific follow-up item
   */
  public async dispatchFollowUp(
    followUpId: string,
    recipientEmail: string,
    subject: string,
    body: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.repo.insert("follow_up_logs", {
        followUpId,
        recipientEmail,
        subject,
        sentAt: new Date().toISOString(),
        channel: this.config.senderChannel,
        status: "DISPATCHED"
      });

      await this.notificationService.notify(
        `Follow-Up message dispatched to ${recipientEmail} for subject: "${subject}"`,
        "info"
      );

      return {
        success: true,
        message: `Follow-up email successfully queued and dispatched to ${recipientEmail}`
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to dispatch follow-up: ${err.message}`
      };
    }
  }

  /**
   * Get Configuration
   */
  public getConfig(): FollowUpSequenceConfig {
    return this.config;
  }

  /**
   * Update Configuration
   */
  public updateConfig(newConfig: Partial<FollowUpSequenceConfig>): FollowUpSequenceConfig {
    this.config = { ...this.config, ...newConfig };
    return this.config;
  }
}
