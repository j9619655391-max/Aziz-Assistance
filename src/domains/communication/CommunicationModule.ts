import BaseModule from "../../kernel/module/BaseModule";
import { ModuleMetadata } from "../../kernel/module/types";
import { NotificationService } from "./NotificationService";
import { HostingerService } from "./HostingerService";
import { TelegramBotService } from "./TelegramBotService";

export class CommunicationModule extends BaseModule {
  public metadata: ModuleMetadata = {
    id: "communication",
    name: "Communication Module",
    version: "1.1.0",
    description: "Outbound communication services, Hostinger custom domain SMTP, and Two-Way Telegram Alert Bot.",
    author: "Communication & Messaging Domain",
    capabilities: ["SMTP_COMMUNICATION", "HOSTINGER_SMTP_INTEGRATION", "TELEGRAM_TWO_WAY_BOT", "MULTI_CHANNEL_ALERTS"],
    dependencies: ["repository"],
    requiredServices: ["NotificationService", "HostingerService", "TelegramBotService"],
  };

  private notificationService: NotificationService | null = null;
  private hostingerService: HostingerService | null = null;
  private telegramService: TelegramBotService | null = null;

  protected async startup(registry: any): Promise<void> {
    this.notificationService = registry.notificationService;
    this.hostingerService = registry.hostingerService;
    this.telegramService = registry.telegramService;

    if (!this.notificationService || !this.hostingerService) {
      throw new Error("Required dependencies 'notificationService' or 'hostingerService' not available in service registry");
    }
  }

  protected async diagnostics() {
    const config = this.hostingerService ? await this.hostingerService.getConfig() : null;
    const tgConfig = this.telegramService ? await this.telegramService.getConfig() : null;
    return {
      hasHostingerSmtpConfigured: !!config?.smtpHost,
      hostingerUser: config?.username || "Not configured",
      telegramBotEnabled: !!tgConfig?.enabled,
      telegramBotUsername: tgConfig?.botUsername || "Not connected",
    };
  }
}

