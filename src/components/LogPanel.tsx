import React, { useState, useEffect, useRef } from "react";
import { Terminal, RefreshCw, Trash2, Shield, Activity, Database, Brain, Mail, Settings, CheckCircle2, AlertOctagon, Info } from "lucide-react";

interface SystemLog {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  type: "api" | "security" | "daemon" | "database" | "ai";
  message: string;
}

export default function LogPanel() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [filter, setFilter] = useState<"all" | "api" | "security" | "daemon" | "database" | "ai">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [autoPoll, setAutoPoll] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to sync system logs:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initFetch = async () => {
      if (isMounted) await fetchLogs();
    };
    initFetch();
    return () => { isMounted = false; };
  }, []);

  // Set up polling interval with unmount guard
  useEffect(() => {
    if (!autoPoll) return;
    let isMounted = true;
    const interval = setInterval(() => {
      if (isMounted) {
        fetchLogs(true);
      }
    }, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [autoPoll]);

  // Handle auto-scroll to top/bottom when log list updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0; // Recent logs at top, so scroll to top
    }
  }, [logs]);

  const handleClearLogs = () => {
    setLogs([]);
  };

  const filteredLogs = logs.filter(log => {
    if (filter === "all") return true;
    return log.type === filter;
  });

  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case "api":
        return <Activity className="w-3.5 h-3.5 text-sky-400" />;
      case "security":
        return <Shield className="w-3.5 h-3.5 text-red-400" />;
      case "daemon":
        return <Settings className="w-3.5 h-3.5 text-emerald-400" />;
      case "database":
        return <Database className="w-3.5 h-3.5 text-purple-400" />;
      case "ai":
        return <Brain className="w-3.5 h-3.5 text-fuchsia-400" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getLogLevelStyle = (level: string) => {
    switch (level) {
      case "success":
        return "text-emerald-400 font-semibold";
      case "warn":
        return "text-amber-400 font-semibold";
      case "error":
        return "text-red-400 font-bold animate-pulse";
      case "info":
      default:
        return "text-slate-300";
    }
  };

  const getLogTypeBadge = (type: string) => {
    switch (type) {
      case "api":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "security":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "daemon":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "database":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "ai":
        return "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#070b13] border border-[#1e293b] rounded-lg overflow-hidden shadow-2xl" id="system-log-terminal">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0c1325] border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-sans text-xs font-semibold text-slate-300 tracking-wider">REAL-TIME SYSTEM AUDIT LOGS</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Polling Indicator */}
          <button
            onClick={() => setAutoPoll(!autoPoll)}
            className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wide border flex items-center gap-1 transition-all ${
              autoPoll
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                : "bg-slate-500/10 text-slate-400 border-slate-500/25"
            }`}
            title="Toggle Live Background Logging Poller"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoPoll ? "bg-emerald-400 animate-ping" : "bg-slate-500"}`} />
            <span>{autoPoll ? "LIVE FEED" : "PAUSED"}</span>
          </button>
          
          <button
            onClick={() => fetchLogs()}
            disabled={isLoading}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
            title="Refresh logs on-demand"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
          
          <button
            onClick={handleClearLogs}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
            title="Wipe current view session logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logging Disclaimer */}
      <div className="px-3 py-2 bg-[#0c1221] border-b border-slate-900 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-1">
          <Info className="w-3 h-3 text-sky-400 shrink-0" />
          <span>Intercepting secure DevOps transactions, file accesses & AI completions</span>
        </div>
        <span>COUNT: {filteredLogs.length}</span>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1 p-2 bg-[#080d1a] border-b border-slate-900/60 font-mono text-[10px]">
        {(["all", "api", "security", "daemon", "database", "ai"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-2 py-1 rounded capitalize border transition-all cursor-pointer ${
              filter === tab
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold"
                : "bg-[#090e1c]/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/30"
            }`}
          >
            {tab === "all" ? "SHOW ALL" : tab}
          </button>
        ))}
      </div>

      {/* Logs Monitor Container */}
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-2.5 max-h-[450px] min-h-[250px] font-mono text-[11px] bg-black/30"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-slate-600">
            <Terminal className="w-8 h-8 text-slate-800 mb-2" />
            <span className="italic">No transactions logged under this selection.</span>
          </div>
        ) : (
          filteredLogs.map(log => (
            <div 
              key={log.id}
              className="p-2 bg-[#090e1d]/50 border border-slate-900/60 rounded-md flex items-start gap-2.5 leading-relaxed hover:bg-[#0a0f23]/75 transition-all"
            >
              {/* Timestamp */}
              <span className="text-slate-600 shrink-0 select-none">
                [{new Date(log.timestamp).toLocaleTimeString()}]
              </span>

              {/* Type Badge */}
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border shrink-0 ${getLogTypeBadge(log.type)}`}>
                {log.type}
              </span>

              {/* Icon */}
              <div className="shrink-0 mt-0.5 select-none">
                {getLogTypeIcon(log.type)}
              </div>

              {/* Message */}
              <span className={`flex-1 break-all ${getLogLevelStyle(log.level)}`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Console Status Bar */}
      <div className="px-4 py-2 bg-[#0c1325] border-t border-[#1e293b] flex items-center justify-between text-[9px] font-mono text-slate-500 select-none">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>DAEMON_PIPELINE_STABLE</span>
        </div>
        <span>LIVE AUTO_SYNC ENABLED</span>
      </div>
    </div>
  );
}
