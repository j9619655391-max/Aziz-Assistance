export interface Memory {
  id: string;
  type: string; // "preference" | "style" | "context" | "security" | "recruiter"
  content: string;
  timestamp: string;
}

export interface TerminalLine {
  id: string;
  type: "command" | "output" | "system" | "error" | "warn";
  text: string;
  timestamp: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AuditIssue {
  severity: "high" | "medium" | "low";
  title: string;
  desc: string;
  recommendation: string;
}

export interface AuditReport {
  scannedFiles: number;
  grade: number;
  status: string;
  issues: AuditIssue[];
  timestamp: string;
}

export interface JobProfile {
  resume: string;
  preferredCountries: string[];
  skills: string[];
  experienceYears: number;
  visaPreference: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  country: string;
  description: string;
  skillsRequired: string[];
  salary: string;
  visaSponsorship: boolean;
  postedDate: string;
  publicHrEmail?: string;
  // Live Data Provenance Fields
  source?: string;
  timestamp?: string;
  verificationStatus?: string;
  confidenceScore?: number;
  originalReference?: string;
  deduplicationStatus?: string;
}

export interface AtsAnalysis {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  experienceMatch: boolean;
  recommendation: string;
  coverLetterDraft?: string;
}

export interface RecruiterContact {
  id: string;
  name: string;
  company: string;
  email: string;
  linkedin?: string;
  notes?: string;
  dateAdded: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  techStack: string[];
  description: string;
  projectUrl?: string;
}

export interface FreelanceProfile {
  hourlyRate: number;
  offerings: string[];
  portfolioUrl: string;
  customPitchPrompt: string;
  projects?: ProjectItem[];
}

export interface FreelanceGig {
  id: string;
  title: string;
  platform: string;
  budget: string;
  duration: string;
  complexity: string;
  description: string;
  skillsRequired: string[];
  postedDate: string;
  compatibilityScore?: number;
  skillsMatched?: string[];
  // Live Data Provenance Fields
  source?: string;
  timestamp?: string;
  verificationStatus?: string;
  confidenceScore?: number;
  originalReference?: string;
  deduplicationStatus?: string;
}

export interface ProposalDraft {
  pitchText: string;
  estimatedHours: number;
  totalCostEstimate: string;
  milestones: string[];
  engine: string;
}

export interface WorkspaceFileIndex {
  path: string;
  name: string;
  size: number; // bytes
  sizeFormatted: string;
  lines: number;
  lastModified: string;
  summary: {
    imports: string[];
    exports: string[];
    functions: string[];
    components: string[];
  };
}

export interface CodeBug {
  id: string;
  filePath: string;
  line: number;
  severity: "critical" | "warning" | "info";
  category: "rendering" | "security" | "network" | "syntax" | "best_practice";
  title: string;
  message: string;
  recommendation: string;
  snippet?: string;
  remediationCode?: string;
}

export interface DiagnosticBugReport {
  timestamp: string;
  scannedFilesCount: number;
  totalIssuesCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  qualityScore: number;
  qualityGrade: "A" | "B" | "C" | "D" | "F";
  bugs: CodeBug[];
}

// ==========================================
// EMPLOYMENT INTEL PLATFORM V2 SHARED MODELS
// ==========================================

export interface SearchHistoryEntry {
  id: string;
  query: string;
  filters: Record<string, any>;
  date: string;
  resultsCount: number;
  durationMs: number;
  provider: string;
  userNotes: string;
  timestamp?: string; // fallback field for compatibility
}

export interface SavedJobEntry {
  id: string;
  job: Job;
  status: "saved" | "archived" | "favorite";
  categories: string[];
  notes: string;
  addedDate: string;
}

export interface ApplicationTrackerEntry {
  id: string;
  job: Job;
  jobId?: string; // compatibility
  company: string;
  title: string;
  appliedDate: string;
  currentStatus: "Applied" | "Interview" | "Interviewing" | "Rejected" | "Offer" | "Offer Received" | "Accepted" | "Withdrawn";
  recruiterId?: string;
  recruiterName?: string; // compatibility
  recruiterEmail?: string; // compatibility
  notes: string;
  interviewDate?: string;
  offerDetails?: string;
}

export interface InterviewStageEntry {
  id: string;
  applicationId: string;
  stage?: "Phone Screening" | "Technical Round" | "HR Round" | "Final Round" | "Offer" | "Rejected";
  stageName?: "Phone Screen" | "Technical Round" | "System Design" | "Culture Fit" | "HR & Compensation" | string; // compatibility
  date?: string;
  scheduledDate?: string; // compatibility
  status?: "Scheduled" | "Completed" | "Cancelled";
  completed?: boolean; // compatibility
  feedback: string;
  notes?: string;
}

export interface FollowupEntry {
  id: string;
  applicationId: string;
  nextFollowupDate?: string;
  lastContactDate?: string;
  contactDate?: string; // compatibility
  recruiterResponse?: "No Response" | "Interested" | "Not Interested" | "Scheduled Interview" | "Hold" | string;
  notes: string;
  reminderEnabled?: boolean;
  contactPerson?: string; // compatibility
  contactMethod?: "Email" | "LinkedIn" | "Phone" | string; // compatibility
  status?: "pending" | "responded" | "no-reply" | string; // compatibility
  reminderDate?: string; // compatibility
  reminderSent?: boolean; // compatibility
}

export interface CompanyProfileEntry {
  id: string;
  name: string;
  industry: string;
  website: string;
  country: string;
  location: string;
  notes: string;
  recruiters: string[];
  interviewExperiences: string[];
}

export interface RecruiterContactEntry {
  id: string;
  name: string;
  company: string;
  linkedin: string;
  email: string;
  phone: string;
  lastContactDate: string;
  relationshipScore: number;
  notes: string;
}

export interface OpportunityScoreBreakdown {
  skillMatch: number;
  salary: number;
  location: number;
  visa: number;
  careerGrowth: number;
  competition: number;
  companyRating: number;
  learningOpportunity: number;
  overallScore: number;
  rationales: Record<string, string>;
}

// ==========================================
// IDENTITY PLATFORM SPRINT 22 MODELS
// ==========================================

export interface Organization {
  id: string;
  name: string;
  tenantId: string;
  billingPlan?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  organizationId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  workspaceId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export type RoleName =
  | "Super Admin"
  | "Organization Admin"
  | "Manager"
  | "Recruiter"
  | "Reviewer"
  | "Viewer"
  | string;

export interface Role {
  id: string;
  name: RoleName;
  permissions: string[];
  organizationId?: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  workspaceIds: string[];
  role: RoleName;
  customRoles?: string[];
  tenantId: string;
  createdAt: string;
}

export interface LoginSession {
  sessionId: string;
  userId: string;
  email: string;
  organizationId: string;
  workspaceIds: string[];
  role: RoleName;
  tenantId: string;
  createdAt: string;
  expiresAt: string;
  deviceMetadata?: {
    ip?: string;
    userAgent?: string;
    platform?: string;
  };
  revoked: boolean;
}

export interface RefreshSession {
  refreshToken: string;
  sessionId: string;
  userId: string;
  expiresAt: string;
  revoked: boolean;
}

export interface IdentityAuditLog {
  id: string;
  timestamp: string;
  tenantId: string;
  organizationId?: string;
  workspaceId?: string;
  userId: string;
  action: "Login" | "Logout" | "Permission Changes" | "Role Changes" | "Workspace Changes" | "Organization Changes" | string;
  details: string;
  ipAddress?: string;
}

export type TodoCategory = 
  | "ai_resilience" 
  | "persistence" 
  | "freelance_jobs" 
  | "email_outreach" 
  | "recruitment_pipeline" 
  | "infrastructure";

export type TodoStatus = "done" | "in_progress" | "planned" | "blocked";
export type TodoPriority = "high" | "medium" | "low";

export interface SystemTodoItem {
  id: string;
  title: string;
  category: TodoCategory;
  status: TodoStatus;
  priority: TodoPriority;
  description: string;
  explanation: string;
  effortEstimate: string;
  isCustom?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}





