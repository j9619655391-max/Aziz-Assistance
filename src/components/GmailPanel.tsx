import React, { useState, useEffect } from "react";
import { 
  Mail, 
  Send, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  LogOut, 
  Lock, 
  ShieldCheck, 
  ShieldAlert,
  Search,
  ArrowRight,
  Eye,
  Check
} from "lucide-react";
import { googleSignIn, logout } from "../lib/firebase";
import { User as FirebaseUser } from "firebase/auth";

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  severity: "high" | "medium" | "low";
}

interface GmailPanelProps {
  user: FirebaseUser | null;
  setUser: React.Dispatch<React.SetStateAction<FirebaseUser | null>>;
  accessToken: string | null;
  setAccessToken: React.Dispatch<React.SetStateAction<string | null>>;
  latestAuditReportText: string;
}

export default function GmailPanel({ user, setUser, accessToken, setAccessToken, latestAuditReportText }: GmailPanelProps) {
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dispatch form state
  const [toAddress, setToAddress] = useState("");
  const [subject, setSubject] = useState("Aziz Assistant Security Posture Audit Report");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Email detail viewer modal
  const [selectedMsg, setSelectedMsg] = useState<GmailMessage | null>(null);

  // Search query
  const [searchQuery, setSearchQuery] = useState("");

  // Track remaining lifespan for the Google OAuth token (default 60 minutes)
  const [tokenLifespan, setTokenLifespan] = useState<{ minutes: number; seconds: number; isExpired: boolean } | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setTokenLifespan(null);
      return;
    }

    const checkLifespan = () => {
      const storedTime = localStorage.getItem("aziz_gmail_token_timestamp");
      if (!storedTime) {
        setTokenLifespan(null);
        return;
      }
      
      const parsedTime = parseInt(storedTime, 10);
      const elapsedMs = Date.now() - parsedTime;
      const totalLifespanMs = 3600 * 1000; // 60 minutes
      const remainingMs = totalLifespanMs - elapsedMs;

      if (remainingMs <= 0) {
        setTokenLifespan({ minutes: 0, seconds: 0, isExpired: true });
      } else {
        const remainingSeconds = Math.floor(remainingMs / 1000);
        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        setTokenLifespan({ minutes: mins, seconds: secs, isExpired: false });
      }
    };

    checkLifespan();
    const interval = setInterval(checkLifespan, 1000);
    return () => clearInterval(interval);
  }, [accessToken]);

  // Load emails when authenticated
  useEffect(() => {
    if (accessToken) {
      loadEmails();
      // Set default draft body to current latest audit report text
      if (latestAuditReportText) {
        setBody(latestAuditReportText);
      }
    }
  }, [accessToken, latestAuditReportText]);

  const handleLogin = async () => {
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
      }
    } catch (err: any) {
      setError(err.message || "OAuth login failed");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setMessages([]);
    } catch (err) {
      console.error("Sign out failure:", err);
    }
  };

  const loadEmails = async (search?: string) => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const queryStr = search ? `?q=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/gmail/messages${queryStr}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
      } else {
        setError(data.error || "Failed to load Gmail messages.");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading emails.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadEmails(searchQuery);
  };

  // Dispatch secure email with user confirmation as mandated
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !toAddress.trim() || !subject.trim() || !body.trim()) return;

    // Explicit confirmation dialog as strictly mandated by the guidelines for mutating data
    const confirmed = window.confirm(
      `Aziz Assistant Dispatch Request:\n\nAre you sure you want to send this email report from your account to: ${toAddress}?\n\nThis will send a real email using Gmail.`
    );
    if (!confirmed) return;

    setIsSending(true);
    setSendSuccess(false);
    setSendError(null);

    try {
      // Format HTML body
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #1e293b; background-color: #0c1220; color: #f1f5f9; border-radius: 8px;">
          <h2 style="color: #10b981; border-bottom: 1px solid #334155; padding-bottom: 10px; font-family: monospace;">[AZIZ_ASSISTANT_SECURITY_DISPATCH]</h2>
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
            The following automated Security Posture advisory was compiled and dispatched from Aziz Assistant's systems hardening workspace:
          </p>
          <pre style="background-color: #070b13; color: #10b981; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 12px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; border: 1px solid #1e293b;">${body}</pre>
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #334155; font-size: 11px; color: #64748b; font-family: monospace;">
            Sender address verified via OAuth. Access control governed by least-privilege standards.
          </div>
        </div>
      `;

      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ to: toAddress, subject, body: htmlBody })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSendSuccess(true);
        setToAddress("");
        // Reload draft with original if needed
      } else {
        setSendError(data.error || "Failed to dispatch email.");
      }
    } catch (err: any) {
      setSendError(err.message || "Network error dispatching email.");
    } finally {
      setIsSending(false);
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] border border-[#1e293b] rounded-lg overflow-hidden shadow-2xl" id="gmail-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e162b] border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-indigo-400" />
          <span className="font-sans text-xs font-semibold text-slate-300 tracking-wide">SECURE GMAIL ALERTS & DISPATCH</span>
        </div>
        
        {user && (
          <div className="flex items-center gap-3">
            {tokenLifespan && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1 ${
                tokenLifespan.isExpired 
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : tokenLifespan.minutes < 10
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                    : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
              }`}>
                {tokenLifespan.isExpired ? (
                  <>
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    <span>Token Expired</span>
                    <button 
                      onClick={handleLogin}
                      className="ml-1 text-indigo-400 hover:underline font-bold"
                    >
                      (Refresh)
                    </button>
                  </>
                ) : (
                  <>
                    <span>🔑 Session: {tokenLifespan.minutes}m {tokenLifespan.seconds}s</span>
                    <button 
                      onClick={handleLogin}
                      className="ml-1 text-indigo-400 hover:underline font-bold"
                      title="Click to refresh Gmail session lifespan to a full 60 minutes"
                    >
                      (🔄)
                    </button>
                  </>
                )}
              </span>
            )}
            <span className="font-mono text-[10px] text-emerald-400 max-w-[120px] truncate" title={user.email || ""}>
              {user.email}
            </span>
            <button 
              onClick={handleLogout} 
              className="text-slate-400 hover:text-red-400 transition-colors"
              title="Disconnect account"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Connection State Panel */}
      {!accessToken ? (
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-3.5 bg-indigo-500/10 rounded-full border border-indigo-500/20 text-indigo-400 animate-pulse">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-sans text-xs font-bold text-white mb-1">Gmail Authentication Required</h3>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Authenticate via Google Auth to safely fetch DevOps alerts and securely email security posturing logs to administrators.
            </p>
          </div>

          <button
            onClick={handleLogin}
            className="gsi-material-button relative flex items-center justify-center cursor-pointer select-none border border-slate-700 bg-[#0e1527] hover:bg-[#16203a] rounded-lg py-2 px-4 transition-all text-sm font-sans"
          >
            <div className="flex items-center gap-3">
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              <span className="font-semibold text-slate-200">Sign in with Google</span>
            </div>
          </button>
          
          {error && (
            <p className="text-[11px] text-red-400 font-mono mt-2 bg-red-950/20 border border-red-500/20 p-2 rounded max-w-xs">{error}</p>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          
          {/* Main workspace splits: Inbox Logs & Send Dispatch */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-900 overflow-y-auto">
            
            {/* Left section: Gmail Inbox Alerts */}
            <div className="p-4 flex flex-col space-y-3 min-h-[220px]">
              
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">DevOps Alerts Inbox</span>
                <button 
                  onClick={() => loadEmails(searchQuery)} 
                  disabled={isLoading}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
                </button>
              </div>

              {/* Alert Search Input */}
              <form onSubmit={handleSearchSubmit} className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Filter (e.g. build failed)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-[#070b13] border border-[#1e293b] rounded px-2 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <button type="submit" className="px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition-colors">
                  <Search className="w-3 h-3" />
                </button>
              </form>

              {/* Email List */}
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[240px] pr-1">
                {isLoading ? (
                  <div className="text-center text-slate-500 text-xs font-mono py-10">Scanning inbox logs...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-slate-600 text-xs py-10">No alert messages found matching query.</div>
                ) : (
                  messages.map((msg) => (
                    <div 
                      key={msg.id}
                      onClick={() => setSelectedMsg(msg)}
                      className="p-2.5 bg-[#0d1425] hover:bg-[#151f38] border border-[#1e293b] hover:border-indigo-500/30 rounded-lg cursor-pointer transition-all space-y-1 relative group"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="font-mono text-xs text-white font-semibold truncate max-w-[80%]">{msg.subject}</span>
                        <span className={`text-[8px] font-mono uppercase px-1 rounded border shrink-0 ${getSeverityStyle(msg.severity)}`}>
                          {msg.severity}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="truncate max-w-[70%]">{msg.from}</span>
                        <span>{new Date(msg.date).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 truncate">{msg.snippet}</p>
                    </div>
                  ))
                )}
              </div>

            </div>

            {/* Right section: Send secure report dispatch */}
            <form onSubmit={handleSendEmail} className="p-4 flex flex-col space-y-3 min-h-[220px] bg-[#0c1221]/30">
              
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Secured Log Dispatch</span>

              {sendSuccess && (
                <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] leading-relaxed flex items-start gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Report dispatched successfully! Message ID: log_delivered.</span>
                </div>
              )}

              {sendError && (
                <div className="p-2.5 rounded bg-red-950/20 border border-red-600/30 text-red-400 text-[11px] leading-relaxed flex items-start gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{sendError}</span>
                </div>
              )}

              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-0.5">RECIPIENT (TO):</label>
                  <input
                    type="email"
                    required
                    placeholder="security-admin@company.com"
                    value={toAddress}
                    onChange={(e) => {
                      setToAddress(e.target.value);
                      setSendSuccess(false);
                    }}
                    className="w-full bg-[#070b13] border border-[#1e293b] rounded px-2 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-0.5">SUBJECT:</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-[#070b13] border border-[#1e293b] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-0.5">AUDIT SUMMARY CONTENT:</label>
                  <textarea
                    rows={4}
                    required
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full bg-[#070b13] border border-[#1e293b] rounded p-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-indigo-500 leading-normal"
                    placeholder="Enter security advisory details..."
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSending || !toAddress.trim()}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-sans text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Security Log...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch Secured Email</span>
                  </>
                )}
              </button>

            </form>

          </div>

        </div>
      )}

      {/* Email Detail modal */}
      {selectedMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 bg-[#0c1220] border border-[#1e293b] rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1e293b]">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-400" />
                <h3 className="font-sans font-bold text-sm text-white">Advisory Alert Details</h3>
              </div>
              <button 
                onClick={() => setSelectedMsg(null)}
                className="text-slate-400 hover:text-white font-sans text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-4 gap-2 border-b border-slate-900 pb-2 mb-2">
                <span className="text-slate-500">SUBJECT:</span>
                <span className="col-span-3 text-white font-semibold">{selectedMsg.subject}</span>
                
                <span className="text-slate-500">FROM:</span>
                <span className="col-span-3 text-slate-300 truncate">{selectedMsg.from}</span>
                
                <span className="text-slate-500">DATE:</span>
                <span className="col-span-3 text-slate-400">{new Date(selectedMsg.date).toLocaleString()}</span>
                
                <span className="text-slate-500">SEVERITY:</span>
                <span className="col-span-3">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase border font-semibold ${getSeverityStyle(selectedMsg.severity)}`}>
                    {selectedMsg.severity}
                  </span>
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Snippet Content:</span>
                <div className="p-3 bg-[#070b13] border border-slate-900 rounded text-slate-300 font-sans text-xs leading-relaxed max-h-[160px] overflow-y-auto">
                  {selectedMsg.snippet}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-[#1e293b]">
              <button
                onClick={() => setSelectedMsg(null)}
                className="px-4 py-2 bg-[#1e293b] hover:bg-[#334155] text-white rounded-lg font-sans text-xs transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
