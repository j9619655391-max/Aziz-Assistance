import React, { useState, useEffect } from "react";
import { 
  Briefcase, 
  User, 
  FileText, 
  Calculator, 
  Send, 
  Plus, 
  Trash2, 
  Search, 
  MapPin, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  UserPlus, 
  Mail, 
  ExternalLink,
  RefreshCw,
  Award,
  Globe,
  DollarSign,
  Fingerprint,
  Upload,
  Bell,
  Sliders,
  Terminal,
  Activity,
  Check,
  Target,
  X,
  Info,
  CheckSquare
} from "lucide-react";
import { JobProfile, Job, AtsAnalysis, RecruiterContact } from "../types";
import { REMOTE_PORTALS_CATALOG, buildSearchUrl, RemotePortal } from "../data/remotePortals";
import SavedJobsPanel from "./SavedJobsPanel";
import ApplicationTrackerPanel from "./ApplicationTrackerPanel";
import SearchHistoryPanel from "./SearchHistoryPanel";
import SearchAnalyticsPanel from "./SearchAnalyticsPanel";
import RoadmapTodoPanel from "./RoadmapTodoPanel";
import ScraperControlWidget from "./ScraperControlWidget";
import TelegramAlertsPanel from "./TelegramAlertsPanel";

interface JobAgentPanelProps {
  gmailUserEmail: string | null;
  gmailAccessToken: string | null;
}

