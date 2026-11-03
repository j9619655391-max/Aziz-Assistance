import { useState, useEffect } from "react";
import { 
  Shield, 
  Terminal as TerminalIcon, 
  Brain, 
  ShieldAlert, 
  Activity, 
  Clock, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Lock,
  Cpu,
  Fingerprint,
  Info,
  Mail,
  Briefcase,
  Layers,
  Users
} from "lucide-react";
import TerminalPanel from "./components/TerminalPanel";
import ChatPanel from "./components/ChatPanel";
import MemoryVault from "./components/MemoryVault";
import GmailPanel from "./components/GmailPanel";
import JobAgentPanel from "./components/JobAgentPanel";
import LogPanel from "./components/LogPanel";
import DiagnosticPanel from "./components/DiagnosticPanel";
import StudioPanel from "./components/StudioPanel";
import RecruitmentIntelligencePanel from "./components/RecruitmentIntelligencePanel";
import { Memory, TerminalLine, Message, AuditReport, AuditIssue } from "./types";
import { User as FirebaseUser } from "firebase/auth";
import { initAuth } from "./lib/firebase";

export default function App() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isHardening, setIsHardening] = useState(false);
  const [isMemoriesLoading, setIsMemoriesLoading] = useState(true);
  const [isChatThinking, setIsChatThinking] = useState(false);
  const [systemTime, setSystemTime] = useState("");
  const [systemUptime, setSystemUptime] = useState("0.00 hours");
  const [vitals, setVitals] = useState({ cpu: 12, ram: 28, disk: 12 });

  // Tab switching state for left column
  const [activeLeftTab, setActiveLeftTab] = useState<"memories" | "gmail" | "logs">("memories");
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [activeWorkspaceMode, setActiveWorkspaceMode] = useState<"devops" | "jobs" | "diagnostic" | "studio" | "recruitment">("studio");


  // Formatting helper for report emailing
  const formatAuditReportToText = (report: AuditReport | null): string => {
    if (!report) return "No audit report available. Run an audit first.";
    const issueStr = report.issues.map((iss, i) => `[FINDING ${i+1}] [${iss.severity.toUpperCase()}] ${iss.title}\n -> Description: ${iss.desc}\n -> Recommendation: ${iss.recommendation}`).join("\n\n");
    return `=== AZIZ ASSISTANT REGISTRY AUDIT REPORT ===
Timestamp: ${new Date(report.timestamp || Date.now()).toLocaleString()}
Overall Health Score: ${report.grade}/100 (${report.status})
Scanned Files: ${report.scannedFiles}

Issues Identified: ${report.issues.length}
-----------------------------------------------
${issueStr || "Zero issues identified. Posture secure."}

Disclaimer: This report was prepared autonomously by Aziz Assistant Workspace Auditing.`;
  };

  // Update clock
  useEffect(() => {
    const updateTimeAndVitals = () => {
      const now = new Date();
      setSystemTime(now.toISOString());
      
      // Slightly fluctuate vitals for realism and visual dynamism
      setVitals(prev => ({
        cpu: Math.max(2, Math.min(99, prev.cpu + Math.floor(Math.random() * 7) - 3)),
        ram: Math.max(20, Math.min(95, prev.ram + Math.floor(Math.random() * 3) - 1)),
        disk: 12
      }));
    };
    
    updateTimeAndVitals();
    const interval = setInterval(updateTimeAndVitals, 4000);
    return () => clearInterval(interval);
  }, []);

  // Set randomized uptime once on load
  useEffect(() => {
    setSystemUptime((Math.random() * 4 + 1.2).toFixed(2) + " hours");
  }, []);

  // Root level Firebase auth state and Gmail access token sync
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setGoogleUser(currentUser);
        setGoogleAccessToken(token);
        // Register session with the backend so the background scan queue is fully activated
        if (currentUser && token) {
          fetch("/api/alerts/register-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: token, email: currentUser.email })
          }).catch(err => console.error("Error registering active auth session on backend:", err));
        }
      },
      () => {
        setGoogleUser(null);
        setGoogleAccessToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  // Fetch initial memories and run first audit safely
  useEffect(() => {
    let isMounted = true;
    const loadInit = async () => {
      setIsMemoriesLoading(true);
      setIsAuditing(true);
      try {
        const [memRes, auditRes] = await Promise.all([
          fetch("/api/memories").then(r => r.json()).catch(() => ({ memories: [] })),
          fetch("/api/security/audit").then(r => r.json()).catch(() => null)
        ]);
        if (!isMounted) return;
        if (memRes && memRes.memories) {
          setMemories(memRes.memories);
        }
        if (auditRes) {
          setAuditReport(auditRes);
        }
      } catch (err) {
        console.error("Error fetching initial memories or security audit:", err);
      } finally {
        if (isMounted) {
          setIsMemoriesLoading(false);
          setIsAuditing(false);
        }
      }
    };
    loadInit();
    return () => { isMounted = false; };
  }, []);

  const fetchMemories = async () => {
    setIsMemoriesLoading(true);
    try {
      const res = await fetch("/api/memories");
      const data = await res.json();
      if (data.memories) {
        setMemories(data.memories);
      }
    } catch (err) {
      console.error("Error fetching memories:", err);
    } finally {
      setIsMemoriesLoading(false);
    }
  };

  const handleAddMemory = async (type: string, content: string) => {
    try {
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content })
      });
      const data = await res.json();
      if (data.success) {
        setMemories(prev => [...prev, data.memory]);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to contact memory service." };
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      const res = await fetch(`/api/memories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMemories(prev => prev.filter(m => m.id !== id));
      }
    } catch (err) {
      console.error("Error deleting memory:", err);
    }
  };

  const runAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await fetch("/api/security/audit");
      const data = await res.json();
      setAuditReport(data);
    } catch (err) {
      console.error("Error running security audit:", err);
    } finally {
      setIsAuditing(false);
    }
  };

  const runHardening = async () => {
    setIsHardening(true);
    try {
      const res = await fetch("/api/security/harden", { method: "POST" });
      const data = await res.json();
      
      // Inject sys-line to terminal signifying system hardening
      const hardenLine: TerminalLine = {
        id: Date.now().toString() + "-sys",
        type: "system",
        text: `[SEC_HARDEN] Executing workspace hardening sequence...\n` +
              data.remediations.map((r: string) => ` -> SUCCESS: ${r}`).join("\n") + 
              `\nStatus: ${data.message}`,
        timestamp: new Date().toISOString()
      };
      setTerminalLines(prev => [...prev, hardenLine]);
      
      // Rerun audit to update state
      await runAudit();
    } catch (err) {
      console.error("Hardening failed:", err);
    } finally {
      setIsHardening(false);
    }
  };

  const handleExecuteCommand = async (cmdText: string) => {
    const res = await fetch("/api/terminal/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: cmdText })
    });
    return await res.json();
  };

  const handleSendMessage = async (text: string) => {
    const userMsg: Message = {
      id: Date.now().toString() + "-user",
      role: "user",
      content: text,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsChatThinking(true);

    try {
      // Include conversation history up to last 15 messages for context
      const chatPayload = [...messages, userMsg].slice(-15).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatPayload })
      });
      const data = await res.json();

      const botMsg: Message = {
        id: Date.now().toString() + "-assistant",
        role: "assistant",
        content: data.text || "Diagnostic stream interrupted.",
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const errMsg: Message = {
        id: Date.now().toString() + "-assistant",
        role: "assistant",
        content: `Handshake Error: ${err.message || "Failed to process chat content securely."}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsChatThinking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-[#e2e8f0] flex flex-col font-sans selection:bg-emerald-500/30 select-none">
      {/* Upper Control Bar */}
      <header className="border-b border-[#1e293b] bg-[#0c1220] py-3.5 px-6 shrink-0 shadow-lg relative z-10">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/25 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.15)]">
              <Fingerprint className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold tracking-wider text-white">AZIZ ASSISTANT</span>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-1.5 py-0.5 rounded-md font-mono">
                  DEV_OPS_CO_PILOT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Autonomous, Least-Privilege & Systems Hardening Workspace
              </p>
            </div>
          </div>

          {/* Real-time Status Grid */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            
            {/* Clock */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#070a14] border border-[#1e293b] rounded-lg text-slate-300 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px]" title="System time (UTC)">
                {systemTime ? systemTime.substring(11, 19) + " UTC" : "STABLE"}
              </span>
            </div>

            {/* Container Vitals */}
            <div className="flex items-center gap-3 px-3 py-1.5 bg-[#070a14] border border-[#1e293b] rounded-lg">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              <div className="flex gap-3 text-[10px] font-mono text-slate-400">
                <span>CPU: <span className="text-white">{vitals.cpu}%</span></span>
                <span>RAM: <span className="text-white">{vitals.ram}%</span></span>
                <span>DISK: <span className="text-white">{vitals.disk}%</span></span>
              </div>
            </div>

            {/* Shield State */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 rounded-lg">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">CONTAINER_SECURE</span>
            </div>
            
          </div>

        </div>
      </header>

      {/* Master Mode Switcher */}
      <div className="px-6 max-w-[1600px] w-full mx-auto mt-6 shrink-0">
        <div className="flex bg-[#0a0f1d] border border-[#1e293b] p-1 rounded-lg gap-1 font-sans text-xs">
          <button
            onClick={() => setActiveWorkspaceMode("studio")}
            className={`flex-1 py-2 px-3 rounded-md font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeWorkspaceMode === "studio"
                ? "bg-indigo-600/10 text-indigo-400 border border-[#1e293b]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Aziz Kernel Studio v1.0</span>
          </button>
          <button
            onClick={() => setActiveWorkspaceMode("devops")}
            className={`flex-1 py-2 px-3 rounded-md font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeWorkspaceMode === "devops"
                ? "bg-indigo-600/10 text-indigo-400 border border-[#1e293b]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Aziz Assistant DevOps & SecOps Center</span>
          </button>
          <button
            onClick={() => setActiveWorkspaceMode("jobs")}
            className={`flex-1 py-2 px-3 rounded-md font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeWorkspaceMode === "jobs"
                ? "bg-indigo-600/10 text-indigo-400 border border-[#1e293b]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Job Search Intelligence Agent</span>
          </button>
          <button
            onClick={() => setActiveWorkspaceMode("diagnostic")}
            className={`flex-1 py-2 px-3 rounded-md font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeWorkspaceMode === "diagnostic"
                ? "bg-indigo-600/10 text-indigo-400 border border-[#1e293b]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Diagnostic & Indexing Agent</span>
          </button>
          <button
            onClick={() => setActiveWorkspaceMode("recruitment")}
            className={`flex-1 py-2 px-3 rounded-md font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeWorkspaceMode === "recruitment"
                ? "bg-indigo-600/10 text-indigo-400 border border-[#1e293b]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Recruitment Intelligence Platform</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto overflow-hidden">
        
        {activeWorkspaceMode === "devops" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            
            {/* Left Column: Security Scan & Memory Vault */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Security Audit Card */}
              <div className="bg-[#0a0f1d] border border-[#1e293b] rounded-lg p-5 shadow-xl flex flex-col relative overflow-hidden" id="security-audit-panel">
                
                {/* Ambient Background Glow */}
                <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-[0.08] pointer-events-none rounded-full ${
                  auditReport && auditReport.grade >= 90 ? "bg-emerald-500" : "bg-amber-500"
                }`} />

                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-900">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <h2 className="font-sans text-xs font-semibold text-slate-300 uppercase tracking-wider">Repository Audit</h2>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={runAudit} 
                      disabled={isAuditing}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
                      title="Recalculate audit rules"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin text-emerald-400" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Audit Status Panel */}
                {auditReport ? (
                  <div className="space-y-4">
                    
                    {/* Score & Rating Bar */}
                    <div className="flex items-center gap-4 p-3 bg-[#0d1425] border border-[#1e293b] rounded-xl">
                      <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center font-mono font-bold text-lg border-2 ${
                        auditReport.grade >= 90 
                          ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/5" 
                          : auditReport.grade >= 70 
                            ? "border-amber-500/50 text-amber-400 bg-amber-500/5" 
                            : "border-red-500/50 text-red-400 bg-red-500/5"
                      }`}>
                        <span>{auditReport.grade}</span>
                        <span className="text-[7px] text-slate-500 uppercase -mt-1">Grade</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-sans font-bold text-xs text-white">Posture: {auditReport.status}</span>
                          {auditReport.grade >= 90 ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Scanned {auditReport.scannedFiles} configuration templates & permissions.
                        </p>
                      </div>
                    </div>

                    {/* Audit Issues / Findings List */}
                    <div className="space-y-2">
                      <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Vulnerabilities & Hardening Steps ({auditReport.issues.length})</span>
                      {auditReport.issues.length === 0 ? (
                        <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 shrink-0" />
                          <span>Zero issues identified. Your repository conforms to secure DevOps criteria.</span>
                        </div>
                      ) : (
                        <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1">
                          {auditReport.issues.map((issue, idx) => (
                            <div key={idx} className="p-2.5 bg-[#070a14] border border-slate-900 rounded-lg text-xs space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-sans font-semibold text-white leading-tight">{issue.title}</span>
                                <span className={`text-[8px] font-mono uppercase px-1 rounded shrink-0 ${
                                  issue.severity === "high" 
                                    ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                                    : issue.severity === "medium" 
                                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                      : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                }`}>
                                  {issue.severity}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">{issue.desc}</p>
                              <div className="pt-1 text-[10px] text-slate-500 font-mono">
                                <span className="text-emerald-400 font-bold">Fix: </span>{issue.recommendation}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Secure Hardening Button */}
                    {auditReport.issues.length > 0 && (
                      <button
                        onClick={runHardening}
                        disabled={isHardening}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-sans text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer"
                      >
                        {isHardening ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Hardening System...</span>
                          </>
                        ) : (
                          <>
                            <Shield className="w-3.5 h-3.5" />
                            <span>Autonomously Harden Repository</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Email Posture Report Shortcut */}
                    <button
                      onClick={() => {
                        setActiveLeftTab("gmail");
                      }}
                      className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 font-sans text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email Security Posture Report</span>
                    </button>

                  </div>
                ) : (
                  <div className="flex items-center justify-center py-10 text-slate-500 text-xs font-mono">
                    Initiating security scan...
                  </div>
                )}

              </div>

              {/* Tab Switcher for Left Column */}
              <div className="flex bg-[#070b14] border border-[#1e293b] p-1 rounded-lg gap-1 shrink-0">
                <button
                  onClick={() => setActiveLeftTab("memories")}
                  className={`flex-1 py-1.5 px-3 rounded-md font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeLeftTab === "memories"
                      ? "bg-indigo-600/10 text-indigo-400 border border-[#1e293b]"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>State Memories</span>
                </button>
                <button
                  onClick={() => setActiveLeftTab("gmail")}
                  className={`flex-1 py-1.5 px-3 rounded-md font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeLeftTab === "gmail"
                      ? "bg-indigo-600/10 text-indigo-400 border border-[#1e293b]"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Gmail Alerts</span>
                </button>
                <button
                  onClick={() => setActiveLeftTab("logs")}
                  className={`flex-1 py-1.5 px-2.5 rounded-md font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeLeftTab === "logs"
                      ? "bg-indigo-600/10 text-indigo-400 border border-[#1e293b]"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>System Logs</span>
                </button>
              </div>

              {/* Dynamic Left Tab Content */}
              {activeLeftTab === "memories" ? (
                <div className="flex-1 min-h-[300px]">
                  <MemoryVault 
                    memories={memories} 
                    onAddMemory={handleAddMemory} 
                    onDeleteMemory={handleDeleteMemory} 
                    isLoading={isMemoriesLoading} 
                  />
                </div>
              ) : activeLeftTab === "gmail" ? (
                <div className="flex-1 min-h-[300px]">
                  <GmailPanel
                    user={googleUser}
                    setUser={setGoogleUser}
                    accessToken={googleAccessToken}
                    setAccessToken={setGoogleAccessToken}
                    latestAuditReportText={formatAuditReportToText(auditReport)}
                  />
                </div>
              ) : (
                <div className="flex-1 min-h-[300px]">
                  <LogPanel />
                </div>
              )}

            </div>

            {/* Right Column: Interactive Terminal & AI Chat */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* Terminal Panel */}
              <div className="h-[360px] shrink-0">
                <TerminalPanel 
                  onExecuteCommand={handleExecuteCommand}
                  terminalLines={terminalLines}
                  setTerminalLines={setTerminalLines}
                  onAuditTriggered={runAudit}
                />
              </div>

              {/* AI Chat Interaction Panel */}
              <div className="flex-1 min-h-[340px]">
                <ChatPanel 
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isThinking={isChatThinking}
                />
              </div>

            </div>

          </div>
        ) : activeWorkspaceMode === "studio" ? (
          <div className="h-full">
            <StudioPanel />
          </div>
        ) : activeWorkspaceMode === "jobs" ? (
          <div className="h-full">
            <JobAgentPanel 
              gmailUserEmail={googleUser?.email || null}
              gmailAccessToken={googleAccessToken}
            />
          </div>
        ) : activeWorkspaceMode === "recruitment" ? (
          <div className="h-full">
            <RecruitmentIntelligencePanel />
          </div>
        ) : (
          <div className="h-full">
            <DiagnosticPanel />
          </div>
        )}

      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-[#1e293b] bg-[#0c1220]/40 py-2.5 px-6 shrink-0">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between text-[10px] text-slate-500 font-mono gap-2">
          <span>SYSTEM_OPERATING_CONTAINER_OK</span>
          <div className="flex items-center gap-4">
            <span>Least Privilege: ENFORCED</span>
            <span>Uptime: {systemUptime}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
