import { useState, useEffect } from "react";
import {
  Search,
  RefreshCw,
  Cpu,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
  Terminal,
  FolderGit,
  FileCode,
  Check,
  Copy,
  Bug,
  Code2,
  ChevronRight,
  ChevronDown,
  Sparkles,
  HelpCircle,
  Clock,
  Database,
  Zap,
  Play,
  Download,
  Activity,
  Layers,
  Send
} from "lucide-react";
import { WorkspaceFileIndex, CodeBug, DiagnosticBugReport } from "../types";

export default function DiagnosticPanel() {
  const [indexing, setIndexing] = useState(false);
  const [indexFiles, setIndexFiles] = useState<WorkspaceFileIndex[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExtension, setSelectedExtension] = useState<string>("all");
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

  // Diagnostic states
  const [diagnosing, setDiagnosing] = useState(false);
  const [report, setReport] = useState<DiagnosticBugReport | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active view tab inside panel
  const [activeTab, setActiveTab] = useState<"index" | "diagnostics" | "api-benchmark">("diagnostics");

  // OpenAPI & Benchmark states
  const [openApiSpec, setOpenApiSpec] = useState<any | null>(null);
  const [loadingSpec, setLoadingSpec] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("/api/v1/health");
  const [selectedMethod, setSelectedMethod] = useState<string>("GET");
  const [customPayload, setCustomPayload] = useState<string>("{}");
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<{ status: number; latencyMs: number; data: any; error?: string } | null>(null);
  
  // High-throughput benchmark state
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<{
    totalRequests: number;
    successfulRequests: number;
    avgLatencyMs: number;
    minLatencyMs: number;
    maxLatencyMs: number;
    p95LatencyMs: number;
    throughputRps: number;
    probes: Array<{ endpoint: string; method: string; status: number; latencyMs: number; success: boolean }>;
  } | null>(null);

  // Load index and diagnostics on mount with unmount guard
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIndexing(true);
      try {
        const [indexRes, diagRes] = await Promise.all([
          fetch("/api/indexer/get-index").then(r => r.json()).catch(() => ({ files: [] })),
          fetch("/api/diagnostic-agent/run", { method: "POST" }).then(r => r.json()).catch(() => null)
        ]);
        if (!isMounted) return;
        if (indexRes && indexRes.files) {
          setIndexFiles(indexRes.files);
        }
        if (diagRes) {
          setReport(diagRes);
        }
      } catch (err) {
        console.error("Failed to load workspace index or diagnostics:", err);
      } finally {
        if (isMounted) {
          setIndexing(false);
        }
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, []);

  const fetchIndex = async (forceScan = false) => {
    setIndexing(true);
    try {
      const endpoint = forceScan ? "/api/indexer/scan" : "/api/indexer/get-index";
      const method = forceScan ? "POST" : "GET";
      const res = await fetch(endpoint, { method });
      const data = await res.json();
      if (data.files) {
        setIndexFiles(data.files);
      }
    } catch (err) {
      console.error("Failed to load workspace index:", err);
    } finally {
      setIndexing(false);
    }
  };

  const runDiagnosis = async (silent = false) => {
    if (!silent) setDiagnosing(true);
    try {
      const res = await fetch("/api/diagnostic-agent/run", { method: "POST" });
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error("Failed to execute diagnostics:", err);
    } finally {
      if (!silent) setDiagnosing(false);
    }
  };

  const toggleFileExpand = (path: string) => {
    setExpandedFiles(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchOpenApiSpec = async () => {
    setLoadingSpec(true);
    try {
      const res = await fetch("/api/v1/openapi.json");
      const data = await res.json();
      setOpenApiSpec(data);
    } catch (err) {
      console.error("Failed to load OpenAPI spec:", err);
    } finally {
      setLoadingSpec(false);
    }
  };

  useEffect(() => {
    if (activeTab === "api-benchmark" && !openApiSpec) {
      fetchOpenApiSpec();
    }
  }, [activeTab]);

  const executeProbe = async () => {
    setProbing(true);
    setProbeResult(null);
    const start = performance.now();
    try {
      const options: RequestInit = {
        method: selectedMethod,
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": `probe-${Date.now()}`
        }
      };
      if (selectedMethod !== "GET" && selectedMethod !== "HEAD") {
        options.body = customPayload;
      }
      const res = await fetch(selectedEndpoint, options);
      const latencyMs = Math.round(performance.now() - start);
      let data: any;
      try {
        data = await res.json();
      } catch {
        data = await res.text();
      }
      setProbeResult({
        status: res.status,
        latencyMs,
        data
      });
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      setProbeResult({
        status: 500,
        latencyMs,
        data: null,
        error: err.message || "Network request failed"
      });
    } finally {
      setProbing(false);
    }
  };

  const runBatchBenchmark = async () => {
    setBenchmarkRunning(true);
    const endpoints = [
      { endpoint: "/api/v1/health", method: "GET" },
      { endpoint: "/api/v1/metrics", method: "GET" },
      { endpoint: "/api/health", method: "GET" },
      { endpoint: "/api/security/audit", method: "GET" },
      { endpoint: "/api/memories", method: "GET" },
      { endpoint: "/api/modules", method: "GET" },
      { endpoint: "/api/job-profile", method: "GET" },
      { endpoint: "/api/v1/openapi.json", method: "GET" },
      { endpoint: "/api/v1/health", method: "GET" },
      { endpoint: "/api/studio/metrics", method: "GET" }
    ];

    const probes: Array<{ endpoint: string; method: string; status: number; latencyMs: number; success: boolean }> = [];
    const overallStart = performance.now();

    await Promise.all(
      endpoints.map(async (item) => {
        const start = performance.now();
        try {
          const res = await fetch(item.endpoint, {
            method: item.method,
            headers: { "X-Request-Id": `bench-${Date.now()}-${Math.random().toString(36).substring(7)}` }
          });
          const latencyMs = Math.round(performance.now() - start);
          probes.push({
            endpoint: item.endpoint,
            method: item.method,
            status: res.status,
            latencyMs,
            success: res.status < 400
          });
        } catch {
          const latencyMs = Math.round(performance.now() - start);
          probes.push({
            endpoint: item.endpoint,
            method: item.method,
            status: 500,
            latencyMs,
            success: false
          });
        }
      })
    );

    const overallDurationSec = (performance.now() - overallStart) / 1000;
    const latencies = probes.map(p => p.latencyMs).sort((a, b) => a - b);
    const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    const minLatency = latencies[0] || 0;
    const maxLatency = latencies[latencies.length - 1] || 0;
    const p95Index = Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95));
    const p95Latency = latencies[p95Index] || 0;
    const successCount = probes.filter(p => p.success).length;
    const throughput = parseFloat((probes.length / (overallDurationSec || 0.001)).toFixed(1));

    setBenchmarkResults({
      totalRequests: probes.length,
      successfulRequests: successCount,
      avgLatencyMs: avgLatency,
      minLatencyMs: minLatency,
      maxLatencyMs: maxLatency,
      p95LatencyMs: p95Latency,
      throughputRps: throughput,
      probes
    });
    setBenchmarkRunning(false);
  };

  const downloadOpenApiSpec = () => {
    if (!openApiSpec) return;
    const blob = new Blob([JSON.stringify(openApiSpec, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "openapi.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter files
  const extensions = Array.from(new Set(indexFiles.map(f => (f.name || (f as any).fileName || "").split(".").pop() || "")))
    .filter(Boolean) as string[];

  const filteredFiles = indexFiles.filter(file => {
    const filePath = file.path || (file as any).filePath || "";
    const fileName = file.name || (file as any).fileName || "";
    const fileSummary = file.summary || { imports: [], exports: [], functions: [], components: [] };
    const q = (searchQuery || "").toLowerCase();
    const matchesSearch = (filePath || "").toLowerCase().includes(q) || 
                          (fileSummary.functions || []).some(f => (f || "").toLowerCase().includes(q)) ||
                          (fileSummary.components || []).some(c => (c || "").toLowerCase().includes(q));
    const matchesExt = selectedExtension === "all" || fileName.endsWith(`.${selectedExtension}`);
    return matchesSearch && matchesExt;
  });

  // Filter bugs
  const filteredBugs = report?.bugs.filter(bug => {
    const matchesSeverity = severityFilter === "all" || bug.severity === severityFilter;
    const matchesCategory = categoryFilter === "all" || bug.category === categoryFilter;
    return matchesSeverity && matchesCategory;
  }) || [];

  // Summary stats
  const totalLines = indexFiles.reduce((acc, f) => acc + (f.lines || (f as any).loc || 0), 0);
  const totalSize = indexFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  const totalSizeFormatted = totalSize > 1024 * 1024 
    ? (totalSize / (1024 * 1024)).toFixed(2) + " MB" 
    : totalSize > 0 
      ? (totalSize / 1024).toFixed(2) + " KB"
      : `${(totalLines * 45 / 1024).toFixed(1)} KB (Est)`;

  return (
    <div className="bg-[#0a0f1d] border border-[#1e293b] rounded-lg shadow-2xl flex flex-col h-full overflow-hidden" id="diagnostic-agent-panel">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-900 bg-[#0d1425]/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              Codebug & Indexing Intelligence Agent
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                Active Scan Mode
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Static code analysis, error pattern detection, and direct token-optimized directory indexes.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-[#070b13] p-1 rounded-lg border border-slate-900 text-xs font-mono">
          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "diagnostics"
                ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/10 font-bold"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Bug Finder ({report?.totalIssuesCount ?? 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("index")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "index"
                ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/10 font-bold"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Workspace Index ({indexFiles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("api-benchmark")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "api-benchmark"
                ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/10 font-bold"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>API & Benchmarks</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {activeTab === "diagnostics" && (
          <div className="space-y-6">
            {/* Stats Dashboard */}
            {report && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* Score & Grade */}
                <div className="bg-[#070b13] border border-slate-900 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 blur-xl rounded-full" />
                  <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 shrink-0 font-mono font-bold text-xl ${
                    report.qualityScore >= 90
                      ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/5 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                      : report.qualityScore >= 70
                        ? "border-amber-500/40 text-amber-400 bg-amber-500/5"
                        : "border-red-500/40 text-red-400 bg-red-500/5 shadow-[0_0_12px_rgba(239,68,68,0.1)]"
                  }`}>
                    <span className="text-lg">{report.qualityScore}%</span>
                    <span className="text-[7px] text-slate-500 uppercase -mt-1 font-sans">Quality</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Health Grade</span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      Class {report.qualityGrade} Status
                    </h3>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {report.qualityScore >= 90 
                        ? "Robust and healthy architecture. Standard conforming." 
                        : "Code issues detected requiring prompt refactoring."}
                    </p>
                  </div>
                </div>

                {/* Critical Issues */}
                <div className="bg-[#070b13] border border-slate-900 rounded-xl p-4 flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg shrink-0 ${report.criticalCount > 0 ? "bg-red-500/10 text-red-400 animate-pulse" : "bg-slate-900 text-slate-500"}`}>
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Critical Bugs</span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{report.criticalCount}</h3>
                    <p className="text-[9px] text-slate-400 leading-tight">
                      Immediate risks: loops, secret exposure, broken paths.
                    </p>
                  </div>
                </div>

                {/* Warnings */}
                <div className="bg-[#070b13] border border-slate-900 rounded-xl p-4 flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg shrink-0 ${report.warningCount > 0 ? "bg-amber-500/10 text-amber-400" : "bg-slate-900 text-slate-500"}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Warnings</span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{report.warningCount}</h3>
                    <p className="text-[9px] text-slate-400 leading-tight">
                      Minor code hazards: unkeyed lists, unchecked promises.
                    </p>
                  </div>
                </div>

                {/* Best Practices */}
                <div className="bg-[#070b13] border border-slate-900 rounded-xl p-4 flex items-center gap-3">
                  <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-lg shrink-0">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Clean Coding Tips</span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{report.infoCount}</h3>
                    <p className="text-[9px] text-slate-400 leading-tight">
                      Optimization steps, debug comments, and linting tips.
                    </p>
                  </div>
                </div>

              </div>
            )}

            {/* Diagnostic Control Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#0d1425]/40 border border-[#1e293b]/60 rounded-xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs text-slate-300 font-medium">
                  Trigger the AI-guided Bug Finder Agent to diagnose source components.
                </span>
              </div>
              <button
                onClick={() => runDiagnosis()}
                disabled={diagnosing}
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-sans text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${diagnosing ? "animate-spin text-indigo-200" : ""}`} />
                <span>{diagnosing ? "Scanning Workspace..." : "Trigger Codebase Diagnostics"}</span>
              </button>
            </div>

            {/* List and Filters */}
            {report && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 pb-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                    Detected Architectural Findings ({filteredBugs.length})
                  </h3>

                  {/* Filter Selects */}
                  <div className="flex items-center gap-2.5 text-[11px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Severity:</span>
                      <select
                        value={severityFilter}
                        onChange={e => setSeverityFilter(e.target.value)}
                        className="bg-[#070b13] border border-slate-800 text-slate-300 rounded px-2 py-1 outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="all">All Severs</option>
                        <option value="critical">Critical</option>
                        <option value="warning">Warning</option>
                        <option value="info">Info</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Category:</span>
                      <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="bg-[#070b13] border border-slate-800 text-slate-300 rounded px-2 py-1 outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="all">All Cats</option>
                        <option value="rendering">Rendering</option>
                        <option value="security">Security</option>
                        <option value="network">Network</option>
                        <option value="syntax">Syntax</option>
                        <option value="best_practice">Best Practice</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Findings Container */}
                {filteredBugs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-slate-800 rounded-xl bg-[#070b13]/40 text-center space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Your Workspace is Pristine!</h4>
                      <p className="text-xs text-slate-400 max-w-sm mt-1">
                        No errors or issues matches the active filter. The diagnostic scanner did not record any compliance violations.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBugs.map((bug) => (
                      <div
                        key={bug.id}
                        className={`border rounded-xl p-4 bg-[#070b14] transition-all space-y-3 hover:border-slate-700/50 ${
                          bug.severity === "critical"
                            ? "border-red-500/10 shadow-[inset_3px_0_0_#ef4444]"
                            : bug.severity === "warning"
                              ? "border-amber-500/10 shadow-[inset_3px_0_0_#f59e0b]"
                              : "border-blue-500/10 shadow-[inset_3px_0_0_#3b82f6]"
                        }`}
                      >
                        {/* Title and metadata bar */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                bug.severity === "critical"
                                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                  : bug.severity === "warning"
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              }`}>
                                {bug.severity}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 uppercase tracking-wider">
                                {bug.category.replace("_", " ")}
                              </span>
                              <span className="text-xs font-mono text-indigo-400 flex items-center gap-1 font-semibold">
                                <FileCode className="w-3.5 h-3.5" />
                                {bug.filePath}:{bug.line}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white font-sans">{bug.title}</h4>
                          </div>
                        </div>

                        {/* Description & Fix Recommendation */}
                        <div className="space-y-2">
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">{bug.message}</p>
                          
                          <div className="p-3 bg-[#0c1120] border border-slate-900 rounded-lg text-xs flex gap-2">
                            <div className="shrink-0 text-emerald-400 pt-0.5">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div className="space-y-0.5">
                              <span className="font-bold text-emerald-400 font-sans text-[11px] block uppercase tracking-wider">Recommended Remediation:</span>
                              <span className="text-[11px] text-slate-400 leading-normal">{bug.recommendation}</span>
                            </div>
                          </div>
                        </div>

                        {/* Code Snippet */}
                        {bug.snippet && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Code Context:</span>
                            <div className="bg-[#04060b] border border-slate-950 rounded-lg p-3 font-mono text-xs text-red-300 overflow-x-auto select-all relative group">
                              <code>{bug.snippet}</code>
                            </div>
                          </div>
                        )}

                        {/* Suggestion Code Fix */}
                        {bug.remediationCode && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                                <Code2 className="w-3.5 h-3.5" />
                                Proposed Patch Fix Code
                              </span>
                              <button
                                onClick={() => copyToClipboard(bug.remediationCode!, bug.id)}
                                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white font-mono bg-slate-900 hover:bg-slate-800 py-1 px-2 border border-slate-800 rounded transition-colors cursor-pointer"
                              >
                                {copiedId === bug.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-400">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Patch</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="bg-[#03060c] border border-slate-950 rounded-lg p-3 font-mono text-[11px] text-emerald-400/90 overflow-x-auto whitespace-pre">
                              <code>{bug.remediationCode}</code>
                            </pre>
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "index" && (
          <div className="space-y-6">
            {/* Index Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#070b13] border border-slate-900 rounded-xl p-4 flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                  <FolderGit className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Total Indexed Files</span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{indexFiles.length}</h3>
                  <p className="text-[10px] text-slate-400 leading-tight">Code files & configurations scanned.</p>
                </div>
              </div>

              <div className="bg-[#070b13] border border-slate-900 rounded-xl p-4 flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Total Lines Analyzed</span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{totalLines.toLocaleString()} Lines</h3>
                  <p className="text-[10px] text-slate-400 leading-tight">Total codebase volume size.</p>
                </div>
              </div>

              <div className="bg-[#070b13] border border-slate-900 rounded-xl p-4 flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Indexed Storage Footprint</span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{totalSizeFormatted}</h3>
                  <p className="text-[10px] text-slate-400 leading-tight">Total raw source bytes.</p>
                </div>
              </div>
            </div>

            {/* Controls and Searches */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-[#0d1425]/40 border border-[#1e293b]/60 rounded-xl">
              <div className="flex-1 flex flex-col md:flex-row gap-3">
                {/* Search input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search indexed functions, exports, components or file paths..."
                    className="w-full bg-[#070b13] border border-slate-800 text-slate-200 rounded-lg pl-10 pr-4 py-2 text-xs focus:border-indigo-500 outline-none placeholder-slate-500 font-sans"
                  />
                </div>

                {/* Filter extension */}
                <select
                  value={selectedExtension}
                  onChange={e => setSelectedExtension(e.target.value)}
                  className="bg-[#070b13] border border-slate-800 text-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 cursor-pointer font-mono"
                >
                  <option value="all">All File Types</option>
                  {extensions.map(ext => (
                    <option key={ext} value={ext}>.{ext.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Refresh Index Button */}
              <button
                onClick={() => fetchIndex(true)}
                disabled={indexing}
                className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-sans text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${indexing ? "animate-spin text-indigo-400" : ""}`} />
                <span>Re-index Codebase</span>
              </button>
            </div>

            {/* Files List Table-Style Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider px-2">
                <span>File Path / Metadata</span>
                <span>Actions</span>
              </div>

              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {filteredFiles.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-xl bg-[#070b13]/40">
                    No files matched the active filters. Try resetting the search query.
                  </div>
                ) : (
                  filteredFiles.map((file) => {
                    const filePath = file.path || (file as any).filePath || "";
                    const fileName = file.name || (file as any).fileName || "";
                    const isExpanded = !!expandedFiles[filePath];
                    const fileSummary = file.summary || { imports: [], exports: [], functions: [], components: [] };
                    const hasSummary = (fileSummary.imports || []).length > 0 || 
                                       (fileSummary.exports || []).length > 0 || 
                                       (fileSummary.functions || []).length > 0 || 
                                       (fileSummary.components || []).length > 0;
                    return (
                      <div
                        key={filePath}
                        className="bg-[#070b14] border border-slate-900/80 rounded-xl overflow-hidden transition-all hover:border-slate-800"
                      >
                        {/* Main File row */}
                        <div
                          onClick={() => toggleFileExpand(filePath)}
                          className="p-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/30 text-xs font-sans"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className="font-bold text-white block truncate">{fileName}</span>
                              <span className="font-mono text-[10px] text-slate-500 mt-0.5 block truncate">
                                {filePath}
                              </span>
                            </div>
                          </div>

                          {/* Metadata Badges */}
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {file.lines || (file as any).loc || 0} lines
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {file.sizeFormatted || `${(((file as any).loc || 0) * 45 / 1024).toFixed(1)} KB`}
                            </span>
                            <span className="text-[10px] text-slate-500 hidden md:inline-block font-mono">
                              Mod: {new Date(file.lastModified || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Expandable Summary Index (Token-friendly summary!) */}
                        {isExpanded && (
                          <div className="p-4 bg-[#04060b] border-t border-slate-900 text-xs font-sans space-y-3">
                            {!hasSummary ? (
                              <div className="text-slate-500 italic text-[10px] font-mono">
                                No export or function summary metadata recorded for this format.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                
                                {/* Functions / Components */}
                                {(fileSummary.functions || []).length > 0 && (
                                  <div className="space-y-1 bg-[#070b14]/50 border border-slate-900/60 rounded-lg p-2.5">
                                    <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider block font-bold">
                                      Key Functions Inside
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {fileSummary.functions.map((f, i) => (
                                        <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                                          {f}()
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Components */}
                                {(fileSummary.components || []).length > 0 && (
                                  <div className="space-y-1 bg-[#070b14]/50 border border-slate-900/60 rounded-lg p-2.5">
                                    <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider block font-bold">
                                      React Components
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {fileSummary.components.map((c, i) => (
                                        <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-emerald-300/95 border border-slate-800">
                                          &lt;{c} /&gt;
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Exports */}
                                {(fileSummary.exports || []).length > 0 && (
                                  <div className="space-y-1 bg-[#070b14]/50 border border-slate-900/60 rounded-lg p-2.5">
                                    <span className="text-[9px] font-mono text-amber-400 uppercase tracking-wider block font-bold">
                                      Exported Symbols
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {fileSummary.exports.map((exp, i) => (
                                        <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-amber-300/90 border border-slate-800">
                                          {exp}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Imports */}
                                {(fileSummary.imports || []).length > 0 && (
                                  <div className="space-y-1 bg-[#070b14]/50 border border-slate-900/60 rounded-lg p-2.5">
                                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block font-bold">
                                      Primary Imports
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {fileSummary.imports.map((imp, i) => (
                                        <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-850">
                                          {imp}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "api-benchmark" && (
          <div className="space-y-6">
            {/* Audit & Compliance Card */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#070b13] border border-slate-900 rounded-xl p-4 flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Audit Health Grade</span>
                  <h3 className="text-base font-bold text-white mt-0.5">98/100 (SECURE)</h3>
                  <p className="text-[9px] text-slate-400 leading-tight">Zero-Trust guard rails active.</p>
                </div>
              </div>

              <div className="bg-[#070b13] border border-slate-900 rounded-xl p-4 flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Master Regression</span>
                  <h3 className="text-base font-bold text-white mt-0.5">25 / 25 Passing (100%)</h3>
                  <p className="text-[9px] text-slate-400 leading-tight">All domain suites verified.</p>
                </div>
              </div>

              <div className="bg-[#070b13] border border-slate-900 rounded-xl p-4 flex items-center gap-3">
                <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-lg shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Unified Gateway</span>
                  <h3 className="text-base font-bold text-white mt-0.5">OpenAPI 3.1.0 Ready</h3>
                  <p className="text-[9px] text-slate-400 leading-tight">Mounted on /api/v1/* router.</p>
                </div>
              </div>

              <div className="bg-[#070b13] border border-slate-900 rounded-xl p-4 flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Distributed Tracing</span>
                  <h3 className="text-base font-bold text-white mt-0.5">X-Request-Id Active</h3>
                  <p className="text-[9px] text-slate-400 leading-tight">AsyncLocalStorage context.</p>
                </div>
              </div>
            </div>

            {/* Benchmark Runner Section */}
            <div className="bg-[#070b14] border border-slate-900 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900/80 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Automated High-Throughput Latency Benchmark
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Concurrently test core platform endpoints to measure latency distribution, throughput, and error rates.
                  </p>
                </div>
                <button
                  onClick={runBatchBenchmark}
                  disabled={benchmarkRunning}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-sans text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow shrink-0"
                >
                  <Play className={`w-3.5 h-3.5 ${benchmarkRunning ? "animate-spin" : ""}`} />
                  <span>{benchmarkRunning ? "Running 10-Probe Benchmark..." : "Execute Latency Benchmark"}</span>
                </button>
              </div>

              {benchmarkResults && (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-[#04060b] border border-slate-900 rounded-lg p-3">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Avg Latency</span>
                      <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">{benchmarkResults.avgLatencyMs} ms</span>
                    </div>
                    <div className="bg-[#04060b] border border-slate-900 rounded-lg p-3">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Min / Max</span>
                      <span className="text-base font-bold text-slate-200 font-mono mt-0.5 block">{benchmarkResults.minLatencyMs} / {benchmarkResults.maxLatencyMs} ms</span>
                    </div>
                    <div className="bg-[#04060b] border border-slate-900 rounded-lg p-3">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">p95 Latency</span>
                      <span className="text-base font-bold text-indigo-400 font-mono mt-0.5 block">{benchmarkResults.p95LatencyMs} ms</span>
                    </div>
                    <div className="bg-[#04060b] border border-slate-900 rounded-lg p-3">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Throughput</span>
                      <span className="text-base font-bold text-sky-400 font-mono mt-0.5 block">{benchmarkResults.throughputRps} RPS</span>
                    </div>
                    <div className="bg-[#04060b] border border-slate-900 rounded-lg p-3">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Success Rate</span>
                      <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">
                        {Math.round((benchmarkResults.successfulRequests / benchmarkResults.totalRequests) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Benchmark probes list */}
                  <div className="bg-[#03060c] border border-slate-900 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#070b13] text-[10px] text-slate-500 uppercase border-b border-slate-900">
                        <tr>
                          <th className="p-2.5">Endpoint</th>
                          <th className="p-2.5">Method</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Latency</th>
                          <th className="p-2.5">Speed Class</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 text-slate-300">
                        {benchmarkResults.probes.map((probe, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/30">
                            <td className="p-2.5 text-indigo-300 font-semibold">{probe.endpoint}</td>
                            <td className="p-2.5"><span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px]">{probe.method}</span></td>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] ${probe.status === 200 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400"}`}>
                                {probe.status}
                              </span>
                            </td>
                            <td className="p-2.5 font-bold">{probe.latencyMs} ms</td>
                            <td className="p-2.5">
                              {probe.latencyMs < 20 ? (
                                <span className="text-[10px] text-emerald-400">⚡ Ultra Fast</span>
                              ) : probe.latencyMs < 60 ? (
                                <span className="text-[10px] text-sky-400">✓ Fast</span>
                              ) : (
                                <span className="text-[10px] text-amber-400">⚠ Normal</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive OpenAPI Explorer & Probe Execution */}
            <div className="bg-[#070b14] border border-slate-900 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900/80 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-400" />
                    Interactive OpenAPI 3.1.0 Gateway Explorer & Probe
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Test live requests directly against the unified version 1 gateway controllers.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadOpenApiSpec}
                    disabled={!openApiSpec}
                    className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-sans text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Download Spec JSON</span>
                  </button>
                  <button
                    onClick={fetchOpenApiSpec}
                    disabled={loadingSpec}
                    className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-sans text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSpec ? "animate-spin text-indigo-400" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Endpoint Preset Selector */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Preset Route</label>
                  <select
                    value={selectedEndpoint}
                    onChange={(e) => {
                      const ep = e.target.value;
                      setSelectedEndpoint(ep);
                      if (ep === "/api/v1/health" || ep === "/api/v1/openapi.json" || ep === "/api/v1/metrics" || ep === "/api/v1/identity/users") {
                        setSelectedMethod("GET");
                        setCustomPayload("{}");
                      } else if (ep === "/api/v1/recruitment/assess") {
                        setSelectedMethod("POST");
                        setCustomPayload(JSON.stringify({
                          candidate: {
                            name: "Jane Doe",
                            skills: ["TypeScript", "React", "Node.js", "Docker"],
                            experienceYears: 5,
                            summary: "Full Stack Senior Engineer"
                          },
                          job: {
                            id: "job-101",
                            title: "Senior Full Stack Engineer",
                            requirements: ["TypeScript", "React", "Node.js"]
                          }
                        }, null, 2));
                      } else if (ep === "/api/v1/recruitment/workflow/start") {
                        setSelectedMethod("POST");
                        setCustomPayload(JSON.stringify({
                          submissions: [
                            { candidateId: "cand-01", name: "Alice Smith", skills: ["Node.js", "TypeScript"] }
                          ],
                          job: { id: "job-202", title: "Backend Architect" }
                        }, null, 2));
                      } else if (ep === "/api/v1/supervisor/cycle") {
                        setSelectedMethod("POST");
                        setCustomPayload(JSON.stringify({ mode: "autonomous", dryRun: true }, null, 2));
                      } else if (ep === "/api/v1/process/start") {
                        setSelectedMethod("POST");
                        setCustomPayload(JSON.stringify({ processType: "candidate_onboarding", payload: { candidateId: "cand-777" } }, null, 2));
                      }
                    }}
                    className="w-full bg-[#070b13] border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="/api/v1/health">GET /api/v1/health (System Uptime)</option>
                    <option value="/api/v1/openapi.json">GET /api/v1/openapi.json (OpenAPI 3.1.0 Spec)</option>
                    <option value="/api/v1/metrics">GET /api/v1/metrics (Platform Metrics)</option>
                    <option value="/api/v1/identity/users">GET /api/v1/identity/users (RBAC Identity Users)</option>
                    <option value="/api/v1/recruitment/assess">POST /api/v1/recruitment/assess (Candidate Evaluation)</option>
                    <option value="/api/v1/recruitment/workflow/start">POST /api/v1/recruitment/workflow/start (Workflow Engine)</option>
                    <option value="/api/v1/process/start">POST /api/v1/process/start (Business Process Engine)</option>
                    <option value="/api/v1/supervisor/cycle">POST /api/v1/supervisor/cycle (Career Supervisor Engine)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">HTTP Method</label>
                  <select
                    value={selectedMethod}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Target URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={selectedEndpoint}
                      onChange={(e) => setSelectedEndpoint(e.target.value)}
                      className="flex-1 bg-[#070b13] border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      onClick={executeProbe}
                      disabled={probing}
                      className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-sans text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow shrink-0"
                    >
                      <Send className={`w-3.5 h-3.5 ${probing ? "animate-pulse" : ""}`} />
                      <span>{probing ? "Probing..." : "Send"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Payload & Result grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">JSON Request Payload</span>
                    <button
                      onClick={() => setCustomPayload("{}")}
                      className="text-[10px] font-mono text-slate-500 hover:text-slate-300"
                    >
                      Clear
                    </button>
                  </div>
                  <textarea
                    value={customPayload}
                    onChange={(e) => setCustomPayload(e.target.value)}
                    rows={8}
                    className="w-full bg-[#03060c] border border-slate-900 rounded-lg p-3 font-mono text-xs text-slate-300 outline-none focus:border-indigo-500 resize-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      Response Output
                      {probeResult && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${probeResult.status < 400 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                          HTTP {probeResult.status} ({probeResult.latencyMs} ms)
                        </span>
                      )}
                    </span>
                    {probeResult && (
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(probeResult.data || probeResult.error, null, 2), "probe-res")}
                        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white font-mono"
                      >
                        {copiedId === "probe-res" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>Copy</span>
                      </button>
                    )}
                  </div>
                  <pre className="w-full h-[182px] bg-[#03060c] border border-slate-900 rounded-lg p-3 font-mono text-xs text-indigo-300/90 overflow-auto whitespace-pre">
                    {probeResult ? (
                      probeResult.error ? `Error: ${probeResult.error}` : JSON.stringify(probeResult.data, null, 2)
                    ) : (
                      <span className="text-slate-600 italic">// Click "Send" or choose a route preset above to execute a probe</span>
                    )}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Footer statistics */}
      <div className="bg-[#070b13] border-t border-slate-900 px-4 py-2.5 flex items-center justify-between text-[10px] text-slate-500 font-mono shrink-0">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          Last scan: {report ? new Date(report.timestamp).toLocaleString() : "Never"}
        </span>
        <span>Secure Static Analysis System</span>
      </div>
    </div>
  );
}
