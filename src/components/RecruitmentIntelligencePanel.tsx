import React, { useState, useEffect } from "react";
import {
  Users,
  Briefcase,
  Layers,
  Sparkles,
  Calendar,
  MessageSquare,
  Building,
  Plus,
  Trash2,
  FileText,
  TrendingUp,
  Cpu,
  Mail,
  UserPlus,
  Compass,
  ArrowRight,
  Clipboard,
  CheckCircle,
  AlertTriangle,
  Activity,
  UserCheck,
  Search,
  Filter
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  company: string;
  industry: string;
  contacts: string;
  hiringManager: string;
  notes: string;
  priority: "High" | "Medium" | "Low";
  status: "Active" | "Inactive";
}

interface JobRequirement {
  id: string;
  clientId: string;
  jobTitle: string;
  department: string;
  skills: string[];
  experience: string;
  location: string;
  salary: string;
  remote: "Onsite" | "Hybrid" | "Remote";
  visa: "Required" | "Not Required" | "Flexible";
  employmentType: "Full-time" | "Contract" | "Part-time";
  openPositions: number;
  priority: "High" | "Medium" | "Low";
  deadline: string;
  status: "Open" | "Closed" | "Draft";
  jobDescription: string;
  intelligence: {
    skills: string[];
    experience: string;
    technologies: string[];
    softSkills: string[];
    requiredCertifications: string[];
    prioritySkills: string[];
    optionalSkills: string[];
  } | null;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  resume: string;
  linkedin: string;
  portfolio: string;
  github: string;
  notes: string;
  status: string;
  intelligence: {
    skills: string[];
    strengths: string[];
    weaknesses: string[];
    missingSkills: string[];
    atsScore: number;
    recommendation: string;
  } | null;
}

interface Pipeline {
  id: string;
  candidateId: string;
  jobId: string;
  status: string;
  updatedAt: string;
}

interface Interview {
  id: string;
  pipelineId: string;
  round: string;
  interviewer: string;
  date: string;
  feedback: string;
  decision: "Pass" | "Fail" | "Pending";
}

interface Communication {
  id: string;
  candidateId: string;
  type: "Email" | "Call" | "WhatsApp" | "Meeting" | "Follow-up";
  content: string;
  date: string;
}

