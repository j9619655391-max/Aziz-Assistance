import React, { useState, useEffect } from "react";
import { 
  Send, 
  Terminal, 
  Activity, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Sliders, 
  CheckCircle2, 
  BellRing, 
  MessageSquare, 
  Mail, 
  Zap, 
  Copy, 
  ShieldCheck, 
  ExternalLink,
  Bot,
  Radio,
  Sparkles,
  Layers
} from "lucide-react";

export default function TelegramAlertsPanel() {
  const [config, setConfig] = useState({
    botToken: "",
    chatId: "9619655391",
    botUsername: "",
    enabled: true,
    notifyOnJobMatch: true,
    notifyOnGigMatch: true,
    notifyOnScrapeComplete: true,
    notifyOnSystemErrors: true,
    minMatchScoreToAlert: 85,
    hasToken: false,
    lastStatus: "Idle"
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; logs: string[] } | null>(null);
  
  // Dual Channel Broadcast Test State
  const [isBroadcastingDual, setIsBroadcastingDual] = useState(false);
  const [dualBroadcastResult, setDualBroadcastResult] = useState<{
    success: boolean;
    hostingerSuccess: boolean;
    telegramSuccess: boolean;
    logs: string[];
    message: string;
  } | null>(null);

  // Channels status
  const [channelsStatus, setChannelsStatus] = useState<{
    hostinger: { configured: boolean; sender: string; recipient: string; status: string };
    telegram: { enabled: boolean; botUsername: string; hasToken: boolean; hasChatId: boolean; status: string };
  } | null>(null);

  // Command Testing Simulation State
  const [simulatedCommand, setSimulatedCommand] = useState("/status");
  const [isSimulatingCommand, setIsSimulatingCommand] = useState(false);
  const [simulationResponse, setSimulationResponse] = useState<string | null>(null);

  const [isPolling, setIsPolling] = useState(false);
  const [pollLogs, setPollLogs] = useState<string[]>([]);
  const [copiedTokenHelper, setCopiedTokenHelper] = useState(false);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/telegram/config");
      if (res.ok) {
        const data = await res.json();
        const cfg = data.config || data;
        setConfig(prev => ({
          ...prev,
          ...cfg,
          chatId: cfg.chatId || prev.chatId || "9619655391",
          hasToken: Boolean(cfg.hasToken || (cfg.botToken && cfg.botToken.length > 0 && cfg.botToken !== "••••••••")),
          botToken: prev.botToken || ""
        }));
      }
    } catch (e) {
      console.error("Failed to load Telegram bot configuration:", e);
    }
  };

  const fetchChannelsStatus = async () => {
    try {
      const res = await fetch("/api/alerts/channels-status");
      if (res.ok) {
        const data = await res.json();
        setChannelsStatus(data);
      }
    } catch (e) {
      console.error("Failed to load channels status:", e);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchChannelsStatus();
    const interval = setInterval(fetchChannelsStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/telegram/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        const data = await res.json();
        const cfg = data.config || data;
        setConfig(prev => ({
          ...prev,
          ...cfg,
          hasToken: Boolean(cfg.hasToken || (config.botToken && config.botToken.length > 0)),
          botToken: config.botToken
        }));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
        fetchChannelsStatus();
      }
    } catch (e) {
      console.error("Error saving Telegram config:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestTelegramAlert = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: config.botToken || undefined,
          chatId: config.chatId
        })
      });
      const data = await res.json();
      setTestResult(data);
      if (data.botUsername) {
        setConfig(prev => ({ ...prev, botUsername: data.botUsername, hasToken: true }));
      }
      fetchChannelsStatus();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Network error: ${err.message}`,
        logs: [`[${new Date().toLocaleTimeString()}] ❌ Failed to dispatch test call: ${err.message}`]
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTriggerDualBroadcast = async () => {
    setIsBroadcastingDual(true);
    setDualBroadcastResult(null);
    try {
      const res = await fetch("/api/alerts/broadcast-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      setDualBroadcastResult(data);
      fetchChannelsStatus();
    } catch (err: any) {
      setDualBroadcastResult({
        success: false,
        hostingerSuccess: false,
        telegramSuccess: false,
        logs: [`[${new Date().toLocaleTimeString()}] ❌ Dual broadcast error: ${err.message}`],
        message: err.message
      });
    } finally {
      setIsBroadcastingDual(false);
    }
  };

  const handleSimulateCommand = async () => {
    setIsSimulatingCommand(true);
    setSimulationResponse(null);
    try {
      const res = await fetch("/api/telegram/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            message_id: Date.now(),
            from: { id: config.chatId || 9619655391, first_name: "Aziz", username: "shaikhaziz" },
            chat: { id: config.chatId || 9619655391, type: "private" },
            text: simulatedCommand,
            date: Math.floor(Date.now() / 1000)
          }
        })
      });
      const data = await res.json();
      setSimulationResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setSimulationResponse(`Error simulating command: ${err.message}`);
    } finally {
      setIsSimulatingCommand(false);
    }
  };

  const handlePollUpdates = async () => {
    setIsPolling(true);
    try {
      const res = await fetch("/api/telegram/poll", { method: "POST" });
      const data = await res.json();
      if (data.updates && data.updates.length > 0) {
        setPollLogs(prev => [
          `[${new Date().toLocaleTimeString()}] Processed ${data.processedCount} new update(s) from Telegram`,
          ...prev.slice(0, 15)
        ]);
      } else {
        setPollLogs(prev => [
          `[${new Date().toLocaleTimeString()}] Polled Telegram API - 0 new pending messages.`,
          ...prev.slice(0, 15)
        ]);
      }
    } catch (err: any) {
      setPollLogs(prev => [
        `[${new Date().toLocaleTimeString()}] Polling error: ${err.message}`,
        ...prev.slice(0, 15)
      ]);
    } finally {
      setIsPolling(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      
      {/* Top Banner: Dual Channel Two-Way Alert Architecture */}
      <div className="p-6 bg-gradient-to-r from-slate-900/90 via-[#0a1128]/80 to-slate-900/90 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/25 rounded-xl text-cyan-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-sans">Two-Way Multi-Channel Alert Hub</h2>
                <span className="px-2 py-0.5 bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold rounded-full uppercase tracking-wider">
                  Hostinger + Telegram Live
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Automated 2-way real-time notification engine for job recommendations, freelance contracts, 3x daily scrape cycles, and remote bot commands.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleTriggerDualBroadcast}
              disabled={isBroadcastingDual}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white font-sans text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-950/30 transition-all cursor-pointer"
            >
              {isBroadcastingDual ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Broadcasting to Both Channels...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Test Dual Broadcast (Email + Telegram)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dual Channel Live Status Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 border-t border-slate-800/80">
          
          {/* Channel 1: Hostinger Mail Status */}
          <div className="p-3.5 bg-[#070b16] border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
                <Mail className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white font-sans">Channel 1: Hostinger SMTP Email</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                    info@aaditechs.in
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Target: <strong className="text-slate-200">{channelsStatus?.hostinger.recipient || "shaikhaziz267@hotmail.com"}</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-right">
              <span className={`w-2 h-2 rounded-full ${channelsStatus?.hostinger.configured ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span className="text-[10px] font-mono text-slate-400">
                {channelsStatus?.hostinger.configured ? "Configured & Active" : "Pending Password"}
              </span>
            </div>
          </div>

          {/* Channel 2: Telegram Bot Status */}
          <div className="p-3.5 bg-[#070b16] border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400">
                <Bot className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white font-sans">Channel 2: Telegram Push Bot</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
                    {config.botUsername ? `@${config.botUsername}` : "@AadiTechsAlertBot"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Chat ID: <strong className="text-slate-200">{config.chatId || "9619655391"}</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-right">
              <span className={`w-2 h-2 rounded-full ${config.hasToken ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              <span className="text-[10px] font-mono text-slate-400">
                {config.hasToken ? "Connected (API Ready)" : "Token Required"}
              </span>
            </div>
          </div>

        </div>

        {/* Dual Broadcast Banner Output */}
        {dualBroadcastResult && (
          <div className={`p-4 rounded-xl border text-xs font-sans space-y-2 ${
            dualBroadcastResult.success ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300" : "bg-red-950/20 border-red-500/30 text-red-300"
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                {dualBroadcastResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                {dualBroadcastResult.message}
              </span>
              <div className="flex gap-2 font-mono text-[10px]">
                <span className={dualBroadcastResult.hostingerSuccess ? "text-emerald-400" : "text-amber-400"}>
                  Hostinger: {dualBroadcastResult.hostingerSuccess ? "✓ Sent" : "⚠️ Skipped/Check Pass"}
                </span>
                <span>•</span>
                <span className={dualBroadcastResult.telegramSuccess ? "text-emerald-400" : "text-amber-400"}>
                  Telegram: {dualBroadcastResult.telegramSuccess ? "✓ Pushed" : "⚠️ Skipped/Check Token"}
                </span>
              </div>
            </div>
            <div className="bg-[#03060f] p-2.5 rounded-lg font-mono text-[10px] text-slate-400 space-y-0.5 max-h-28 overflow-y-auto">
              {dualBroadcastResult.logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Main Grid: Telegram Bot Setup Form + Live Handshake Test */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form: Telegram Bot Credentials & Notification Triggers */}
        <div className="lg:col-span-7 space-y-6">
          
          <form onSubmit={handleSaveConfig} className="p-6 bg-[#0a0f1d] border border-slate-850 rounded-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <span className="text-xs font-bold text-white font-sans uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Telegram Bot API Configuration
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                config.hasToken ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}>
                ● {config.hasToken ? "Authenticated" : "Token Not Stored"}
              </span>
            </div>

            {/* Step-by-step Bot Setup Guide Banner */}
            <div className="p-3.5 bg-cyan-950/20 border border-cyan-500/15 rounded-xl space-y-2 text-xs font-sans text-slate-300">
              <div className="flex items-center justify-between text-cyan-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  How to create your Telegram Bot (30 seconds):
                </span>
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[10px] text-cyan-300 hover:text-white underline"
                >
                  Open @BotFather <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400 leading-relaxed">
                <li>Message <strong>@BotFather</strong> on Telegram and send <code className="text-cyan-300 bg-cyan-950 px-1 py-0.5 rounded font-mono">/newbot</code>.</li>
                <li>Give your bot a name (e.g. <em>Aziz Career Radar</em>) and a username ending in <em>bot</em> (e.g. <em>AaditechsJobAlert_bot</em>).</li>
                <li>Copy the generated <strong>HTTP API Token</strong> and paste it below.</li>
                <li>Send a message or <code className="text-cyan-300 bg-cyan-950 px-1 py-0.5 rounded font-mono">/start</code> to your new bot, then paste your Telegram User ID or Chat ID.</li>
              </ol>
            </div>

            <div className="space-y-4 text-xs font-sans">
              
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium flex items-center justify-between">
                  <span>Telegram Bot Token (from @BotFather)</span>
                  <span className="text-[10px] text-slate-500 font-mono">e.g. 7123456789:AAFxxx...</span>
                </label>
                <input
                  type="password"
                  value={config.botToken}
                  onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
                  placeholder={config.hasToken ? "••••••••••••••••••••••••" : "Paste bot token here..."}
                  className="w-full bg-[#05080f] border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium flex items-center justify-between">
                    <span>Target Chat ID / User ID</span>
                    <span className="text-[10px] text-cyan-400 font-mono">Aziz ID</span>
                  </label>
                  <input
                    type="text"
                    value={config.chatId}
                    onChange={(e) => setConfig({ ...config, chatId: e.target.value })}
                    required
                    placeholder="9619655391"
                    className="w-full bg-[#05080f] border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <p className="text-[10px] text-slate-500">
                    Get your ID by messaging <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">@userinfobot</a>.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium">Bot Handle / Username</label>
                  <input
                    type="text"
                    value={config.botUsername}
                    onChange={(e) => setConfig({ ...config, botUsername: e.target.value })}
                    placeholder="e.g. AaditechsJobAlert_bot"
                    className="w-full bg-[#05080f] border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <p className="text-[10px] text-slate-500">
                    Auto-detected when you click "Test Telegram Connection".
                  </p>
                </div>
              </div>

              {/* Notification Filter Trigger Toggles */}
              <div className="pt-3 border-t border-slate-900 space-y-3">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Automated Two-Way Notification Triggers
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  
                  <label className="flex items-center gap-2.5 p-2.5 bg-[#05080f] border border-slate-900 rounded-lg cursor-pointer hover:border-slate-800 transition-colors">
                    <input
                      type="checkbox"
                      checked={config.notifyOnJobMatch}
                      onChange={(e) => setConfig({ ...config, notifyOnJobMatch: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <div>
                      <span className="text-white font-medium block">Job Match Alerts</span>
                      <span className="text-[10px] text-slate-500">When high-scoring jobs are found</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-[#05080f] border border-slate-900 rounded-lg cursor-pointer hover:border-slate-800 transition-colors">
                    <input
                      type="checkbox"
                      checked={config.notifyOnGigMatch}
                      onChange={(e) => setConfig({ ...config, notifyOnGigMatch: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <div>
                      <span className="text-white font-medium block">Freelance Contract Alerts</span>
                      <span className="text-[10px] text-slate-500">Hourly & fixed remote gigs</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-[#05080f] border border-slate-900 rounded-lg cursor-pointer hover:border-slate-800 transition-colors">
                    <input
                      type="checkbox"
                      checked={config.notifyOnScrapeComplete}
                      onChange={(e) => setConfig({ ...config, notifyOnScrapeComplete: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <div>
                      <span className="text-white font-medium block">3x Daily Scraper Digest</span>
                      <span className="text-[10px] text-slate-500">08:00, 14:00, 20:00 UTC summaries</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-[#05080f] border border-slate-900 rounded-lg cursor-pointer hover:border-slate-800 transition-colors">
                    <input
                      type="checkbox"
                      checked={config.notifyOnSystemErrors}
                      onChange={(e) => setConfig({ ...config, notifyOnSystemErrors: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <div>
                      <span className="text-white font-medium block">System Health & Error Alerts</span>
                      <span className="text-[10px] text-slate-500">Daemon logs and rate warnings</span>
                    </div>
                  </label>

                </div>
              </div>

            </div>

            <div className="pt-3 border-t border-slate-900 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                Encrypted in backend memory & database persistence.
              </span>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-sans text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Bot Settings</span>
                  </>
                )}
              </button>
            </div>

            {saveSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-sans">
                ✓ Telegram Bot settings saved and integrated into multi-channel daemon!
              </div>
            )}
          </form>

        </div>

        {/* Right Column: Live Bot Diagnostic Handshake & Interactive 2-Way Command Console */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Diagnostic Handshake Card */}
          <div className="p-6 bg-[#0a0f1d] border border-slate-850 rounded-xl space-y-4">
            <div className="border-b border-slate-900 pb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-white font-sans uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                Telegram Handshake Test
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${config.hasToken ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                <span className="text-[10px] font-mono text-slate-400">{config.lastStatus || "Idle"}</span>
              </span>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <p className="text-slate-400 leading-relaxed text-xs">
                Executes <code className="text-cyan-300 font-mono">getMe</code> on the Telegram Bot API and pushes a live rich HTML test alert to your Chat ID.
              </p>

              <button
                type="button"
                onClick={handleTestTelegramAlert}
                disabled={isTesting}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 disabled:opacity-50 text-white font-sans text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-950/20"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Contacting Telegram API...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-cyan-200" />
                    <span>Send Live Test Push to Telegram</span>
                  </>
                )}
              </button>
            </div>

            {/* Test Handshake Result Banner */}
            {testResult && (
              <div className={`p-3.5 rounded-lg border text-xs font-sans space-y-1.5 ${
                testResult.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-950/20 border-red-500/20 text-red-400"
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {testResult.message}
                </div>
                {testResult.logs && (
                  <div className="bg-[#03060f] p-2 rounded font-mono text-[10px] text-slate-300 space-y-0.5 max-h-28 overflow-y-auto">
                    {testResult.logs.map((l, i) => (
                      <div key={i}>{l}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interactive 2-Way Command Simulator & Polling */}
          <div className="p-6 bg-[#0a0f1d] border border-slate-850 rounded-xl space-y-4">
            <div className="border-b border-slate-900 pb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-white font-sans uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                2-Way Command Console
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                Interactive Bot
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Test sending bot commands just as you would inside Telegram:
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => setSimulatedCommand("/status")}
                className={`p-2 rounded border text-left cursor-pointer transition-all ${
                  simulatedCommand === "/status" ? "bg-cyan-950/40 border-cyan-500 text-cyan-300 font-bold" : "bg-[#05080f] border-slate-850 text-slate-400 hover:border-slate-700"
                }`}
              >
                /status
                <span className="block text-[9px] font-sans text-slate-500 font-normal">Daemon health check</span>
              </button>

              <button
                type="button"
                onClick={() => setSimulatedCommand("/jobs")}
                className={`p-2 rounded border text-left cursor-pointer transition-all ${
                  simulatedCommand === "/jobs" ? "bg-cyan-950/40 border-cyan-500 text-cyan-300 font-bold" : "bg-[#05080f] border-slate-850 text-slate-400 hover:border-slate-700"
                }`}
              >
                /jobs
                <span className="block text-[9px] font-sans text-slate-500 font-normal">Top matched jobs</span>
              </button>

              <button
                type="button"
                onClick={() => setSimulatedCommand("/gigs")}
                className={`p-2 rounded border text-left cursor-pointer transition-all ${
                  simulatedCommand === "/gigs" ? "bg-cyan-950/40 border-cyan-500 text-cyan-300 font-bold" : "bg-[#05080f] border-slate-850 text-slate-400 hover:border-slate-700"
                }`}
              >
                /gigs
                <span className="block text-[9px] font-sans text-slate-500 font-normal">Freelance contracts</span>
              </button>

              <button
                type="button"
                onClick={() => setSimulatedCommand("/scrape")}
                className={`p-2 rounded border text-left cursor-pointer transition-all ${
                  simulatedCommand === "/scrape" ? "bg-cyan-950/40 border-cyan-500 text-cyan-300 font-bold" : "bg-[#05080f] border-slate-850 text-slate-400 hover:border-slate-700"
                }`}
              >
                /scrape
                <span className="block text-[9px] font-sans text-slate-500 font-normal">Trigger instant scrape</span>
              </button>
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={simulatedCommand}
                onChange={(e) => setSimulatedCommand(e.target.value)}
                placeholder="/command"
                className="flex-1 bg-[#05080f] border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={handleSimulateCommand}
                disabled={isSimulatingCommand}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-sans text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                {isSimulatingCommand ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3 h-3" />}
                Execute
              </button>
              <button
                type="button"
                onClick={handlePollUpdates}
                disabled={isPolling}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-sans text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                title="Poll Telegram API for user commands"
              >
                <RefreshCw className={`w-3 h-3 ${isPolling ? "animate-spin" : ""}`} />
                Poll
              </button>
            </div>

            {simulationResponse && (
              <div className="p-2.5 bg-[#03060f] border border-slate-900 rounded-lg text-[10px] font-mono text-cyan-300 max-h-36 overflow-y-auto whitespace-pre-wrap">
                {simulationResponse}
              </div>
            )}

            {pollLogs.length > 0 && (
              <div className="p-2.5 bg-[#03060f] border border-slate-900 rounded-lg text-[10px] font-mono text-slate-400 max-h-24 overflow-y-auto space-y-0.5">
                {pollLogs.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
