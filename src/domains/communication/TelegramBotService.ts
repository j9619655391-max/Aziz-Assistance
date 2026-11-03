import { IAppRepository } from "../shared/repository/IRepository";
import { TelegramConfig } from "../shared/repository/types";

export interface TelegramTestResult {
  success: boolean;
  message: string;
  botInfo?: any;
  logs: string[];
}

export class TelegramBotService {
  private updateOffset = 0;

  constructor(
    private repo: IAppRepository,
    private getScraperService?: () => any,
    private getJobSearchService?: () => any,
    private getFreelanceService?: () => any
  ) {}

  /**
   * Retrieves active Telegram bot configuration
   */
  public async getConfig(): Promise<TelegramConfig> {
    const raw = await this.repo.getTelegramConfig();
    const envToken = process.env.TELEGRAM_BOT_TOKEN || "";
    const envChatId = process.env.TELEGRAM_CHAT_ID || "";

    const botToken = raw.botToken || envToken;
    const chatId = raw.chatId || envChatId || "9619655391";

    return {
      ...raw,
      botToken,
      chatId,
      enabled: raw.enabled !== undefined ? raw.enabled : true
    };
  }

  /**
   * Updates Telegram bot configuration
   */
  public async updateConfig(partial: Partial<TelegramConfig>): Promise<TelegramConfig> {
    const existing = await this.repo.getTelegramConfig();
    let finalToken = partial.botToken;
    if (!finalToken || finalToken === "••••••••" || finalToken.trim() === "") {
      finalToken = existing.botToken || "";
    }

    const merged = await this.repo.updateTelegramConfig({
      ...partial,
      botToken: finalToken
    });

    await this.repo.addSystemLog(
      "info",
      "api",
      `Telegram Alert Bot settings updated. (Enabled: ${merged.enabled ? "YES" : "NO"})`
    );

    return merged;
  }

