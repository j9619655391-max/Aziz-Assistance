import { JobProfile, FreelanceProfile, RecruiterContact, Memory, FreelanceGig } from "../../../types";
import { RepositoryHealth, SystemLog, HostingerConfig, TelegramConfig, GmailSession, ScanLog, MetricEntry } from "./types";

/**
 * A generic, database-agnostic Repository interface.
 * Represents a collection or table in the persistent store.
 */
export interface IRepository<T> {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  health(): Promise<RepositoryHealth>;

  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  search(query: string): Promise<T[]>;
  insert(item: Omit<T, "id" | "timestamp"> | T): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
  exists(id: string): Promise<boolean>;
  transaction?<R>(work: () => Promise<R>): Promise<R>;
}

/**
 * Main App Repository interface that aggregates the domain-specific DAO methods
 * and implements top-level generic, collection-based CRUD methods.
 */
export interface IAppRepository {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  health(): Promise<RepositoryHealth>;

  // Generic, collection-based persistence methods requested by prompt
  findById<T = any>(collectionName: string, id: string): Promise<T | null>;
  findAll<T = any>(collectionName: string): Promise<T[]>;
  search<T = any>(collectionName: string, query: string): Promise<T[]>;
  insert<T = any>(collectionName: string, item: any): Promise<T>;
  update<T = any>(collectionName: string, id: string, item: any): Promise<T>;
  delete(collectionName: string, id: string): Promise<boolean>;
  count(collectionName: string): Promise<number>;
  exists(collectionName: string, id: string): Promise<boolean>;
  transaction?<R>(work: () => Promise<R>): Promise<R>;

  // Domain-specific DAO operations for application business logic compatibility
  getMemories(): Promise<Memory[]>;
  addMemory(memory: Omit<Memory, "id" | "timestamp">): Promise<Memory>;
  deleteMemory(id: string): Promise<boolean>;

  getJobProfile(): Promise<JobProfile & { currentRole?: string }>;
  updateJobProfile(profile: Partial<JobProfile & { currentRole?: string }>): Promise<JobProfile & { currentRole?: string }>;

  getFreelanceProfile(): Promise<FreelanceProfile & { fewShotExamples?: Array<{ id: string; gigTitle: string; pitchText: string; addedAt: string }> }>;
  updateFreelanceProfile(profile: Partial<FreelanceProfile>): Promise<FreelanceProfile>;
  addFewShotExample(example: { gigTitle: string; pitchText: string }): Promise<any>;
  deleteFewShotExample(id: string): Promise<boolean>;

  getSampleGigs(): Promise<FreelanceGig[]>;
  findGigById(id: string): Promise<FreelanceGig | undefined>;

  getRecruiterContacts(): Promise<RecruiterContact[]>;
  addRecruiterContact(contact: Omit<RecruiterContact, "id" | "dateAdded">): Promise<RecruiterContact>;
  deleteRecruiterContact(id: string): Promise<boolean>;

  getSystemLogs(): Promise<SystemLog[]>;
  addSystemLog(level: "info" | "warn" | "error" | "success", type: "api" | "security" | "daemon" | "database" | "ai", message: string): Promise<void>;

  getHostingerConfig(): Promise<HostingerConfig>;
  updateHostingerConfig(config: Partial<HostingerConfig>): Promise<HostingerConfig>;

  getTelegramConfig(): Promise<TelegramConfig>;
  updateTelegramConfig(config: Partial<TelegramConfig>): Promise<TelegramConfig>;

  getGmailSession(userId: string): Promise<GmailSession | undefined>;
  setGmailSession(userId: string, session: GmailSession): Promise<void>;
  clearGmailSession(userId: string): Promise<void>;

  getScanLogs(): Promise<ScanLog[]>;
  addScanLog(log: Omit<ScanLog, "id" | "timestamp">): Promise<ScanLog>;

  getMetrics(): Promise<Record<string, MetricEntry>>;
  recordMetric(endpoint: string, latencyMs: number, hasError: boolean): Promise<void>;
}
