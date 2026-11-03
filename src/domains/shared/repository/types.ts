import { JobProfile, FreelanceProfile, RecruiterContact, Memory, FreelanceGig } from "../../../types";

export type RepositoryType = "INMEMORY" | "FIREBASE" | "POSTGRES" | "SQLITE" | "MONGODB";

export interface RepositoryHealth {
  status: "healthy" | "unhealthy" | "degraded";
  message: string;
  latencyMs: number;
  lastCheck: string;
}

export interface RepositoryMetrics {
  totalQueries: number;
  totalWrites: number;
  totalErrors: number;
  averageLatencyMs: number;
  uptimeSeconds: number;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  type: "api" | "security" | "daemon" | "database" | "ai";
  message: string;
}

export interface HostingerConfig {
  smtpHost: string;
  smtpPort: number;
  secure: boolean;
  username: string;
  emailFrom: string;
  smtpPassword?: string;
  brandName?: string;
  websiteUrl?: string;
  notificationTriggerEmail?: string;
  smtpUser?: string;
  isConfigured?: boolean;
  hasPassword?: boolean;
  lastTriggerStatus?: string;
}

export interface TelegramConfig {
  botToken?: string;
  chatId?: string;
  enabled: boolean;
  autoAlertOnScrape: boolean;
  autoAlertOnHighMatch: boolean;
  autoAlertOnRecruiterFollowup: boolean;
  minMatchScore: number;
  botUsername?: string;
  lastStatus?: string;
  lastCheckedAt?: string;
  webhookUrl?: string;
  notifyOnJobMatch?: boolean;
  notifyOnGigMatch?: boolean;
  notifyOnScrapeComplete?: boolean;
  notifyOnSystemErrors?: boolean;
  minMatchScoreToAlert?: number;
}

export interface GmailSession {
  accessToken?: string;
  refreshToken?: string;
  expiryDate?: number;
  scopes?: string[];
  isAuthenticated: boolean;
  userEmail?: string;
}

export interface ScanLog {
  id: string;
  timestamp: string;
  type: string;
  status: "success" | "failed" | "info";
  message: string;
}

export interface MetricEntry {
  requests: number;
  latencySamples: number[];
  avgLatency: number;
  errors: number;
}