  /**
   * Tests connection with Telegram API using getMe and sends a test message to chatId
   */
  public async testConnection(tokenOverride?: string, chatIdOverride?: string): Promise<TelegramTestResult> {
    const logs: string[] = [];
    logs.push(`[${new Date().toLocaleTimeString()}] 🚀 Initiating Telegram Bot API Handshake...`);

    const config = await this.repo.getTelegramConfig();
    const token = tokenOverride || config.botToken;
    const chatId = chatIdOverride || config.chatId;

    if (!token || token.trim() === "") {
      logs.push(`[${new Date().toLocaleTimeString()}] ❌ Failed: Telegram Bot Token is missing.`);
      return {
        success: false,
        message: "Telegram Bot Token is required. Obtain one from @BotFather on Telegram.",
        logs
      };
    }

    try {
      logs.push(`[${new Date().toLocaleTimeString()}] 📡 Querying Telegram getMe endpoint...`);
      const getMeRes = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      const getMeData = await getMeRes.json();
      if (!getMeRes.ok || !getMeData.ok) {
        const errorDesc = getMeData.description || "Invalid Bot Token";
        logs.push(`[${new Date().toLocaleTimeString()}] ❌ Bot authentication failed: ${errorDesc}`);
        await this.repo.updateTelegramConfig({ lastStatus: `Auth Failed: ${errorDesc}` });
        return {
          success: false,
          message: `Telegram Bot authentication failed: ${errorDesc}`,
          logs
        };
      }

      const botInfo = getMeData.result;
      logs.push(`[${new Date().toLocaleTimeString()}] 🤖 Bot Identified: @${botInfo.username} (${botInfo.first_name})`);

      // Update bot username in repository
      await this.repo.updateTelegramConfig({
        botUsername: botInfo.username,
        lastStatus: "Authenticated & Active",
        lastCheckedAt: new Date().toISOString()
      });

      // If chatId is provided, send a verified test notification
      if (chatId && chatId.trim() !== "") {
        logs.push(`[${new Date().toLocaleTimeString()}] 📤 Sending interactive test alert to Chat ID: ${chatId}...`);
        const testHtml = `
🚀 <b>Aziz AI Assistant & Career Dispatcher</b>
━━━━━━━━━━━━━━━━━━━━
✅ <b>Telegram Alert Bot Connected Successfully!</b>

• <b>Bot:</b> @${botInfo.username}
• <b>Timestamp:</b> ${new Date().toLocaleString()}
• <b>Active Channels:</b> Hostinger SMTP (info@aaditechs.in) + Telegram Bot
• <b>Scope:</b> High-Match Jobs (>80%), Scraped Gigs, Recruiter Follow-ups

💡 <i>You can send <code>/status</code>, <code>/jobs</code>, <code>/gigs</code>, or <code>/scrape</code> anytime to interact with your AI Assistant!</i>
`.trim();

        const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: testHtml,
            parse_mode: "HTML",
            disable_web_page_preview: true
          })
        });

        const sendData = await sendRes.json();
        if (!sendRes.ok || !sendData.ok) {
          logs.push(`[${new Date().toLocaleTimeString()}] ⚠️ Handshake succeeded, but message delivery failed: ${sendData.description}`);
          return {
            success: true,
            botInfo,
            message: `Bot authenticated as @${botInfo.username}, but failed to deliver to Chat ID: ${sendData.description}. Ensure you sent /start to the bot first.`,
            logs
          };
        }

        logs.push(`[${new Date().toLocaleTimeString()}] ✉️ Telegram message delivered successfully! (Message ID: ${sendData.result.message_id})`);
      } else {
        logs.push(`[${new Date().toLocaleTimeString()}] ℹ️ No Chat ID provided yet. Send /start to @${botInfo.username} and configure Chat ID.`);
      }

      await this.repo.addSystemLog("success", "api", `Verified Telegram Bot @${botInfo.username}.`);
      return {
        success: true,
        botInfo,
        message: `Telegram Bot @${botInfo.username} is connected and ready to send alerts!`,
        logs
      };
    } catch (err: any) {
      logs.push(`[${new Date().toLocaleTimeString()}] ❌ Network Exception: ${err.message}`);
      return {
        success: false,
        message: `Failed to connect to Telegram: ${err.message}`,
        logs
      };
    }
  }

  /**
   * Sends raw HTML text message to Telegram channel/user
   */
  public async sendTelegramMessage(text: string, parseMode: "HTML" | "Markdown" = "HTML"): Promise<boolean> {
    try {
      const config = await this.repo.getTelegramConfig();
      if (!config.enabled || !config.botToken || !config.chatId) {
        return false;
      }

      const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: config.chatId,
          text,
          parse_mode: parseMode,
          disable_web_page_preview: true
        })
      });

      const data = await res.json();
      return res.ok && data.ok;
    } catch (err) {
      console.warn("[TelegramBotService] Failed to send telegram message:", err);
      return false;
    }
  }

  /**
   * Dispatches a high-match Job alert to Telegram
   */
  public async sendJobAlert(job: any): Promise<boolean> {
    const config = await this.repo.getTelegramConfig();
    if (!config.enabled || !config.autoAlertOnHighMatch) return false;

    const stars = job.matchScore?.stars || "⭐⭐⭐⭐⭐";
    const matchText = job.matchScore?.text || "High Match";
    const salary = job.salary || "Competitive / Market Rate";
    const link = job.originalReference || job.url || "#";

    const text = `
🎯 <b>NEW HIGH-MATCH JOB DISCOVERED!</b>
━━━━━━━━━━━━━━━━━━━━
💼 <b>${job.title}</b>
🏢 <b>Company:</b> ${job.company}
📍 <b>Location:</b> ${job.location || "Remote / Hybrid"}
💰 <b>Salary:</b> <code>${salary}</code>
🎯 <b>Match Rating:</b> ${stars} (${matchText})

🔑 <b>Skills:</b> ${Array.isArray(job.skillsMatched || job.skillsRequired) ? (job.skillsMatched || job.skillsRequired).slice(0, 5).join(", ") : "IT Support, Infrastructure"}
📝 <i>${job.description ? job.description.slice(0, 180) + "..." : ""}</i>

🔗 <a href="${link}"><b>View & Apply Opportunity ➔</b></a>
━━━━━━━━━━━━━━━━━━━━
<i>Aziz AI Autonomous Career Dispatcher</i>
`.trim();

    return this.sendTelegramMessage(text, "HTML");
  }

  /**
   * Dispatches a Freelance Contract Gig alert to Telegram
   */
  public async sendGigAlert(gig: any): Promise<boolean> {
    const config = await this.repo.getTelegramConfig();
    if (!config.enabled || !config.autoAlertOnHighMatch) return false;

    const budget = gig.budget || "Negotiable";
    const platform = gig.platform || "Upwork / Remote";
    const link = gig.originalReference || gig.url || "#";

    const text = `
⚡ <b>NEW FREELANCE CONTRACT OPPORTUNITY!</b>
━━━━━━━━━━━━━━━━━━━━
🛠️ <b>${gig.title}</b>
🌐 <b>Platform:</b> ${platform}
💵 <b>Budget / Rate:</b> <code>${budget}</code>
⏱️ <b>Duration:</b> ${gig.duration || "Flexible"}
⭐ <b>Seniority:</b> ${gig.complexity || "Intermediate"}

🔑 <b>Required Tech:</b> ${Array.isArray(gig.skillsRequired) ? gig.skillsRequired.slice(0, 5).join(", ") : "Docker, Linux, Systems"}
📝 <i>${gig.description ? gig.description.slice(0, 180) + "..." : ""}</i>

🔗 <a href="${link}"><b>Open Contract & Pitch Proposal ➔</b></a>
━━━━━━━━━━━━━━━━━━━━
<i>Aziz AI Freelance Scout Engine</i>
`.trim();

    return this.sendTelegramMessage(text, "HTML");
  }

  /**
   * Dispatches a 3x Daily Scraping Cycle summary to Telegram
   */
  public async sendScrapeSummary(summary: {
    cycleId: string;
    jobsCount: number;
    recruitersCount: number;
    gigsCount: number;
    durationMs: number;
  }): Promise<boolean> {
    const config = await this.repo.getTelegramConfig();
    if (!config.enabled || !config.autoAlertOnScrape) return false;

    const seconds = Math.round(summary.durationMs / 1000);
    const text = `
🔄 <b>3x-DAILY AUTONOMOUS SCRAPING COMPLETED</b>
━━━━━━━━━━━━━━━━━━━━
🆔 <b>Cycle ID:</b> <code>${summary.cycleId}</code>
⏱️ <b>Execution Time:</b> ${seconds}s

📊 <b>Fresh Records Captured:</b>
• 💼 <b>Jobs Discovered:</b> +${summary.jobsCount}
• 👥 <b>Recruiters & HR Leads:</b> +${summary.recruitersCount}
• ⚡ <b>Freelance Contracts:</b> +${summary.gigsCount}

💾 <i>All records deduplicated and persisted to database repository.</i>
━━━━━━━━━━━━━━━━━━━━
<i>Aziz AI Intelligence Platform</i>
`.trim();

    return this.sendTelegramMessage(text, "HTML");
  }

  /**
   * Dispatches a Recruiter Follow-up / Outreach alert to Telegram
   */
  public async sendFollowupAlert(recipientEmail: string, subject: string, notes?: string): Promise<boolean> {
    const config = await this.repo.getTelegramConfig();
    if (!config.enabled || !config.autoAlertOnRecruiterFollowup) return false;

    const text = `
📬 <b>RECRUITER OUTREACH DISPATCHED!</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>Recipient:</b> <code>${recipientEmail}</code>
📄 <b>Subject:</b> ${subject}
🛡️ <b>Sender:</b> info@aaditechs.in (Hostinger SMTP)
${notes ? `📝 <b>Notes:</b> ${notes}\n` : ""}
⏰ <b>Timestamp:</b> ${new Date().toLocaleTimeString()}
━━━━━━━━━━━━━━━━━━━━
<i>Aziz AI Recruiter Workflow Engine</i>
`.trim();

    return this.sendTelegramMessage(text, "HTML");
  }

  /**
   * Processes an incoming 2-way Telegram command message and returns an appropriate reply
   */
  public async processIncomingMessage(message: any): Promise<{ replied: boolean; replyText?: string }> {
    const chatId = message?.chat?.id;
    const text = (message?.text || "").trim();
    if (!chatId || !text) return { replied: false };

    const lower = text.toLowerCase();
    let reply = "";

    if (lower.startsWith("/start") || lower.startsWith("/help")) {
      reply = `
👋 <b>Welcome to Aziz AI Personal Assistant Bot!</b>
━━━━━━━━━━━━━━━━━━━━
I am your automated two-way career, freelance, and infrastructure dispatcher.

<b>Available 2-Way Commands:</b>
📊 <code>/status</code> - Live system status, DB counts & scraper health
💼 <code>/jobs</code> - Top 3 latest verified high-match jobs
⚡ <code>/gigs</code> - Top 3 latest freelance contracts & budgets
🔄 <code>/scrape</code> - Trigger an instant live deep scrape cycle
📬 <code>/outreach</code> - View latest recruiter outreach status
🛡️ <code>/hostinger</code> - Check Hostinger SMTP server status
❓ <code>/help</code> - Show this command menu

<i>Your Telegram Chat ID is:</i> <code>${chatId}</code>
`.trim();
    } else if (lower.startsWith("/status") || lower === "status") {
      const jobsCount = await this.repo.count("scraped_jobs").catch(() => 0);
      const gigsCount = await this.repo.count("scraped_gigs").catch(() => 0);
      const recCount = await this.repo.count("recruiter_contacts").catch(() => 0);
      const hostinger = await this.repo.getHostingerConfig();

      reply = `
📊 <b>AZIZ AI SYSTEM STATUS REPORT</b>
━━━━━━━━━━━━━━━━━━━━
🟢 <b>System Status:</b> Operational & Active
💾 <b>Database Repository:</b> Connected
• <b>Stored Jobs:</b> ${jobsCount} records
• <b>Freelance Gigs:</b> ${gigsCount} contracts
• <b>Recruiter Contacts:</b> ${recCount} leads

📧 <b>Hostinger SMTP:</b>
• <b>Sender:</b> ${hostinger.username || "info@aaditechs.in"}
• <b>Status:</b> ${hostinger.isConfigured ? "Authenticated & Active" : "Missing Password"}
• <b>Recipient:</b> ${hostinger.notificationTriggerEmail || "shaikhaziz267@hotmail.com"}

🤖 <b>Telegram Alert Bot:</b> Connected (Two-Way Active)
⏰ <b>Server Time:</b> ${new Date().toLocaleString()}
`.trim();
    } else if (lower.startsWith("/jobs") || lower === "jobs") {
      const jobs = await this.repo.findAll("scraped_jobs").catch(() => []);
      const topJobs = jobs.slice(-3).reverse();

      if (topJobs.length === 0) {
        reply = `ℹ️ No scraped jobs found in database yet. Send <code>/scrape</code> to discover live jobs!`;
      } else {
        const jobList = topJobs.map((j: any, i: number) => `
${i + 1}. <b>${j.title}</b>
🏢 ${j.company} &bull; 📍 ${j.location || "Remote"}
💰 <code>${j.salary || "Competitive"}</code>
🔗 <a href="${j.originalReference || j.url || "#"}">Apply Link</a>
`).join("\n");

        reply = `
💼 <b>LATEST TOP JOB OPENINGS:</b>
━━━━━━━━━━━━━━━━━━━━
${jobList}
━━━━━━━━━━━━━━━━━━━━
<i>Send <code>/scrape</code> to run an instant fresh search!</i>
`.trim();
      }
    } else if (lower.startsWith("/gigs") || lower === "gigs") {
      const gigs = await this.repo.findAll("scraped_gigs").catch(() => []);
      const topGigs = gigs.slice(-3).reverse();

      if (topGigs.length === 0) {
        reply = `ℹ️ No freelance gigs found in database yet. Send <code>/scrape</code> to search Upwork & remote platforms!`;
      } else {
        const gigList = topGigs.map((g: any, i: number) => `
${i + 1}. <b>${g.title}</b>
🌐 ${g.platform} &bull; 💵 <code>${g.budget || "Negotiable"}</code>
⏱️ ${g.duration || "Flexible"} &bull; 🛠️ ${(g.skillsRequired || []).slice(0, 3).join(", ")}
🔗 <a href="${g.originalReference || g.url || "#"}">View Gig</a>
`).join("\n");

        reply = `
⚡ <b>LATEST FREELANCE CONTRACTS:</b>
━━━━━━━━━━━━━━━━━━━━
${gigList}
━━━━━━━━━━━━━━━━━━━━
<i>Send <code>/scrape</code> to refresh contract leads!</i>
`.trim();
      }
    } else if (lower.startsWith("/scrape") || lower === "scrape") {
      reply = `⏳ <b>Scrape Cycle Initiated!</b> Querying Google Search Grounding across LinkedIn, Indeed, Upwork, and remote job portals... I will report back shortly.`;
      
      // Execute asynchronously
      if (this.getScraperService) {
        const scraper = this.getScraperService();
        if (scraper) {
          setTimeout(async () => {
            try {
              const res = await scraper.executeScrapeCycle("Telegram /scrape Command");
              const summaryMsg = `
✅ <b>Telegram Triggered Scrape Completed!</b>
• Jobs: +${res.jobsScraped}
• Gigs: +${res.gigsScraped}
• Recruiters: +${res.recruitersScraped}
• Duration: ${Math.round(res.durationMs / 1000)}s
`.trim();
              await this.sendTelegramMessage(summaryMsg, "HTML");
            } catch (err: any) {
              await this.sendTelegramMessage(`❌ Scrape failed: ${err.message}`, "HTML");
            }
          }, 100);
        }
      }
    } else if (lower.startsWith("/hostinger") || lower === "hostinger") {
      const hostinger = await this.repo.getHostingerConfig();
      reply = `
📧 <b>HOSTINGER CUSTOM DOMAIN MAIL STATUS</b>
━━━━━━━━━━━━━━━━━━━━
• <b>Domain:</b> ${hostinger.websiteUrl || "aaditechs.in"}
• <b>SMTP Host:</b> ${hostinger.smtpHost}:${hostinger.smtpPort}
• <b>Sender Email:</b> ${hostinger.username || "info@aaditechs.in"}
• <b>Target Digest:</b> ${hostinger.notificationTriggerEmail || "shaikhaziz267@hotmail.com"}
• <b>Status:</b> ${hostinger.isConfigured ? "Authenticated & Active" : "Missing Credentials"}
`.trim();
    } else {
      reply = `
🤖 I received your message: "<i>${text}</i>"

Type <code>/help</code> to see available automated commands (<code>/status</code>, <code>/jobs</code>, <code>/gigs</code>, <code>/scrape</code>).
`.trim();
    }

    const config = await this.repo.getTelegramConfig();
    if (config.botToken) {
      await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: reply,
          parse_mode: "HTML",
          disable_web_page_preview: true
        })
      });
    }

    return { replied: true, replyText: reply };
  }

  /**
   * Polls Telegram for new 2-way incoming messages and processes commands
   */
  public async pollUpdates(): Promise<{ processedCount: number; messages: string[] }> {
    const config = await this.repo.getTelegramConfig();
    if (!config.botToken) {
      return { processedCount: 0, messages: ["Bot token not configured"] };
    }

    const messages: string[] = [];
    try {
      const url = `https://api.telegram.org/bot${config.botToken}/getUpdates?offset=${this.updateOffset}&limit=10&timeout=2`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        return { processedCount: 0, messages: [`Telegram API Error: ${data.description || res.statusText}`] };
      }

      const updates = data.result || [];
      for (const update of updates) {
        this.updateOffset = update.update_id + 1;
        if (update.message) {
          const fromUser = update.message.from?.username || update.message.from?.first_name || "User";
          const msgText = update.message.text || "[Non-text]";
          messages.push(`From @${fromUser}: ${msgText}`);
          await this.processIncomingMessage(update.message);
        }
      }

      return { processedCount: updates.length, messages };
    } catch (err: any) {
      return { processedCount: 0, messages: [`Polling Exception: ${err.message}`] };
    }
  }

  /**
   * Handles incoming Telegram webhook payload
   */
  public async handleWebhook(payload: any): Promise<{ success: boolean; result?: any }> {
    if (payload?.message) {
      const res = await this.processIncomingMessage(payload.message);
      return { success: true, result: res };
    }
    return { success: false, result: "No message in update" };
  }
}
