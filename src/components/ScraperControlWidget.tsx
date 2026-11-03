import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Database,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Calendar,
  Layers,
  Sparkles,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sliders,
  ShieldCheck
} from "lucide-react";

export interface ScraperStatus {
  isSchedulerActive: boolean;
  currentStatus: "idle" | "scraping" | "scheduled" | "error";
  lastRunTimestamp: string | null;
  nextRunTimestamp: string | null;
  dailyRunsTarget: number;
  totalCyclesCompleted: number;
  totalRecordsInDatabase: {
    jobs: number;
    recruiters: number;
    gigs: number;
  };
  scheduleTimes: string[];
  lastResult?: {
    cycleId: string;
    timestamp: string;
    status: "SUCCESS" | "PARTIAL" | "FAILED";
    jobsScraped: number;
    recruitersScraped: number;
    gigsScraped: number;
    durationMs: number;
    sourcesUsed: string[];
    persistedToDatabase: boolean;
  };
}

interface ScraperControlWidgetProps {
  onRefreshData?: () => void;
}

export default function ScraperControlWidget({ onRefreshData }: ScraperControlWidgetProps) {
  const [status, setStatus] = useState<ScraperStatus | null>(null);
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [showDbViewer, setShowDbViewer] = useState<boolean>(false);
  const [activeDbType, setActiveDbType] = useState<"jobs" | "recruiters" | "gigs">("jobs");
  const [dbRecords, setDbRecords] = useState<any[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dbSearch, setDbSearch] = useState<string>("");

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/v1/scraper/status");
      const data = await res.json();
      if (data.success && data.status) {
        setStatus(data.status);
      }
    } catch (err) {
      console.warn("Failed to fetch scraper status:", err);
    }
  };

  const handleTriggerScrape = async () => {
    setIsTriggering(true);
    showToast("🚀 Initiating Deep Real Data Scraping Cycle across 40 portals...");
    try {
      const res = await fetch("/api/v1/scraper/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Manual UI Trigger from Scraper Widget" })
      });
      const data = await res.json();
      if (data.success && data.result) {
        showToast(`✅ Scrape Complete! Saved ${data.result.jobsScraped} Jobs, ${data.result.recruitersScraped} Recruiters, ${data.result.gigsScraped} Gigs to DB.`);
        fetchStatus();
        if (onRefreshData) onRefreshData();
      } else {
        showToast("⚠️ Scraping cycle finished with notices.");
      }
    } catch (err: any) {
      showToast(`❌ Scraper Error: ${err.message}`);
    } finally {
      setIsTriggering(false);
    }
  };

  const fetchDbRecords = async (type: "jobs" | "recruiters" | "gigs") => {
    setActiveDbType(type);
    setIsLoadingRecords(true);
    try {
      const res = await fetch(`/api/v1/scraper/records?type=${type}&limit=50`);
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        setDbRecords(data.records);
      }
    } catch (err) {
      console.error("Failed to load DB records:", err);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const openDbViewer = (type: "jobs" | "recruiters" | "gigs" = "jobs") => {
    setShowDbViewer(true);
    fetchDbRecords(type);
  };

  const filteredRecords = dbRecords.filter((rec) => {
    if (!dbSearch.trim()) return true;
    const q = dbSearch.toLowerCase();
    const str = JSON.stringify(rec).toLowerCase();
    return str.includes(q);
  });

  return (
    <div className="bg-[#080d1a] border border-[#1b2640] rounded-xl p-4 text-xs font-sans text-slate-300 shadow-md space-y-3">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-indigo-950/90 border border-indigo-500/50 text-indigo-200 px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header & Status Grid */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#141e33]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Autonomous 3x-Daily Deep Scraper & Database Vault
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                3x Daily Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Scheduled times: <strong className="text-slate-200">08:00 AM • 02:00 PM • 08:00 PM (UTC)</strong>. Real scraped records are persistently indexed into the database.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => openDbViewer("jobs")}
            className="px-3 py-1.5 bg-[#0f172a] hover:bg-[#1e293b] text-slate-200 border border-[#243354] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Browse all stored records in DB"
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>View DB Vault</span>
          </button>
          <button
            onClick={handleTriggerScrape}
            disabled={isTriggering}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            {isTriggering ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Scraping Live Web...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Scrape Real Data Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metrics & Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {/* Next Scheduled */}
        <div className="p-2.5 bg-[#050914] border border-[#141e33] rounded-lg">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Next Auto Scrape:</span>
          <span className="text-xs font-bold text-indigo-300 font-mono">
            {status?.nextRunTimestamp ? new Date(status.nextRunTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "08:00 AM"}
          </span>
          <span className="text-[9px] text-slate-500 block">3x Daily Automated Cron</span>
        </div>

        {/* Jobs In DB */}
        <div 
          onClick={() => openDbViewer("jobs")}
          className="p-2.5 bg-[#050914] border border-[#141e33] rounded-lg hover:border-indigo-500/40 cursor-pointer transition-colors"
        >
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Jobs in Database:</span>
          <span className="text-xs font-bold text-emerald-400 font-mono">
            {status?.totalRecordsInDatabase?.jobs || 0} Records
          </span>
          <span className="text-[9px] text-slate-500 block">Click to view table</span>
        </div>

        {/* Recruiters In DB */}
        <div 
          onClick={() => openDbViewer("recruiters")}
          className="p-2.5 bg-[#050914] border border-[#141e33] rounded-lg hover:border-indigo-500/40 cursor-pointer transition-colors"
        >
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Recruiters in DB:</span>
          <span className="text-xs font-bold text-cyan-400 font-mono">
            {status?.totalRecordsInDatabase?.recruiters || 0} Contacts
          </span>
          <span className="text-[9px] text-slate-500 block">Hiring Managers</span>
        </div>

        {/* Gigs In DB */}
        <div 
          onClick={() => openDbViewer("gigs")}
          className="p-2.5 bg-[#050914] border border-[#141e33] rounded-lg hover:border-indigo-500/40 cursor-pointer transition-colors"
        >
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Freelance Contracts:</span>
          <span className="text-xs font-bold text-purple-400 font-mono">
            {status?.totalRecordsInDatabase?.gigs || 0} Gigs
          </span>
          <span className="text-[9px] text-slate-500 block">Upwork & 40 Portals</span>
        </div>
      </div>

      {/* DB Viewer Modal / Expanded Drawer */}
      {showDbViewer && (
        <div className="mt-3 p-4 bg-[#050914] border border-[#1b2640] rounded-xl space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#141e33] pb-2.5">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Persistent Database Records Vault
              </h4>
            </div>
            
            {/* Type Switcher Tabs */}
            <div className="flex items-center gap-1 bg-[#090f1f] p-0.5 rounded-lg border border-[#1b2640]">
              <button
                onClick={() => fetchDbRecords("jobs")}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  activeDbType === "jobs" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Jobs ({status?.totalRecordsInDatabase?.jobs || 0})
              </button>
              <button
                onClick={() => fetchDbRecords("recruiters")}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  activeDbType === "recruiters" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Recruiters ({status?.totalRecordsInDatabase?.recruiters || 0})
              </button>
              <button
                onClick={() => fetchDbRecords("gigs")}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  activeDbType === "gigs" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Freelance Gigs ({status?.totalRecordsInDatabase?.gigs || 0})
              </button>
              <button
                onClick={() => setShowDbViewer(false)}
                className="px-2 py-1 text-slate-500 hover:text-rose-400 font-bold ml-1 text-xs"
                title="Close Viewer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Search Filter */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder={`Filter stored ${activeDbType} by keyword, company, or skills...`}
              value={dbSearch}
              onChange={(e) => setDbSearch(e.target.value)}
              className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Records Table / List */}
          {isLoadingRecords ? (
            <div className="py-8 text-center text-slate-500 text-xs font-mono">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-2" />
              Loading database records from persistent storage...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No records found in database for this category. Click <strong>"Scrape Real Data Now"</strong> to run a live scrape cycle.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 font-mono text-[11px]">
              {filteredRecords.map((item, idx) => (
                <div key={item.id || idx} className="p-3 bg-[#0a1020] border border-[#19243d] rounded-lg space-y-1 hover:border-slate-700 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-white font-bold font-sans text-xs block">
                        {item.title || item.name}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        {item.company} • {item.location || item.clientCountry || item.role || "Global"}
                      </span>
                    </div>
                    {item.salary || item.budget ? (
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-semibold text-[10px]">
                        {item.salary || item.budget}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[9px]">
                        {item.status || "Verified"}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-slate-400 text-[10px] font-sans line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  )}
                  <div className="pt-1 flex items-center justify-between text-[9px] text-slate-500 border-t border-[#131c30] mt-1">
                    <span>Scraped At: {item.persistedAt || item.timestamp ? new Date(item.persistedAt || item.timestamp).toLocaleString() : "Live Buffer"}</span>
                    {item.originalReference || item.url || item.linkedIn ? (
                      <a
                        href={item.originalReference || item.url || item.linkedIn}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline flex items-center gap-1 font-sans"
                      >
                        Original Source <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
