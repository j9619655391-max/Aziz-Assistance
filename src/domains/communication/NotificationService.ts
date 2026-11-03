import nodemailer from "nodemailer";
import { IAppRepository } from "../shared/repository/IRepository";

export interface HostingerEmailResult {
  success: boolean;
  message: string;
  logs: string[];
}

export class NotificationService {
  constructor(private repo: IAppRepository) {}

  /**
   * General notification logger for automation and supervisor events
   */
  public async notify(message: string, level: "info" | "warn" | "error" | "success" = "info"): Promise<void> {
    await this.repo.addSystemLog(level, "daemon", message);
  }

  /**
   * Transmits a beautifully styled earning digest report using the Gmail API
   */
  public async sendGmailDigest(
    accessToken: string,
    recipientEmail: string,
    matches: any[]
  ): Promise<boolean> {
    try {
      const matchCardsHtml = matches.map((j: any) => `
        <div style="border: 1px solid #1e293b; background-color: #070b13; border-radius: 12px; padding: 20px; margin-bottom: 16px; border-left: 5px solid ${j.isExceptional ? '#10b981' : '#6366f1'}; text-align: left;">
          ${j.isExceptional ? '<span style="background-color: rgba(16,185,129,0.1); color: #10b981; font-size: 9px; font-family: monospace; font-weight: bold; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; display: inline-block; margin-bottom: 10px;">🚨 High-Priority / Exceptional Opportunity</span>' : ''}
          <div style="font-family: monospace; font-size: 11px; color: #818cf8; text-transform: uppercase; margin-bottom: 4px; font-weight: bold;">
            🏢 ${j.company} &bull; ${j.location}
          </div>
          <h3 style="color: #ffffff; font-size: 16px; margin: 4px 0 10px 0; font-family: sans-serif; font-weight: bold;">
            ${j.title}
          </h3>
          
          <div style="background-color: #0d1527; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5;">${j.description}</p>
          </div>

          <div style="margin-bottom: 10px; font-size: 12px;">
            <strong style="color: #cbd5e1;">🎯 Match Rating:</strong> 
            <span style="font-size: 13px;">${j.matchScore?.stars || '⭐⭐⭐⭐'}</span> 
            <span style="color: #38bdf8; font-weight: bold; margin-left: 6px;">(${j.matchScore?.text || 'Good'})</span>
          </div>

          <div style="margin-bottom: 10px; font-size: 12px; color: #cbd5e1;">
            <strong>💼 Why it Matches:</strong> <span style="color: #94a3b8;">${j.matchScore?.reason || ''}</span>
          </div>

          <div style="margin-bottom: 10px; font-size: 12px; color: #cbd5e1;">
            <strong>💰 Income Estimate:</strong> <span style="color: #10b981; font-weight: bold; font-family: monospace;">${j.salary}</span>
          </div>

          <div style="margin-bottom: 12px; font-size: 11px; color: #94a3b8;">
            <strong>🔑 Matched Core Skills:</strong> <span style="color: #818cf8; font-family: monospace;">${j.skillsMatched?.join(", ") || j.matchedSkills?.join(", ")}</span>
          </div>

          <table style="width: 100%; border-top: 1px solid #1e293b; padding-top: 10px; font-size: 11px; color: #64748b; font-family: monospace;">
            <tr>
              <td style="padding: 3px 0;"><strong>Website:</strong> <a href="${j.companyWebsite || '#'}" style="color: #38bdf8; text-decoration: none;">${j.companyWebsite || 'N/A'}</a></td>
              <td style="padding: 3px 0;"><strong>HR Email:</strong> ${j.publicHrEmail || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 3px 0;"><strong>Phone:</strong> ${j.publicContactPhone || 'N/A'}</td>
              <td style="padding: 3px 0;"><strong>Apply Rec:</strong> <span style="color: #e2e8f0;">${j.applyRecommendation || 'N/A'}</span></td>
            </tr>
          </table>
        </div>
      `).join("");

      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #1e293b; background-color: #0c1220; color: #f1f5f9; border-radius: 12px; text-align: center;">
          <div style="padding-bottom: 15px; border-bottom: 1px solid #1e293b; margin-bottom: 25px;">
            <h1 style="color: #6366f1; font-size: 22px; margin: 0 0 5px 0; font-family: sans-serif; font-weight: bold;">
              🤖 AI Career & Income Research Agent
            </h1>
            <p style="font-size: 12px; color: #64748b; margin: 0; font-family: monospace; text-transform: uppercase; tracking-wider: 1px;">
              Autonomous Hourly Earning sweeps (Every 1 Hour)
            </p>
          </div>
          
          <div style="text-align: left; background-color: #111827; border: 1px dashed #312e81; padding: 15px; border-radius: 8px; margin-bottom: 25px; font-size: 13px; line-height: 1.6; color: #94a3b8;">
            <strong style="color: #f1f5f9; block; margin-bottom: 4px; display: block;">🎯 Active Target Research Scope:</strong>
            &bull; <strong>Candidate:</strong> Aziz (Assistant Manager - Hardware & IT Support)<br/>
            &bull; <strong>Experience Level:</strong> 15+ Years Enterprise IT Infrastructure<br/>
            &bull; <strong>Primary Focus:</strong> High-Income Retainers, AMC, Emergency Support, Direct Client Projects<br/>
            &bull; <strong>Active Regions:</strong> Tier 1 (Mumbai, Thane, Navi Mumbai), Tier 2 (Remote India), Tier 3 (International Remote)
          </div>

          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px; text-align: left;">
            We have scanned all primary MSP, Upwork, Toptal, Contra, LinkedIn, and corporate directories. The following verified earning opportunities are highly compatible with your technical skills:
          </p>

          ${matchCardsHtml}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; font-family: monospace; line-height: 1.4;">
            This report was auto-compiled and verified by the <strong>AI Career & Income Research Agent Daemon</strong>.<br/>
            Schedule sweeps: Active Every 1 Hour (24x7 Real-time).
          </div>
        </div>
      `;

      // Gracefully handle test, mock, or offline tokens
      if (
        !accessToken ||
        accessToken.startsWith("mock_") ||
        accessToken.startsWith("test_") ||
        accessToken.startsWith("probe_") ||
        accessToken === "offline-token" ||
        accessToken === "stub-token"
      ) {
        await this.repo.addSystemLog("info", "daemon", `Simulated email digest dispatched to ${recipientEmail} (${matches.length} matches).`);
        return true;
      }

      const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          raw: Buffer.from(
            `To: ${recipientEmail}\r\nSubject: 🔔 AI Career & Income Research Agent: Hourly Earning Digest\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${htmlBody}`
          ).toString("base64url")
        })
      });

      if (!sendRes.ok) {
        const errText = await sendRes.text().catch(() => "");
        console.warn(`Gmail API returned status ${sendRes.status}: ${errText}`);
        if (sendRes.status === 401 || sendRes.status === 403) {
          const current = await this.repo.getGmailSession("me");
          if (current) {
            await this.repo.setGmailSession("me", { ...current, isAuthenticated: false });
          }
        }
      }

      return sendRes.ok;
    } catch (err) {
      console.error("Gmail digest send failed:", err);
      return false;
    }
  }

  /**
   * Tests Custom Domain SMTP parameters on Hostinger and sends verification email
   */
  public async testHostingerSMTP(config: any): Promise<HostingerEmailResult> {
    const logs: string[] = [];
    logs.push(`[${new Date().toLocaleTimeString()}] 🚀 Initializing Hostinger SMTP Verification Sequence...`);

    const smtpHost = config.smtpHost || "smtp.hostinger.com";
    const smtpPort = Number(config.smtpPort) || 465;
    const smtpUser = config.smtpUser || config.username || config.emailFrom;
    const smtpPassword = config.smtpPassword;

    if (!smtpHost || !smtpUser || !smtpPassword) {
      logs.push(`[${new Date().toLocaleTimeString()}] ❌ Failed: SMTP credentials are not fully configured yet.`);
      return {
        success: false,
        message: "Please provide your Hostinger SMTP credentials (Host, User, Password) first.",
        logs
      };
    }

    logs.push(`[${new Date().toLocaleTimeString()}] 📡 Configuring secure transporter connection payload:`);
    logs.push(`   -> SMTP Server: ${smtpHost}`);
    logs.push(`   -> Port: ${smtpPort}`);
    logs.push(`   -> Username/Sender: ${smtpUser}`);
    logs.push(`   -> SSL/TLS configuration active: ${smtpPort === 465 ? "Implicit SSL (Port 465)" : "TLS/STARTTLS (Port 587)"}`);

    try {
      const isSsl = smtpPort === 465;
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: isSsl,
        auth: {
          user: smtpUser,
          pass: smtpPassword
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 8000
      });

      logs.push(`[${new Date().toLocaleTimeString()}] ⏳ Executing SMTP handshake authentication to ${smtpHost}...`);
      await transporter.verify();
      logs.push(`[${new Date().toLocaleTimeString()}] 🔐 Handshake successful! SMTP connection authenticated successfully.`);

      const recipient = config.notificationTriggerEmail || smtpUser;
      logs.push(`[${new Date().toLocaleTimeString()}] 📧 Preparing verification test email body to recipient: ${recipient}`);

      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #1e293b; background-color: #0c1220; color: #f1f5f9; border-radius: 8px;">
          <h2 style="color: #6366f1; border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 20px;">
            ⚙️ Hostinger Custom Domain SMTP Verification
          </h2>
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
            Congratulations! Your Hostinger professional mail server integration for <strong>${config.brandName || "Aziz"}</strong> (${config.websiteUrl || ""}) has been successfully verified.
          </p>
          <div style="background-color: #111827; border: 1px solid #1f2937; padding: 15px; border-radius: 6px; margin: 20px 0; font-size: 12px; font-family: monospace;">
            <strong style="color: #10b981;">INTEGRATION METRICS:</strong><br/>
            SMTP Sender: ${smtpUser}<br/>
            SMTP Server: ${smtpHost}:${smtpPort}<br/>
            Verified At: ${new Date().toLocaleString()}<br/>
            Main Website: <a href="https://${config.websiteUrl || ""}" target="_blank" style="color: #6366f1;">${config.websiteUrl || ""}</a>
          </div>
          <p style="font-size: 12px; color: #64748b;">
            This verification email was triggered and delivered autonomously from your integrated IT Support Assistant workspace.
          </p>
        </div>
      `;

      logs.push(`[${new Date().toLocaleTimeString()}] 📤 Transferring message stream envelope over SMTP...`);
      const info = await transporter.sendMail({
        from: `"${config.brandName || "Aziz Assistant"}" <${smtpUser}>`,
        to: recipient,
        subject: `🛡️ Hostinger Integration Verified - ${config.brandName || "Aziz"}`,
        html: htmlBody
      });

      logs.push(`[${new Date().toLocaleTimeString()}] 📦 Dispatch complete! Message accepted by Hostinger mail transport agent.`);
      logs.push(`   -> MessageId: ${info.messageId}`);

      await this.repo.updateHostingerConfig({ lastTriggerStatus: "Authenticated & Verified", isConfigured: true });

      return {
        success: true,
        message: `Verification mail sent successfully to ${recipient}! Check your inbox.`,
        logs
      };
    } catch (err: any) {
      logs.push(`[${new Date().toLocaleTimeString()}] ❌ Handshake Exception: ${err.message}`);
      await this.repo.updateHostingerConfig({ lastTriggerStatus: `Handshake Failed: ${err.message}` });
      return {
        success: false,
        message: `Failed to authenticate with Hostinger SMTP: ${err.message}`,
        logs
      };
    }
  }

