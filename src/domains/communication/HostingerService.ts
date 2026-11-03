import { IAppRepository } from "../shared/repository/IRepository";
import { HostingerConfig } from "../shared/repository/types";

export class HostingerService {
  constructor(private repo: IAppRepository) {}

  /**
   * Retrieves active Hostinger configuration state with normalized properties
   */
  public async getConfig(): Promise<HostingerConfig> {
    const raw = await this.repo.getHostingerConfig();
    const envPass = process.env.HOSTINGER_SMTP_PASS || "";
    const envUser = process.env.HOSTINGER_SMTP_USER || "";
    const envHost = process.env.HOSTINGER_SMTP_HOST || "";
    const envEmail = process.env.HOSTINGER_NOTIFICATION_EMAIL || "";

    const user = raw.smtpUser || raw.username || raw.emailFrom || envUser || "info@aaditechs.in";
    const brandName = raw.brandName || "Aaditech Solution";
    const websiteUrl = raw.websiteUrl || "aaditechs.in";
    const notificationTriggerEmail = raw.notificationTriggerEmail || envEmail || "shaikhaziz267@hotmail.com";
    const finalPassword = raw.smtpPassword || envPass;
    const hasPassword = Boolean(finalPassword && finalPassword.length > 0);
    const host = raw.smtpHost || envHost || "smtp.hostinger.com";
    const isConfigured = Boolean(host && user && hasPassword);

    return {
      ...raw,
      smtpHost: host,
      smtpPort: raw.smtpPort || (process.env.HOSTINGER_SMTP_PORT ? parseInt(process.env.HOSTINGER_SMTP_PORT, 10) : 465),
      secure: raw.secure !== false,
      username: user,
      emailFrom: user,
      smtpUser: user,
      smtpPassword: finalPassword,
      brandName,
      websiteUrl,
      notificationTriggerEmail,
      hasPassword,
      isConfigured: raw.isConfigured !== undefined ? raw.isConfigured : isConfigured,
      lastTriggerStatus: raw.lastTriggerStatus || (isConfigured ? "Authenticated" : "Idle")
    };
  }

  /**
   * Updates Hostinger configuration properties
   */
  public async updateConfig(updatedConfig: Partial<HostingerConfig>): Promise<HostingerConfig> {
    const existing = await this.repo.getHostingerConfig();
    
    let finalPassword = updatedConfig.smtpPassword;
    if (!finalPassword || finalPassword === "••••••••" || finalPassword.trim() === "") {
      finalPassword = existing.smtpPassword || "";
    }

    const user = updatedConfig.smtpUser || updatedConfig.username || updatedConfig.emailFrom || existing.smtpUser || existing.username || "info@aaditechs.in";
    const hasPassword = Boolean(finalPassword && finalPassword.length > 0);
    const isConfigured = Boolean((updatedConfig.smtpHost || existing.smtpHost || "smtp.hostinger.com") && user && hasPassword);

    const merged: Partial<HostingerConfig> = {
      ...existing,
      ...updatedConfig,
      smtpHost: updatedConfig.smtpHost || existing.smtpHost || "smtp.hostinger.com",
      smtpPort: updatedConfig.smtpPort || existing.smtpPort || 465,
      secure: updatedConfig.secure !== undefined ? updatedConfig.secure : true,
      username: user,
      emailFrom: user,
      smtpUser: user,
      smtpPassword: finalPassword,
      brandName: updatedConfig.brandName || existing.brandName || "Aaditech Solution",
      websiteUrl: updatedConfig.websiteUrl || existing.websiteUrl || "aaditechs.in",
      notificationTriggerEmail: updatedConfig.notificationTriggerEmail || existing.notificationTriggerEmail || "shaikhaziz267@hotmail.com",
      hasPassword,
      isConfigured,
      lastTriggerStatus: isConfigured ? "Authenticated & Active" : "Idle"
    };

    const saved = await this.repo.updateHostingerConfig(merged);
    await this.repo.addSystemLog("success", "api", `Updated Hostinger custom domain SMTP configuration for ${user}.`);
    
    return {
      ...saved,
      ...merged,
      hasPassword,
      isConfigured
    };
  }
}

