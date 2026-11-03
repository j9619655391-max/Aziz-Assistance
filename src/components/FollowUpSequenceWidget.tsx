import React, { useState, useEffect } from "react";
import {
  Mail,
  Clock,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Globe,
  Settings,
  Layers,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from "lucide-react";

interface FollowUpItem {
  id: string;
  applicationId: string;
  jobTitle: string;
  company: string;
  recipientEmail: string;
  contactName?: string;
  stage: "stage_1_reminder" | "stage_2_case_study" | "completed";
  daysSinceApplication: number;
  subject: string;
  bodyPreview: string;
  status: "pending_review" | "ready_to_send" | "sent" | "dismissed";
  scheduledFor: string;
}

interface FollowUpConfig {
  enabled: boolean;
  firstFollowUpDays: number;
  secondFollowUpDays: number;
  autoSendMode: "draft_only" | "auto_dispatch";
  senderChannel: "gmail" | "hostinger_smtp";
}

export default function FollowUpSequenceWidget() {
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [config, setConfig] = useState<FollowUpConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDispatching, setIsDispatching] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Webhook Test Form State
  const [testTitle, setTestTitle] = useState("Lead Systems Administrator");
  const [testCompany, setTestCompany] = useState("FinTech Infrastructure Corp");
  const [testSalary, setTestSalary] = useState("₹14,50,000 - ₹18,00,000 / yr");
  const [testEmail, setTestEmail] = useState("hr@fintech-infra.com");
  const [testUrl, setTestUrl] = useState("https://www.linkedin.com/jobs/view/998234");
  const [isSubmittingWebhook, setIsSubmittingWebhook] = useState(false);

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchFollowUps = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/follow-ups");
      const data = await res.json();
      if (data.success) {
        setFollowUps(data.items || []);
        setConfig(data.config || null);
      }
    } catch (err) {
      console.warn("Failed to load follow ups:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDispatch = async (item: FollowUpItem) => {
    setIsDispatching(item.id);
    try {
      const res = await fetch("/api/v1/follow-ups/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followUpId: item.id,
          recipientEmail: item.recipientEmail,
          subject: item.subject,
          body: item.bodyPreview
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ Follow-up sent to ${item.recipientEmail}`);
        setFollowUps((prev) => prev.filter((f) => f.id !== item.id));
      } else {
        showToast(`⚠️ ${data.message || "Failed to dispatch follow-up."}`);
      }
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setIsDispatching(null);
    }
  };

  const handleTestWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingWebhook(true);
    try {
      const res = await fetch("/api/v1/webhook/import-opportunity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: testTitle,
          company: testCompany,
          salary: testSalary,
          recruiterEmail: testEmail,
          url: testUrl,
          source: "Chrome Extension Webhook Bridge"
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🚀 Webhook imported "${testTitle}" directly into DB!`);
      } else {
        showToast("⚠️ Import error");
      }
    } catch (err: any) {
      showToast(`❌ Webhook error: ${err.message}`);
    } finally {
      setIsSubmittingWebhook(false);
    }
  };

  const webhookEndpoint = `${window.location.origin}/api/v1/webhook/import-opportunity`;

  const copyWebhookCode = () => {
    const code = `// Chrome / Bookmarklet Webhook POST
fetch("${webhookEndpoint}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: document.title,
    company: window.location.hostname,
    url: window.location.href,
    source: "Browser Extension"
  })
});`;
    navigator.clipboard.writeText(code);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 3000);
  };

  return (
    <div className="space-y-6 text-xs text-slate-300">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-indigo-950/90 border border-indigo-500/50 text-indigo-200 px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2 backdrop-blur-md animate-in fade-in">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Container Header */}
      <div className="bg-[#0a0f1c] border border-[#1e293b] rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#141e33]">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Automated 3-Day & 7-Day Drip Follow-Up Sequences
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Drip Engine Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Monitors unanswered applications and generates tailored, professional follow-up messages automatically at 3 days (Stage 1) and 7 days (Stage 2 Case Study).
            </p>
          </div>

          <button
            onClick={fetchFollowUps}
            disabled={isLoading}
            className="px-3 py-1.5 bg-[#0f172a] hover:bg-[#1e293b] text-slate-200 border border-[#243354] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : "text-slate-400"}`} />
            <span>Refresh Pending</span>
          </button>
        </div>

        {/* Pending Follow-Up Queue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>ACTIONABLE FOLLOW-UP QUEUE ({followUps.length} Pending)</span>
            <span>Config: 3-Day & 7-Day Intervals</span>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-slate-500 font-mono">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-2" />
              Scanning submitted applications for pending reminders...
            </div>
          ) : followUps.length === 0 ? (
            <div className="p-6 bg-[#060a14] border border-[#141e33] rounded-xl text-center text-slate-400 space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
              <p className="font-semibold text-white">All Follow-Up Sequences are Up-to-Date</p>
              <p className="text-[11px] text-slate-500">
                No applications currently require a 3-day or 7-day reminder. New follow-up prompts will generate as applications age past 3 days without replies.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {followUps.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-[#060a14] border border-[#1b2640] rounded-xl space-y-2.5 hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-xs">{item.jobTitle}</span>
                        <span className="text-slate-400 text-xs">@ {item.company}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {item.stage === "stage_1_reminder" ? "Day 3 Reminder" : "Day 7 Case Study"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Applied {item.daysSinceApplication} days ago • Target: {item.recipientEmail}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDispatch(item)}
                      disabled={isDispatching === item.id}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                    >
                      {isDispatching === item.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Follow-Up Now</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-3 bg-[#090f1f] border border-[#15213b] rounded-lg font-mono text-[11px] space-y-1">
                    <span className="text-slate-400 block font-sans font-bold text-xs text-white">
                      Subject: {item.subject}
                    </span>
                    <p className="text-slate-300 whitespace-pre-line text-[10px] leading-relaxed pt-1">
                      {item.bodyPreview}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Webhook Extension Bridge Card */}
      <div className="bg-[#0a0f1c] border border-[#1e293b] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#141e33]">
          <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Browser Extension Webhook Bridge (1-Click Import)
            </h3>
            <p className="text-[11px] text-slate-400">
              Directly capture jobs and freelance listings from Chrome, LinkedIn, Indeed, or Naukri straight into your persistent database.
            </p>
          </div>
        </div>

        {/* Webhook Endpoint Snippet */}
        <div className="p-3 bg-[#060a14] border border-[#141e33] rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
              Active Webhook POST Endpoint:
            </span>
            <button
              onClick={copyWebhookCode}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono cursor-pointer"
            >
              {copiedWebhook ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedWebhook ? "Snippet Copied!" : "Copy Browser Snippet"}</span>
            </button>
          </div>
          <code className="block p-2 bg-[#03060e] border border-[#111928] rounded text-[11px] text-emerald-400 font-mono select-all break-all">
            POST {webhookEndpoint}
          </code>
        </div>

        {/* 1-Click Interactive Test Importer */}
        <form onSubmit={handleTestWebhook} className="space-y-3 pt-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
            Test Webhook Ingestion Engine:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            <div>
              <label className="text-[9px] text-slate-500 uppercase block font-mono mb-1">Job Title</label>
              <input
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-white text-xs"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-500 uppercase block font-mono mb-1">Company</label>
              <input
                type="text"
                value={testCompany}
                onChange={(e) => setTestCompany(e.target.value)}
                className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-white text-xs"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-500 uppercase block font-mono mb-1">Salary / Budget</label>
              <input
                type="text"
                value={testSalary}
                onChange={(e) => setTestSalary(e.target.value)}
                className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-white text-xs"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-500 uppercase block font-mono mb-1">HR Email (Optional)</label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-white text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmittingWebhook}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {isSubmittingWebhook ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Simulating Webhook Capture...</span>
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5" />
                <span>Simulate 1-Click Extension Webhook Import</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