  /**
   * Dispatches a drafted pitch proposal email via Hostinger SMTP integration
   */
  public async sendHostingerPitch(
    smtpConfig: any,
    to: string,
    subject: string,
    bodyText: string
  ): Promise<boolean> {
    try {
      const smtpHost = smtpConfig.smtpHost || "smtp.hostinger.com";
      const smtpPort = Number(smtpConfig.smtpPort) || 465;
      const smtpUser = smtpConfig.smtpUser || smtpConfig.username || smtpConfig.emailFrom;
      const smtpPassword = smtpConfig.smtpPassword;
      const isSsl = smtpPort === 465;

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: isSsl,
        auth: {
          user: smtpUser,
          pass: smtpPassword
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const formattedHtml = bodyText.replace(/\n/g, "<br/>");
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #1e293b; background-color: #0c1220; color: #f1f5f9; border-radius: 8px; line-height: 1.6;">
          ${formattedHtml}
          <div style="margin-top: 35px; padding-top: 15px; border-top: 1px solid #1e293b; font-size: 11px; color: #475569;">
            Sender: ${smtpUser} &bull; Web: <a href="https://${smtpConfig.websiteUrl || "aaditechs.in"}" style="color: #6366f1; text-decoration: none;">${smtpConfig.websiteUrl || "aaditechs.in"}</a>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"${smtpConfig.brandName || "Aaditech Solution"}" <${smtpUser}>`,
        to,
        subject,
        html: htmlBody
      });

      return true;
    } catch (err) {
      console.error("Hostinger pitch send failed:", err);
      return false;
    }
  }

  /**
   * Dispatches a high-match Job notification email via Hostinger SMTP
   */
  public async sendHostingerJobAlert(
    smtpConfig: any,
    to: string,
    job: any
  ): Promise<boolean> {
    const stars = job.matchScore?.stars || "⭐⭐⭐⭐⭐";
    const matchText = job.matchScore?.text || "High Match";
    const salary = job.salary || "Competitive Market Rate";
    const link = job.originalReference || job.url || "#";

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #1e293b; background-color: #0c1220; color: #f1f5f9; border-radius: 12px;">
        <div style="padding-bottom: 15px; border-bottom: 1px solid #1e293b; margin-bottom: 20px;">
          <span style="background-color: rgba(99,102,241,0.15); color: #818cf8; font-size: 10px; font-family: monospace; font-weight: bold; padding: 4px 8px; border-radius: 4px; text-transform: uppercase;">
            🎯 Two-Way Alert: New High-Match Job Found
          </span>
          <h2 style="color: #ffffff; font-size: 20px; margin: 10px 0 4px 0;">${job.title}</h2>
          <div style="font-family: monospace; font-size: 12px; color: #38bdf8;">
            🏢 ${job.company} &bull; 📍 ${job.location || "Remote / Hybrid"}
          </div>
        </div>

        <div style="background-color: #111827; border: 1px solid #1f2937; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <div style="margin-bottom: 8px; font-size: 13px;">
            <strong style="color: #cbd5e1;">Match Rating:</strong> <span style="font-size: 14px;">${stars}</span> <span style="color: #10b981; font-weight: bold;">(${matchText})</span>
          </div>
          <div style="margin-bottom: 8px; font-size: 13px;">
            <strong style="color: #cbd5e1;">Compensation:</strong> <span style="color: #10b981; font-family: monospace; font-weight: bold;">${salary}</span>
          </div>
          <div style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
            ${job.description || "Exciting opportunity aligned with your enterprise IT infrastructure skills."}
          </div>
        </div>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${link}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
            View & Apply Opportunity ➔
          </a>
        </div>

        <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; font-family: monospace; text-align: center;">
          Sent autonomously via Hostinger Custom Domain SMTP (${smtpConfig.username || "info@aaditechs.in"}) to ${to}.
        </div>
      </div>
    `;

    return this.sendHostingerPitch(smtpConfig, to, `🎯 Job Alert: ${job.title} at ${job.company}`, htmlBody);
  }

  /**
   * Dispatches a Freelance Gig notification email via Hostinger SMTP
   */
  public async sendHostingerGigAlert(
    smtpConfig: any,
    to: string,
    gig: any
  ): Promise<boolean> {
    const budget = gig.budget || "Negotiable";
    const platform = gig.platform || "Upwork / Remote";
    const link = gig.originalReference || gig.url || "#";

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #1e293b; background-color: #0c1220; color: #f1f5f9; border-radius: 12px;">
        <div style="padding-bottom: 15px; border-bottom: 1px solid #1e293b; margin-bottom: 20px;">
          <span style="background-color: rgba(16,185,129,0.15); color: #10b981; font-size: 10px; font-family: monospace; font-weight: bold; padding: 4px 8px; border-radius: 4px; text-transform: uppercase;">
            ⚡ Freelance Contract Opportunity
          </span>
          <h2 style="color: #ffffff; font-size: 20px; margin: 10px 0 4px 0;">${gig.title}</h2>
          <div style="font-family: monospace; font-size: 12px; color: #38bdf8;">
            🌐 ${platform} &bull; 💵 ${budget}
          </div>
        </div>

        <div style="background-color: #111827; border: 1px solid #1f2937; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5; margin: 0 0 10px 0;">
            ${gig.description || "A new contract matching your systems administration and automation portfolio."}
          </p>
          <div style="font-size: 12px; color: #818cf8; font-family: monospace;">
            <strong>Skills:</strong> ${(gig.skillsRequired || []).join(", ") || "Linux, Docker, IT Support"}
          </div>
        </div>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${link}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
            Open Contract & Draft Proposal ➔
          </a>
        </div>

        <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; font-family: monospace; text-align: center;">
          Sent autonomously via Hostinger Custom Domain (${smtpConfig.username || "info@aaditechs.in"}).
        </div>
      </div>
    `;

    return this.sendHostingerPitch(smtpConfig, to, `⚡ Freelance Gig: ${gig.title} (${budget})`, htmlBody);
  }

  /**
   * Dispatches a full Scraping Cycle Digest via Hostinger SMTP
   */
  public async sendHostingerScrapeDigest(
    smtpConfig: any,
    to: string,
    summary: { cycleId: string; jobsCount: number; recruitersCount: number; gigsCount: number; durationMs: number }
  ): Promise<boolean> {
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #1e293b; background-color: #0c1220; color: #f1f5f9; border-radius: 12px;">
        <h2 style="color: #6366f1; border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 20px;">
          🔄 3x Daily Scraping Cycle Completed
        </h2>
        <div style="background-color: #111827; border: 1px solid #1f2937; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 13px; line-height: 1.8;">
          • <strong>Cycle ID:</strong> ${summary.cycleId}<br/>
          • <strong>Jobs Discovered:</strong> <span style="color: #38bdf8;">+${summary.jobsCount}</span><br/>
          • <strong>Recruiter Leads:</strong> <span style="color: #a855f7;">+${summary.recruitersCount}</span><br/>
          • <strong>Freelance Gigs:</strong> <span style="color: #10b981;">+${summary.gigsCount}</span><br/>
          • <strong>Execution Time:</strong> ${Math.round(summary.durationMs / 1000)}s
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 15px;">
          All opportunities have been indexed and saved to your persistent database repository.
        </p>
      </div>
    `;

    return this.sendHostingerPitch(smtpConfig, to, `📊 Scraping Digest: ${summary.jobsCount} Jobs, ${summary.gigsCount} Gigs Found`, htmlBody);
  }
}