export default function RecruitmentIntelligencePanel() {
  const [subTab, setSubTab] = useState<"dashboard" | "clients" | "jobs" | "candidates" | "matching" | "interviews" | "orchestrate">("dashboard");

  // Core Data States
  const [clients, setClients] = useState<Client[]>([]);
  const [requirements, setRequirements] = useState<JobRequirement[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    openPositions: 0,
    candidates: 0,
    interviews: 0,
    offers: 0,
    joining: 0,
    averageMatch: 0,
    timeToHire: "14 days"
  });

  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Add Client Form States
  const [newClient, setNewClient] = useState({
    name: "",
    company: "",
    industry: "Technology",
    contacts: "",
    hiringManager: "",
    notes: "",
    priority: "Medium" as const,
    status: "Active" as const
  });

  // Add Job Form States
  const [newJob, setNewJob] = useState({
    clientId: "",
    jobTitle: "",
    department: "Engineering",
    skills: "",
    experience: "3+ years",
    location: "Remote",
    salary: "$120k - $140k",
    remote: "Remote" as const,
    visa: "Not Required" as const,
    employmentType: "Full-time" as const,
    openPositions: 1,
    priority: "Medium" as const,
    deadline: "",
    status: "Open" as const,
    jobDescription: ""
  });

  // Add Candidate Form States
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    email: "",
    resume: "",
    linkedin: "",
    portfolio: "",
    github: "",
    notes: ""
  });

  // Schedule Interview Form States
  const [newInterview, setNewInterview] = useState({
    pipelineId: "",
    round: "Screening",
    interviewer: "",
    date: "",
    feedback: "",
    decision: "Pending" as const
  });

  // Log Communication Form States
  const [newComm, setNewComm] = useState({
    candidateId: "",
    type: "Email" as const,
    content: ""
  });

  // Match / Orchestrate Inputs
  const [selectedMatchCandidate, setSelectedMatchCandidate] = useState("");
  const [selectedMatchRequirement, setSelectedMatchRequirement] = useState("");
  const [matchResult, setMatchResult] = useState<any | null>(null);
  const [isMatching, setIsMatching] = useState(false);

  // Orchestrator State
  const [orchestrationGoal, setOrchestrationGoal] = useState("Run requirement analysis, map resume profiles, evaluate ATS alignment, draft professional email outreach, and pre-schedule screening interview round.");
  const [orchestratorTaskId, setOrchestratorTaskId] = useState<string | null>(null);
  const [orchestratorSteps, setOrchestratorSteps] = useState<any[]>([]);
  const [isOrchestrating, setIsOrchestrating] = useState(false);

  // Candidate Email Outreach Template Visualizer State
  const [outreachModalOpen, setOutreachModalOpen] = useState(false);
  const [selectedOutreachCandidate, setSelectedOutreachCandidate] = useState<Candidate | null>(null);
  const [selectedOutreachJobId, setSelectedOutreachJobId] = useState("");
  const [outreachTemplateType, setOutreachTemplateType] = useState<"initial_outreach" | "interview_invitation" | "offer_proposal">("initial_outreach");
  const [outreachSubject, setOutreachSubject] = useState("");
  const [outreachBody, setOutreachBody] = useState("");
  const [outreachVars, setOutreachVars] = useState<Record<string, string>>({});
  const [isGeneratingOutreach, setIsGeneratingOutreach] = useState(false);
  const [isSendingOutreach, setIsSendingOutreach] = useState(false);
  const [outreachSendResult, setOutreachSendResult] = useState<{ success: boolean; message: string; deliveredViaSMTP: boolean } | null>(null);

  const handleOpenOutreachModal = (cand: Candidate, reqId?: string) => {
    setSelectedOutreachCandidate(cand);
    const targetReqId = reqId || (requirements.length > 0 ? requirements[0].id : "");
    setSelectedOutreachJobId(targetReqId);
    setOutreachModalOpen(true);
    setOutreachSendResult(null);

    if (targetReqId) {
      fetchOutreachTemplate(cand.id, targetReqId, outreachTemplateType);
    }
  };

  const fetchOutreachTemplate = async (candidateId: string, requirementId: string, type: string) => {
    setIsGeneratingOutreach(true);
    try {
      const res = await fetch("/api/recruitment/outreach/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, requirementId, templateType: type })
      });
      if (res.ok) {
        const data = await res.json();
        setOutreachSubject(data.subject || "");
        setOutreachBody(data.body || "");
        setOutreachVars(data.variables || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingOutreach(false);
    }
  };

  const handleSendOutreachEmail = async () => {
    if (!selectedOutreachCandidate || !outreachSubject || !outreachBody) return;
    setIsSendingOutreach(true);
    setOutreachSendResult(null);
    try {
      const res = await fetch("/api/recruitment/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selectedOutreachCandidate.id,
          recipientEmail: selectedOutreachCandidate.email,
          subject: outreachSubject,
          body: outreachBody
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOutreachSendResult({
          success: true,
          message: `Email successfully dispatched to ${selectedOutreachCandidate.name} (${selectedOutreachCandidate.email})!`,
          deliveredViaSMTP: !!data.deliveredViaSMTP
        });
        loadData();
      } else {
        setOutreachSendResult({
          success: false,
          message: data.error || "Failed to send outreach email.",
          deliveredViaSMTP: false
        });
      }
    } catch (err: any) {
      setOutreachSendResult({
        success: false,
        message: err.message || "Failed to send outreach email.",
        deliveredViaSMTP: false
      });
    } finally {
      setIsSendingOutreach(false);
    }
  };

  // Fetch all core recruitment tables with resilient individual endpoint error handling
  const safeFetch = async (url: string, fallback: any) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return fallback;
      return await res.json();
    } catch {
      return fallback;
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resClients, resReqs, resCands, resPipelines, resInterviews, resComms, resStats] = await Promise.all([
        safeFetch("/api/recruitment/clients", { clients: [] }),
        safeFetch("/api/recruitment/requirements", { requirements: [] }),
        safeFetch("/api/recruitment/candidates", { candidates: [] }),
        safeFetch("/api/recruitment/pipelines", { pipelines: [] }),
        safeFetch("/api/recruitment/interviews", { interviews: [] }),
        safeFetch("/api/recruitment/communications", { communications: [] }),
        safeFetch("/api/recruitment/dashboard", null)
      ]);

      setClients(resClients.clients || []);
      setRequirements(resReqs.requirements || []);
      setCandidates(resCands.candidates || []);
      setPipelines(resPipelines.pipelines || []);
      setInterviews(resInterviews.interviews || []);
      setCommunications(resComms.communications || []);
      setDashboardStats(resStats || {
        openPositions: 0,
        candidates: 0,
        interviews: 0,
        offers: 0,
        joining: 0,
        averageMatch: 82,
        timeToHire: "14 days"
      });
    } catch (err) {
      console.error("Failed to load recruitment workspace data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initLoad = async () => {
      if (isMounted) await loadData();
    };
    initLoad();
    return () => { isMounted = false; };
  }, []);

  // Poll for active orchestrator status if running with unmount guard
  useEffect(() => {
    let interval: any;
    let isMounted = true;
    if (orchestratorTaskId && isOrchestrating) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/studio/task/${orchestratorTaskId}`);
          if (res.ok && isMounted) {
            const taskState = await res.json();
            if (isMounted) {
              setOrchestratorSteps(taskState.steps || []);
              if (taskState.status === "completed" || taskState.status === "failed") {
                setIsOrchestrating(false);
                loadData(); // Reload data with updated pipeline
              }
            }
          }
        } catch (e) {
          console.error("Error polling orchestrator task state", e);
        }
      }, 1000);
    }
    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [orchestratorTaskId, isOrchestrating]);

  // Client Handlers
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.company) return;
    try {
      const res = await fetch("/api/recruitment/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClient)
      });
      if (res.ok) {
        setNewClient({
          name: "",
          company: "",
          industry: "Technology",
          contacts: "",
          hiringManager: "",
          notes: "",
          priority: "Medium",
          status: "Active"
        });
        loadData();
      }
    } catch (err) {
      console.error("Failed to add client", err);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm("Are you sure you want to remove this client?")) return;
    try {
      await fetch(`/api/recruitment/clients/${id}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Job Requirement Handlers
  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.jobTitle || !newJob.clientId) return;
    try {
      const res = await fetch("/api/recruitment/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newJob)
      });
      if (res.ok) {
        setNewJob({
          clientId: "",
          jobTitle: "",
          department: "Engineering",
          skills: "",
          experience: "3+ years",
          location: "Remote",
          salary: "$120k - $140k",
          remote: "Remote",
          visa: "Not Required",
          employmentType: "Full-time",
          openPositions: 1,
          priority: "Medium",
          deadline: "",
          status: "Open",
          jobDescription: ""
        });
        loadData();
      }
    } catch (err) {
      console.error("Failed to add job requirement", err);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm("Are you sure you want to remove this job requirement?")) return;
    try {
      await fetch(`/api/recruitment/requirements/${id}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalyzeJob = async (id: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/recruitment/requirements/${id}/analyze`, { method: "POST" });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Candidate Intake Handlers
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidate.name || !newCandidate.email) return;
    try {
      const res = await fetch("/api/recruitment/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCandidate)
      });
      if (res.ok) {
        setNewCandidate({
          name: "",
          email: "",
          resume: "",
          linkedin: "",
          portfolio: "",
          github: "",
          notes: ""
        });
        loadData();
      }
    } catch (err) {
      console.error("Failed to add candidate", err);
    }
  };

  const handleAnalyzeCandidate = async (id: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/recruitment/candidates/${id}/analyze`, { method: "POST" });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // AI Matching Trigger
  const handleRunMatching = async () => {
    if (!selectedMatchCandidate || !selectedMatchRequirement) return;
    setIsMatching(true);
    setMatchResult(null);
    try {
      const res = await fetch("/api/recruitment/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selectedMatchCandidate,
          requirementId: selectedMatchRequirement
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMatchResult(data.match);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsMatching(false);
    }
  };

  // Pipeline Status Drag / Click update
  const handleUpdatePipelineStatus = async (pipelineId: string, status: string) => {
    try {
      const res = await fetch(`/api/recruitment/pipelines/${pipelineId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLinkToPipeline = async (candidateId: string, jobId: string) => {
    try {
      const res = await fetch("/api/recruitment/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, jobId, status: "New" })
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Schedule Interview round
  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInterview.pipelineId || !newInterview.round) return;
    try {
      const res = await fetch("/api/recruitment/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newInterview)
      });
      if (res.ok) {
        setNewInterview({
          pipelineId: "",
          round: "Screening",
          interviewer: "",
          date: "",
          feedback: "",
          decision: "Pending"
        });
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update interview feedback / decision
  const handleRecordInterviewFeedback = async (id: string, feedback: string, decision: "Pass" | "Fail") => {
    try {
      const res = await fetch(`/api/recruitment/interviews/${id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback, decision })
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Log new Outreach Communication
  const handleAddCommunication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComm.candidateId || !newComm.content) return;
    try {
      const res = await fetch("/api/recruitment/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: newComm.candidateId,
          type: newComm.type,
          content: newComm.content
        })
      });
      if (res.ok) {
        setNewComm({
          candidateId: "",
          type: "Email",
          content: ""
        });
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger Custom AI Task Orchestration Workflow
  const handleRunOrchestrator = async () => {
    if (!selectedMatchCandidate || !selectedMatchRequirement) {
      alert("Please select a Candidate and a Job Requirement first to bind the Orchestration context.");
      return;
    }
    setIsOrchestrating(true);
    setOrchestratorTaskId(null);
    setOrchestratorSteps([]);
    try {
      const res = await fetch("/api/recruitment/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: orchestrationGoal,
          clientId: requirements.find(r => r.id === selectedMatchRequirement)?.clientId,
          requirementId: selectedMatchRequirement,
          candidateId: selectedMatchCandidate
        })
      });
      if (res.ok) {
        const data = await res.json();
        setOrchestratorTaskId(data.taskId);
        setOrchestratorSteps(data.steps || []);
      } else {
        setIsOrchestrating(false);
      }
    } catch (err) {
      console.error(err);
      setIsOrchestrating(false);
    }
  };

  const pipelineStates = ["New", "Screening", "Technical", "HR", "Final", "Offer", "Joined", "Rejected", "Hold"];

  return (
    <div className="bg-[#0b1329] border border-[#1e293b]/50 rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[750px] font-sans text-slate-100">
      
      {/* Side Control Tabs Panel */}
      <div className="w-full md:w-64 bg-[#080d1a] border-r border-[#1e293b]/50 p-4 flex flex-col gap-1 shrink-0">
        <div className="flex items-center gap-2 px-3 py-4 mb-4 border-b border-[#1e293b]/35">
          <Cpu className="w-6 h-6 text-indigo-400 animate-pulse" />
          <div>
            <h3 className="font-bold tracking-tight text-slate-100 text-sm">Recruitment Intel</h3>
            <p className="text-[10px] text-indigo-400 font-mono">Sprint 4 Core Engine</p>
          </div>
        </div>

        <button
          onClick={() => setSubTab("dashboard")}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
            subTab === "dashboard" ? "bg-indigo-600/20 text-indigo-300 border-l-2 border-indigo-500" : "text-slate-400 hover:bg-[#0d1527] hover:text-slate-200"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Dashboard & Pipeline
        </button>

        <button
          onClick={() => setSubTab("clients")}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
            subTab === "clients" ? "bg-indigo-600/20 text-indigo-300 border-l-2 border-indigo-500" : "text-slate-400 hover:bg-[#0d1527] hover:text-slate-200"
          }`}
        >
          <Building className="w-4 h-4" />
          Client Accounts
        </button>

        <button
          onClick={() => setSubTab("jobs")}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
            subTab === "jobs" ? "bg-indigo-600/20 text-indigo-300 border-l-2 border-indigo-500" : "text-slate-400 hover:bg-[#0d1527] hover:text-slate-200"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Job Requirements
        </button>

        <button
          onClick={() => setSubTab("candidates")}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
            subTab === "candidates" ? "bg-indigo-600/20 text-indigo-300 border-l-2 border-indigo-500" : "text-slate-400 hover:bg-[#0d1527] hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          Candidates Intake
        </button>

        <button
          onClick={() => setSubTab("matching")}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
            subTab === "matching" ? "bg-indigo-600/20 text-indigo-300 border-l-2 border-indigo-500" : "text-slate-400 hover:bg-[#0d1527] hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI Matching Lab
        </button>

        <button
          onClick={() => setSubTab("interviews")}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
            subTab === "interviews" ? "bg-indigo-600/20 text-indigo-300 border-l-2 border-indigo-500" : "text-slate-400 hover:bg-[#0d1527] hover:text-slate-200"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Interviews & Timeline
        </button>

        <button
          onClick={() => setSubTab("orchestrate")}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
            subTab === "orchestrate" ? "bg-pink-600/20 text-pink-300 border-l-2 border-pink-500" : "text-slate-400 hover:bg-[#0d1527] hover:text-slate-200"
          }`}
        >
          <Compass className="w-4 h-4" />
          Orchestration Studio
        </button>

        {/* Load status */}
        <div className="mt-auto pt-4 border-t border-[#1e293b]/35 px-2">
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
            <span className={`w-2 h-2 rounded-full ${isLoading ? "bg-amber-500 animate-ping" : "bg-emerald-500"}`}></span>
            {isLoading ? "Syncing Workspace..." : "Workspace Connected"}
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 bg-[#090f1e] p-6 flex flex-col gap-6 overflow-y-auto">
        
        {/* TOP STATUS BENTO MATRIX */}
        {subTab === "dashboard" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0e172a] border border-[#1e293b]/40 rounded-xl p-4 flex flex-col justify-between shadow-lg">
                <span className="text-slate-400 text-xs font-medium">Open Positions</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-bold tracking-tight">{dashboardStats.openPositions || requirements.length}</span>
                  <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded font-mono">Active</span>
                </div>
              </div>

              <div className="bg-[#0e172a] border border-[#1e293b]/40 rounded-xl p-4 flex flex-col justify-between shadow-lg">
                <span className="text-slate-400 text-xs font-medium">Candidates Enrolled</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-bold tracking-tight">{dashboardStats.candidates || candidates.length}</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">Intake</span>
                </div>
              </div>

              <div className="bg-[#0e172a] border border-[#1e293b]/40 rounded-xl p-4 flex flex-col justify-between shadow-lg">
                <span className="text-slate-400 text-xs font-medium">Interviews Conducted</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-bold tracking-tight">{dashboardStats.interviews || interviews.length}</span>
                  <span className="text-[10px] text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded font-mono">Schedules</span>
                </div>
              </div>

              <div className="bg-[#0e172a] border border-[#1e293b]/40 rounded-xl p-4 flex flex-col justify-between shadow-lg">
                <span className="text-slate-400 text-xs font-medium">Average Match Alignment</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-bold tracking-tight">{dashboardStats.averageMatch || 82}%</span>
                  <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded font-mono">ATS-AI</span>
                </div>
              </div>
            </div>

            {/* REAL-TIME PIPELINE INTERACTIVE KANBAN BOARD */}
            <div className="bg-[#0e172a] border border-[#1e293b]/40 rounded-xl p-5 shadow-lg flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-[#1e293b]/35 pb-3">
                <div>
                  <h3 className="font-bold tracking-tight text-sm text-slate-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Interactive Recruitment Pipeline
                  </h3>
                  <p className="text-slate-400 text-xs">Manage candidate transition status fluidly across the recruitment lifecycle.</p>
                </div>
                <button onClick={loadData} className="px-3 py-1.5 bg-[#1e293b] hover:bg-[#2e3b52] rounded-md text-[11px] font-medium transition-all">
                  Reload Board
                </button>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-4">
                {pipelineStates.map(state => {
                  const stateCandidates = candidates.filter(c => c.status === state);
                  return (
                    <div key={state} className="flex-1 min-w-[200px] bg-[#070b14]/75 border border-[#1e293b]/30 p-3 rounded-lg flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-[#1e293b]/20 pb-1.5">
                        <span className="text-xs font-semibold text-indigo-300">{state}</span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-500/10 px-1.5 rounded-full">{stateCandidates.length}</span>
                      </div>

                      <div className="flex flex-col gap-2 min-h-[150px]">
                        {stateCandidates.length === 0 ? (
                          <div className="text-[10px] text-slate-600 text-center py-8 italic border border-dashed border-[#1e293b]/20 rounded">
                            Empty stage
                          </div>
                        ) : (
                          stateCandidates.map(c => {
                            const pipeItem = pipelines.find(p => p.candidateId === c.id);
                            return (
                              <div key={c.id} className="bg-[#0c1222] border border-[#1e293b]/40 p-2.5 rounded shadow flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                  <span className="text-xs font-bold text-slate-200">{c.name}</span>
                                  {pipeItem && (
                                    <button
                                      onClick={() => {
                                        const nextIdx = (pipelineStates.indexOf(state) + 1) % pipelineStates.length;
                                        handleUpdatePipelineStatus(pipeItem.id, pipelineStates[nextIdx]);
                                      }}
                                      title="Promote Stage"
                                      className="text-slate-500 hover:text-indigo-400 transition-all"
                                    >
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 truncate">{c.email}</span>
                                {c.intelligence?.atsScore && (
                                  <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-[#1e293b]/10 text-[9px] font-mono">
                                    <span className="text-slate-500">ATS Score</span>
                                    <span className="text-indigo-400 font-bold">{c.intelligence.atsScore}%</span>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* CLIENT ACCOUNTS SECTION */}
        {subTab === "clients" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Create Client Form */}
            <div className="bg-[#0e172a] border border-[#1e293b]/40 rounded-xl p-5 shadow-lg flex flex-col gap-4">
              <h3 className="font-bold tracking-tight text-sm text-indigo-300 flex items-center gap-2 border-b border-[#1e293b]/35 pb-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                Add Client Company
              </h3>

              <form onSubmit={handleAddClient} className="flex flex-col gap-3 font-sans text-xs text-slate-300">
                <div className="flex flex-col gap-1">
                  <label>Contact Name</label>
                  <input
                    type="text"
                    required
                    value={newClient.name}
                    onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                    placeholder="e.g. Aziz Senior"
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label>Company/Institution</label>
                  <input
                    type="text"
                    required
                    value={newClient.company}
                    onChange={e => setNewClient({ ...newClient, company: e.target.value })}
                    placeholder="e.g. Aziz Family Enterprises"
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label>Industry</label>
                  <input
                    type="text"
                    value={newClient.industry}
                    onChange={e => setNewClient({ ...newClient, industry: e.target.value })}
                    placeholder="e.g. Finance & Asset Management"
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label>Contacts Info</label>
                  <input
                    type="text"
                    value={newClient.contacts}
                    onChange={e => setNewClient({ ...newClient, contacts: e.target.value })}
                    placeholder="e.g. +91 99999999"
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label>Hiring Manager</label>
                  <input
                    type="text"
                    value={newClient.hiringManager}
                    onChange={e => setNewClient({ ...newClient, hiringManager: e.target.value })}
                    placeholder="e.g. Jamil Aziz"
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label>Recruitment Notes</label>
                  <textarea
                    rows={3}
                    value={newClient.notes}
                    onChange={e => setNewClient({ ...newClient, notes: e.target.value })}
                    placeholder="Required executive IT officer..."
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <button type="submit" className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold p-2 rounded transition-all cursor-pointer">
                  Register Client Account
                </button>
              </form>
            </div>

            {/* Client Accounts list */}
            <div className="lg:col-span-2 bg-[#0e172a] border border-[#1e293b]/40 rounded-xl p-5 shadow-lg flex flex-col gap-4">
              <h3 className="font-bold tracking-tight text-sm text-slate-100 flex items-center gap-2 border-b border-[#1e293b]/35 pb-2">
                <Building className="w-4 h-4 text-indigo-400" />
                Registered Clients ({clients.length})
              </h3>

              <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                {clients.length === 0 ? (
                  <div className="text-slate-500 text-xs text-center py-12 italic">No clients registered yet.</div>
                ) : (
                  clients.map(cli => (
                    <div key={cli.id} className="bg-[#070c16] border border-[#1e293b]/30 p-4 rounded-lg flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200 text-sm">{cli.company}</span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded">{cli.industry}</span>
                        </div>
                        <span className="text-xs text-indigo-400 font-medium">Contact: {cli.name} ({cli.hiringManager || "No Manager"})</span>
                        <p className="text-xs text-slate-400 mt-1.5 italic bg-[#0c1322] p-2 border-l-2 border-slate-500 rounded">{cli.notes || "No notes registered."}</p>
                      </div>

                      <button onClick={() => handleDeleteClient(cli.id)} className="text-slate-500 hover:text-red-400 p-1.5 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* JOB REQUIREMENTS SECTION */}
        {subTab === "jobs" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Create Job Form */}
            <div className="bg-[#0e172a] border border-[#1e293b]/40 rounded-xl p-5 shadow-lg flex flex-col gap-4">
              <h3 className="font-bold tracking-tight text-sm text-indigo-300 flex items-center gap-2 border-b border-[#1e293b]/35 pb-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                Add Job Requirement
              </h3>

              <form onSubmit={handleAddJob} className="flex flex-col gap-3 font-sans text-xs text-slate-300">
                <div className="flex flex-col gap-1">
                  <label>Client Account</label>
                  <select
                    required
                    value={newJob.clientId}
                    onChange={e => setNewJob({ ...newJob, clientId: e.target.value })}
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Associated Client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.company}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label>Job Title</label>
                  <input
                    type="text"
                    required
                    value={newJob.jobTitle}
                    onChange={e => setNewJob({ ...newJob, jobTitle: e.target.value })}
                    placeholder="e.g. Senior DevOps Systems Administrator"
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label>Department</label>
                    <input
                      type="text"
                      value={newJob.department}
                      onChange={e => setNewJob({ ...newJob, department: e.target.value })}
                      className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label>Salary Budget</label>
                    <input
                      type="text"
                      value={newJob.salary}
                      onChange={e => setNewJob({ ...newJob, salary: e.target.value })}
                      className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label>Required Core Skills (comma separated)</label>
                  <input
                    type="text"
                    value={newJob.skills}
                    onChange={e => setNewJob({ ...newJob, skills: e.target.value })}
                    placeholder="e.g. AWS, Linux, Kubernetes, Terraform"
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label>Full Job Description</label>
                  <textarea
                    rows={4}
                    value={newJob.jobDescription}
                    onChange={e => setNewJob({ ...newJob, jobDescription: e.target.value })}
                    placeholder="We require an IT officer capable of securing multi-WAN architecture, Docker configurations, and firewall domains..."
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none focus:border-indigo-500 resize-none font-mono text-[11px]"
                  />
                </div>

                <button type="submit" className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold p-2 rounded transition-all cursor-pointer">
                  Save Job Requirement
                </button>
              </form>
            </div>

            {/* Requirements List */}
            <div className="lg:col-span-2 bg-[#0e172a] border border-[#1e293b]/40 rounded-xl p-5 shadow-lg flex flex-col gap-4">
              <h3 className="font-bold tracking-tight text-sm text-slate-100 flex items-center gap-2 border-b border-[#1e293b]/35 pb-2">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                Active Job Requirements ({requirements.length})
              </h3>

              <div className="flex flex-col gap-4 max-h-[550px] overflow-y-auto pr-1">
                {requirements.length === 0 ? (
                  <div className="text-slate-500 text-xs text-center py-12 italic">No job requirements added yet.</div>
                ) : (
                  requirements.map(req => {
                    const client = clients.find(c => c.id === req.clientId);
                    return (
                      <div key={req.id} className="bg-[#070c16] border border-[#1e293b]/30 p-4 rounded-lg flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-slate-200 text-sm">{req.jobTitle}</span>
                            <span className="text-xs text-indigo-400 font-semibold">{client ? client.company : "Independent Account"} • {req.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAnalyzeJob(req.id)}
                              className="bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 text-[10px] font-bold px-2 py-1 rounded transition-all border border-indigo-500/30 flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              AI Analyze Requirement
                            </button>
                            <button onClick={() => handleDeleteJob(req.id)} className="text-slate-500 hover:text-red-400 p-1.5 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Intelligence Profile Drawer */}
                        {req.intelligence ? (
                          <div className="bg-[#0a1122] border border-indigo-500/20 rounded p-3 text-xs flex flex-col gap-2">
                            <div className="text-[10px] font-mono text-indigo-400 font-bold tracking-widest uppercase flex items-center gap-1">
                              <Activity className="w-3.5 h-3.5 animate-pulse" />
                              Requirement Intelligence Extracted Profile
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-1 font-mono text-[11px]">
                              <div>
                                <span className="text-slate-500">Priority Skills:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {req.intelligence.prioritySkills?.map(s => <span key={s} className="bg-indigo-500/10 text-indigo-300 px-1.5 rounded">{s}</span>)}
                                </div>
                              </div>
                              <div>
                                <span className="text-slate-500">Technologies:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {req.intelligence.technologies?.map(s => <span key={s} className="bg-slate-500/10 text-slate-300 px-1.5 rounded">{s}</span>)}
                                </div>
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1 border-t border-[#1e293b]/30 pt-1.5">
                              <span className="font-semibold text-slate-300">Target Experience:</span> {req.intelligence.experience}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 italic bg-[#0c1322] px-3 py-2 rounded border border-[#1e293b]/20">
                            No AI intelligence profile compiled. Trigger analysis above to populate.
                          </div>
                        )}

                        <div className="text-xs text-slate-400 font-mono flex items-center justify-between">
                          <span>Salary: <b className="text-slate-200">{req.salary}</b></span>
                          <span>Positions: <b className="text-slate-200">{req.openPositions}</b></span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* CANDIDATES INTAKE & ATS SECTION */}
        {subTab === "candidates" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Add Candidate Intake Form */}
            <div className="bg-[#0e172a] border border-[#1e293b]/40 rounded-xl p-5 shadow-lg flex flex-col gap-4">
              <h3 className="font-bold tracking-tight text-sm text-indigo-300 flex items-center gap-2 border-b border-[#1e293b]/35 pb-2">
                <UserPlus className="w-4 h-4 text-indigo-400" />
                Candidate Enrollment Intake
              </h3>

              <form onSubmit={handleAddCandidate} className="flex flex-col gap-3 font-sans text-xs text-slate-300">
                <div className="flex flex-col gap-1">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    value={newCandidate.name}
                    onChange={e => setNewCandidate({ ...newCandidate, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label>Email Address</label>
                  <input
                    type="email"
                    required
                    value={newCandidate.email}
                    onChange={e => setNewCandidate({ ...newCandidate, email: e.target.value })}
                    placeholder="e.g. john@example.com"
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label>LinkedIn URL</label>
                  <input
                    type="text"
                    value={newCandidate.linkedin}
                    onChange={e => setNewCandidate({ ...newCandidate, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label>GitHub or Portfolio link</label>
                  <input
                    type="text"
                    value={newCandidate.github}
                    onChange={e => setNewCandidate({ ...newCandidate, github: e.target.value })}
                    placeholder="e.g. github.com/username"
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label>Resume Text / Professional Profile details</label>
                  <textarea
                    rows={6}
                    value={newCandidate.resume}
                    onChange={e => setNewCandidate({ ...newCandidate, resume: e.target.value })}
                    placeholder="15 Years IT setup admin setting up systems..."
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none focus:border-indigo-500 resize-none font-mono text-[11px]"
                  />
                </div>

                <button type="submit" className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold p-2 rounded transition-all cursor-pointer">
                  Onboard Candidate
                </button>
              </form>
            </div>

            {/* Candidates List & ATS assessment */}
            <div className="lg:col-span-2 bg-[#0e172a] border border-[#1e293b]/40 rounded-xl p-5 shadow-lg flex flex-col gap-4">
              <h3 className="font-bold tracking-tight text-sm text-slate-100 flex items-center gap-2 border-b border-[#1e293b]/35 pb-2">
                <Users className="w-4 h-4 text-indigo-400" />
                Active Recruiting Profiles ({candidates.length})
              </h3>

              <div className="flex flex-col gap-4 max-h-[550px] overflow-y-auto pr-1">
                {candidates.length === 0 ? (
                  <div className="text-slate-500 text-xs text-center py-12 italic">No candidates registered yet.</div>
                ) : (
                  candidates.map(cand => (
                    <div key={cand.id} className="bg-[#070c16] border border-[#1e293b]/30 p-4 rounded-lg flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-200 text-sm">{cand.name}</span>
                          <span className="text-xs text-slate-400">{cand.email} • Status: <span className="text-indigo-400 font-semibold">{cand.status}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenOutreachModal(cand)}
                            className="bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded border border-emerald-500/30 flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Mail className="w-3 h-3" />
                            Draft Outreach Email
                          </button>
                          <button
                            onClick={() => handleAnalyzeCandidate(cand.id)}
                            className="bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 text-[10px] font-bold px-2 py-1 rounded border border-indigo-500/30 flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            Run ATS Analysis
                          </button>
                        </div>
                      </div>

                      {/* Resume Intelligence Drawer */}
                      {cand.intelligence ? (
                        <div className="bg-[#0a1122] border border-indigo-500/20 rounded p-4 text-xs flex flex-col gap-3">
                          <div className="flex justify-between items-center border-b border-[#1e293b]/40 pb-2">
                            <span className="text-[10px] font-mono text-indigo-400 font-bold tracking-widest uppercase flex items-center gap-1">
                              <Activity className="w-3.5 h-3.5 animate-pulse" />
                              ATS Skill Matrix & suitability
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-300">
                              ATS Score: <span className="text-indigo-400">{cand.intelligence.atsScore}%</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                            <div>
                              <span className="text-slate-500">Key Strengths:</span>
                              <ul className="list-disc list-inside mt-1 text-slate-300 flex flex-col gap-0.5">
                                {cand.intelligence.strengths?.map((str, i) => <li key={i} className="truncate">{str}</li>)}
                              </ul>
                            </div>
                            <div>
                              <span className="text-slate-500">Missing alignments:</span>
                              <ul className="list-disc list-inside mt-1 text-slate-400 flex flex-col gap-0.5">
                                {cand.intelligence.weaknesses?.map((wk, i) => <li key={i} className="truncate">{wk}</li>)}
                              </ul>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-400 border-t border-[#1e293b]/30 pt-2 italic">
                            {cand.intelligence.recommendation}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 italic bg-[#0c1322] px-3 py-2 rounded border border-[#1e293b]/20">
                          Resume parsed but intelligence report not evaluated. Trigger ATS Evaluator above.
                        </div>
                      )}

                      {/* Direct Pipeline registration utility */}
                      <div className="bg-[#0a1122] border border-[#1e293b]/30 rounded p-3 flex flex-wrap gap-2 items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">Link candidate to live Position:</span>
                        <div className="flex gap-2">
                          <select
                            id={`job-link-${cand.id}`}
                            className="bg-[#070c16] border border-[#1e293b] px-2 py-1 rounded text-[11px] focus:outline-none"
                          >
                            <option value="">Select Requirement</option>
                            {requirements.map(r => (
                              <option key={r.id} value={r.id}>{r.jobTitle}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              const selectEl = document.getElementById(`job-link-${cand.id}`) as HTMLSelectElement;
                              if (selectEl?.value) {
                                handleLinkToPipeline(cand.id, selectEl.value);
                              }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] px-2.5 py-1 rounded font-semibold transition-all cursor-pointer"
                          >
                            Link
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI MATCHING LAB */}
        {subTab === "matching" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Matching selector configuration */}
            <div className="bg-[#0e172a] border border-[#1e293b]/40 rounded-xl p-5 shadow-lg flex flex-col gap-4">
              <h3 className="font-bold tracking-tight text-sm text-indigo-300 flex items-center gap-2 border-b border-[#1e293b]/35 pb-2">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                Configure Match Alignment
              </h3>

              <div className="flex flex-col gap-3 font-sans text-xs text-slate-300">
                <div className="flex flex-col gap-1">
                  <label>Select Target Candidate</label>
                  <select
                    value={selectedMatchCandidate}
                    onChange={e => setSelectedMatchCandidate(e.target.value)}
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Candidate</option>
                    {candidates.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label>Select Associated Job Requirement</label>
                  <select
                    value={selectedMatchRequirement}
                    onChange={e => setSelectedMatchRequirement(e.target.value)}
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Job Requirement</option>
                    {requirements.map(r => (
                      <option key={r.id} value={r.id}>{r.jobTitle}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleRunMatching}
                  disabled={isMatching || !selectedMatchCandidate || !selectedMatchRequirement}
                  className="mt-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold p-2.5 rounded transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isMatching ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      Evaluating with Gemini AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Run Match Audit
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Match output report panel */}
            <div className="lg:col-span-2 bg-[#0e172a] border border-[#1e293b]/40 rounded-xl p-6 shadow-lg flex flex-col gap-4">
              <h3 className="font-bold tracking-tight text-sm text-slate-100 flex items-center gap-2 border-b border-[#1e293b]/35 pb-2">
                <Clipboard className="w-4 h-4 text-indigo-400" />
                Suitability Audit Report
              </h3>

              {matchResult ? (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center bg-[#070c16] border border-[#1e293b]/40 px-4 py-3 rounded-lg">
                    <span className="text-slate-300 font-bold text-xs">Aesthetic Suitability Score</span>
                    <span className="text-xl font-bold font-mono text-indigo-400">{matchResult.matchPercent}% Match</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-400">Core Alignments / Strengths:</span>
                    <p className="text-xs text-slate-200 bg-[#070c16] p-3 rounded border border-[#1e293b]/20 font-sans italic leading-relaxed">{matchResult.strength}</p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-400">Identified Suitability Risks / Deficiencies:</span>
                    <p className="text-xs text-slate-300 bg-[#070c16] p-3 rounded border border-[#1e293b]/20 font-sans leading-relaxed">{matchResult.risk}</p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-400">Expert Recruitment Next Steps Recommendation:</span>
                    <p className="text-xs text-indigo-300 bg-indigo-500/5 p-3 rounded border border-indigo-500/20 font-sans font-medium">{matchResult.recommendation}</p>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs text-center py-20 italic">
                  No active suitabilities analyzed. Select context parameters in control drawer and press Audit.
                </div>
              )}
            </div>
          </div>
        )}

        {/* INTERVIEWS & TIMELINE SECTION */}
        {subTab === "interviews" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Interviews Scheduling Dashboard */}
            <div className="bg-[#0e172a] border border-[#1e293b]/40 rounded-xl p-5 shadow-lg flex flex-col gap-4">
              <h3 className="font-bold tracking-tight text-sm text-slate-100 flex items-center gap-2 border-b border-[#1e293b]/35 pb-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Interviews Workspace & Feedback
              </h3>

              <form onSubmit={handleScheduleInterview} className="bg-[#070c16] border border-[#1e293b]/35 p-4 rounded-lg flex flex-col gap-3 font-sans text-xs text-slate-300">
                <span className="font-bold text-indigo-300 text-xs block mb-1">Schedule New Interview Round</span>
                
                <div className="flex flex-col gap-1">
                  <label>Pipeline Candidate Link</label>
                  <select
                    required
                    value={newInterview.pipelineId}
                    onChange={e => setNewInterview({ ...newInterview, pipelineId: e.target.value })}
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none"
                  >
                    <option value="">Select Pipeline Candidate</option>
                    {pipelines.map(p => {
                      const cand = candidates.find(c => c.id === p.candidateId);
                      const req = requirements.find(r => r.id === p.jobId);
                      return (
                        <option key={p.id} value={p.id}>{cand?.name || "Candidate"} ↔ {req?.jobTitle || "Job"}</option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label>Round</label>
                    <select
                      value={newInterview.round}
                      onChange={e => setNewInterview({ ...newInterview, round: e.target.value })}
                      className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none"
                    >
                      <option value="Screening">Screening Round</option>
                      <option value="Technical">Technical Round</option>
                      <option value="HR">HR Culture Round</option>
                      <option value="Final">Final Round</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label>Interviewer</label>
                    <input
                      type="text"
                      value={newInterview.interviewer}
                      onChange={e => setNewInterview({ ...newInterview, interviewer: e.target.value })}
                      placeholder="e.g. Lead Engineer Jamil"
                      className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none"
                    />
                  </div>
                </div>

                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold p-2 rounded transition-all cursor-pointer">
                  Register Schedule Round
                </button>
              </form>

              {/* Schedules List */}
              <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                {interviews.length === 0 ? (
                  <div className="text-slate-500 text-[11px] text-center py-8 italic">No interviews scheduled yet.</div>
                ) : (
                  interviews.map(int => {
                    const pipe = pipelines.find(p => p.id === int.pipelineId);
                    const cand = candidates.find(c => c?.id === pipe?.candidateId);
                    return (
                      <div key={int.id} className="bg-[#070c16] border border-[#1e293b]/20 p-3 rounded flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-300">{cand?.name || "Candidate"} - Round: {int.round}</span>
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${int.decision === "Pass" ? "bg-emerald-500/15 text-emerald-400" : (int.decision === "Fail" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400")}`}>{int.decision}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">Scheduled Interviewer: {int.interviewer}</span>
                        
                        {int.decision === "Pending" ? (
                          <div className="flex gap-2 mt-1">
                            <input
                              type="text"
                              id={`feedback-${int.id}`}
                              placeholder="Record Round Feedback..."
                              className="bg-[#0c1222] border border-[#1e293b] text-[11px] px-2 py-1 rounded flex-1 focus:outline-none"
                            />
                            <button
                              onClick={() => {
                                const el = document.getElementById(`feedback-${int.id}`) as HTMLInputElement;
                                if (el) handleRecordInterviewFeedback(int.id, el.value, "Pass");
                              }}
                              className="bg-emerald-600 text-white text-[10px] font-bold px-2 rounded hover:bg-emerald-700 cursor-pointer"
                            >
                              Pass
                            </button>
                            <button
                              onClick={() => {
                                const el = document.getElementById(`feedback-${int.id}`) as HTMLInputElement;
                                if (el) handleRecordInterviewFeedback(int.id, el.value, "Fail");
                              }}
                              className="bg-red-600 text-white text-[10px] font-bold px-2 rounded hover:bg-red-700 cursor-pointer"
                            >
                              Fail
                            </button>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic bg-[#0c1322] px-2.5 py-1.5 rounded border border-[#1e293b]/10">{int.feedback || "No feedback logged."}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Communications log timeline */}
            <div className="bg-[#0e172a] border border-[#1e293b]/40 rounded-xl p-5 shadow-lg flex flex-col gap-4">
              <h3 className="font-bold tracking-tight text-sm text-slate-100 flex items-center gap-2 border-b border-[#1e293b]/35 pb-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                Outreach Communications Timeline
              </h3>

              <form onSubmit={handleAddCommunication} className="bg-[#070c16] border border-[#1e293b]/35 p-4 rounded-lg flex flex-col gap-3 font-sans text-xs text-slate-300">
                <span className="font-bold text-indigo-300 text-xs block mb-1">Log Outreach Contact Notes</span>

                <div className="flex flex-col gap-1">
                  <label>Candidate Context</label>
                  <select
                    required
                    value={newComm.candidateId}
                    onChange={e => setNewComm({ ...newComm, candidateId: e.target.value })}
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none"
                  >
                    <option value="">Select Candidate</option>
                    {candidates.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label>Type of Contact</label>
                  <select
                    value={newComm.type}
                    onChange={e => setNewComm({ ...newComm, type: e.target.value as any })}
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none"
                  >
                    <option value="Email">Email Message</option>
                    <option value="Call">Phone Call notes</option>
                    <option value="WhatsApp">WhatsApp logs</option>
                    <option value="Meeting">Direct Meeting logs</option>
                    <option value="Follow-up">Automated Follow-up notes</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label>Outreach Details / Body</label>
                  <textarea
                    rows={3}
                    required
                    value={newComm.content}
                    onChange={e => setNewComm({ ...newComm, content: e.target.value })}
                    placeholder="Sent initial email regarding Senior DevOps Requirements..."
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none resize-none font-mono text-[11px]"
                  />
                </div>

                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold p-2 rounded transition-all cursor-pointer">
                  Log Communication Note
                </button>
              </form>

              {/* Communications Timeline list */}
              <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                {communications.length === 0 ? (
                  <div className="text-slate-500 text-[11px] text-center py-8 italic">No timeline entries registered yet.</div>
                ) : (
                  communications.slice().reverse().map(com => {
                    const cand = candidates.find(c => c.id === com.candidateId);
                    return (
                      <div key={com.id} className="bg-[#070c16] border border-[#1e293b]/20 p-3 rounded flex flex-col gap-2 font-mono">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-indigo-400">{com.type.toUpperCase()} ↔ {cand?.name || "Candidate"}</span>
                          <span className="text-slate-500">{new Date(com.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed break-words">{com.content}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ORCHESTRATION STUDIO */}
        {subTab === "orchestrate" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Orchestration inputs */}
            <div className="bg-[#0e172a] border border-[#1e293b]/40 rounded-xl p-5 shadow-lg flex flex-col gap-4">
              <h3 className="font-bold tracking-tight text-sm text-pink-300 flex items-center gap-2 border-b border-[#1e293b]/35 pb-2">
                <Cpu className="w-4 h-4 text-pink-400" />
                Orchestration Config Panel
              </h3>

              <div className="flex flex-col gap-3 font-sans text-xs text-slate-300">
                <div className="flex flex-col gap-1">
                  <label>Active Recruitment Candidate Context</label>
                  <select
                    value={selectedMatchCandidate}
                    onChange={e => setSelectedMatchCandidate(e.target.value)}
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none"
                  >
                    <option value="">Select Candidate</option>
                    {candidates.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label>Associated Position Context</label>
                  <select
                    value={selectedMatchRequirement}
                    onChange={e => setSelectedMatchRequirement(e.target.value)}
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none"
                  >
                    <option value="">Select Position</option>
                    {requirements.map(r => (
                      <option key={r.id} value={r.id}>{r.jobTitle}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label>Recruiter Goal Workflow Strategy</label>
                  <textarea
                    rows={5}
                    value={orchestrationGoal}
                    onChange={e => setOrchestrationGoal(e.target.value)}
                    className="bg-[#070c16] border border-[#1e293b] p-2 rounded focus:outline-none font-mono text-[11px] leading-relaxed"
                  />
                </div>

                <button
                  onClick={handleRunOrchestrator}
                  disabled={isOrchestrating || !selectedMatchCandidate || !selectedMatchRequirement}
                  className="mt-2 bg-pink-600 hover:bg-pink-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold p-2.5 rounded transition-all cursor-pointer flex items-center justify-center gap-2 text-xs"
                >
                  {isOrchestrating ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      Executing AI Task Orchestrator...
                    </>
                  ) : (
                    <>
                      <Compass className="w-4 h-4" />
                      Execute Orchestrated Workflow
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live progress console */}
            <div className="lg:col-span-2 bg-[#0e172a] border border-[#1e293b]/40 rounded-xl p-5 shadow-lg flex flex-col gap-4">
              <h3 className="font-bold tracking-tight text-sm text-slate-100 flex items-center justify-between border-b border-[#1e293b]/35 pb-2">
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-pink-400" />
                  Orchestration Live Step Console
                </span>
                {orchestratorTaskId && (
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded">Task ID: {orchestratorTaskId}</span>
                )}
              </h3>

              <div className="flex flex-col gap-3 min-h-[350px] bg-[#070b14] border border-[#1e293b]/40 p-4 rounded-lg font-mono text-xs">
                {orchestratorSteps.length === 0 ? (
                  <div className="text-slate-600 italic py-24 text-center">
                    AI Studio Task Orchestrator ready. Specify contexts, set goal, and hit execute.
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {orchestratorSteps.map((step, index) => (
                      <div key={step.stepId} className="flex flex-col gap-1 border-b border-[#1e293b]/15 pb-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-300">
                            [{index + 1}] {step.name || step.label}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            step.status === "completed" ? "bg-emerald-500/15 text-emerald-400" :
                            (step.status === "running" ? "bg-amber-500/15 text-amber-300 animate-pulse" : "bg-slate-500/15 text-slate-500")
                          }`}>
                            {step.status.toUpperCase()}
                          </span>
                        </div>
                        {step.logs && step.logs.map((log: string, lIdx: number) => (
                          <div key={lIdx} className="text-[11px] text-slate-400 mt-1 pl-4 flex items-center gap-1.5">
                            <ArrowRight className="w-3 h-3 text-pink-500 shrink-0" />
                            {log}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* OUTREACH EMAIL TEMPLATE VISUALIZER MODAL */}
      {outreachModalOpen && selectedOutreachCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-indigo-500/30 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-[#080d1a] border-b border-[#1e293b] px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                  <Mail className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    Candidate Email Outreach Visualizer
                    <span className="text-[10px] font-mono bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">Hostinger SMTP Ready</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Target: <strong className="text-slate-200">{selectedOutreachCandidate.name}</strong> ({selectedOutreachCandidate.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOutreachModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1e293b]/50 transition-all text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6 text-xs text-slate-300">
              
              {/* Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#070c16] p-4 rounded-lg border border-[#1e293b]/40">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-400 text-[11px]">Associated Job Requirement</label>
                  <select
                    value={selectedOutreachJobId}
                    onChange={(e) => {
                      setSelectedOutreachJobId(e.target.value);
                      if (selectedOutreachCandidate && e.target.value) {
                        fetchOutreachTemplate(selectedOutreachCandidate.id, e.target.value, outreachTemplateType);
                      }
                    }}
                    className="bg-[#0c1220] border border-[#1e293b] p-2 rounded text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Requirement</option>
                    {requirements.map((r) => (
                      <option key={r.id} value={r.id}>{r.jobTitle} ({r.location})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-400 text-[11px]">Outreach Preset Strategy</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOutreachTemplateType("initial_outreach");
                        if (selectedOutreachCandidate && selectedOutreachJobId) {
                          fetchOutreachTemplate(selectedOutreachCandidate.id, selectedOutreachJobId, "initial_outreach");
                        }
                      }}
                      className={`flex-1 py-1.5 px-2 rounded border text-[11px] font-medium transition-all cursor-pointer ${
                        outreachTemplateType === "initial_outreach" ? "bg-indigo-600/30 border-indigo-500 text-indigo-200" : "bg-[#0c1220] border-[#1e293b] text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Intro Outreach
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOutreachTemplateType("interview_invitation");
                        if (selectedOutreachCandidate && selectedOutreachJobId) {
                          fetchOutreachTemplate(selectedOutreachCandidate.id, selectedOutreachJobId, "interview_invitation");
                        }
                      }}
                      className={`flex-1 py-1.5 px-2 rounded border text-[11px] font-medium transition-all cursor-pointer ${
                        outreachTemplateType === "interview_invitation" ? "bg-indigo-600/30 border-indigo-500 text-indigo-200" : "bg-[#0c1220] border-[#1e293b] text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Interview Invite
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOutreachTemplateType("offer_proposal");
                        if (selectedOutreachCandidate && selectedOutreachJobId) {
                          fetchOutreachTemplate(selectedOutreachCandidate.id, selectedOutreachJobId, "offer_proposal");
                        }
                      }}
                      className={`flex-1 py-1.5 px-2 rounded border text-[11px] font-medium transition-all cursor-pointer ${
                        outreachTemplateType === "offer_proposal" ? "bg-indigo-600/30 border-indigo-500 text-indigo-200" : "bg-[#0c1220] border-[#1e293b] text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Offer Letter
                    </button>
                  </div>
                </div>
              </div>

              {/* Variable Substitution Chips */}
              <div className="flex flex-col gap-1.5 bg-[#070c16] p-3 rounded-lg border border-[#1e293b]/40">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Live Context Variables (Click to append):</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(outreachVars).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setOutreachBody(prev => `${prev} {${key}}`)}
                      className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span className="text-slate-400">{`{${key}}`}:</span>
                      <span className="font-semibold text-slate-200 truncate max-w-[120px]">{val}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Visual Editor & Live Email Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Editor Column */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-200 text-xs">Email Editor & Subject</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedOutreachCandidate && selectedOutreachJobId) {
                          fetchOutreachTemplate(selectedOutreachCandidate.id, selectedOutreachJobId, outreachTemplateType);
                        }
                      }}
                      disabled={isGeneratingOutreach}
                      className="text-indigo-400 hover:text-indigo-300 text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Regenerate with Gemini AI
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-slate-400 text-[11px]">Subject Line</label>
                    <input
                      type="text"
                      value={outreachSubject}
                      onChange={(e) => setOutreachSubject(e.target.value)}
                      placeholder="Email Subject..."
                      className="bg-[#070c16] border border-[#1e293b] p-2.5 rounded text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-sans"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-slate-400 text-[11px]">Email Body Template</label>
                    <textarea
                      rows={12}
                      value={outreachBody}
                      onChange={(e) => setOutreachBody(e.target.value)}
                      className="bg-[#070c16] border border-[#1e293b] p-3 rounded text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed resize-none"
                    />
                  </div>
                </div>

                {/* Live Preview Column */}
                <div className="flex flex-col gap-3">
                  <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Live Rendered Recipient Preview
                  </span>

                  <div className="bg-[#070c16] border border-[#1e293b] rounded-lg p-4 flex flex-col gap-3 h-full overflow-y-auto">
                    {/* Fake Email Envelope Header */}
                    <div className="border-b border-[#1e293b]/50 pb-3 flex flex-col gap-1 text-[11px] font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-500">From:</span>
                        <span className="text-slate-300">Executive Talent Acquisition &lt;outreach@company.com&gt;</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">To:</span>
                        <span className="text-indigo-400">{selectedOutreachCandidate.name} &lt;{selectedOutreachCandidate.email}&gt;</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Subject:</span>
                        <span className="text-slate-200 font-bold truncate max-w-[280px]">{outreachSubject || "No Subject"}</span>
                      </div>
                    </div>

                    {/* Rendered Body */}
                    <div className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap py-2">
                      {isGeneratingOutreach ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-2 text-indigo-400">
                          <Activity className="w-5 h-5 animate-spin" />
                          <span>Generating AI Outreach Candidate Template...</span>
                        </div>
                      ) : (
                        outreachBody || "Start typing template body to preview..."
                      )}
                    </div>

                    {/* Hostinger Stamp Badge */}
                    <div className="mt-auto border-t border-[#1e293b]/50 pt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Transport: Hostinger SMTP / Express SMTP</span>
                      <span className="text-emerald-400 font-semibold">Ready for Dispatch</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Outreach Send Result Alert */}
              {outreachSendResult && (
                <div className={`p-4 rounded-lg border flex items-center justify-between text-xs font-mono ${
                  outreachSendResult.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"
                }`}>
                  <div className="flex items-center gap-2">
                    {outreachSendResult.success ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
                    <span>{outreachSendResult.message}</span>
                  </div>
                  {outreachSendResult.deliveredViaSMTP && (
                    <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] border border-emerald-500/40">Verified Hostinger SMTP</span>
                  )}
                </div>
              )}

            </div>

            {/* Modal Actions Footer */}
            <div className="bg-[#080d1a] border-t border-[#1e293b] px-6 py-4 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setOutreachModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#0c1220] border border-[#1e293b] text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendOutreachEmail}
                disabled={isSendingOutreach || !outreachSubject || !outreachBody}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
              >
                {isSendingOutreach ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    Transmitting via Hostinger SMTP...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Outreach Email
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