export default function JobAgentPanel({ gmailUserEmail, gmailAccessToken }: JobAgentPanelProps) {
  // Navigation tabs inside Job Agent Panel
  const [activeTab, setActiveTab] = useState<
    "profile" | "jobs" | "ats" | "recruiters" | "alerts" | "freelance" | "hostinger" | "telegram" | "saved" | "pipeline" | "history" | "analytics" | "todo"
  >("profile");

  // Profile Form States
  const [profile, setProfile] = useState<JobProfile>({
    resume: "",
    preferredCountries: [],
    skills: [],
    experienceYears: 0,
    visaPreference: "Sponsorship Required"
  });

  // Freelance Gigs state
  const [freelanceProfileState, setFreelanceProfileState] = useState<{
    hourlyRate: number;
    offerings: string[];
    portfolioUrl: string;
    customPitchPrompt: string;
    projects?: Array<{ id: string; title: string; techStack: string[]; description: string; projectUrl?: string }>;
    fewShotExamples?: Array<{ id: string; gigTitle: string; pitchText: string; addedAt: string }>;
  }>({
    hourlyRate: 85,
    offerings: [],
    portfolioUrl: "",
    customPitchPrompt: "",
    projects: [],
    fewShotExamples: []
  });

  const [newProject, setNewProject] = useState({
    title: "",
    techStack: "",
    description: "",
    projectUrl: ""
  });
  const [freelanceGigs, setFreelanceGigs] = useState<any[]>([]);
  const [selectedGig, setSelectedGig] = useState<any | null>(null);
  const [isLoadingGigs, setIsLoadingGigs] = useState(false);
  const [freelanceSearch, setFreelanceSearch] = useState("");
  const [newOffering, setNewOffering] = useState("");
  const [isSavingFreelanceProfile, setIsSavingFreelanceProfile] = useState(false);
  const [freelanceSaveSuccess, setFreelanceSaveSuccess] = useState(false);

  // Freelance Scout Filter States - Default all 40 portals selected
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(() => 
    REMOTE_PORTALS_CATALOG.map((p) => p.name)
  );
  const [scoutPlatformSearch, setScoutPlatformSearch] = useState("");
  const [scoutPlatformCategory, setScoutPlatformCategory] = useState("all");
  const [minCompatibilityScore, setMinCompatibilityScore] = useState<number>(0);
  const [rateFilterOption, setRateFilterOption] = useState<"all" | "meets_rate" | "fixed_only">("all");

  // Proposal State
  const [isDraftingProposal, setIsDraftingProposal] = useState(false);
  const [proposalDraftResult, setProposalDraftResult] = useState<any | null>(null);
  const [proposalDraftError, setProposalDraftError] = useState<string | null>(null);
  const [copiedProposalText, setCopiedProposalText] = useState(false);
  const [isEmailingProposal, setIsEmailingProposal] = useState(false);
  const [proposalEmailSuccess, setProposalEmailSuccess] = useState(false);
  const [proposalEmailError, setProposalEmailError] = useState<string | null>(null);
  const [proposalRecipientEmail, setProposalRecipientEmail] = useState("");
  const [isEditingPitch, setIsEditingPitch] = useState(false);
  const [editedPitchText, setEditedPitchText] = useState("");
  const [alsoSaveAsFewShot, setAlsoSaveAsFewShot] = useState(true);
  const [saveFewShotFeedbackSuccess, setSaveFewShotFeedbackSuccess] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // New Freelance Scout Improvements States
  const [isPastingGig, setIsPastingGig] = useState(false);
  const [newGigTitle, setNewGigTitle] = useState("");
  const [newGigPlatform, setNewGigPlatform] = useState("Upwork");
  const [newGigBudget, setNewGigBudget] = useState("$60 / hr");
  const [newGigDuration, setNewGigDuration] = useState("2 Weeks");
  const [newGigComplexity, setNewGigComplexity] = useState("Intermediate");
  const [newGigDescription, setNewGigDescription] = useState("");
  const [newGigSkills, setNewGigSkills] = useState("");
  const [isSavingCustomGig, setIsSavingCustomGig] = useState(false);

  const [activeProposalTab, setActiveProposalTab] = useState<"pitch" | "optimize">("pitch");
  const [isOptimizingProfile, setIsOptimizingProfile] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any | null>(null);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);

  // Resume upload & parsing states
  const [resumeInputMode, setResumeInputMode] = useState<"upload" | "paste">("upload");
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Alert & Notification Center States
  const [alertSettings, setAlertSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("aziz_alert_settings");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      emailAlertsEnabled: true,
      inAppAlertsEnabled: true,
      minMatchScore: 70,
      alertFrequency: "Daily Digest"
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem("aziz_alert_settings", JSON.stringify(alertSettings));
    } catch (e) {}
  }, [alertSettings]);

  const [isSendingDigest, setIsSendingDigest] = useState(false);
  const [digestSuccess, setDigestSuccess] = useState(false);
  const [digestError, setDigestError] = useState<string | null>(null);

  // Job Search States
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobsStatus, setJobsStatus] = useState<string>("live");
  const [gigsStatus, setGigsStatus] = useState<string>("live");

  // ATS Comparison State
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customCompany, setCustomCompany] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [customSkillsString, setCustomSkillsString] = useState("");
  const [customJd, setCustomJd] = useState("");
  
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<AtsAnalysis | null>(null);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  // Recruiters States
  const [recruiters, setRecruiters] = useState<RecruiterContact[]>([]);
  const [recForm, setRecForm] = useState({ name: "", company: "", email: "", linkedin: "", notes: "" });
  const [isAddingRecruiter, setIsAddingRecruiter] = useState(false);
  const [recruiterSuccess, setRecruiterSuccess] = useState(false);
  const [recruiterSearchQuery, setRecruiterSearchQuery] = useState("");
  const [recruiterCategoryFilter, setRecruiterCategoryFilter] = useState("all");
  const [copiedRecruiterId, setCopiedRecruiterId] = useState<string | null>(null);

  // 40 Remote Job Portals State
  const [portalCategoryFilter, setPortalCategoryFilter] = useState<string>("all");
  const [portalSearchQuery, setPortalSearchQuery] = useState("");
  const [portalRoleQuery, setPortalRoleQuery] = useState("Hardware Support");

  // Email Cover Letter Bridge State
  const [isEmailingCoverLetter, setIsEmailingCoverLetter] = useState(false);
  const [emailSendSuccess, setEmailSendSuccess] = useState(false);
  const [emailSendError, setEmailSendError] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [coverLetterSender, setCoverLetterSender] = useState<"gmail" | "hostinger">("hostinger");

  // Copy status indicators
  const [copiedCoverLetter, setCopiedCoverLetter] = useState(false);

  // Hostinger Mail & Custom Domain States
  const [hostingerConfig, setHostingerConfig] = useState({
    smtpHost: "smtp.hostinger.com",
    smtpPort: 465,
    smtpUser: "info@aaditechs.in",
    smtpPassword: "",
    brandName: "Aaditech Solution",
    websiteUrl: "aaditechs.in",
    notificationTriggerEmail: "shaikhaziz267@hotmail.com",
    isConfigured: false,
    lastTriggerStatus: "Idle",
    hasPassword: false
  });
  const [hostingerLogs, setHostingerLogs] = useState<string[]>([]);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestSuccess, setSmtpTestSuccess] = useState<boolean | null>(null);
  const [smtpTestMessage, setSmtpTestMessage] = useState<string | null>(null);
  const [isSavingHostinger, setIsSavingHostinger] = useState(false);
  const [hostingerSaveSuccess, setHostingerSaveSuccess] = useState(false);
  
  // Custom Domain Pitch sending state
  const [isSendingPitchViaHostinger, setIsSendingPitchViaHostinger] = useState(false);
  const [pitchSendHostingerSuccess, setPitchSendHostingerSuccess] = useState(false);
  const [pitchSendHostingerError, setPitchSendHostingerError] = useState<string | null>(null);

  // Custom modal dialog states (bypassing sandboxed iframe popups restrictions)
  const [modalConfirm, setModalConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [modalAlert, setModalAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  } | null>(null);

  const showCustomAlert = (title: string, message: string) => {
    setModalAlert({ isOpen: true, title, message });
  };

  const showCustomConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalConfirm({ isOpen: true, title, message, onConfirm });
  };

  const fetchHostingerConfig = async () => {
    try {
      const res = await fetch("/api/hostinger/config");
      if (res.ok) {
        const data = await res.json();
        const cfg = data.config || data;
        setHostingerConfig(prev => {
          const user = cfg.smtpUser || cfg.username || cfg.emailFrom || prev.smtpUser || "info@aaditechs.in";
          const hasPass = Boolean(cfg.hasPassword || (cfg.smtpPassword && cfg.smtpPassword.length > 0 && cfg.smtpPassword !== "••••••••"));
          const isCfg = Boolean(cfg.isConfigured !== undefined ? cfg.isConfigured : (cfg.smtpHost && user && hasPass));
          return {
            ...prev,
            ...cfg,
            smtpHost: cfg.smtpHost || prev.smtpHost || "smtp.hostinger.com",
            smtpPort: cfg.smtpPort || prev.smtpPort || 465,
            smtpUser: user,
            brandName: cfg.brandName || prev.brandName || "Aaditech Solution",
            websiteUrl: cfg.websiteUrl || prev.websiteUrl || "aaditechs.in",
            notificationTriggerEmail: cfg.notificationTriggerEmail || prev.notificationTriggerEmail || "shaikhaziz267@hotmail.com",
            isConfigured: isCfg,
            hasPassword: hasPass,
            lastTriggerStatus: cfg.lastTriggerStatus || (isCfg ? "Authenticated & Active" : "Idle"),
            smtpPassword: prev.smtpPassword || ""
          };
        });
      }
    } catch (err) {
      console.error("Error fetching Hostinger config:", err);
    }
  };

  const handleSaveHostingerConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingHostinger(true);
    setHostingerSaveSuccess(false);
    try {
      const res = await fetch("/api/hostinger/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hostingerConfig)
      });
      if (res.ok) {
        const data = await res.json();
        const cfg = data.config || data;
        setHostingerConfig(prev => {
          const user = cfg.smtpUser || cfg.username || cfg.emailFrom || prev.smtpUser || "info@aaditechs.in";
          const hasPass = Boolean(cfg.hasPassword || (hostingerConfig.smtpPassword && hostingerConfig.smtpPassword.length > 0) || (cfg.smtpPassword && cfg.smtpPassword.length > 0));
          const isCfg = Boolean(cfg.isConfigured !== undefined ? cfg.isConfigured : (cfg.smtpHost && user && hasPass));
          return {
            ...prev,
            ...cfg,
            smtpHost: cfg.smtpHost || prev.smtpHost || "smtp.hostinger.com",
            smtpPort: cfg.smtpPort || prev.smtpPort || 465,
            smtpUser: user,
            brandName: cfg.brandName || prev.brandName || "Aaditech Solution",
            websiteUrl: cfg.websiteUrl || prev.websiteUrl || "aaditechs.in",
            notificationTriggerEmail: cfg.notificationTriggerEmail || prev.notificationTriggerEmail || "shaikhaziz267@hotmail.com",
            isConfigured: isCfg,
            hasPassword: hasPass,
            lastTriggerStatus: cfg.lastTriggerStatus || (isCfg ? "Authenticated & Active" : "Idle")
          };
        });
        setHostingerSaveSuccess(true);
        setTimeout(() => setHostingerSaveSuccess(false), 4500);
      }
    } catch (err) {
      console.error("Error saving Hostinger config:", err);
    } finally {
      setIsSavingHostinger(false);
    }
  };

  const handleTestSmtpConnection = async () => {
    setIsTestingSmtp(true);
    setSmtpTestSuccess(null);
    setSmtpTestMessage(null);
    setHostingerLogs(["[Client-Side] Handshake requested. Dispatched connection test to workspace container server..."]);
    try {
      const res = await fetch("/api/hostinger/test-email", {
        method: "POST"
      });
      const data = await res.json();
      setHostingerLogs(data.logs || []);
      setSmtpTestSuccess(data.success);
      setSmtpTestMessage(data.message);
      fetchHostingerConfig();
    } catch (err: any) {
      setSmtpTestSuccess(false);
      setSmtpTestMessage(err.message || "Failed to trigger SMTP test on server.");
      setHostingerLogs(prev => [...prev, `[Client-Side] ❌ Network Error: ${err.message}`]);
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleSendPitchViaHostinger = async () => {
    if (!proposalRecipientEmail || !proposalDraftResult?.pitchText) return;
    setIsSendingPitchViaHostinger(true);
    setPitchSendHostingerSuccess(false);
    setPitchSendHostingerError(null);
    try {
      const res = await fetch("/api/hostinger/send-pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: proposalRecipientEmail,
          subject: `Proposal: ${selectedGig?.title || "IT Support Consulting contract"}`,
          bodyText: proposalDraftResult.pitchText,
          gigTitle: selectedGig?.title
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPitchSendHostingerSuccess(true);
        setProposalRecipientEmail("");
        setTimeout(() => setPitchSendHostingerSuccess(false), 6000);
      } else {
        setPitchSendHostingerError(data.error || "Failed to deliver pitch proposal via Hostinger SMTP.");
      }
    } catch (err: any) {
      setPitchSendHostingerError(err.message || "Network error occurred during SMTP dispatch.");
    } finally {
      setIsSendingPitchViaHostinger(false);
    }
  };

  // Background scheduler queue logs and daemon active status
  const [schedulerLogs, setSchedulerLogs] = useState<{ timestamp: string; event: string }[]>([]);
  const [isScanningDaemon, setIsScanningDaemon] = useState(false);
  const [daemonSuccessMessage, setDaemonSuccessMessage] = useState<string | null>(null);

  const fetchSchedulerLogs = async () => {
    try {
      const res = await fetch("/api/alerts/logs");
      if (res.ok) {
        const data = await res.json();
        setSchedulerLogs(data.logs || []);
      }
    } catch (err) {
      // Soft-log polling network errors (such as during dev server restarts) to prevent test harness noise
      console.warn("Scheduler logs fetch status:", err instanceof Error ? err.message : err);
    }
  };

  const triggerDaemonScan = async () => {
    setIsScanningDaemon(true);
    setDaemonSuccessMessage(null);
    try {
      const res = await fetch("/api/alerts/trigger-scan", {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setSchedulerLogs(data.logs || []);
        if (data.autoDispatched) {
          setDaemonSuccessMessage("Daemon sweep triggered and matching digest successfully sent directly to your email!");
        } else {
          setDaemonSuccessMessage("Daemon completed global scan. Verified compatibility constraints successfully.");
        }
        // Refresh job listings
        fetchJobs(searchQuery);
      }
    } catch (err) {
      console.error("Error triggering daemon scan:", err);
    } finally {
      setIsScanningDaemon(false);
    }
  };

  // Load Initial Data with unmount protection
  useEffect(() => {
    let isMounted = true;
    fetchProfile();
    fetchJobs();
    fetchRecruiters();
    fetchSchedulerLogs();
    fetchFreelanceProfile();
    fetchFreelanceGigs();
    fetchHostingerConfig();
    const interval = setInterval(() => {
      if (isMounted) {
        fetchSchedulerLogs();
      }
    }, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Sync recipient email with the selected job's HR email
  useEffect(() => {
    if (selectedJob) {
      setRecipientEmail(selectedJob.publicHrEmail || "");
    }
  }, [selectedJob]);

  const fetchFreelanceProfile = async () => {
    try {
      const res = await fetch("/api/freelance/profile");
      if (res.ok) {
        const data = await res.json();
        setFreelanceProfileState(data);
      }
    } catch (err) {
      console.error("Error fetching freelance profile:", err);
    }
  };

  const fetchFreelanceGigs = async (search?: string) => {
    setIsLoadingGigs(true);
    setGigsStatus("live");
    try {
      const url = search ? `/api/freelance/gigs?q=${encodeURIComponent(search)}` : "/api/freelance/gigs";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const gigList = Array.isArray(data) ? data : (data.gigs || []);
        setFreelanceGigs(gigList);
        if (data.status) {
          setGigsStatus(data.status);
        }
      } else {
        setGigsStatus("Live source unavailable");
      }
    } catch (err) {
      console.error("Error fetching freelance gigs:", err);
      setGigsStatus("Live source unavailable");
    } finally {
      setIsLoadingGigs(false);
    }
  };

  const saveFreelanceProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFreelanceProfile(true);
    setFreelanceSaveSuccess(false);
    try {
      const res = await fetch("/api/freelance/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(freelanceProfileState)
      });
      if (res.ok) {
        setFreelanceSaveSuccess(true);
        setTimeout(() => setFreelanceSaveSuccess(false), 3000);
        fetchFreelanceGigs(freelanceSearch);
      }
    } catch (err) {
      console.error("Error saving freelance profile:", err);
    } finally {
      setIsSavingFreelanceProfile(false);
    }
  };

  const addOfferingTag = () => {
    const offering = newOffering.trim();
    const currentOfferings = freelanceProfileState?.offerings || [];
    if (offering && !currentOfferings.includes(offering)) {
      setFreelanceProfileState(prev => ({
        ...prev,
        offerings: [...(prev.offerings || []), offering]
      }));
      setNewOffering("");
    }
  };

  const removeOfferingTag = (offeringToRemove: string) => {
    setFreelanceProfileState(prev => ({
      ...prev,
      offerings: prev.offerings.filter(o => o !== offeringToRemove)
    }));
  };

  const addProjectItem = () => {
    if (!newProject.title.trim() || !newProject.description.trim()) return;
    const createdProject = {
      id: "proj-" + Date.now(),
      title: newProject.title.trim(),
      techStack: (newProject.techStack || "").split(",").map(t => t.trim()).filter(t => t.length > 0),
      description: newProject.description.trim(),
      projectUrl: newProject.projectUrl.trim() || undefined
    };

    setFreelanceProfileState(prev => ({
      ...prev,
      projects: [...(prev.projects || []), createdProject]
    }));

    setNewProject({
      title: "",
      techStack: "",
      description: "",
      projectUrl: ""
    });
  };

  const removeProjectItem = (idToRemove: string) => {
    setFreelanceProfileState(prev => ({
      ...prev,
      projects: (prev.projects || []).filter(p => p.id !== idToRemove)
    }));
  };

  const handleDraftFreelanceProposal = async (gigId: string) => {
    setIsDraftingProposal(true);
    setProposalDraftError(null);
    setProposalDraftResult(null);
    setProposalEmailSuccess(false);
    setIsEditingPitch(false);
    setSaveFewShotFeedbackSuccess(false);
    try {
      const res = await fetch("/api/freelance/gigs/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gigId })
      });
      const data = await res.json();
      if (res.ok) {
        setProposalDraftResult(data);
        setEditedPitchText(data.pitchText || "");
      } else {
        setProposalDraftError(data.error || "Failed to generate proposal draft.");
      }
    } catch (err: any) {
      setProposalDraftError(err.message || "Failed to contact proposal generator.");
    } finally {
      setIsDraftingProposal(false);
    }
  };

  const handleSaveAndCorrectPitch = async () => {
    if (!proposalDraftResult) return;
    
    // Update local proposal draft with the corrected text
    const updatedResult = {
      ...proposalDraftResult,
      pitchText: editedPitchText
    };
    setProposalDraftResult(updatedResult);
    setIsEditingPitch(false);
    
    // If user checked "Save as successful few-shot example for model tuning"
    if (alsoSaveAsFewShot) {
      try {
        const res = await fetch("/api/freelance/few-shot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gigTitle: selectedGig?.title || proposalDraftResult.title || "Custom Freelance Gig",
            pitchText: editedPitchText
          })
        });
        if (res.ok) {
          setSaveFewShotFeedbackSuccess(true);
          setTimeout(() => setSaveFewShotFeedbackSuccess(false), 3000);
          // Refresh freelance profile to load updated list of few-shot examples
          fetchFreelanceProfile();
        }
      } catch (err) {
        console.error("Error registering few-shot proposal example:", err);
      }
    }
  };

  const handleDeleteFewShotExample = async (id: string) => {
    try {
      const res = await fetch(`/api/freelance/few-shot/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        // Refresh freelance profile
        fetchFreelanceProfile();
      }
    } catch (err) {
      console.error("Error deleting few-shot example:", err);
    }
  };

  const handleEmailProposal = async () => {
    if (!gmailAccessToken || !proposalDraftResult) return;
    setIsEmailingProposal(true);
    setProposalEmailSuccess(false);
    setProposalEmailError(null);

    const emailSubject = `Proposal: Consulting Services for ${selectedGig?.title || "Contract Gig"}`;
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #1e293b; background-color: #0c1220; color: #f1f5f9; border-radius: 8px;">
        <h2 style="color: #10b981; border-bottom: 1px solid #1e293b; padding-bottom: 12px; font-family: monospace; margin-bottom: 20px;">
          Freelance Proposal Pitch
        </h2>
        
        <div style="background-color: #070b13; color: #cbd5e1; padding: 20px; border-radius: 6px; font-size: 14px; line-height: 1.6; border: 1px solid #1e293b; white-space: pre-wrap; font-family: sans-serif; margin-bottom: 15px;">
${proposalDraftResult.pitchText}
        </div>

        <div style="background-color: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); padding: 15px; border-radius: 6px; font-size: 12px; margin-bottom: 20px;">
          <strong style="color: #10b981; display: block; margin-bottom: 5px; font-family: monospace;">Estimated Metrics:</strong>
          <span>Estimated Hours: <strong>${proposalDraftResult.estimatedHours} hrs</strong></span><br/>
          <span>Estimated Total Cost: <strong>${proposalDraftResult.totalCostEstimate}</strong></span>
        </div>

        <div style="font-size: 11px; color: #64748b; font-family: monospace; border-top: 1px solid #1e293b; padding-top: 15px;">
          Scouted and dispatched via Aziz Assistant Freelance Module.
        </div>
      </div>
    `;

    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gmailAccessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ to: proposalRecipientEmail, subject: emailSubject, body: htmlBody })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProposalEmailSuccess(true);
        setProposalRecipientEmail("");
      } else {
        setProposalEmailError(data.error || "Failed to dispatch proposal email.");
      }
    } catch (err: any) {
      setProposalEmailError(err.message || "Network error occurred sending pitch.");
    } finally {
      setIsEmailingProposal(false);
    }
  };

  const handleCreateCustomGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGigTitle.trim() || !newGigDescription.trim()) return;
    setIsSavingCustomGig(true);
    try {
      const skillsArray = (newGigSkills || "")
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const res = await fetch("/api/freelance/gigs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newGigTitle,
          platform: newGigPlatform,
          budget: newGigBudget,
          duration: newGigDuration,
          complexity: newGigComplexity,
          description: newGigDescription,
          skillsRequired: skillsArray
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Refresh gigs list
        await fetchFreelanceGigs();
        // Reset states
        setNewGigTitle("");
        setNewGigDescription("");
        setNewGigSkills("");
        setIsPastingGig(false);
        // Select newly added gig
        if (data.gig) {
          setSelectedGig(data.gig);
          setProposalDraftResult(null);
          setProposalDraftError(null);
          setOptimizationResult(null);
          setActiveProposalTab("pitch");
        }
      }
    } catch (err) {
      console.error("Error creating custom gig:", err);
    } finally {
      setIsSavingCustomGig(false);
    }
  };

  const handleOptimizeProfileAlignment = async () => {
    if (!selectedGig) return;
    setIsOptimizingProfile(true);
    setOptimizationResult(null);
    setOptimizationError(null);
    try {
      const res = await fetch("/api/freelance/gigs/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gigId: selectedGig.id })
      });
      const data = await res.json();
      if (res.ok) {
        setOptimizationResult(data);
      } else {
        setOptimizationError(data.error || "Failed to analyze profile alignment optimization.");
      }
    } catch (err: any) {
      setOptimizationError(err.message || "Network error occurred analyzing alignment.");
    } finally {
      setIsOptimizingProfile(false);
    }
  };

  // Milestone editing inline helper functions
  const handleEditMilestoneText = (index: number, newText: string) => {
    if (!proposalDraftResult) return;
    const updatedMilestones = [...proposalDraftResult.milestones];
    updatedMilestones[index] = newText;
    setProposalDraftResult({
      ...proposalDraftResult,
      milestones: updatedMilestones
    });
  };

  const handleDeleteMilestoneItem = (index: number) => {
    if (!proposalDraftResult) return;
    const updatedMilestones = proposalDraftResult.milestones.filter((_: any, i: number) => i !== index);
    setProposalDraftResult({
      ...proposalDraftResult,
      milestones: updatedMilestones
    });
  };

  const handleAddMilestoneItem = (text: string) => {
    if (!proposalDraftResult || !text.trim()) return;
    const updatedMilestones = [...(proposalDraftResult.milestones || []), text.trim()];
    setProposalDraftResult({
      ...proposalDraftResult,
      milestones: updatedMilestones
    });
  };

  const handleUpdateDurationAndBudget = (hours: number, cost: string) => {
    if (!proposalDraftResult) return;
    setProposalDraftResult({
      ...proposalDraftResult,
      estimatedHours: hours,
      totalCostEstimate: cost
    });
  };

  const copyProposalToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedProposalText(true);
    setTimeout(() => setCopiedProposalText(false), 2000);
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/job-profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      console.error("Error fetching job profile:", err);
    }
  };

  const fetchJobs = async (search?: string) => {
    setIsLoadingJobs(true);
    setJobsStatus("live");
    try {
      const url = search ? `/api/jobs?q=${encodeURIComponent(search)}` : "/api/jobs";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        if (data.status) {
          setJobsStatus(data.status);
        }
      } else {
        setJobsStatus("Live source unavailable");
      }
    } catch (err) {
      console.error("Error fetching job listings:", err);
      setJobsStatus("Live source unavailable");
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const fetchRecruiters = async () => {
    try {
      const res = await fetch("/api/recruiters");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.contacts || data.recruiters || []);
        setRecruiters(list);
      }
    } catch (err) {
      console.error("Error fetching recruiter directory:", err);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSaveSuccess(false);
    try {
      const res = await fetch("/api/job-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        setProfileSaveSuccess(true);
        setTimeout(() => setProfileSaveSuccess(false), 3000);
        // Refresh job listings to reflect newly saved skills
        fetchJobs(searchQuery);
      }
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const addSkillTag = () => {
    const skill = newSkill.trim();
    const currentSkills = profile?.skills || [];
    if (skill && !currentSkills.includes(skill)) {
      setProfile(prev => ({
        ...prev,
        skills: [...(prev.skills || []), skill]
      }));
      setNewSkill("");
    }
  };

  const removeSkillTag = (skillToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      skills: (prev.skills || []).filter(s => s !== skillToRemove)
    }));
  };

  const addCountryTag = () => {
    const country = newCountry.trim();
    const currentCountries = profile?.preferredCountries || [];
    if (country && !currentCountries.includes(country)) {
      setProfile(prev => ({
        ...prev,
        preferredCountries: [...(prev.preferredCountries || []), country]
      }));
      setNewCountry("");
    }
  };

  const removeCountryTag = (countryToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      preferredCountries: prev.preferredCountries.filter(c => c !== countryToRemove)
    }));
  };

  const handleFileChange = async (file: File) => {
    if (!file) return;
    setIsParsingFile(true);
    setParsingError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string;
      if (!base64Data) {
        setParsingError("Unable to read local file content.");
        setIsParsingFile(false);
        return;
      }

      const base64Content = base64Data.split(",")[1];
      const mimeType = file.type || "application/octet-stream";

      try {
        const response = await fetch("/api/parse-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileData: base64Content,
            mimeType: mimeType,
            fileName: file.name
          })
        });

        const data = await response.json();
        if (response.ok && data.text) {
          setProfile(prev => ({ ...prev, resume: data.text }));
          // Switch to copy-paste mode so the candidate can inspect and edit the parsed text
          setResumeInputMode("paste");
        } else {
          setParsingError(data.error || "Failed to extract text from file.");
        }
      } catch (err: any) {
        setParsingError(err.message || "Network error processing document.");
      } finally {
        setIsParsingFile(false);
      }
    };

    reader.onerror = () => {
      setParsingError("Error reading local file.");
      setIsParsingFile(false);
    };

    reader.readAsDataURL(file);
  };

  // Run ATS Comparison (Simulated database job or custom pasted JDs)
  const runCompareAndDraft = async (job?: Job) => {
    setIsComparing(true);
    setComparisonResult(null);
    setComparisonError(null);
    setEmailSendSuccess(false);
    setEmailSendError(null);
    
    // Switch to ATS tab to display loading state
    setActiveTab("ats");

    let payload: any = {};
    if (job) {
      setSelectedJob(job);
      payload = { jobId: job.id };
      // pre-fill custom JD form for visual consistency
      setCustomTitle(job.title);
      setCustomCompany(job.company);
      setCustomLocation(job.location);
      setCustomSkillsString(job.skillsRequired.join(", "));
      setCustomJd(job.description);
      setRecipientEmail(job.publicHrEmail || "");
    } else {
      setSelectedJob(null);
      payload = {
        customTitle,
        customCompany,
        customLocation,
        customSkills: (customSkillsString || "").split(",").map(s => s.trim()).filter(Boolean),
        customJd
      };
    }

    try {
      const res = await fetch("/api/jobs/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setComparisonResult(data);
      } else {
        setComparisonError(data.error || "Failed to analyze Job Description.");
      }
    } catch (err: any) {
      setComparisonError(err.message || "Network error evaluating Job Description.");
    } finally {
      setIsComparing(false);
    }
  };

  const handleAddRecruiter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingRecruiter(true);
    setRecruiterSuccess(false);
    try {
      const res = await fetch("/api/recruiters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recForm)
      });
      if (res.ok) {
        setRecruiterSuccess(true);
        setRecForm({ name: "", company: "", email: "", linkedin: "", notes: "" });
        fetchRecruiters();
        setTimeout(() => setRecruiterSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Error adding recruiter:", err);
    } finally {
      setIsAddingRecruiter(false);
    }
  };

  const handleDeleteRecruiter = async (id: string) => {
    showCustomConfirm(
      "Delete Recruiter Contact",
      "Are you sure you want to delete this recruiter contact?",
      async () => {
        try {
          const res = await fetch(`/api/recruiters/${id}`, { method: "DELETE" });
          if (res.ok) {
            fetchRecruiters();
          }
        } catch (err) {
          console.error("Error deleting recruiter:", err);
        }
      }
    );
  };

  // Dispatch custom tailored cover letter via Gmail API proxy or Hostinger SMTP
  const handleEmailCoverLetter = async () => {
    if (!recipientEmail || !comparisonResult?.coverLetterDraft) return;

    if (coverLetterSender === "gmail" && !gmailAccessToken) {
      showCustomAlert("Authentication Required", "Please connect your Gmail account first in the Gmail tab.");
      return;
    }
    if (coverLetterSender === "hostinger" && !hostingerConfig.isConfigured) {
      showCustomAlert("SMTP Settings Required", "Please configure your Hostinger SMTP credentials in the Hostinger SMTP Settings tab.");
      return;
    }

    const senderEmailStr = coverLetterSender === "gmail" ? (gmailUserEmail || "your Gmail account") : hostingerConfig.smtpUser;
    
    showCustomConfirm(
      "OpenClaw Dispatch Request",
      `Are you sure you want to send this tailored cover letter from "${senderEmailStr}" to recruiter: ${recipientEmail}?`,
      async () => {
        setIsEmailingCoverLetter(true);
        setEmailSendSuccess(false);
        setEmailSendError(null);

        const emailSubject = `Application for ${customTitle || selectedJob?.title || "Specialist Position"} - Tailored Cover Letter`;
        
        try {
          if (coverLetterSender === "gmail") {
            // Structure email HTML
            const htmlBody = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #1e293b; background-color: #0c1220; color: #f1f5f9; border-radius: 8px;">
                <h2 style="color: #6366f1; border-bottom: 1px solid #1e293b; padding-bottom: 12px; font-family: sans-serif; margin-bottom: 20px;">
                  Application Submission & Credentials
                </h2>
                <div style="background-color: #070b13; color: #cbd5e1; padding: 20px; border-radius: 6px; font-size: 14px; line-height: 1.6; border: 1px solid #1e293b; white-space: pre-wrap;">
${comparisonResult.coverLetterDraft}
                </div>
                <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; font-family: monospace;">
                  This communication was prepared and dispatched autonomously via OpenClaw Job Agent Workspace.
                </div>
              </div>
            `;

            const res = await fetch("/api/gmail/send", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${gmailAccessToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ to: recipientEmail, subject: emailSubject, body: htmlBody })
            });

            const data = await res.json();
            if (res.ok && data.success) {
              setEmailSendSuccess(true);
              setRecipientEmail("");
            } else {
              setEmailSendError(data.error || "Failed to dispatch email cover letter via Gmail.");
            }
          } else {
            // Send via Hostinger SMTP
            const res = await fetch("/api/hostinger/send-pitch", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                to: recipientEmail,
                subject: emailSubject,
                bodyText: comparisonResult.coverLetterDraft,
                gigTitle: customTitle || selectedJob?.title || "Specialist Position"
              })
            });

            const data = await res.json();
            if (res.ok && data.success) {
              setEmailSendSuccess(true);
              setRecipientEmail("");
            } else {
              setEmailSendError(data.error || "Failed to dispatch email cover letter via Hostinger SMTP.");
            }
          }
        } catch (err: any) {
          setEmailSendError(err.message || "Network error sending email.");
        } finally {
          setIsEmailingCoverLetter(false);
        }
      }
    );
  };

  // Compile top matches based on profile and dispatch them directly as a Gmail Alert
  const handleSendMatchDigest = async () => {
    if (!gmailAccessToken || !gmailUserEmail) return;
    
    showCustomConfirm(
      "OpenClaw Dispatch Request",
      `Do you want to run an instant matching job scan and send a professional alert digest directly to your email address: ${gmailUserEmail}?`,
      async () => {
        setIsSendingDigest(true);
        setDigestSuccess(false);
        setDigestError(null);

        try {
          // Fetch fresh evaluations
          const searchRes = await fetch("/api/jobs");
          if (!searchRes.ok) throw new Error("Could not retrieve current open listings.");
          const searchData = await searchRes.json();
          const listings = searchData.jobs || [];

          // Filter based on user preference score
          const minScore = alertSettings.minMatchScore;
          const filteredMatches = listings.filter((j: any) => (j.compatibilityScore || 50) >= minScore);

          if (filteredMatches.length === 0) {
            setDigestError(`No job listings found matching or exceeding your minimum match score of ${minScore}%. Try adjusting your criteria under the Alert Center.`);
            setIsSendingDigest(false);
            return;
          }

          const matchCardsHtml = filteredMatches.map((j: any) => {
            const score = j.compatibilityScore || 50;
            const matched = j.skillsMatched || [];
            const missing = j.skillsRequired.filter((s: string) => !matched.includes(s));
            
            return `
              <div style="border: 1px solid #1e293b; background-color: #070b13; border-radius: 8px; padding: 15px; margin-bottom: 12px; margin-top: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 8px; margin-bottom: 8px;">
                  <div>
                    <strong style="color: #818cf8; font-size: 11px; font-family: monospace; text-transform: uppercase;">${j.company}</strong>
                    <h4 style="margin: 2px 0 0 0; color: #ffffff; font-size: 14px; font-family: sans-serif;">${j.title}</h4>
                  </div>
                  <div style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; color: #10b981; font-family: monospace; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 4px; white-space: nowrap;">
                    ${score}% Match
                  </div>
                </div>
                <p style="margin: 0; color: #94a3b8; font-size: 12px; font-family: sans-serif;">📍 ${j.location} | 💰 ${j.salary}</p>
                <p style="margin: 8px 0; color: #cbd5e1; font-size: 11px; font-family: sans-serif; line-height: 1.5;">${j.description}</p>
                <div style="margin-top: 6px; font-size: 11px; font-family: monospace;">
                  <span style="color: #64748b; text-transform: uppercase;">Skills Matched: </span>
                  <strong style="color: #10b981;">${matched.join(", ") || "None"}</strong>
                </div>
                <div style="margin-top: 3px; font-size: 11px; font-family: monospace;">
                  <span style="color: #64748b; text-transform: uppercase;">Skills Missing: </span>
                  <span style="color: #f43f5e; font-style: italic;">${missing.join(", ") || "None (Perfect Fit!)"}</span>
                </div>
              </div>
            `;
          }).join("");

          const htmlBody = `
            <div style="font-family: sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #1e293b; background-color: #0c1220; color: #f1f5f9; border-radius: 12px;">
              <div style="text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 15px; margin-bottom: 20px;">
                <h2 style="color: #818cf8; margin: 0; font-family: sans-serif; font-size: 22px;">🔔 Intelligent Matching Alert</h2>
                <p style="font-size: 12px; color: #94a3b8; margin: 5px 0 0 0; font-family: monospace; text-transform: uppercase;">OpenClaw Auto Matcher Service</p>
              </div>
              
              <p style="font-size: 13px; color: #cbd5e1; line-height: 1.6; font-family: sans-serif;">
                We compiled a fresh digest of job openings matching your candidate skills criteria (<strong>${profile.skills.join(", ")}</strong>).
              </p>

              <div style="background-color: rgba(99, 102, 241, 0.05); border: 1px solid #1e293b; border-radius: 8px; padding: 15px; margin-bottom: 20px; font-size: 12px; font-family: sans-serif;">
                <strong style="color: #818cf8; font-family: monospace; text-transform: uppercase; display: block; border-bottom: 1px solid #1e293b; padding-bottom: 6px; margin-bottom: 8px;">🎯 Match Criteria Settings</strong>
                <span style="color: #94a3b8;">Experience Target:</span> <strong>${profile.experienceYears} Years</strong><br/>
                <span style="color: #94a3b8;">Visa Preference:</span> <strong>${profile.visaPreference}</strong><br/>
                <span style="color: #94a3b8;">Notification Settings:</span> <strong>${alertSettings.alertFrequency} (Min. Score: ${minScore}%)</strong>
              </div>

              <h3 style="font-size: 14px; color: #ffffff; border-bottom: 1px solid #1e293b; padding-bottom: 8px; margin-bottom: 15px; font-family: sans-serif;">💼 Top Matches Detected (${filteredMatches.length})</h3>
              
              ${matchCardsHtml}

              <div style="margin-top: 25px; padding-top: 15px; border-top: 2px solid #1e293b; font-size: 11px; color: #64748b; font-family: monospace; text-align: center;">
                This email was generated and dispatched via the Google OAuth secure mail flow in your OpenClaw workspace.
              </div>
            </div>
          `;

          const mailRes = await fetch("/api/gmail/send", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${gmailAccessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              to: gmailUserEmail,
              subject: `[OpenClaw Alert] ${filteredMatches.length} Compatible Jobs Found matching your Profile`,
              body: htmlBody
            })
          });

          const mailData = await mailRes.json();
          if (mailRes.ok && mailData.success) {
            setDigestSuccess(true);
            setTimeout(() => setDigestSuccess(false), 6000);
          } else {
            setDigestError(mailData.error || "Failed to deliver matching alerts digest.");
          }
        } catch (err: any) {
          setDigestError(err.message || "Network error dispatching alert digest.");
        } finally {
          setIsSendingDigest(false);
        }
      }
    );
  };

  const handleAddMissingSkills = async (skillsToAdd: string[]) => {
    const updatedSkills = [...profile.skills];
    let addedCount = 0;
    skillsToAdd.forEach(s => {
      if (!updatedSkills.some(existing => existing.toLowerCase() === s.toLowerCase())) {
        updatedSkills.push(s);
        addedCount++;
      }
    });

    if (addedCount === 0) {
      showCustomAlert("Profile Synced", "All of these skills are already in your profile.");
      return;
    }

    const updatedProfile = {
      ...profile,
      skills: updatedSkills
    };

    setProfile(updatedProfile);

    try {
      const res = await fetch("/api/job-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProfile)
      });
      if (res.ok) {
        showCustomAlert("Skills Synced", `Success: Added ${addedCount} missing skills to your profile!`);
        fetchJobs(searchQuery);
      } else {
        showCustomAlert("Sync Error", "Failed to sync updated skills profile with the server backend.");
      }
    } catch (err) {
      console.error("Error saving profile with missing skills:", err);
      showCustomAlert("Network Error", "Network error occurred while syncing profile.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCoverLetter(true);
    setTimeout(() => setCopiedCoverLetter(false), 2000);
  };

  const handleSaveJob = async (job: Job) => {
    try {
      const res = await fetch("/api/employment/v2/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job, status: "saved", categories: [], notes: "" })
      });
      if (res.ok) {
        showCustomAlert("Job Saved", `Successfully bookmarked "${job.title}" at "${job.company}". Access it anytime under the "Saved Bookmarks" tab!`);
      } else {
        const errorData = await res.json();
        showCustomAlert("Save Failed", errorData.error || "Failed to save job. It may be a duplicate.");
      }
    } catch (err) {
      console.error("Error saving job:", err);
      showCustomAlert("Error", "A network error occurred while saving the job entry.");
    }
  };

  const parseHourlyRate = (budgetStr: string): number | null => {
    const match = budgetStr?.match(/\$(\d+)\s*\/\s*hr/i);
    return match ? parseInt(match[1], 10) : null;
  };

  const filteredFreelanceGigs = freelanceGigs.filter(gig => {
    const platformMatch = (selectedPlatforms || []).length === 0 
      ? true 
      : (selectedPlatforms || []).some(sp => {
          if (!gig.platform) return true;
          const clean1 = sp.toLowerCase().replace(/[\s\.\-_]/g, "");
          const clean2 = gig.platform.toLowerCase().replace(/[\s\.\-_]/g, "");
          return clean1 === clean2 || clean1.includes(clean2) || clean2.includes(clean1) || sp === gig.platform;
        });
    const scoreMatch = (gig.compatibilityScore || 0) >= minCompatibilityScore;
    
    let rateMatch = true;
    if (rateFilterOption === "meets_rate") {
      const gigHourlyRate = parseHourlyRate(gig.budget);
      if (gigHourlyRate !== null) {
        rateMatch = gigHourlyRate >= freelanceProfileState.hourlyRate;
      } else {
        rateMatch = true; // Fixed price meets rate options by default
      }
    } else if (rateFilterOption === "fixed_only") {
      rateMatch = gig.budget?.toLowerCase().includes("fixed");
    }

    return platformMatch && scoreMatch && rateMatch;
  });

  return (
    <div className="flex flex-col h-full bg-[#030712] border border-[#1e293b] rounded-lg overflow-hidden shadow-2xl" id="job-agent-panel">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-[#080d1a] border-b border-[#1e293b] gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/25 rounded-md text-indigo-400">
            <Briefcase className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="font-sans text-xs font-semibold text-slate-400 tracking-wider block">INTELLIGENT AGENT MODULE</span>
            <h2 className="font-sans text-sm font-bold text-white tracking-tight">Job Search & Application Matcher</h2>
          </div>
        </div>

        {/* Workspace Sub-tabs */}
        <div className="flex flex-wrap bg-[#030712] border border-[#1e293b] p-1 rounded-md gap-1 self-start md:self-auto font-sans text-xs max-w-full">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === "profile" ? "bg-indigo-600/10 text-indigo-400 font-semibold border border-indigo-500/25" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Candidate Profile
          </button>
          <button
            onClick={() => setActiveTab("jobs")}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === "jobs" ? "bg-indigo-600/10 text-indigo-400 font-semibold border border-indigo-500/25" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Matched Board
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === "saved" ? "bg-indigo-600/10 text-indigo-400 font-semibold border border-indigo-500/25" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Saved Bookmarks 📁
          </button>
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === "pipeline" ? "bg-indigo-600/10 text-indigo-400 font-semibold border border-indigo-500/25" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Pipeline Tracker 🤝
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === "history" ? "bg-indigo-600/10 text-indigo-400 font-semibold border border-indigo-500/25" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Search Logs ⏱️
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === "analytics" ? "bg-indigo-600/10 text-indigo-400 font-semibold border border-indigo-500/25" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Analytics Funnel 📊
          </button>
          <button
            onClick={() => setActiveTab("ats")}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === "ats" ? "bg-indigo-600/10 text-indigo-400 font-semibold border border-indigo-500/25" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ATS JD Evaluator
          </button>
          <button
            onClick={() => setActiveTab("recruiters")}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === "recruiters" ? "bg-indigo-600/10 text-indigo-400 font-semibold border border-indigo-500/25" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Recruiters ({recruiters.length})
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === "alerts" ? "bg-indigo-600/10 text-indigo-400 font-semibold border border-indigo-500/25" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            AI Career Research Agent 🤖
          </button>
          <button
            onClick={() => setActiveTab("freelance")}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === "freelance" ? "bg-indigo-600/10 text-indigo-400 font-semibold border border-indigo-500/25" : "text-slate-400 hover:text-slate-200"
            }`}
            id="freelance-tab-btn"
          >
            Freelance Gigs 💼
          </button>
          <button
            onClick={() => setActiveTab("todo")}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "todo" ? "bg-purple-600/20 text-purple-300 font-semibold border border-purple-500/40 shadow-sm" : "text-purple-400 hover:text-purple-200"
            }`}
            id="todo-roadmap-tab-btn"
          >
            <span>Roadmap & TODOs 📋</span>
          </button>
          <button
            onClick={() => setActiveTab("hostinger")}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === "hostinger" ? "bg-indigo-600/10 text-indigo-400 font-semibold border border-indigo-500/25" : "text-slate-400 hover:text-slate-200"
            }`}
            id="hostinger-tab-btn"
          >
            Hostinger Mail 📧
          </button>
          <button
            onClick={() => setActiveTab("telegram")}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "telegram" ? "bg-cyan-600/20 text-cyan-300 font-semibold border border-cyan-500/40 shadow-sm" : "text-cyan-400 hover:text-cyan-200"
            }`}
            id="telegram-tab-btn"
          >
            <span>Telegram & Dual Alerts 🤖</span>
          </button>
        </div>
      </div>

      {/* Integration Status Banner */}
      <div className="bg-[#0a1122] border-b border-[#131d35] px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono gap-1">
        <div className="flex flex-wrap items-center gap-3 text-slate-400">
          <div className="flex items-center gap-1.5">
            <Fingerprint className="w-3.5 h-3.5 text-indigo-400" />
            <span>Integrations:</span>
          </div>
          <div className="flex items-center gap-1.5 border-r border-[#131d35] pr-3">
            <span className="text-[10px] text-slate-500 uppercase">Dual LLM Core:</span>
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle className="w-3 h-3 text-emerald-400" /> Gemini + OpenRouter Free LLM Fallback (Zero Rate Limits)
            </span>
          </div>
          <div className="flex items-center gap-1.5 border-r border-[#131d35] pr-3">
            <span className="text-[10px] text-slate-500 uppercase">Gmail OAuth:</span>
            {gmailAccessToken ? (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle className="w-3 h-3 text-emerald-400" /> Connected ({gmailUserEmail})
              </span>
            ) : (
              <span className="text-slate-500">Offline</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase">Hostinger SMTP:</span>
            {hostingerConfig.isConfigured ? (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle className="w-3 h-3 text-emerald-400" /> Active ({hostingerConfig.smtpUser})
              </span>
            ) : (
              <span className="text-amber-500 flex items-center gap-1">
                ⚠️ Unconfigured ({hostingerConfig.websiteUrl})
              </span>
            )}
          </div>
        </div>
        <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded self-start sm:self-auto font-bold">
          {hostingerConfig.brandName} Engine
        </span>
      </div>

      {/* Primary Workspace Scroll Box */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        
        {/* TAB 1: Profile Settings */}
        {activeTab === "profile" && (
          <div className="space-y-6 max-w-3xl">
            
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
              <h3 className="font-sans text-xs font-bold text-white flex items-center gap-1.5 mb-1">
                <User className="w-4 h-4 text-indigo-400" /> Candidate Profile Data
              </h3>
              <p className="text-xs text-slate-400 leading-normal">
                These properties form the base layer of knowledge for your autonomous job assistant. 
                They are mapped automatically against incoming job descriptions to evaluate alignment.
              </p>
            </div>

            {/* Dual-Core Career Profile Indicator */}
            <div className="p-4 bg-[#0a0f1d] border border-[#1e293b] rounded-xl space-y-3 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-900">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block font-bold">💼 Active Professional Mode:</span>
                <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-bold">
                  IT Hardware Support + AI-Assisted Automation
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Hardware Core Specialty */}
                <div className="p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                    <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
                    🔧 Main Role: Hardware & Networks
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal font-sans">
                    Physical server racking, desktop & laptop maintenance, workstation onboarding, local network switches, cabling, and basic firewall routing configuration.
                  </p>
                </div>

                {/* AI-Assisted Software Core */}
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    🤖 Tech Stack: AI-Assisted Development
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal font-sans">
                    Dockerization, shell scripting, API services, and basic DevOps pipelines—fully supported and generated on-demand using modern AI Agents.
                  </p>
                </div>
              </div>
            </div>

            {profileSaveSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Job Assistant profile successfully persisted and indexed!</span>
              </div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-4">
              
              {/* Experience Years & Visa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider">Years of Experience:</label>
                  <input
                    type="number"
                    min="0"
                    max="40"
                    value={profile.experienceYears}
                    onChange={(e) => setProfile(prev => ({ ...prev, experienceYears: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider">Visa Sponsorship Preference:</label>
                  <select
                    value={profile.visaPreference}
                    onChange={(e) => setProfile(prev => ({ ...prev, visaPreference: e.target.value }))}
                    className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="Sponsorship Required">Requires Visa Sponsorship</option>
                    <option value="No Sponsorship Needed">No Sponsorship Needed (Citizen / Permanent Resident)</option>
                  </select>
                </div>
              </div>

              {/* Skills Tags */}
              <div className="space-y-2">
                <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider">Professional Skill Tags:</label>
                
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#060a12] border border-[#1e293b] rounded-lg min-h-[50px]">
                  {profile.skills.length === 0 ? (
                    <span className="text-slate-600 text-xs italic p-1">No skills added yet...</span>
                  ) : (
                    profile.skills.map((skill) => (
                      <span key={skill} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-xs">
                        {skill}
                        <button type="button" onClick={() => removeSkillTag(skill)} className="text-indigo-400 hover:text-red-400 font-bold ml-1 text-[10px]">✕</button>
                      </span>
                    ))
                  )}
                </div>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Add skill (e.g. Kubernetes, Python)..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkillTag())}
                    className="flex-1 bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={addSkillTag}
                    className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs transition-colors font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>

              {/* Preferred Countries */}
              <div className="space-y-2">
                <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider">Preferred Countries for Jobs:</label>
                
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#060a12] border border-[#1e293b] rounded-lg min-h-[50px]">
                  {profile.preferredCountries.length === 0 ? (
                    <span className="text-slate-600 text-xs italic p-1">No countries added...</span>
                  ) : (
                    profile.preferredCountries.map((c) => (
                      <span key={c} className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-xs">
                        {c}
                        <button type="button" onClick={() => removeCountryTag(c)} className="text-emerald-400 hover:text-red-400 font-bold ml-1 text-[10px]">✕</button>
                      </span>
                    ))
                  )}
                </div>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Add country (e.g. USA, Canada)..."
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCountryTag())}
                    className="flex-1 bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={addCountryTag}
                    className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs transition-colors font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>

              {/* Dual-Mode Resume Input (Upload File & Copy-Paste Text) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider">Candidate Resume (CV):</label>
                  <div className="flex bg-[#070b14] border border-[#1e293b] p-0.5 rounded-lg gap-0.5 font-sans text-[11px]">
                    <button
                      type="button"
                      onClick={() => setResumeInputMode("upload")}
                      className={`py-1 px-2.5 rounded-md font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        resumeInputMode === "upload"
                          ? "bg-indigo-600/10 text-indigo-400 border border-[#1e293b]"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResumeInputMode("paste")}
                      className={`py-1 px-2.5 rounded-md font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        resumeInputMode === "paste"
                          ? "bg-indigo-600/10 text-indigo-400 border border-[#1e293b]"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      <span>Copy-Paste Text</span>
                    </button>
                  </div>
                </div>

                {resumeInputMode === "upload" ? (
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileChange(file);
                    }}
                    className={`p-6 border border-dashed rounded-xl transition-all text-center space-y-3 ${
                      dragOver 
                        ? "border-indigo-500 bg-indigo-500/5" 
                        : "border-[#1e293b] bg-[#070b13]/60 hover:border-slate-700"
                    }`}
                  >
                    {isParsingFile ? (
                      <div className="py-4 space-y-3">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
                        <div>
                          <h4 className="font-sans text-xs font-bold text-white uppercase tracking-wider">Parsing Resume Document...</h4>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Gemini is analyzing structure and extracting full resume details.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 space-y-3">
                        <div className="w-10 h-10 bg-indigo-500/5 border border-indigo-500/10 rounded-full flex items-center justify-center mx-auto text-indigo-400">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-sans text-xs font-semibold text-slate-200 block">Drag & drop your resume file here</span>
                          <span className="text-[10px] text-slate-500 font-mono mt-1 block">Supports PDF, DOCX, TXT, or Markdown</span>
                        </div>
                        <label className="inline-block py-1 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold cursor-pointer transition-colors">
                          Browse Files
                          <input 
                            type="file" 
                            accept=".pdf,.docx,.doc,.txt,.md" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileChange(file);
                            }}
                            className="hidden" 
                          />
                        </label>
                      </div>
                    )}

                    {parsingError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="text-left leading-normal">{parsingError}</span>
                      </div>
                    )}

                    {profile.resume ? (
                      <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 shrink-0" />
                          <span className="font-semibold text-left">Resume loaded ({profile.resume.length} characters)</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setResumeInputMode("paste")}
                          className="text-indigo-400 hover:text-indigo-300 font-semibold underline text-xs cursor-pointer"
                        >
                          Review & Edit
                        </button>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-slate-500/5 border border-slate-500/10 text-slate-400 text-[11px] rounded-lg">
                        No resume text loaded yet. Upload a file above or click "Copy-Paste Text" to add manually.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider">Paste Resume CV text content:</label>
                      {profile.resume && (
                        <button 
                          type="button" 
                          onClick={() => setProfile(prev => ({ ...prev, resume: "" }))} 
                          className="text-red-400 hover:text-red-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Clear Text
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={10}
                      required
                      placeholder="Paste your resume / CV biography, work achievements, and professional summary here..."
                      value={profile.resume}
                      onChange={(e) => setProfile(prev => ({ ...prev, resume: e.target.value }))}
                      className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg p-3 text-xs text-slate-300 font-sans focus:outline-none focus:border-indigo-500 leading-normal"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-semibold font-sans flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {isSavingProfile ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Indexing Profile Data...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Save Candidate Profile</span>
                  </>
                )}
              </button>

            </form>

          </div>
        )}

        {/* TAB 2: Jobs Board */}
        {activeTab === "jobs" && (
          <div className="space-y-4">
            
            {/* Autonomous 3x-Daily Scraper & DB Control Center */}
            <ScraperControlWidget onRefreshData={() => fetchJobs(searchQuery)} />

            {/* Filter Search */}
            <form onSubmit={(e) => { e.preventDefault(); fetchJobs(searchQuery); }} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter jobs by title, company, country, or specific skills (e.g. Terraform)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs transition-colors font-semibold"
              >
                Search
              </button>
            </form>

            {/* Live Source Status Check */}
            {jobsStatus === "Live source unavailable" && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <h4 className="font-semibold text-white uppercase tracking-wider">Live Source Unavailable</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    The backend search grounding engine is offline or experiencing network errors. Aziz Assistant refuses to display simulated or mock data. Please configure your GEMINI_API_KEY.
                  </p>
                </div>
              </div>
            )}

            {/* Jobs list */}
            {isLoadingJobs ? (
              <div className="text-center py-20 text-slate-500 text-xs font-mono">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                Querying global open listings database...
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-20 text-slate-500 text-xs">
                No matching positions found. Broaden your search criteria or add more skills to your profile.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {jobs.map((job) => {
                  const compat = (job as any).compatibilityScore || 50;
                  const skillsMatched: string[] = (job as any).skillsMatched || [];
                  const missingSkills = (job.skillsRequired || []).filter(s => !(skillsMatched || []).includes(s));

                  return (
                    <div 
                      key={job.id} 
                      className="p-5 bg-[#0a0f1d] border border-[#1e293b] hover:border-indigo-500/40 rounded-xl transition-all flex flex-col justify-between space-y-4 group"
                    >
                      
                      {/* Header details */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">{job.company}</span>
                          <h4 className="font-sans text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{job.title}</h4>
                          
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-500" /> {job.location}
                            </span>
                            <span className="flex items-center gap-1 font-mono">
                              <DollarSign className="w-3.5 h-3.5 text-slate-500" /> {job.salary}
                            </span>
                          </div>
                        </div>

                        {/* Match indicator */}
                        <div className="text-right flex flex-col items-end shrink-0">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            compat >= 75 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            compat >= 50 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}>
                            {compat}% Match
                          </span>
                          
                          {job.visaSponsorship ? (
                            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/5 px-1 rounded mt-1.5 flex items-center gap-0.5">
                              <Globe className="w-2.5 h-2.5" /> Sponsors Visa
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-slate-500 bg-slate-950 px-1 rounded mt-1.5">
                              No Visa Sponsor
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Brief description */}
                      <p className="text-xs text-slate-400 leading-normal line-clamp-3">
                        {job.description}
                      </p>

                      {/* Skills match summary */}
                      <div className="space-y-1">
                        <span className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider">Required Skills Matching:</span>
                        <div className="flex flex-wrap gap-1">
                          {skillsMatched.map(s => (
                            <span key={s} className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded text-[10px] font-mono font-semibold">
                              ✓ {s}
                            </span>
                          ))}
                          {missingSkills.map(s => (
                            <span key={s} className="px-1.5 py-0.5 bg-slate-800 text-slate-500 border border-slate-700/50 rounded text-[10px] font-mono">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Data Provenance Box */}
                      <div className="p-3 bg-[#070b13] border border-slate-900 rounded-lg space-y-2 text-[11px] font-mono">
                        <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-1">
                          <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Data Provenance Summary</span>
                          <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            {job.verificationStatus || "Verified Live"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-400">
                          <div>
                            <span className="text-slate-600 block text-[9px] uppercase tracking-wider">Acquisition Source:</span>
                            <span className="text-slate-300 font-sans font-semibold">{job.source || "Google Search Index"}</span>
                          </div>
                          <div>
                            <span className="text-slate-600 block text-[9px] uppercase tracking-wider">Confidence Score:</span>
                            <span className="text-slate-300 font-semibold">{job.confidenceScore || 95}%</span>
                          </div>
                          <div>
                            <span className="text-slate-600 block text-[9px] uppercase tracking-wider">Fetch Timestamp:</span>
                            <span className="text-slate-300">{job.timestamp ? new Date(job.timestamp).toLocaleString() : new Date().toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-slate-600 block text-[9px] uppercase tracking-wider">Deduplication:</span>
                            <span className="text-slate-300">{job.deduplicationStatus || "Unique Entry"}</span>
                          </div>
                        </div>
                        {job.originalReference && (
                          <div className="pt-1.5 border-t border-slate-900 flex items-center justify-between">
                            <span className="text-slate-600 text-[9px] uppercase tracking-wider">Verification Origin:</span>
                            <a
                              href={job.originalReference}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold hover:underline"
                            >
                              View Original Listing <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-slate-900 flex gap-2">
                        <button
                          onClick={() => runCompareAndDraft(job)}
                          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold font-sans flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          <span>Compare JD & Calc ATS</span>
                        </button>
                        <button
                          onClick={() => handleSaveJob(job)}
                          className="px-4 py-2 bg-[#111827] hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold font-sans border border-[#1e293b] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Save Job 📁</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* TAB 3: ATS Evaluator */}
        {activeTab === "ats" && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              
              {/* Form Input fields */}
              <div className="xl:col-span-1 space-y-4 p-5 bg-[#0a0f1c] border border-[#1e293b] rounded-xl">
                <div className="flex items-center gap-1.5 border-b border-slate-900 pb-2 mb-2">
                  <Calculator className="w-4 h-4 text-indigo-400" />
                  <span className="font-sans text-xs font-bold text-white uppercase tracking-wider">Configure Target JD</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-0.5">ROLE TITLE:</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior DevOps Specialist"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full bg-[#070b13] border border-[#1e293b] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-0.5">COMPANY:</label>
                    <input
                      type="text"
                      placeholder="e.g. AWS Platforms"
                      value={customCompany}
                      onChange={(e) => setCustomCompany(e.target.value)}
                      className="w-full bg-[#070b13] border border-[#1e293b] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-0.5">LOCATION:</label>
                    <input
                      type="text"
                      placeholder="e.g. Munich, Germany"
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      className="w-full bg-[#070b13] border border-[#1e293b] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-0.5">KEY REQUIRED SKILLS (COMMA SEPARATED):</label>
                    <input
                      type="text"
                      placeholder="Kubernetes, Terraform, AWS, Go"
                      value={customSkillsString}
                      onChange={(e) => setCustomSkillsString(e.target.value)}
                      className="w-full bg-[#070b13] border border-[#1e293b] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-0.5">FULL JOB DESCRIPTION TEXT:</label>
                    <textarea
                      rows={6}
                      placeholder="Paste the target job description or requirements section here to analyze..."
                      value={customJd}
                      onChange={(e) => setCustomJd(e.target.value)}
                      className="w-full bg-[#070b13] border border-[#1e293b] rounded p-2 text-xs font-sans text-slate-300 focus:outline-none focus:border-indigo-500 leading-normal"
                    />
                  </div>
                </div>

                <button
                  onClick={() => runCompareAndDraft()}
                  disabled={isComparing || !customJd.trim()}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-sans text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-4"
                >
                  {isComparing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Evaluating ATS Score...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Run Custom Comparison</span>
                    </>
                  )}
                </button>
              </div>

              {/* Evaluation Outcome Results */}
              <div className="xl:col-span-2 space-y-4">
                
                {isComparing ? (
                  <div className="p-12 border border-slate-900 bg-[#070b13]/40 rounded-xl text-center space-y-3">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
                    <div>
                      <h4 className="font-sans text-xs font-bold text-white uppercase tracking-wider">Analyzing alignment matrices...</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Correlating candidate skill vectors against target keywords with automated semantic modeling.
                      </p>
                    </div>
                  </div>
                ) : comparisonError ? (
                  <div className="p-5 border border-red-900 bg-red-950/20 text-red-400 rounded-xl text-xs flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <span>{comparisonError}</span>
                  </div>
                ) : comparisonResult ? (
                  <div className="space-y-4">
                    
                    {/* Score Summary Box */}
                    <div className="p-5 bg-[#0a0f1d] border border-[#1e293b] rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      
                      {/* Radial Score Gauge */}
                      <div className="flex flex-col items-center text-center p-3 border-r border-slate-900 md:border-r">
                        <div className="relative w-20 h-20 flex items-center justify-center">
                          <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path
                              className="text-slate-800"
                              strokeWidth="3.5"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className={
                                comparisonResult.score >= 75 ? "text-emerald-400" :
                                comparisonResult.score >= 50 ? "text-amber-400" :
                                "text-red-400"
                              }
                              strokeWidth="3.5"
                              strokeDasharray={`${comparisonResult.score}, 100`}
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <span className="font-mono text-xl font-bold text-white">{comparisonResult.score}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono mt-2 uppercase tracking-wider">ATS MATCH SCORE</span>
                      </div>

                      {/* Score Metrics */}
                      <div className="col-span-2 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-slate-500 uppercase">Engine:</span>
                          <span className="text-[10px] font-mono text-indigo-400 font-semibold">{comparisonResult.coverLetterDraft ? "Gemini-3.5 Cognitive Analysis" : "Local Rules Engine fallback"}</span>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-sans">
                          <div className="flex items-center gap-1.5">
                            {comparisonResult.experienceMatch ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-slate-500" />
                            )}
                            <span className="text-slate-300">Experience Years Fit</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Globe className="w-4 h-4 text-emerald-400" />
                            <span className="text-slate-300">Country Preference Match</span>
                          </div>
                        </div>

                        <div className="p-2 bg-[#060a12] border border-slate-900 rounded text-[11px] text-slate-400 leading-relaxed font-sans">
                          <strong>Advisory Recommendations:</strong> {comparisonResult.recommendation}
                        </div>
                      </div>

                    </div>

                    {/* Skill Overlaps List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-[#0a0f1d] border border-slate-900 rounded-lg">
                        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block mb-2 font-semibold">Matched Keywords / Skills ({comparisonResult.matchedSkills.length})</span>
                        <div className="flex flex-wrap gap-1">
                          {comparisonResult.matchedSkills.length === 0 ? (
                            <span className="text-slate-600 text-xs italic">No matching keywords found.</span>
                          ) : (
                            comparisonResult.matchedSkills.map(s => (
                              <span key={s} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded text-xs font-mono font-semibold">
                                ✓ {s}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="p-4 bg-[#0a0f1d] border border-slate-900 rounded-lg">
                        <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block mb-2 font-semibold">Missing Keywords / Skills ({comparisonResult.missingSkills.length})</span>
                        <div className="flex flex-wrap gap-1">
                          {comparisonResult.missingSkills.length === 0 ? (
                            <span className="text-slate-600 text-xs italic">Zero missing keywords detected! Profile fully aligned.</span>
                          ) : (
                            comparisonResult.missingSkills.map(s => (
                              <span key={s} className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/15 rounded text-xs font-mono">
                                {s}
                              </span>
                            ))
                          )}
                        </div>
                        {comparisonResult.missingSkills.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-900/60">
                            <button
                              onClick={() => handleAddMissingSkills(comparisonResult.missingSkills)}
                              className="w-full px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[10px] font-semibold rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              id="add-missing-skills-btn"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Missing Skills to Profile</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tailored Cover Letter Hub */}
                    {comparisonResult.coverLetterDraft && (
                      <div className="p-5 bg-[#0a0f1d] border border-[#1e293b] rounded-xl space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                            <span className="font-sans text-xs font-bold text-white uppercase tracking-wider">Tailored Cover Letter Studio</span>
                          </div>
                          
                          <button
                            onClick={() => copyToClipboard(comparisonResult.coverLetterDraft || "")}
                            className="px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-[11px] font-semibold rounded flex items-center gap-1 transition-all"
                          >
                            {copiedCoverLetter ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-emerald-400" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Text</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Letter box */}
                        <pre className="p-4 bg-[#060a12] border border-slate-900 rounded-lg text-xs font-sans text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                          {comparisonResult.coverLetterDraft}
                        </pre>

                        {/* Direct dispatch bridge with Sender selection */}
                        <div className="p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-lg space-y-4">
                          <div>
                            <span className="block text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider">Direct Dispatch Bridge:</span>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                              Seamlessly deliver this personalized Cover Letter directly to target hiring recruiters from your chosen sender account.
                            </p>
                          </div>

                          {/* Sender Account Selection */}
                          <div className="space-y-2">
                            <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Select Sender Profile (From Account):</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {/* Option 1: Hostinger SMTP */}
                              <button
                                type="button"
                                onClick={() => {
                                  setCoverLetterSender("hostinger");
                                  setEmailSendSuccess(false);
                                  setEmailSendError(null);
                                }}
                                className={`p-2.5 border rounded-lg text-left transition-all ${
                                  coverLetterSender === "hostinger"
                                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                                    : "bg-black/20 border-slate-800 text-slate-400 hover:bg-black/40"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold font-sans">Hostinger Professional SMTP</span>
                                  {coverLetterSender === "hostinger" && <span className="text-emerald-400 text-xs">● Active</span>}
                                </div>
                                <span className="block text-[10px] font-mono text-slate-500 mt-0.5 truncate">
                                  {hostingerConfig.smtpUser || "info@aaditechs.in (Not Configured)"}
                                </span>
                              </button>

                              {/* Option 2: Gmail API */}
                              <button
                                type="button"
                                onClick={() => {
                                  setCoverLetterSender("gmail");
                                  setEmailSendSuccess(false);
                                  setEmailSendError(null);
                                }}
                                className={`p-2.5 border rounded-lg text-left transition-all ${
                                  coverLetterSender === "gmail"
                                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                                    : "bg-black/20 border-slate-800 text-slate-400 hover:bg-black/40"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold font-sans">Google Gmail API</span>
                                  {coverLetterSender === "gmail" && <span className="text-emerald-400 text-xs">● Active</span>}
                                </div>
                                <span className="block text-[10px] font-mono text-slate-500 mt-0.5 truncate">
                                  {gmailAccessToken ? gmailUserEmail : "Not Connected (Connect in Gmail tab)"}
                                </span>
                              </button>
                            </div>
                          </div>

                          {emailSendSuccess && (
                            <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>Letter dispatched to recruiter mailbox successfully! Check your sent history.</span>
                            </div>
                          )}

                          {emailSendError && (
                            <div className="p-2.5 rounded bg-red-950/20 border border-red-500/20 text-red-400 text-xs">
                              {emailSendError}
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="email"
                              required
                              placeholder="recruiter@company.com"
                              value={recipientEmail}
                              onChange={(e) => {
                                setRecipientEmail(e.target.value);
                                setEmailSendSuccess(false);
                              }}
                              className="flex-1 bg-[#070b13] border border-[#1e293b] rounded px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                            />
                            <button
                              onClick={handleEmailCoverLetter}
                              disabled={
                                isEmailingCoverLetter || 
                                !recipientEmail || 
                                (coverLetterSender === "gmail" && !gmailAccessToken) ||
                                (coverLetterSender === "hostinger" && !hostingerConfig.isConfigured)
                              }
                              className="px-4 py-1.5 bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              {isEmailingCoverLetter ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Mailing...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Dispatch Letter</span>
                                </>
                              )}
                            </button>
                          </div>
                          
                          {coverLetterSender === "gmail" && !gmailAccessToken && (
                            <p className="text-[10px] text-amber-400/80 italic">
                              * Google account authentication is required to send using Gmail. Please authenticate in the "Gmail Alerts" tab.
                            </p>
                          )}

                          {coverLetterSender === "hostinger" && !hostingerConfig.isConfigured && (
                            <p className="text-[10px] text-amber-400/80 italic">
                              * Hostinger SMTP is not fully configured. Please provide your Hostinger credentials under the "Hostinger SMTP Settings" tab first.
                            </p>
                          )}
                        </div>

                      </div>
                    )}

                  </div>
                ) : (
                  <div className="p-12 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs">
                    Configure a custom JD on the left or click "Compare JD" inside the "Matched Board" to trigger automated alignments checks.
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

        {/* TAB 4: Recruiters */}
        {activeTab === "recruiters" && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              
              {/* Recruiter Add Form */}
              <form onSubmit={handleAddRecruiter} className="xl:col-span-1 p-5 bg-[#0a0f1c] border border-[#1e293b] rounded-xl space-y-4">
                <div className="flex items-center gap-1.5 border-b border-slate-900 pb-2 mb-2">
                  <UserPlus className="w-4 h-4 text-indigo-400" />
                  <span className="font-sans text-xs font-bold text-white uppercase tracking-wider">Save Recruiter Contact</span>
                </div>

                {recruiterSuccess && (
                  <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    <span>Contact stored in directory!</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-0.5">FULL NAME *:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sarah Jenkins"
                      value={recForm.name}
                      onChange={(e) => setRecForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-[#070b13] border border-[#1e293b] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-0.5">COMPANY/AGENCY *:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Google Cloud Recruitment"
                      value={recForm.company}
                      onChange={(e) => setRecForm(prev => ({ ...prev, company: e.target.value }))}
                      className="w-full bg-[#070b13] border border-[#1e293b] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-0.5">EMAIL ADDRESS *:</label>
                    <input
                      type="email"
                      required
                      placeholder="sjenkins@recruiting.com"
                      value={recForm.email}
                      onChange={(e) => setRecForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-[#070b13] border border-[#1e293b] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-0.5">LINKEDIN URL (OPTIONAL):</label>
                    <input
                      type="text"
                      placeholder="linkedin.com/in/sarah-jenkins"
                      value={recForm.linkedin}
                      onChange={(e) => setRecForm(prev => ({ ...prev, linkedin: e.target.value }))}
                      className="w-full bg-[#070b13] border border-[#1e293b] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-0.5">CONVERSATION LOG / NOTES:</label>
                    <textarea
                      rows={3}
                      placeholder="Pasted conversations details, follow-up timelines or specific notes..."
                      value={recForm.notes}
                      onChange={(e) => setRecForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full bg-[#070b13] border border-[#1e293b] rounded p-2 text-xs font-sans text-slate-300 focus:outline-none focus:border-indigo-500 leading-normal"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAddingRecruiter}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-sans text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Store Contact</span>
                </button>
              </form>

              {/* Recruiter Contacts list */}
              <div className="xl:col-span-2 space-y-4 text-left">
                
                {/* Stats & Search Header */}
                <div className="bg-[#0a0f1d] border border-[#1e293b] p-4 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-3">
                    <div>
                      <span className="text-xs font-bold text-white font-sans uppercase tracking-wider flex items-center gap-1.5">
                        <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
                        Verified Recruiter Contacts Directory
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Direct outreach contacts across leading IT staffing agencies, enterprise recruitment firms, and remote talent partners.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ● {recruiters.length} Contacts Loaded
                      </span>
                    </div>
                  </div>

                  {/* Search and Category Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search recruiters by name, agency, email or notes..."
                        value={recruiterSearchQuery}
                        onChange={(e) => setRecruiterSearchQuery(e.target.value)}
                        className="w-full bg-[#05080f] border border-[#1e293b] rounded-lg pl-8 pr-8 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                      {recruiterSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setRecruiterSearchQuery("")}
                          className="absolute right-2 top-2 text-slate-500 hover:text-slate-300 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      {[
                        { id: "all", label: "All Contacts" },
                        { id: "it_support", label: "IT & Hardware" },
                        { id: "staffing_agency", label: "Staffing Agencies" },
                        { id: "us_uk_remote", label: "US / UK Leads" }
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setRecruiterCategoryFilter(cat.id)}
                          className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                            recruiterCategoryFilter === cat.id
                              ? "bg-indigo-600 text-white font-semibold"
                              : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {(() => {
                  const filteredRecruiters = recruiters.filter((rec) => {
                    const query = recruiterSearchQuery.toLowerCase().trim();
                    const matchesQuery = !query || 
                      rec.name.toLowerCase().includes(query) ||
                      rec.company.toLowerCase().includes(query) ||
                      rec.email.toLowerCase().includes(query) ||
                      (rec.notes && rec.notes.toLowerCase().includes(query));
                    
                    if (!matchesQuery) return false;

                    if (recruiterCategoryFilter === "it_support") {
                      return (
                        rec.company.toLowerCase().includes("support") ||
                        rec.company.toLowerCase().includes("tech") ||
                        rec.company.toLowerCase().includes("cloud") ||
                        (rec.notes && (rec.notes.toLowerCase().includes("hardware") || rec.notes.toLowerCase().includes("it") || rec.notes.toLowerCase().includes("infra") || rec.notes.toLowerCase().includes("desktop")))
                      );
                    }
                    if (recruiterCategoryFilter === "staffing_agency") {
                      return (
                        rec.company.toLowerCase().includes("staffing") ||
                        rec.company.toLowerCase().includes("recruiting") ||
                        rec.company.toLowerCase().includes("talent") ||
                        rec.company.toLowerCase().includes("group") ||
                        rec.company.toLowerCase().includes("partners") ||
                        rec.company.toLowerCase().includes("search")
                      );
                    }
                    if (recruiterCategoryFilter === "us_uk_remote") {
                      return (
                        rec.company.toLowerCase().includes("us") ||
                        rec.company.toLowerCase().includes("uk") ||
                        rec.company.toLowerCase().includes("america") ||
                        rec.company.toLowerCase().includes("london") ||
                        rec.company.toLowerCase().includes("global") ||
                        (rec.notes && (rec.notes.toLowerCase().includes("remote") || rec.notes.toLowerCase().includes("us") || rec.notes.toLowerCase().includes("uk") || rec.notes.toLowerCase().includes("london")))
                      );
                    }
                    return true;
                  });

                  if (filteredRecruiters.length === 0) {
                    return (
                      <div className="p-8 border border-slate-900 bg-[#070b13]/25 rounded-xl text-center text-slate-500 text-xs">
                        {recruiterSearchQuery ? `No recruiters matched search "${recruiterSearchQuery}". Try clearing filters.` : "No saved recruiters. Store incoming outreach details on the left."}
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredRecruiters.map((rec) => (
                        <div key={rec.id} className="p-4 bg-[#0a0f1d] border border-[#1e293b] rounded-xl flex flex-col justify-between space-y-3 group hover:border-indigo-500/30 transition-colors">
                          
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-sans text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">{rec.name}</h4>
                                <span className="text-[10px] font-mono text-indigo-400 block mt-0.5">{rec.company}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(rec.email);
                                    setCopiedRecruiterId(rec.id);
                                    setTimeout(() => setCopiedRecruiterId(null), 2000);
                                  }}
                                  className="text-slate-500 hover:text-emerald-400 p-1 transition-all cursor-pointer"
                                  title="Copy email to clipboard"
                                >
                                  {copiedRecruiterId === rec.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecruiter(rec.id)}
                                  className="text-slate-600 hover:text-red-400 p-1 transition-all cursor-pointer"
                                  title="Delete contact"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-3 space-y-1.5 text-[11px] font-sans text-slate-400">
                              <div className="flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="text-slate-300 truncate select-all" title={rec.email}>{rec.email}</span>
                              </div>

                              {rec.linkedin && (
                                <div className="flex items-center gap-1.5">
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <a 
                                    href={rec.linkedin.startsWith("http") ? rec.linkedin : `https://${rec.linkedin}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-indigo-400 hover:underline truncate"
                                  >
                                    {rec.linkedin.replace("https://www.", "").replace("http://www.", "")}
                                  </a>
                                </div>
                              )}
                            </div>

                            {rec.notes && (
                              <div className="mt-3 p-2 bg-[#060a12] border border-slate-900/80 rounded text-[10px] text-slate-400 leading-normal font-sans">
                                <strong className="text-slate-300">Specialization:</strong> {rec.notes}
                              </div>
                            )}
                          </div>

                          {/* Quick Outreach Actions */}
                          <div className="pt-2 border-t border-slate-900/60 flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setRecipientEmail(rec.email);
                                setCoverLetterSender("hostinger");
                                setActiveTab("ats");
                              }}
                              className="w-full py-1.5 bg-indigo-600/15 hover:bg-indigo-600/35 border border-indigo-500/15 text-indigo-400 text-[10px] font-semibold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>Draft Cover Letter & Pitch ({rec.email.split("@")[0]})</span>
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>
                  );
                })()}

              </div>

            </div>

          </div>
        )}

        {/* TAB 5: Alerts & Notifications */}
        {activeTab === "alerts" && (
          <div className="space-y-6">
            
            {/* AI Career & Income Research Agent Main Intro */}
            <div className="p-5 bg-gradient-to-r from-indigo-950/40 via-[#070b13] to-slate-950/40 border border-indigo-500/20 rounded-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <h3 className="font-sans text-xs font-bold text-white uppercase tracking-wider">AI Career & Income Research Agent</h3>
                  </div>
                  <h4 className="font-sans text-lg font-bold text-slate-100">Hourly Earning & Retainer Hunt Dashboard</h4>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-3xl font-sans">
                    Is module ka objective sirf standard jobs dhoondhna nahi hai, balki <strong>har roz aapke liye genuine high-income earning opportunities</strong> secure karna hai. Hum dynamic algorithms ka use karke non-stop channels scan karte hain.
                  </p>
                </div>
                
                {/* Dynamic Every 1 Hour Schedule Sweeps */}
                <div className="p-3 bg-black/40 border border-slate-800 rounded-lg shrink-0 flex flex-col justify-center min-w-[220px] text-center font-sans space-y-2">
                  <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">📅 Schedule Sweeps</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
                      <span className="block text-[11px] font-bold text-emerald-400">Every 1 Hour</span>
                      <span className="text-[9px] text-slate-500 uppercase font-mono">Opportunity Scan</span>
                    </div>
                    <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded">
                      <span className="block text-[11px] font-bold text-indigo-400">Continuous</span>
                      <span className="text-[9px] text-slate-500 uppercase font-mono">Retainer Scan</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time filters and spam-protection checklist badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-900">
                <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded flex flex-col font-sans">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Priority Goal</span>
                  <span className="text-xs font-bold text-emerald-400 mt-1">High Income Retainers</span>
                </div>
                <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded flex flex-col font-sans">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Verification Level</span>
                  <span className="text-xs font-bold text-indigo-400 mt-1">Direct HR Contacts</span>
                </div>
                <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded flex flex-col font-sans">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Anti-Scam Filter</span>
                  <span className="text-xs font-bold text-red-400 mt-1">MLM & Fees Excluded</span>
                </div>
                <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded flex flex-col font-sans">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Target Reach</span>
                  <span className="text-xs font-bold text-amber-400 mt-1">Local AMC & Int'l Remote</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Notification Configuration Parameters */}
              <div className="lg:col-span-5 space-y-6">
                
                <div className="p-5 bg-[#0a0f1d] border border-[#1e293b] rounded-xl space-y-4">
                  <div className="flex items-center gap-1.5 border-b border-slate-900 pb-2.5">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span className="font-sans text-xs font-bold text-white uppercase tracking-wider">Configure Channels</span>
                  </div>

                  {/* Channel 1: Gmail alerts */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="block text-xs font-semibold text-white font-sans">Gmail Dispatch Alerts</span>
                        <p className="text-[11px] text-slate-500 font-sans leading-normal">
                          High compatibility jobs milne par aapke authorized Google mailbox ({gmailUserEmail || "Offline"}) par automatic digest reports bheje jayenge.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={alertSettings.emailAlertsEnabled}
                        disabled={!gmailAccessToken}
                        onChange={(e) => setAlertSettings(prev => ({ ...prev, emailAlertsEnabled: e.target.checked }))}
                        className="mt-1 w-4 h-4 text-indigo-600 bg-slate-950 border-slate-800 rounded focus:ring-indigo-500 cursor-pointer disabled:opacity-40"
                      />
                    </div>
                    {!gmailAccessToken && (
                      <div className="p-2.5 bg-amber-500/5 border border-amber-500/10 rounded text-[10px] text-amber-400/80 italic font-mono">
                        * Please Authenticate Google Account in "Gmail Alerts" tab on the left to activate physical email dispatches.
                      </div>
                    )}
                  </div>

                  {/* Channel 2: System Banners */}
                  <div className="pt-3 border-t border-slate-900/60">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="block text-xs font-semibold text-white font-sans">In-App Dashboard Alerts</span>
                        <p className="text-[11px] text-slate-500 font-sans leading-normal">
                          Compatible match indicators ko directly home board notifications me aur active matching triggers me display kiya jayega.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={alertSettings.inAppAlertsEnabled}
                        onChange={(e) => setAlertSettings(prev => ({ ...prev, inAppAlertsEnabled: e.target.checked }))}
                        className="mt-1 w-4 h-4 text-indigo-600 bg-slate-950 border-slate-800 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Threshold Parameter */}
                  <div className="pt-4 border-t border-slate-900/60 space-y-2">
                    <div className="flex items-center justify-between text-xs font-sans">
                      <span className="font-semibold text-white">Minimum Match Score Threshold</span>
                      <span className="font-mono text-indigo-400 font-bold">{alertSettings.minMatchScore}% Match</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="95"
                      step="5"
                      value={alertSettings.minMatchScore}
                      onChange={(e) => setAlertSettings(prev => ({ ...prev, minMatchScore: parseInt(e.target.value) }))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-slate-500">
                      <span>50% (Loose Alignment)</span>
                      <span>95% (Strict Fit Only)</span>
                    </div>
                  </div>

                  {/* Alert Frequency */}
                  <div className="pt-4 border-t border-slate-900/60">
                    <label className="block text-[10px] text-slate-400 font-mono mb-1.5 uppercase tracking-wider">Alert & Scan Frequency:</label>
                    <select
                      value={alertSettings.alertFrequency}
                      onChange={(e) => setAlertSettings(prev => ({ ...prev, alertFrequency: e.target.value }))}
                      className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="Real-Time / Instant">Real-Time (Naye posts automatic scan karein)</option>
                      <option value="Daily Digest">Daily Summary Digest (Harpal alert email summary)</option>
                      <option value="Weekly Round-Up">Weekly Career Report (Hafte me ek baar comprehensive update)</option>
                    </select>
                  </div>

                </div>

                {/* Conceptual Flow Block */}
                <div className="p-5 bg-[#0a0f1d] border border-slate-900 rounded-xl space-y-3.5">
                  <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">How Notifications Work:</span>
                  
                  {/* Step visual timeline */}
                  <div className="space-y-3 text-xs font-sans text-slate-400">
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 flex items-center justify-center font-mono text-[10px] shrink-0 font-bold">1</div>
                      <div>
                        <strong className="text-white text-[11px] block">Global Database Scanning</strong>
                        <p className="text-[11px] text-slate-500 leading-normal">Our system perpetually scans new roles, extracting tech stacks and visa eligibility criteria.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 flex items-center justify-center font-mono text-[10px] shrink-0 font-bold">2</div>
                      <div>
                        <strong className="text-white text-[11px] block">Cognitive AI Alignment Comparison</strong>
                        <p className="text-[11px] text-slate-500 leading-normal">Matches listings against your exact skills (e.g. Kubernetes, Python, React) and target countries.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 flex items-center justify-center font-mono text-[10px] shrink-0 font-bold">3</div>
                      <div>
                        <strong className="text-white text-[11px] block">Direct Secure Dispatch via Gmail</strong>
                        <p className="text-[11px] text-slate-500 leading-normal">Automatically delivers a beautiful compiled digest containing top matches directly to your inbox.</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Instant Match Scan & Live Delivery Preview */}
              <div className="lg:col-span-7 space-y-6">

                {/* Real-time Background Daemon Log Terminal */}
                <div className="p-5 bg-[#070b13] border border-[#1e293b] rounded-xl space-y-4" id="autonomic-daemon-console">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">AI Career & Income Research Agent Daemon</span>
                    </div>
                    <button
                      onClick={triggerDaemonScan}
                      disabled={isScanningDaemon}
                      className="px-2.5 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold rounded flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {isScanningDaemon ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      <span>Trigger Global Sweep</span>
                    </button>
                  </div>

                  {daemonSuccessMessage && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 text-[11px] rounded font-sans">
                      {daemonSuccessMessage}
                    </div>
                  )}

                  <div className="p-3 bg-black/40 border border-slate-900 rounded-lg max-h-[160px] overflow-y-auto font-mono text-[10px] space-y-2 text-slate-400">
                    {schedulerLogs.length === 0 ? (
                      <span className="text-slate-600 italic">No background sweeps logged yet. Waiting for heartbeat...</span>
                    ) : (
                      schedulerLogs.map((log, i) => {
                        const ev = log?.event || "";
                        return (
                          <div key={i} className="flex items-start gap-2 leading-relaxed">
                            <span className="text-slate-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                            <span className={
                              ev.includes("✅") ? "text-emerald-400" :
                              ev.includes("❌") ? "text-red-400" :
                              ev.includes("🚀") ? "text-indigo-400 font-semibold" :
                              ev.includes("🔍") ? "text-amber-400" :
                              ev.includes("🔑") ? "text-indigo-300 font-semibold" :
                              "text-slate-300"
                            }>
                              {log.event}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>STATUS: ACTIVE DAEMON HEARTBEAT</span>
                    <span>INTERVAL: {alertSettings.alertFrequency === "Real-Time / Instant" ? "3 MIN (Simulation Mode)" : alertSettings.alertFrequency}</span>
                  </div>
                </div>
                
                <div className="p-5 bg-indigo-950/10 border border-[#1e293b] rounded-xl space-y-4">
                  <div>
                    <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">Real-time Dispatch Station</span>
                    <h4 className="font-sans text-xs font-bold text-white uppercase tracking-tight mt-0.5">Test & Send Match Digest Email</h4>
                    <p className="text-xs text-slate-400 mt-1 font-sans leading-normal">
                      Wait mat kijiye! Connected Gmail account ka use karke aap instantly ek live resume match score evaluation report direct apne inbox me check kar sakte hain.
                    </p>
                  </div>

                  {/* Feedback Blocks */}
                  {digestSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>Alert digest email successfully compiled and sent! Please check your Gmail Inbox.</span>
                    </div>
                  )}

                  {digestError && (
                    <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-lg">
                      {digestError}
                    </div>
                  )}

                  <button
                    onClick={handleSendMatchDigest}
                    disabled={isSendingDigest || !gmailAccessToken}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-sans text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    {isSendingDigest ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Compiling and sending live digest...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>Send Me Instant Matched Jobs Summary via Email ✉️</span>
                      </>
                    )}
                  </button>

                  {!gmailAccessToken && (
                    <p className="text-[11px] text-amber-400/80 italic font-mono leading-normal">
                      * Direct email delivery requires authenticating Google Account in "Gmail Alerts" tab on the left.
                    </p>
                  )}
                </div>

                {/* Match Email Live Preview box */}
                <div className="p-5 bg-[#060a12] border border-[#1e293b] rounded-xl space-y-3">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Live Alert Email Template Preview:</span>
                  
                  {/* Mock Email box */}
                  <div className="p-4 bg-[#090f1d] border border-slate-900 rounded-lg space-y-3.5 max-h-[350px] overflow-y-auto">
                    
                    <div className="border-b border-slate-900 pb-3 flex justify-between items-center text-[10px] font-mono">
                      <div>
                        <span className="text-slate-500">From:</span> <span className="text-indigo-400">Aziz Assistant Alert Engine</span><br/>
                        <span className="text-slate-500">To:</span> <span className="text-slate-300">{gmailUserEmail || "your-email@gmail.com"}</span>
                      </div>
                      <span className="text-emerald-400 text-[9px] bg-emerald-500/5 border border-emerald-500/10 px-1 rounded">SYSTEM_PREVIEW</span>
                    </div>

                    <div className="text-center pb-2 border-b border-slate-900/60">
                      <h4 className="text-sm font-bold text-white font-sans">🔔 Compatible Match Notification</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">MATCH THRESHOLD MET: &gt;={alertSettings.minMatchScore}%</p>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Based on your targeted skills profile, the following job openings were matched by our system with high precision:
                    </p>

                    {/* Job Mock Item 1 */}
                    <div className="p-3 bg-[#050810] border border-slate-900 rounded text-xs space-y-1 font-sans">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase">Google Cloud (EMEA)</span>
                          <h5 className="font-bold text-white text-[11px] mt-0.5">Senior Cloud Infrastructure Engineer</h5>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 text-[10px] font-mono font-bold font-sans">85% Match</span>
                      </div>
                      <p className="text-[10px] text-slate-500">📍 Zurich, Switzerland | 💰 CHF 185,000 | Sponsorship Included</p>
                      <div className="pt-2 text-[10px]">
                        <span className="text-emerald-400 font-bold font-mono">Matched:</span> <span className="text-slate-300">Kubernetes, Terraform, Go, Docker</span>
                      </div>
                    </div>

                    {/* Job Mock Item 2 */}
                    <div className="p-3 bg-[#050810] border border-slate-900 rounded text-xs space-y-1 font-sans">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase">Amazon Web Services</span>
                          <h5 className="font-bold text-white text-[11px] mt-0.5">DevOps Systems Consultant</h5>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/15 text-[10px] font-mono font-bold font-sans">78% Match</span>
                      </div>
                      <p className="text-[10px] text-slate-500">📍 London, UK | 💰 £115,000 | Sponsorship Included</p>
                      <div className="pt-2 text-[10px]">
                        <span className="text-emerald-400 font-bold font-mono">Matched:</span> <span className="text-slate-300">Kubernetes, Terraform, Python</span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* TAB 6: Freelance Gigs Finder & Proposal Pitch generator */}
        {activeTab === "freelance" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Freelance Profile Config (xl:col-span-4) */}
              <div className="xl:col-span-4 space-y-6">
                
                <form onSubmit={saveFreelanceProfile} className="p-5 bg-[#0a0f1c] border border-[#1e293b] rounded-xl space-y-4">
                  <div className="flex items-center gap-1.5 border-b border-slate-900 pb-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <span className="font-sans text-xs font-bold text-white uppercase tracking-wider">Freelance Profile Settings</span>
                  </div>

                  <div className="p-2.5 bg-indigo-500/5 border border-indigo-500/10 rounded-lg text-[11px] text-indigo-300 leading-snug">
                    <span className="font-bold text-white block mb-0.5">⚙️ Profile Strategy:</span>
                    Primary offering focuses on <strong>Hardware, Workstations & Network/Firewall setup</strong>. Coding/pipelines are marked as <strong>🤖 AI-assisted</strong>.
                  </div>

                  {freelanceSaveSuccess && (
                    <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Freelance consulting parameters updated and synced!</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider">Your Consulting Hourly Rate ($/hr):</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-xs font-mono">$</div>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={freelanceProfileState.hourlyRate}
                        onChange={(e) => setFreelanceProfileState(prev => ({ ...prev, hourlyRate: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider">Consulting Portfolio Link:</label>
                    <input
                      type="url"
                      placeholder="https://github.com/username or portfolio"
                      value={freelanceProfileState.portfolioUrl}
                      onChange={(e) => setFreelanceProfileState(prev => ({ ...prev, portfolioUrl: e.target.value }))}
                      className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  {/* Offerings Tag Editor */}
                  <div className="space-y-2">
                    <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider">Key Services Offered:</label>
                    
                    <div className="flex flex-wrap gap-1.5 p-2 bg-[#060a12] border border-[#1e293b] rounded-lg min-h-[50px]">
                      {freelanceProfileState.offerings.length === 0 ? (
                        <span className="text-slate-600 text-xs italic p-1">No services specified yet...</span>
                      ) : (
                        freelanceProfileState.offerings.map((offering) => (
                          <span key={offering} className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-xs">
                            {offering}
                            <button type="button" onClick={() => removeOfferingTag(offering)} className="text-emerald-400 hover:text-red-400 font-bold ml-1 text-[10px]">✕</button>
                          </span>
                        ))
                      )}
                    </div>

                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g., AWS Architecting..."
                        value={newOffering}
                        onChange={(e) => setNewOffering(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOfferingTag())}
                        className="flex-1 bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={addOfferingTag}
                        className="px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs transition-colors font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider">Custom Pitching Prompt Guide:</label>
                    <textarea
                      rows={3}
                      value={freelanceProfileState.customPitchPrompt}
                      onChange={(e) => setFreelanceProfileState(prev => ({ ...prev, customPitchPrompt: e.target.value }))}
                      placeholder="Instructions on how you want Gemini to phrase your proposal..."
                      className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors font-sans"
                    />
                  </div>

                  {/* Portfolio Projects Section */}
                  <div className="pt-4 border-t border-slate-900 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">My Main Projects / Case Studies:</span>
                      <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/15">
                        {(freelanceProfileState.projects || []).length} registered
                      </span>
                    </div>

                    <div className="space-y-3">
                      {!(freelanceProfileState.projects?.length) ? (
                        <div className="p-3 bg-[#060a12] border border-dashed border-slate-800 rounded-lg text-slate-500 text-[11px] italic text-center">
                          No main projects registered yet. Use the tool below to register your best projects to reference in client bids!
                        </div>
                      ) : (
                        freelanceProfileState.projects.map((proj) => (
                          <div key={proj.id} className="p-3 bg-[#060a12] border border-[#1e293b] rounded-lg relative group space-y-1.5">
                            <button
                              type="button"
                              onClick={() => removeProjectItem(proj.id)}
                              className="absolute top-2.5 right-2.5 p-1 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Delete project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="pr-6">
                              <h5 className="font-bold text-white text-xs leading-none flex items-center gap-1">
                                {proj.title}
                                {proj.projectUrl && (
                                  <a href={proj.projectUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
                                    <ExternalLink className="w-3 h-3 inline-block" />
                                  </a>
                                )}
                              </h5>
                              <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                                {proj.description}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {proj.techStack.map(tech => (
                                  <span key={tech} className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-900 text-slate-400 rounded">
                                    {tech}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* New Project Form Card */}
                    <div className="p-3 bg-[#070c16] border border-indigo-500/15 rounded-lg space-y-3 text-left">
                      <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider font-bold block">Add a Portfolio Project</span>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input
                            type="text"
                            placeholder="Project Title (e.g., Auth Engine)"
                            value={newProject.title}
                            onChange={(e) => setNewProject(p => ({ ...p, title: e.target.value }))}
                            className="w-full bg-[#030712] border border-[#1e293b] rounded px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Tech (e.g., React, Go)"
                            value={newProject.techStack}
                            onChange={(e) => setNewProject(p => ({ ...p, techStack: e.target.value }))}
                            className="w-full bg-[#030712] border border-[#1e293b] rounded px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                          />
                        </div>
                      </div>

                      <div>
                        <textarea
                          placeholder="Project description & key metrics (e.g., reduced load time by 40%). This will be fed directly to the proposal AI generator!"
                          rows={2}
                          value={newProject.description}
                          onChange={(e) => setNewProject(p => ({ ...p, description: e.target.value }))}
                          className="w-full bg-[#030712] border border-[#1e293b] rounded px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 font-sans"
                        />
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="Project URL (Optional)"
                          value={newProject.projectUrl}
                          onChange={(e) => setNewProject(p => ({ ...p, projectUrl: e.target.value }))}
                          className="flex-1 bg-[#030712] border border-[#1e293b] rounded px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                        />
                        <button
                          type="button"
                          onClick={addProjectItem}
                          disabled={!newProject.title.trim() || !newProject.description.trim()}
                          className="px-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded text-[11px] transition-colors font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingFreelanceProfile}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-sans text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isSavingFreelanceProfile ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Consulting Parameters...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Update Freelance Profile</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Successful Pitch Examples (Few-Shot) Card */}
                <div className="p-4 bg-[#0a0f1c] border border-[#1e293b] rounded-xl space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-sans text-[10px] font-bold text-white uppercase tracking-wider">Successful past proposals</span>
                    </div>
                    <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 px-1.5 py-0.5 rounded">
                      {(freelanceProfileState.fewShotExamples || []).length} active
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-normal font-sans">
                    These proposal examples are injected into the Gemini prompt context so that future proposal drafts mimic your exact tone, length, formatting, and structural alignments.
                  </p>

                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {!(freelanceProfileState.fewShotExamples?.length) ? (
                      <div className="p-3 bg-[#060a12] border border-dashed border-slate-800 rounded-lg text-slate-500 text-[10px] italic text-center font-sans">
                        No few-shot examples registered yet. Add past high-quality bids or save your edited AI drafts to tune proposal precision!
                      </div>
                    ) : (
                      freelanceProfileState.fewShotExamples.map((ex) => (
                        <div key={ex.id} className="p-2.5 bg-[#060a12] border border-[#1e293b] rounded-lg relative group space-y-1.5 text-left">
                          <button
                            type="button"
                            onClick={() => handleDeleteFewShotExample(ex.id)}
                            className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                            title="Delete example"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="pr-5">
                            <h5 className="font-bold text-white text-[10px] leading-tight flex items-center gap-1">
                              🎯 {ex.gigTitle}
                            </h5>
                            <p className="text-[10px] text-slate-300 font-sans mt-1.5 whitespace-pre-wrap leading-relaxed bg-[#03060c] p-2 rounded border border-slate-900/65 font-normal">
                              {ex.pitchText}
                            </p>
                            <span className="text-[8px] font-mono text-slate-500 block mt-1">
                              Registered on: {new Date(ex.addedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Info Card */}
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-xs space-y-1">
                  <h4 className="font-bold text-white uppercase tracking-wider font-sans">💡 Freelance Matching Engine</h4>
                  <p className="text-slate-400 leading-normal">
                    This module actively cross-references available gigs on major platforms against your core skills and consulting hourly rate. Your customized AI pitch proposal utilizes your resume content to draft highly contextual bids.
                  </p>
                </div>

              </div>

              {/* Right Column: Freelance Gig Finder & Proposals (xl:col-span-8) */}
              <div className="xl:col-span-8 space-y-6">

                {/* 40 REMOTE JOB PORTALS & FREELANCE PLATFORMS DIRECTORY */}
                <div className="bg-[#0a0f1d] border border-[#1e293b] rounded-xl p-4 sm:p-5 space-y-4 text-left shadow-2xl" id="remote-portals-catalog">
                  
                  {/* Header & Stats */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-900 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-indigo-400" />
                        <h3 className="font-sans text-xs font-bold text-white uppercase tracking-wider">
                          40 Genuine Remote Job Portals & Freelance Platforms
                        </h3>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          40 Loaded
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-2xl">
                        A curated catalog of 40 authentic remote work platforms, freelance marketplaces, and global job aggregators. Launch pre-filtered searches directly or import platforms into the AI Bid Composer.
                      </p>
                    </div>
                  </div>

                  {/* Role Target Selector & Search Filter */}
                  <div className="bg-[#070b13] border border-[#1e293b] p-3 rounded-lg space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                      
                      {/* Search Filter input */}
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="Filter portals by name, domain, or skills (e.g. Upwork, DevOps, Support)..."
                          value={portalSearchQuery}
                          onChange={(e) => setPortalSearchQuery(e.target.value)}
                          className="w-full bg-[#030712] border border-[#1e293b] rounded-lg pl-8 pr-8 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                        {portalSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setPortalSearchQuery("")}
                            className="absolute right-2 top-2 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Role Query input for deep-linking */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0">Search Role:</span>
                        <input
                          type="text"
                          value={portalRoleQuery}
                          onChange={(e) => setPortalRoleQuery(e.target.value)}
                          placeholder="e.g. Hardware Support"
                          className="w-44 bg-[#030712] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-xs text-indigo-300 font-semibold focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Quick Role Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="text-slate-500 font-mono">Quick Roles:</span>
                      {[
                        "Hardware Support",
                        "Network Engineer",
                        "IT Administrator",
                        "Desktop Support",
                        "Windows Server AD",
                        "Cloud & DevOps"
                      ].map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setPortalRoleQuery(role)}
                          className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                            portalRoleQuery === role
                              ? "bg-indigo-600 text-white font-semibold"
                              : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-900/80 text-[10px]">
                      {[
                        { id: "all", label: "All 40 Portals" },
                        { id: "freelance", label: "Freelance Marketplaces (7)" },
                        { id: "remote_board", label: "Remote Boards (9)" },
                        { id: "aggregator", label: "Global Aggregators (7)" },
                        { id: "tech_startup", label: "Tech & Startups (8)" },
                        { id: "writing_specialist", label: "Specialist & Writing (5)" },
                        { id: "design_tasks", label: "Design & Micro (4)" }
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setPortalCategoryFilter(cat.id)}
                          className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                            portalCategoryFilter === cat.id
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold"
                              : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/60"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Portals Catalog Grid */}
                  {(() => {
                    const filteredPortals = REMOTE_PORTALS_CATALOG.filter((portal) => {
                      const matchesCategory = portalCategoryFilter === "all" || portal.category === portalCategoryFilter;
                      const query = portalSearchQuery.toLowerCase().trim();
                      const matchesQuery = !query || 
                        portal.name.toLowerCase().includes(query) ||
                        portal.domain.toLowerCase().includes(query) ||
                        portal.description.toLowerCase().includes(query) ||
                        portal.typicalRoles.some(r => r.toLowerCase().includes(query));
                      return matchesCategory && matchesQuery;
                    });

                    if (filteredPortals.length === 0) {
                      return (
                        <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-900 rounded-xl">
                          No remote portals matched "{portalSearchQuery}". Try resetting filters or searching with another keyword.
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                        {filteredPortals.map((portal) => {
                          const searchUrl = buildSearchUrl(portal, portalRoleQuery);
                          return (
                            <div
                              key={portal.id}
                              className="p-3.5 bg-[#070b13] border border-[#1e293b] hover:border-indigo-500/40 rounded-xl flex flex-col justify-between space-y-2.5 transition-all group"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                      #{portal.rank}
                                    </span>
                                    <div>
                                      <h4 className="font-sans text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">
                                        {portal.name}
                                      </h4>
                                      <span className="text-[10px] font-mono text-slate-500">{portal.domain}</span>
                                    </div>
                                  </div>
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                    {portal.trustScore}% Verified
                                  </span>
                                </div>

                                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                                  {portal.description}
                                </p>

                                <div className="flex flex-wrap gap-1 mt-2">
                                  {portal.typicalRoles.slice(0, 3).map((role) => (
                                    <span
                                      key={role}
                                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-800/30"
                                    >
                                      {role}
                                    </span>
                                  ))}
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-500">
                                    {portal.payoutModel}
                                  </span>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="pt-2 border-t border-slate-900 flex items-center gap-2">
                                <a
                                  href={searchUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                >
                                  <span>Search on {portal.name}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewGigTitle(`${portalRoleQuery || "IT Support Engineer"} - ${portal.name}`);
                                    setNewGigPlatform(portal.name);
                                    setNewGigBudget(portal.payoutModel.includes("Hourly") ? "$50 - $85 / hr" : "$2,500 / mo");
                                    setNewGigSkills(portal.typicalRoles.join(", "));
                                    setNewGigDescription(`Contract sourced from ${portal.name} (${portal.domain}). Seeking verified specialist for ${portalRoleQuery || "Technical Support & Systems Administration"}.`);
                                    setIsPastingGig(true);
                                  }}
                                  className="py-1.5 px-2.5 bg-emerald-600/15 hover:bg-emerald-600/35 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold rounded flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                                  title="Import to Custom Contract Bid Composer"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>Import to Bid</span>
                                </button>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                </div>

                {/* Custom Contract Creator and Toggle Button */}
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center bg-[#070b13] p-4 border border-[#1e293b] rounded-xl">
                    <div className="text-left">
                      <h4 className="font-sans text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-emerald-400" /> Real-World Contract Scouting & Custom Bids
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5 max-w-md">
                        Found a contract on any of the 40 portals above? Paste the description here to run compatibility score evaluations and generate highly tailored bids instantly!
                      </p>
                    </div>
                    <button
                      onClick={() => setIsPastingGig(!isPastingGig)}
                      className={`px-3 py-1.5 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        isPastingGig
                          ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
                          : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {isPastingGig ? (
                        <>
                          <X className="w-3.5 h-3.5" /> Cancel
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" /> Paste Custom Contract
                        </>
                      )}
                    </button>
                  </div>

                  {isPastingGig && (
                    <form onSubmit={handleCreateCustomGig} className="p-4 bg-[#0a0f1c] border border-emerald-500/30 rounded-xl space-y-4 text-left animate-fade-in shadow-xl">
                      <div className="border-b border-slate-900 pb-2">
                        <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-bold">Paste External Contract Details</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono text-slate-400 uppercase">Contract Title *</label>
                          <input
                            type="text"
                            value={newGigTitle}
                            onChange={(e) => setNewGigTitle(e.target.value)}
                            placeholder="e.g. Senior Infrastructure Engineer - AWS migration"
                            required
                            className="w-full bg-[#030712] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono text-slate-400 uppercase">Freelance Platform</label>
                          <select
                            value={newGigPlatform}
                            onChange={(e) => setNewGigPlatform(e.target.value)}
                            className="w-full bg-[#030712] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                          >
                            {REMOTE_PORTALS_CATALOG.map((portal) => (
                              <option key={portal.id} value={portal.name}>
                                #{portal.rank} {portal.name} ({portal.categoryLabel})
                              </option>
                            ))}
                            <option value="Custom">Other / Custom Platform</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono text-slate-400 uppercase">Budget / Hourly Rate</label>
                          <input
                            type="text"
                            value={newGigBudget}
                            onChange={(e) => setNewGigBudget(e.target.value)}
                            placeholder="e.g. $75 / hr or $3,000"
                            className="w-full bg-[#030712] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono text-slate-400 uppercase">Project Duration</label>
                          <input
                            type="text"
                            value={newGigDuration}
                            onChange={(e) => setNewGigDuration(e.target.value)}
                            placeholder="e.g. 1 Month, 3 Days"
                            className="w-full bg-[#030712] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono text-slate-400 uppercase">Required Seniority</label>
                          <select
                            value={newGigComplexity}
                            onChange={(e) => setNewGigComplexity(e.target.value)}
                            className="w-full bg-[#030712] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                          >
                            <option value="Beginner">Beginner / Entry Level</option>
                            <option value="Intermediate">Intermediate / Mid-Level</option>
                            <option value="Expert">Expert / Senior Level</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-slate-400 uppercase">Required Technical Skills (Comma-separated)</label>
                        <input
                          type="text"
                          value={newGigSkills}
                          onChange={(e) => setNewGigSkills(e.target.value)}
                          placeholder="e.g. Docker, Python, AWS, Firewalls"
                          className="w-full bg-[#030712] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-slate-400 uppercase">Full Contract / Job Description *</label>
                        <textarea
                          value={newGigDescription}
                          onChange={(e) => setNewGigDescription(e.target.value)}
                          rows={4}
                          required
                          placeholder="Copy and paste the exact text description of the project from Upwork or Fiverr..."
                          className="w-full bg-[#030712] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-600 font-sans"
                        />
                      </div>

                      <div className="flex justify-end gap-2 text-xs pt-1">
                        <button
                          type="button"
                          onClick={() => setIsPastingGig(false)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingCustomGig}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {isSavingCustomGig ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing & Matching...
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" /> Import & Evaluate Match
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
                
                {/* Search Bar */}
                <div className="flex bg-[#0a0f1c] border border-[#1e293b] rounded-xl p-3 items-center gap-3">
                  <Search className="w-4 h-4 text-slate-500 shrink-0" />
                  <input
                    type="text"
                    value={freelanceSearch}
                    onChange={(e) => {
                      setFreelanceSearch(e.target.value);
                      fetchFreelanceGigs(e.target.value);
                    }}
                    placeholder="Search freelance contract gigs by title, skill, or keyword (e.g. Terraform, AWS, Express)..."
                    className="flex-1 bg-transparent border-0 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-0"
                  />
                  {isLoadingGigs && <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500 shrink-0" />}
                </div>

                {/* Freelance Scout Filter Matrices */}
                <div className="bg-[#0a0f1c] border border-[#1e293b] rounded-xl p-4 sm:p-5 space-y-4 text-left shadow-lg" id="freelance-scout-filters">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-900">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-400" />
                      <div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider font-sans block">
                          Freelance Scout Filters
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Showing {filteredFreelanceGigs.length} of {freelanceGigs.length} contracts scouted
                        </span>
                      </div>
                    </div>
                    
                    {/* Platform Count & Global Toggle Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                        selectedPlatforms.length === REMOTE_PORTALS_CATALOG.length
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : selectedPlatforms.length > 0
                          ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                          : "bg-red-500/15 text-red-400 border-red-500/30"
                      }`}>
                        {selectedPlatforms.length} / {REMOTE_PORTALS_CATALOG.length} Portals Active
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedPlatforms(REMOTE_PORTALS_CATALOG.map((p) => p.name))}
                        className="px-2.5 py-1 text-[10px] font-semibold rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer flex items-center gap-1"
                        title="Select all 40 portals"
                      >
                        <Check className="w-3 h-3 text-emerald-400" /> Select All (40)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPlatforms([])}
                        className="px-2.5 py-1 text-[10px] font-semibold rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-all cursor-pointer flex items-center gap-1"
                        title="Deselect all portals"
                      >
                        <X className="w-3 h-3" /> Clear Selection
                      </button>
                    </div>
                  </div>

                  {/* 40 Target Platforms Directory Checklist */}
                  <div className="bg-[#070b13] border border-[#1e293b] p-3.5 rounded-lg space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[10px] text-slate-300 font-mono uppercase tracking-wider font-bold">
                          40 Remote Job Portals & Freelance Platforms:
                        </span>
                      </div>

                      {/* Quick Portal Search within Scout Filter */}
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
                        <input
                          type="text"
                          placeholder="Filter portals by name..."
                          value={scoutPlatformSearch}
                          onChange={(e) => setScoutPlatformSearch(e.target.value)}
                          className="w-full bg-[#030712] border border-[#1e293b] rounded pl-7 pr-6 py-1 text-[11px] text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                        {scoutPlatformSearch && (
                          <button
                            type="button"
                            onClick={() => setScoutPlatformSearch("")}
                            className="absolute right-2 top-1.5 text-slate-500 hover:text-slate-300 text-[10px] cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Category Fast Selectors */}
                    <div className="flex flex-wrap items-center gap-1 text-[10px] pt-1 border-t border-slate-900">
                      <span className="text-[9px] font-mono text-slate-500 mr-1">Category View:</span>
                      {[
                        { id: "all", label: "All 40" },
                        { id: "freelance", label: "Freelance (7)" },
                        { id: "remote_board", label: "Remote Boards (9)" },
                        { id: "aggregator", label: "Aggregators (7)" },
                        { id: "tech_startup", label: "Tech & Startups (8)" },
                        { id: "writing_specialist", label: "Writing & Specialist (5)" },
                        { id: "design_tasks", label: "Design & Micro (4)" }
                      ].map((cat) => {
                        const isCatActive = scoutPlatformCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setScoutPlatformCategory(cat.id)}
                            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                              isCatActive
                                ? "bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 font-semibold"
                                : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
                            }`}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* All 40 Platform Filter Badges */}
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {REMOTE_PORTALS_CATALOG
                        .filter((portal) => {
                          const matchesCat = scoutPlatformCategory === "all" || portal.category === scoutPlatformCategory;
                          const q = scoutPlatformSearch.toLowerCase().trim();
                          const matchesSearch = !q || portal.name.toLowerCase().includes(q) || portal.domain.toLowerCase().includes(q);
                          return matchesCat && matchesSearch;
                        })
                        .map((portal) => {
                          const isSelected = selectedPlatforms.includes(portal.name);
                          return (
                            <button
                              key={portal.id}
                              type="button"
                              onClick={() => {
                                setSelectedPlatforms((prev) =>
                                  prev.includes(portal.name)
                                    ? prev.filter((item) => item !== portal.name)
                                    : [...prev, portal.name]
                                );
                              }}
                              className={`px-2 py-1 text-[11px] rounded transition-all cursor-pointer font-medium flex items-center gap-1.5 ${
                                isSelected
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold shadow-sm"
                                  : "bg-slate-900/90 text-slate-500 border border-slate-900 hover:text-slate-300 hover:border-slate-800"
                              }`}
                              title={`${portal.name} - ${portal.categoryLabel} (${portal.domain})`}
                            >
                              <span className={`text-[9px] font-mono ${isSelected ? "text-emerald-400" : "text-slate-600"}`}>
                                #{portal.rank}
                              </span>
                              <span>{portal.name}</span>
                              {isSelected ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-700 inline-block" />
                              )}
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Secondary Filters: Match Score and Rates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-left pt-1">
                    {/* Match Score Threshold */}
                    <div className="space-y-2 bg-[#070b13] border border-[#1e293b] p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Min Tech Compatibility:</span>
                        <span className="font-mono text-xs font-bold text-indigo-400">{minCompatibilityScore}%+</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={minCompatibilityScore}
                          onChange={(e) => setMinCompatibilityScore(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Rate Alignment Filter */}
                    <div className="space-y-2 bg-[#070b13] border border-[#1e293b] p-3 rounded-lg">
                      <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Budget & Rate Focus:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: "All Rates", value: "all" },
                          { label: `Meets Min ($${freelanceProfileState.hourlyRate}/hr)`, value: "meets_rate" },
                          { label: "Fixed Price Only", value: "fixed_only" }
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setRateFilterOption(opt.value as any)}
                            className={`px-2.5 py-1 text-[10px] rounded transition-all cursor-pointer ${
                              rateFilterOption === opt.value
                                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/35 font-semibold"
                                : "bg-slate-900 text-slate-500 border border-slate-900 hover:text-slate-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  
                  {/* Gig Listings */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Available Contract Matches ({filteredFreelanceGigs.length})</span>
                    
                    {gigsStatus === "Live source unavailable" && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2.5 mb-4 text-left">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                        <div>
                          <h4 className="font-semibold text-white uppercase tracking-wider">Live Source Unavailable</h4>
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            The backend freelance search grounding engine is offline or experiencing network errors. Aziz Assistant refuses to display simulated or mock data. Please configure your GEMINI_API_KEY.
                          </p>
                        </div>
                      </div>
                    )}

                    {isLoadingGigs ? (
                      <div className="p-12 text-center text-slate-500 text-xs">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                        Scanning remote contract databases...
                      </div>
                    ) : filteredFreelanceGigs.length === 0 ? (
                      <div className="p-12 text-center border border-dashed border-slate-850 text-slate-600 text-xs rounded-xl bg-[#0a0f1d]">
                        No freelance gigs found matching your active filter criteria.
                      </div>
                    ) : (
                      filteredFreelanceGigs.map((gig) => {
                        const isSel = selectedGig?.id === gig.id;
                        const gigHourlyRate = parseHourlyRate(gig.budget);
                        const meetsRate = gigHourlyRate !== null ? gigHourlyRate >= freelanceProfileState.hourlyRate : null;

                        return (
                          <div
                            key={gig.id}
                            onClick={() => {
                              setSelectedGig(gig);
                              setProposalDraftResult(null);
                              setProposalDraftError(null);
                            }}
                            className={`p-4 border transition-all rounded-xl cursor-pointer text-left space-y-2.5 ${
                              isSel 
                                ? "bg-emerald-950/10 border-emerald-500" 
                                : "bg-[#0a0f1d] border-[#1e293b] hover:border-slate-800"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10 uppercase tracking-wider">{gig.platform}</span>
                                <h4 className="font-bold text-white text-xs mt-1.5 leading-snug">{gig.title}</h4>
                              </div>
                              <span className="text-[10px] font-mono font-bold text-white px-2 py-0.5 bg-indigo-500/10 rounded-md border border-indigo-500/25 shrink-0">
                                {gig.compatibilityScore}% match
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                              <span className="flex items-center gap-1 text-emerald-300">💰 {gig.budget}</span>
                              <span>⏳ {gig.duration}</span>
                              <span className="text-slate-500">Complexity: <strong className="text-slate-300">{gig.complexity}</strong></span>
                            </div>

                            {/* Dynamic Rate Align Tag */}
                            <div className="pt-0.5">
                              {meetsRate === true && (
                                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                  🟢 Meets Rate ($${gigHourlyRate}/hr)
                                </span>
                              )}
                              {meetsRate === false && (
                                <span className="text-[9px] font-mono text-amber-500 bg-amber-500/5 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                  🟡 Below Rate ($${gigHourlyRate}/hr)
                                </span>
                              )}
                              {meetsRate === null && (
                                <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/5 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                                  🔵 Fixed-Price Contract
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-sans">
                              {gig.description}
                            </p>

                            <div className="flex flex-wrap gap-1 pt-1">
                              {gig.skillsRequired.map((s: string) => {
                                const matched = gig.skillsMatched?.includes(s);
                                return (
                                  <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${matched ? "bg-emerald-500/10 text-emerald-400 font-bold" : "bg-slate-900 text-slate-500"}`}>
                                    {s}
                                  </span>
                                );
                              })}
                            </div>

                            {/* Data Provenance Box */}
                            <div className="p-2.5 bg-[#050810] border border-slate-900 rounded-lg space-y-1.5 text-[10px] font-mono" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-between border-b border-slate-900 pb-1 mb-0.5">
                                <span className="text-[8px] text-slate-500 uppercase tracking-wider font-bold">Data Provenance Summary</span>
                                <span className="text-[8px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-1 py-0.5 rounded font-bold uppercase tracking-wider">
                                  {gig.verificationStatus || "Verified Live"}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-400">
                                <div>
                                  <span className="text-slate-600 block text-[8px] uppercase tracking-wider">Acquisition Source:</span>
                                  <span className="text-slate-300 font-sans font-semibold">{gig.source || "Google Search Index"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-600 block text-[8px] uppercase tracking-wider">Confidence Score:</span>
                                  <span className="text-slate-300 font-semibold">{gig.confidenceScore || 95}%</span>
                                </div>
                                <div>
                                  <span className="text-slate-600 block text-[8px] uppercase tracking-wider">Fetch Timestamp:</span>
                                  <span className="text-slate-300">{gig.timestamp ? new Date(gig.timestamp).toLocaleString() : new Date().toLocaleString()}</span>
                                </div>
                                <div>
                                  <span className="text-slate-600 block text-[8px] uppercase tracking-wider">Deduplication:</span>
                                  <span className="text-slate-300">{gig.deduplicationStatus || "Unique Entry"}</span>
                                </div>
                              </div>
                              {gig.originalReference && (
                                <div className="pt-1 border-t border-slate-900 flex items-center justify-between">
                                  <span className="text-slate-600 text-[8px] uppercase tracking-wider">Verification Origin:</span>
                                  <a
                                    href={gig.originalReference}
                                    target="_blank"
                                    referrerPolicy="no-referrer"
                                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 font-semibold hover:underline"
                                  >
                                    View Original Listing <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                              )}
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Active Gig Detailed View & AI Bid Proposal generator */}
                  <div className="space-y-4">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Pitch Proposal Studio</span>

                    {selectedGig ? (
                      <div className="p-5 bg-[#0a0f1d] border border-[#1e293b] rounded-xl space-y-4 text-left">
                        
                        <div>
                          <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">{selectedGig.platform} Contract</span>
                          <h3 className="font-bold text-white text-sm font-sans mt-0.5 leading-snug">{selectedGig.title}</h3>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed border-b border-slate-900 pb-3 font-sans">
                            {selectedGig.description}
                          </p>
                        </div>

                        <div className="space-y-2 text-xs">
                          <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider">Target Skills Overlay:</span>
                          <div className="flex flex-wrap gap-1">
                            {selectedGig.skillsRequired.map((s: string) => {
                              const matched = selectedGig.skillsMatched?.includes(s);
                              return (
                                <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${matched ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" : "bg-red-500/5 text-red-400 border border-red-500/5"}`}>
                                  {matched ? "✓" : "✗"} {s}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* Tab Selector for Pitch vs Alignment Optimizer */}
                        <div className="flex border-b border-[#1e293b] pb-0.5 gap-1.5 pt-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveProposalTab("pitch")}
                            className={`px-3 py-1.5 font-sans text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                              activeProposalTab === "pitch"
                                ? "text-indigo-400 border-indigo-500 font-bold bg-indigo-500/5"
                                : "text-slate-400 border-transparent hover:text-slate-300 hover:bg-slate-900/40"
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-300" /> 1. AI Proposal Writer
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveProposalTab("optimize");
                              if (!optimizationResult && !isOptimizingProfile) {
                                handleOptimizeProfileAlignment();
                              }
                            }}
                            className={`px-3 py-1.5 font-sans text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                              activeProposalTab === "optimize"
                                ? "text-indigo-400 border-indigo-500 font-bold bg-indigo-500/5"
                                : "text-slate-400 border-transparent hover:text-slate-300 hover:bg-slate-900/40"
                            }`}
                          >
                            <Target className="w-3.5 h-3.5 text-emerald-400" /> 2. Profile Alignment Advisor
                          </button>
                        </div>

                        {activeProposalTab === "pitch" && (
                          <div className="space-y-4">
                            <div className="pt-1">
                              <button
                                onClick={() => handleDraftFreelanceProposal(selectedGig.id)}
                                disabled={isDraftingProposal}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-sans text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              >
                                {isDraftingProposal ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Drafting Custom Bid with AI...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                                    <span>Draft Bid Proposal with Gemini</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {proposalDraftError && (
                              <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-lg">
                                {proposalDraftError}
                              </div>
                            )}
                          </div>
                        )}

                        {activeProposalTab === "optimize" && (
                          <div className="space-y-4 pt-1">
                            {isOptimizingProfile ? (
                              <div className="p-10 text-center text-slate-500 text-xs">
                                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                                Gemini is analyzing your consulting profile alignment...
                              </div>
                            ) : optimizationError ? (
                              <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-lg space-y-2">
                                <p>{optimizationError}</p>
                                <button
                                  type="button"
                                  onClick={handleOptimizeProfileAlignment}
                                  className="px-3 py-1 bg-red-500/20 hover:bg-red-500/35 text-red-300 font-semibold rounded text-[10px] cursor-pointer"
                                >
                                  Retry Analysis
                                </button>
                              </div>
                            ) : optimizationResult ? (
                              <div className="space-y-4 animate-fade-in text-left">
                                
                                {/* Suggested Title Hook */}
                                <div className="bg-indigo-950/10 border border-[#1e293b] p-3 rounded-xl space-y-1">
                                  <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider block font-bold">Recommended Bidding Title / Hook:</span>
                                  <p className="text-xs text-white font-sans font-semibold leading-relaxed">
                                    "{optimizationResult.recommendedTitle}"
                                  </p>
                                </div>

                                {/* Skills to Highlight */}
                                <div className="space-y-1.5">
                                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Key Capabilities to Highlight in Pitch:</span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {optimizationResult.topSkillsToHighlight?.map((skill: string, i: number) => (
                                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-[#070b13] border border-slate-900 rounded-lg text-xs text-slate-300">
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <span>{skill}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Case Study Projects to Highlight */}
                                <div className="space-y-1.5">
                                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Priority Portfolio Projects to Reference:</span>
                                  <div className="space-y-2">
                                    {optimizationResult.projectsToPrioritize?.map((project: string, i: number) => (
                                      <div key={i} className="p-2.5 bg-[#070b13] border border-[#1e293b] rounded-lg text-xs text-slate-300 flex items-start gap-2.5">
                                        <Briefcase className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                                        <div>
                                          <strong className="text-white block font-sans text-xs">{project}</strong>
                                          <span className="text-[10px] text-slate-500">Perfect match case-study to include in your cover letter outline.</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Bidding Strategy Tips */}
                                <div className="space-y-1.5">
                                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Actionable Bidding Tactics:</span>
                                  <ul className="space-y-2 text-xs text-slate-300 font-sans">
                                    {optimizationResult.strategicTips?.map((tip: string, i: number) => (
                                      <li key={i} className="flex items-start gap-2.5 leading-relaxed font-normal text-slate-300">
                                        <span className="w-5 h-5 bg-emerald-500/10 text-emerald-400 font-mono font-bold text-[10px] rounded-full flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                        <span>{tip}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <div className="flex justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={handleOptimizeProfileAlignment}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                                  >
                                    <RefreshCw className="w-3 h-3" /> Refresh Analysis
                                  </button>
                                </div>

                              </div>
                            ) : (
                              <div className="p-4 bg-slate-900/10 border border-slate-900 rounded-lg text-slate-500 text-xs text-center">
                                Tap 'Analyze' to scan profile alignment.
                              </div>
                            )}
                          </div>
                        )}

                        {activeProposalTab === "pitch" && proposalDraftResult && (
                          <div className="p-4 bg-[#070b13] border border-slate-900 rounded-xl space-y-4">
                            
                            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold">Generated Client Proposal Pitch:</span>
                              <div className="flex items-center gap-2">
                                {!isEditingPitch && (
                                  <button
                                    onClick={() => {
                                      setEditedPitchText(proposalDraftResult.pitchText);
                                      setIsEditingPitch(true);
                                    }}
                                    className="px-2 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-semibold rounded transition-all flex items-center gap-1 cursor-pointer"
                                    title="Correct draft & teach model"
                                  >
                                    <Terminal className="w-3 h-3" /> Correct Draft
                                  </button>
                                )}
                                <button
                                  onClick={() => copyProposalToClipboard(proposalDraftResult.pitchText)}
                                  className="px-2 py-0.5 bg-emerald-500/15 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold rounded transition-all cursor-pointer"
                                >
                                  {copiedProposalText ? "Copied!" : "Copy bid"}
                                </button>
                              </div>
                            </div>

                            {isEditingPitch ? (
                              <div className="space-y-3 text-left">
                                <textarea
                                  value={editedPitchText}
                                  onChange={(e) => setEditedPitchText(e.target.value)}
                                  rows={6}
                                  className="w-full bg-[#05080f] text-[11px] font-sans text-slate-200 p-3 rounded-lg border border-[#1e293b] focus:outline-none focus:border-emerald-500 leading-relaxed font-normal"
                                  placeholder="Make manual corrections here..."
                                />
                                
                                <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded border border-slate-900">
                                  <label className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer select-none font-sans font-medium">
                                    <input
                                      type="checkbox"
                                      checked={alsoSaveAsFewShot}
                                      onChange={(e) => setAlsoSaveAsFewShot(e.target.checked)}
                                      className="rounded border-slate-800 text-emerald-600 focus:ring-emerald-500 bg-[#070b13] w-3.5 h-3.5 cursor-pointer"
                                    />
                                    💾 Save as successful past example to train AI tone/style!
                                  </label>
                                </div>

                                <div className="flex justify-end gap-2 text-[10px]">
                                  <button
                                    onClick={() => setIsEditingPitch(false)}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={handleSaveAndCorrectPitch}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded cursor-pointer"
                                  >
                                    Save & Apply Corrections
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <pre className="text-[11px] font-sans text-slate-300 leading-relaxed max-h-[180px] overflow-y-auto whitespace-pre-wrap text-left bg-[#05080f] p-3 rounded-lg border border-slate-900">
                                  {proposalDraftResult.pitchText}
                                </pre>
                                
                                {saveFewShotFeedbackSuccess && (
                                  <div className="p-2 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[10px] rounded flex items-center gap-1.5 font-sans justify-center animate-fade-in">
                                    <Check className="w-3.5 h-3.5" /> Checked in! Registered correction as a dynamic few-shot template.
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-xs font-mono border-t border-slate-900/60 pt-3">
                              <div className="space-y-1 text-left">
                                <span className="text-slate-500 uppercase block text-[9px]">Calculated Duration (hrs):</span>
                                <input
                                  type="number"
                                  value={proposalDraftResult.estimatedHours}
                                  onChange={(e) => handleUpdateDurationAndBudget(Number(e.target.value), proposalDraftResult.totalCostEstimate)}
                                  className="w-full bg-[#05080f] border border-slate-900 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div className="space-y-1 text-left">
                                <span className="text-slate-500 uppercase block text-[9px]">Cost Projection:</span>
                                <input
                                  type="text"
                                  value={proposalDraftResult.totalCostEstimate}
                                  onChange={(e) => handleUpdateDurationAndBudget(proposalDraftResult.estimatedHours, e.target.value)}
                                  className="w-full bg-[#05080f] border border-slate-900 rounded px-2 py-1 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                            </div>

                            {proposalDraftResult.milestones && (
                              <div className="space-y-2 text-left border-t border-slate-900/60 pt-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Client Milestones Plan ({proposalDraftResult.milestones.length}):</span>
                                </div>
                                
                                <div className="space-y-2">
                                  {proposalDraftResult.milestones.map((mil: string, i: number) => (
                                    <div key={i} className="flex items-center gap-2 bg-[#05080f] border border-slate-900/50 p-1.5 rounded-lg">
                                      <span className="text-[10px] text-slate-600 font-mono w-4 text-right">{i + 1}.</span>
                                      <input
                                        type="text"
                                        value={mil}
                                        onChange={(e) => handleEditMilestoneText(i, e.target.value)}
                                        className="flex-1 bg-transparent border-0 text-[11px] text-slate-300 focus:outline-none focus:ring-0 p-0 font-sans"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMilestoneItem(i)}
                                        className="text-slate-600 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                                        title="Delete Milestone"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                {/* Add New Milestone Inline Input */}
                                <div className="flex gap-2 pt-1">
                                  <input
                                    type="text"
                                    id="new-milestone-input"
                                    placeholder="Add custom milestone (e.g. Phase 2 Server Config)..."
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        const val = (e.target as HTMLInputElement).value;
                                        if (val.trim()) {
                                          handleAddMilestoneItem(val);
                                          (e.target as HTMLInputElement).value = "";
                                        }
                                      }
                                    }}
                                    className="flex-1 bg-[#05080f] border border-slate-900 rounded px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 font-sans"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const inputEl = document.getElementById("new-milestone-input") as HTMLInputElement;
                                      if (inputEl && inputEl.value.trim()) {
                                        handleAddMilestoneItem(inputEl.value);
                                        inputEl.value = "";
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-[#1e293b] hover:bg-slate-700 text-slate-300 font-sans text-[10px] font-semibold rounded transition-all cursor-pointer"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Dual Delivery Channel Options */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mt-3.5 pt-3.5 border-t border-slate-900">
                              
                              {/* Channel 1: Google Gmail */}
                              <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-lg space-y-2">
                                <div>
                                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block font-bold">📤 Dispatch via Google Gmail:</span>
                                  <p className="text-[9px] text-slate-500 mt-0.5 leading-normal">
                                    Deliver this pitch proposal instantly via your personal authorized Gmail account.
                                  </p>
                                </div>

                                {proposalEmailSuccess && (
                                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded">
                                    Proposal delivered via Gmail successfully!
                                  </div>
                                )}

                                {proposalEmailError && (
                                  <div className="p-2 bg-red-950/20 border border-red-500/20 text-red-400 text-[10px] rounded">
                                    {proposalEmailError}
                                  </div>
                                )}

                                <div className="flex gap-1.5 pt-1">
                                  <input
                                    type="email"
                                    placeholder="client@company.com"
                                    value={proposalRecipientEmail}
                                    onChange={(e) => {
                                      setProposalRecipientEmail(e.target.value);
                                      setProposalEmailSuccess(false);
                                    }}
                                    disabled={!gmailAccessToken}
                                    className="flex-1 bg-[#05080f] border border-slate-900 disabled:opacity-50 text-[11px] text-white px-2 py-1 rounded focus:outline-none focus:ring-0"
                                  />
                                  <button
                                    onClick={handleEmailProposal}
                                    disabled={isEmailingProposal || !proposalRecipientEmail || !gmailAccessToken}
                                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-sans text-[10px] px-2.5 py-1 rounded transition-colors cursor-pointer font-bold"
                                  >
                                    {isEmailingProposal ? "Mailing..." : "Gmail Send"}
                                  </button>
                                </div>

                                {!gmailAccessToken && (
                                  <p className="text-[8px] text-amber-500 italic font-sans leading-snug">
                                    * Connect Gmail account under "Gmail Alerts" tab to unlock.
                                  </p>
                                )}
                              </div>

                              {/* Channel 2: Hostinger Custom Domain */}
                              <div className="bg-[#0b0f19] border border-indigo-500/15 p-3 rounded-lg space-y-2">
                                <div>
                                  <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider block font-bold">🌐 Dispatch via {hostingerConfig.websiteUrl}:</span>
                                  <p className="text-[9px] text-slate-400 mt-0.5 leading-normal">
                                    Deliver professional bids directly from your official domain sender address (<strong>{hostingerConfig.smtpUser}</strong>).
                                  </p>
                                </div>

                                {pitchSendHostingerSuccess && (
                                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded">
                                    Proposal sent via Hostinger SMTP successfully!
                                  </div>
                                )}

                                {pitchSendHostingerError && (
                                  <div className="p-2 bg-red-950/20 border border-red-500/20 text-red-400 text-[10px] rounded">
                                    {pitchSendHostingerError}
                                  </div>
                                )}

                                <div className="flex gap-1.5 pt-1">
                                  <input
                                    type="email"
                                    placeholder="client@company.com"
                                    value={proposalRecipientEmail}
                                    onChange={(e) => {
                                      setProposalRecipientEmail(e.target.value);
                                      setPitchSendHostingerSuccess(false);
                                    }}
                                    disabled={!hostingerConfig.isConfigured}
                                    className="flex-1 bg-[#05080f] border border-slate-900 disabled:opacity-50 text-[11px] text-white px-2 py-1 rounded focus:outline-none focus:ring-0"
                                  />
                                  <button
                                    onClick={handleSendPitchViaHostinger}
                                    disabled={isSendingPitchViaHostinger || !proposalRecipientEmail || !hostingerConfig.isConfigured}
                                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-sans text-[10px] px-2.5 py-1 rounded transition-colors cursor-pointer font-bold"
                                  >
                                    {isSendingPitchViaHostinger ? "Mailing..." : "Domain Send"}
                                  </button>
                                </div>

                                {!hostingerConfig.isConfigured && (
                                  <p className="text-[8px] text-amber-400 italic font-sans leading-snug">
                                    * Configure SMTP in the "Hostinger Mail" tab to unlock professional domain bidding.
                                  </p>
                                )}
                              </div>

                            </div>

                          </div>
                        )}

                      </div>
                    ) : (
                      <div className="p-12 border border-dashed border-slate-850 rounded-xl text-center text-slate-500 text-xs font-sans">
                        Select an available contract gig on the left to review detail matrices and generate tailored bids.
                      </div>
                    )}

                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

        {/* Hostinger Custom Domain SMTP Integration Tab */}
        {activeTab === "hostinger" && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="flex flex-col lg:flex-row gap-6">
              
              {/* Left Column: Form Settings */}
              <div className="flex-1 space-y-6">
                
                {/* Header Information */}
                <div className="p-6 bg-slate-900/40 border border-slate-850 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white font-sans">Hostinger SMTP Mail Integration</h2>
                      <p className="text-xs text-slate-400 font-sans mt-0.5">
                        Send automated proposal pitches, daily match digests, and client triggers directly from your custom professional domain email.
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-indigo-950/20 border border-indigo-500/10 rounded-lg text-xs text-slate-300 space-y-1.5 font-sans leading-relaxed">
                    <p>
                      💡 <strong>Why integrate your custom domain?</strong> Sending proposals from a generic email address can make freelance pitches look unprofessional. Integrating <strong>info@aaditechs.in</strong> ensures all emails are sent directly from your verified Hostinger mail server.
                    </p>
                    <p className="text-[11px] text-slate-400 italic">
                      * Uses secure SSL/TLS protocols with implicit connection timeout safeguards to guarantee delivery logs.
                    </p>
                  </div>
                </div>

                {/* Configuration form */}
                <form onSubmit={handleSaveHostingerConfig} className="p-6 bg-[#0a0f1d] border border-slate-850 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <span className="text-xs font-bold text-white font-sans uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                      Server Configuration
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${hostingerConfig.isConfigured ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" : "bg-amber-500/10 text-amber-500 border border-amber-500/10"}`}>
                      ● {hostingerConfig.isConfigured ? "Authenticated & Active" : "Missing Credentials"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                    
                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">Business / Brand Name</label>
                      <input
                        type="text"
                        value={hostingerConfig.brandName}
                        onChange={(e) => setHostingerConfig({ ...hostingerConfig, brandName: e.target.value })}
                        required
                        placeholder="e.g. AadiTechs Support Solutions"
                        className="w-full bg-[#05080f] border border-slate-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">Business Portfolio Website</label>
                      <input
                        type="text"
                        value={hostingerConfig.websiteUrl}
                        onChange={(e) => setHostingerConfig({ ...hostingerConfig, websiteUrl: e.target.value })}
                        required
                        placeholder="e.g. aaditechs.in"
                        className="w-full bg-[#05080f] border border-slate-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">Hostinger SMTP Host</label>
                      <input
                        type="text"
                        value={hostingerConfig.smtpHost}
                        onChange={(e) => setHostingerConfig({ ...hostingerConfig, smtpHost: e.target.value })}
                        required
                        placeholder="smtp.hostinger.com"
                        className="w-full bg-[#05080f] border border-slate-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">SMTP Port</label>
                      <select
                        value={hostingerConfig.smtpPort}
                        onChange={(e) => setHostingerConfig({ ...hostingerConfig, smtpPort: Number(e.target.value) })}
                        className="w-full bg-[#05080f] border border-slate-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                      >
                        <option value={465}>465 (Implicit SSL/TLS - Recommended)</option>
                        <option value={587}>587 (Explicit TLS / STARTTLS)</option>
                        <option value={25}>25 (Unencrypted Port)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">SMTP Username (Full Sender Email)</label>
                      <input
                        type="email"
                        value={hostingerConfig.smtpUser}
                        onChange={(e) => setHostingerConfig({ ...hostingerConfig, smtpUser: e.target.value })}
                        required
                        placeholder="info@aaditechs.in"
                        className="w-full bg-[#05080f] border border-slate-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium flex items-center justify-between">
                        <span>Hostinger Mail Password / App Secret</span>
                        <span className="text-[10px] text-slate-500">Secure AES-256 Storage</span>
                      </label>
                      <input
                        type="password"
                        value={hostingerConfig.smtpPassword}
                        onChange={(e) => setHostingerConfig({ ...hostingerConfig, smtpPassword: e.target.value })}
                        placeholder={hostingerConfig.hasPassword ? "••••••••••••" : "Enter your Hostinger email password"}
                        required={!hostingerConfig.hasPassword}
                        className="w-full bg-[#05080f] border border-slate-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-slate-400 font-medium flex items-center justify-between">
                        <span>Alerts Destination Email</span>
                        <span className="text-[10px] text-indigo-400 font-semibold">Notifications pipeline target</span>
                      </label>
                      <input
                        type="email"
                        value={hostingerConfig.notificationTriggerEmail}
                        onChange={(e) => setHostingerConfig({ ...hostingerConfig, notificationTriggerEmail: e.target.value })}
                        required
                        placeholder="e.g. j9619655391@gmail.com"
                        className="w-full bg-[#05080f] border border-slate-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                      <p className="text-[10px] text-slate-500 leading-normal">
                        This is the inbox that will receive direct notification digests, automated system logs, and matched gig triggers sent from your domain.
                      </p>
                    </div>

                  </div>

                  <div className="pt-3 border-t border-slate-900 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingHostinger}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-sans text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer"
                    >
                      {isSavingHostinger ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Encrypting Settings...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Server Configuration</span>
                        </>
                      )}
                    </button>
                  </div>

                  {hostingerSaveSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/15 rounded-lg text-emerald-400 text-xs font-sans">
                      ✓ Hostinger SMTP server specifications saved and synchronized with server database memory!
                    </div>
                  )}
                </form>

              </div>

              {/* Right Column: Real-Time Diagnostic Unit */}
              <div className="w-full lg:w-[420px] space-y-6">
                
                {/* Live Diagnostics Card */}
                <div className="p-6 bg-[#0a0f1d] border border-slate-850 rounded-xl space-y-4">
                  <div className="border-b border-slate-900 pb-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-sans uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      SMTP Diagnostic Unit
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${hostingerConfig.isConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                      <span className="text-[10px] font-mono text-slate-400">SMTP Handshake: {hostingerConfig.lastTriggerStatus}</span>
                    </span>
                  </div>

                  <div className="space-y-3.5 text-xs font-sans">
                    <p className="text-slate-400 leading-relaxed text-xs">
                      Run an authenticated loopback diagnostic test to establish an active socket connection with Hostinger SMTP and dispatch a secure verification email.
                    </p>

                    <button
                      type="button"
                      onClick={handleTestSmtpConnection}
                      disabled={isTestingSmtp || !hostingerConfig.isConfigured}
                      className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:from-slate-900 disabled:to-slate-900 disabled:text-slate-600 text-white font-sans text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950/20"
                    >
                      {isTestingSmtp ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>Testing SMTP Handshake...</span>
                        </>
                      ) : (
                        <>
                          <Activity className="w-4 h-4 text-indigo-300" />
                          <span>Trigger Diagnostics & Test Mail</span>
                        </>
                      )}
                    </button>

                    {!hostingerConfig.isConfigured && (
                      <p className="text-[10px] text-amber-500 italic text-center mt-1">
                        * Please save your Hostinger configuration first to unlock loopback diagnostics.
                      </p>
                    )}
                  </div>

                  {/* Output Status Banner */}
                  {smtpTestSuccess !== null && (
                    <div className={`p-3.5 rounded-lg border text-xs font-sans ${smtpTestSuccess ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-950/20 border-red-500/20 text-red-400"}`}>
                      <div className="font-bold flex items-center gap-1.5">
                        {smtpTestSuccess ? "✓ Connection Handshake Succeeded" : "❌ Connection Handshake Failed"}
                      </div>
                      <p className="text-[11px] mt-1 leading-normal text-slate-300">{smtpTestMessage}</p>
                    </div>
                  )}

                  {/* Terminal Network Log Display */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Raw SMTP Negotiation Stream:</span>
                    <div className="bg-[#05080f] border border-slate-900 rounded-lg p-3 h-[240px] overflow-y-auto font-mono text-[10px] text-slate-300 space-y-1 leading-relaxed selection:bg-indigo-950">
                      {hostingerLogs.length === 0 ? (
                        <div className="text-slate-600 italic h-full flex items-center justify-center">
                          Waiting for diagnostic trigger...
                        </div>
                      ) : (
                        hostingerLogs.map((log, index) => {
                          const l = log || "";
                          let color = "text-slate-400";
                          if (l.includes("❌") || l.includes("Exception") || l.includes("Failed")) color = "text-red-400";
                          else if (l.includes("🔐") || l.includes("successful") || l.includes("verified") || l.includes("✓")) color = "text-emerald-400 font-bold";
                          else if (l.includes("📡") || l.includes("Configuring")) color = "text-indigo-400";
                          else if (l.includes("⏳") || l.includes("Executing")) color = "text-amber-400";
                          else if (l.includes("📦") || l.includes("complete")) color = "text-cyan-400 font-semibold";
                          
                          return (
                            <div key={index} className={color}>
                              {log}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

        {/* TAB: Telegram Bot & Two-Way Alerts Hub */}
        {activeTab === "telegram" && (
          <TelegramAlertsPanel />
        )}

        {/* TAB: Saved Bookmarks */}
        {activeTab === "saved" && (
          <SavedJobsPanel />
        )}

        {/* TAB: Pipeline Tracker */}
        {activeTab === "pipeline" && (
          <ApplicationTrackerPanel />
        )}

        {/* TAB: Search History Logs */}
        {activeTab === "history" && (
          <SearchHistoryPanel />
        )}

        {/* TAB: Analytics Funnel */}
        {activeTab === "analytics" && (
          <SearchAnalyticsPanel />
        )}

        {/* TAB: Roadmap & Engineering TODOs */}
        {activeTab === "todo" && (
          <RoadmapTodoPanel />
        )}

      </div>

      {/* Custom Alert Modal */}
      {modalAlert && modalAlert.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#0c101a] border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white font-sans">{modalAlert.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans whitespace-pre-wrap">{modalAlert.message}</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalAlert(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold font-sans transition-all cursor-pointer"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {modalConfirm && modalConfirm.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#0c101a] border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white font-sans">{modalConfirm.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans whitespace-pre-wrap">{modalConfirm.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalConfirm(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg text-xs font-semibold font-sans transition-all cursor-pointer border border-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  modalConfirm.onConfirm();
                  setModalConfirm(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold font-sans transition-all cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
