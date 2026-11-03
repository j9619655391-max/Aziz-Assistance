import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  RefreshCw,
  Layers,
  CheckCircle,
  AlertTriangle,
  Play,
  Activity,
  Shield,
  Clock,
  Eye,
  AlertCircle,
  FileCode,
  List,
  Compass,
  DollarSign,
  Cpu,
  Database,
  BarChart2,
  Lock,
  MessageSquare,
  ArrowRight,
  ShieldAlert,
  Terminal
} from "lucide-react";
import { StudioService, StudioTask, StudioTaskStep, StudioTool, StudioAgent } from "../services/StudioService";

export default function StudioPanel() {
  // Navigation tabs inside Studio
  const [activeTab, setActiveTab] = useState<"planner" | "context" | "verification" | "reflection" | "execute" | "telemetry" | "tools">("execute");

  // Core list states
  const [agents, setAgents] = useState<StudioAgent[]>([]);
  const [tools, setTools] = useState<StudioTool[]>([]);
  const [tasks, setTasks] = useState<StudioTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [activeTask, setActiveTask] = useState<StudioTask | null>(null);

  // Form input states
  const [goal, setGoal] = useState("Perform math validation of 15 + 27 and calculate token metrics");
  const [selectedAgent, setSelectedAgent] = useState("math_agent");
  const [planGoal, setPlanGoal] = useState("Formulate SRE secure deployment configuration guidelines");
  const [planFiles, setPlanFiles] = useState("package.json, server.ts");
  
  const [contextQuery, setContextQuery] = useState("security policy check");
  const [contextFiles, setContextFiles] = useState("package.json, src/kernel/types.ts");
  
  const [verifyTaskId, setVerifyTaskId] = useState("");
  const [verifyFiles, setVerifyFiles] = useState("package.json, server.ts");

  const [reflectTaskId, setReflectTaskId] = useState("");
  const [reflectGoal, setReflectGoal] = useState("");
  const [reflectResult, setReflectResult] = useState("");

  // Loading and result states
  const [isPlanning, setIsPlanning] = useState(false);
  const [planResult, setPlanResult] = useState<any>(null);
  
  const [isCompilingContext, setIsCompilingContext] = useState(false);
  const [contextResult, setContextResult] = useState<any>(null);
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const [isReflecting, setIsReflecting] = useState(false);
  const [reflectionResult, setReflectionResult] = useState<any>(null);

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionTaskId, setExecutionTaskId] = useState<string>("");

  // Telemetry states
  const [telemetry, setTelemetry] = useState<any>(null);
  const [isTelemetryLoading, setIsTelemetryLoading] = useState(false);

  // Errors / diagnostic banner
  const [errorDiagnostic, setErrorDiagnostic] = useState<string | null>(null);

  // Polling ref for dynamic execution updates
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initial load
  useEffect(() => {
    fetchAgents();
    fetchTools();
    fetchTasks();
    fetchTelemetry();
  }, []);

  // Poll active task if it is running
  useEffect(() => {
    if (executionTaskId) {
      // Start polling
      pollIntervalRef.current = setInterval(async () => {
        try {
          const taskData = await StudioService.getTask(executionTaskId);
          setActiveTask(taskData);
          
          if (taskData.activeStatus === "completed" || taskData.activeStatus === "failed") {
            setIsExecuting(false);
            setExecutionTaskId("");
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }
            // Refresh telemetry & task history
            fetchTelemetry();
            fetchTasks();
          }
        } catch (err) {
          console.error("Error polling task:", err);
        }
      }, 1000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [executionTaskId]);

  const fetchAgents = async () => {
    try {
      const data = await StudioService.listAgents();
      setAgents(data.agents);
      if (data.agents.length > 0) {
        setSelectedAgent(data.agents[0].id);
      }
    } catch (err: any) {
      setErrorDiagnostic(`Agent retrieval failed: ${err.message}`);
    }
  };

  const fetchTools = async () => {
    try {
      const data = await StudioService.listTools();
      setTools(data.tools);
    } catch (err: any) {
      setErrorDiagnostic(`Tool retrieval failed: ${err.message}`);
    }
  };

  const fetchTasks = async () => {
    try {
      const data = await StudioService.listTasks();
      setTasks(data.tasks);
    } catch (err: any) {
      setErrorDiagnostic(`Task list retrieval failed: ${err.message}`);
    }
  };

  const fetchTelemetry = async () => {
    setIsTelemetryLoading(true);
    try {
      const data = await StudioService.getTelemetry();
      setTelemetry(data);
    } catch (err: any) {
      console.error("Telemetry failed:", err);
    } finally {
      setIsTelemetryLoading(false);
    }
  };

  // 1. Planner Trigger
  const handleFormulatePlan = async () => {
    setIsPlanning(true);
    setErrorDiagnostic(null);
    setPlanResult(null);
    try {
      const filesArray = planFiles.split(",").map(f => f.trim()).filter(Boolean);
      const res = await StudioService.buildPlan(planGoal, filesArray);
      setPlanResult(res);
      fetchTasks(); // update task list
    } catch (err: any) {
      setErrorDiagnostic(`Planner Exception: Circular path or missing capability: ${err.message}`);
    } finally {
      setIsPlanning(false);
    }
  };

  // 2. Context Builder Trigger
  const handleCompileContext = async () => {
    setIsCompilingContext(true);
    setErrorDiagnostic(null);
    setContextResult(null);
    try {
      const filesArray = contextFiles.split(",").map(f => f.trim()).filter(Boolean);
      const res = await StudioService.compileContext(contextQuery, filesArray);
      setContextResult(res);
    } catch (err: any) {
      setErrorDiagnostic(`Context Builder Exception: ${err.message}`);
    } finally {
      setIsCompilingContext(false);
    }
  };

  // 3. Verification Trigger
  const handleVerify = async () => {
    setIsVerifying(true);
    setErrorDiagnostic(null);
    setVerificationResult(null);
    try {
      const filesArray = verifyFiles.split(",").map(f => f.trim()).filter(Boolean);
      const res = await StudioService.runVerification(verifyTaskId || "verify_run", filesArray);
      setVerificationResult(res);
    } catch (err: any) {
      setErrorDiagnostic(`Verification Engine Exception: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // 4. Reflection Trigger
  const handleReflect = async () => {
    setIsReflecting(true);
    setErrorDiagnostic(null);
    setReflectionResult(null);
    try {
      const res = await StudioService.runReflection(reflectTaskId || "reflect_run", reflectGoal, reflectResult);
      setReflectionResult(res);
    } catch (err: any) {
      setErrorDiagnostic(`Reflection Engine Exception: ${err.message}`);
    } finally {
      setIsReflecting(false);
    }
  };

  // 5. Execute E2E simulator
  const handleStartExecution = async () => {
    if (!goal.trim()) {
      setErrorDiagnostic("Goal text cannot be empty");
      return;
    }
    setIsExecuting(true);
    setErrorDiagnostic(null);
    setActiveTask(null);
    try {
      const res = await StudioService.executeTask(goal, selectedAgent);
      setExecutionTaskId(res.taskId);
      const taskData = await StudioService.getTask(res.taskId);
      setActiveTask(taskData);
    } catch (err: any) {
      setErrorDiagnostic(`Runtime Instantiation Exception: ${err.message}`);
      setIsExecuting(false);
    }
  };

  const handleSelectTask = async (id: string) => {
    setSelectedTaskId(id);
    try {
      const taskData = await StudioService.getTask(id);
      setActiveTask(taskData);
    } catch (err: any) {
      setErrorDiagnostic(`Task retrieve failed: ${err.message}`);
    }
  };

  return (
    <div className="bg-[#0a0f1d] border border-[#1e293b] rounded-lg shadow-2xl flex flex-col h-full overflow-hidden" id="aziz-kernel-studio-panel">
      
      {/* Panel Top Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-slate-900 bg-[#0d1425]/50 shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/15 rounded-xl text-emerald-400 border border-emerald-500/20">
            <Layers className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              Aziz Kernel Studio v1.0
              <span className="text-[9px] px-2 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
                Kernel Contract Frozen
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              React UI connected directly to policy-driven, type-safe Aziz Kernel services through the Studio Service Layer.
            </p>
          </div>
        </div>

        {/* View Selection Bar */}
        <div className="flex flex-wrap bg-[#070b13] p-1 rounded-lg border border-slate-900 text-[11px] font-mono gap-1">
          <button
            onClick={() => setActiveTab("execute")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "execute"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/15"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Task Executor</span>
          </button>
          
          <button
            onClick={() => setActiveTab("planner")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "planner"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/15"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Planner</span>
          </button>

          <button
            onClick={() => setActiveTab("context")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "context"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/15"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Context Compiler</span>
          </button>

          <button
            onClick={() => setActiveTab("verification")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "verification"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/15"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Verifier</span>
          </button>

          <button
            onClick={() => setActiveTab("reflection")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "reflection"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/15"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Reflection</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("telemetry");
              fetchTelemetry();
            }}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "telemetry"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/15"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab("tools")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "tools"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/15"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Capabilites</span>
          </button>
        </div>
      </div>

      {/* Structured Diagnostics & circular warnings */}
      {errorDiagnostic && (
        <div className="m-5 p-3.5 bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-lg flex items-start gap-2.5 shadow-md">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-500 animate-bounce" />
          <div className="space-y-1">
            <span className="font-mono font-bold uppercase tracking-wider text-[10px]">Aziz Kernel Exception Diagnostics:</span>
            <p className="font-sans text-[11px] leading-relaxed">{errorDiagnostic}</p>
          </div>
        </div>
      )}

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* TAB 1: TASK EXECUTOR SIMULATOR */}
        {activeTab === "execute" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Input Form Column */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#070b13] border border-slate-900 rounded-xl p-4.5 space-y-4">
                <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Configure Task Workspace</span>
                
                {/* Agent Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium font-sans">Select Autonomous Agent Profile</label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="w-full bg-[#0d1425] border border-[#1e293b] text-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-emerald-500 cursor-pointer font-sans"
                  >
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.capabilityTags.join(", ")})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Plaintext Goal */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium font-sans">Plain-Text Goal (CE-A Boundary)</label>
                  <textarea
                    rows={4}
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Enter task objective here..."
                    className="w-full bg-[#0d1425] border border-[#1e293b] text-slate-200 rounded-lg p-3 text-xs outline-none focus:border-emerald-500 placeholder-slate-600 font-sans leading-relaxed"
                  />
                </div>

                {/* Execute Button */}
                <button
                  onClick={handleStartExecution}
                  disabled={isExecuting}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-sans text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Running Agent Pipeline...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Instantiate E2E Kernel Pipeline</span>
                    </>
                  )}
                </button>
              </div>

              {/* Task Runs Directory */}
              <div className="bg-[#070b13] border border-slate-900 rounded-xl p-4.5 space-y-3">
                <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Workspace Task Directory ({tasks.length})</span>
                {tasks.length === 0 ? (
                  <p className="text-xs text-slate-500 italic font-sans py-2">No historical tasks logged in memory</p>
                ) : (
                  <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 font-sans">
                    {tasks.map((tsk) => (
                      <div
                        key={tsk.taskId}
                        onClick={() => handleSelectTask(tsk.taskId)}
                        className={`p-2.5 border rounded-lg text-xs cursor-pointer transition-colors ${
                          activeTask && activeTask.taskId === tsk.taskId
                            ? "bg-emerald-500/5 border-emerald-500/20"
                            : "bg-[#0b1021] border-slate-900 hover:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono text-[9px] text-slate-500 truncate max-w-[120px]">{tsk.taskId}</span>
                          <span className={`text-[8px] font-mono px-1 rounded uppercase shrink-0 font-bold ${
                            tsk.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : tsk.status === "failed"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          }`}>
                            {tsk.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 truncate font-sans">{tsk.goal}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Step Progression & Event Monitor */}
            <div className="lg:col-span-7 space-y-4">
              {activeTask ? (
                <div className="bg-[#070b13] border border-slate-900 rounded-xl p-5 space-y-5">
                  
                  {/* Task Headings */}
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-900 pb-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider block font-bold">Active Task Execution Frame</span>
                      <h3 className="text-sm font-bold text-white font-sans leading-normal">{activeTask.goal}</h3>
                      <div className="flex items-center gap-3 pt-1 text-[10px] font-mono text-slate-500">
                        <span>Task ID: <span className="text-slate-300">{activeTask.taskId}</span></span>
                        <span>•</span>
                        <span>Created: <span className="text-slate-300">{new Date(activeTask.createdAt).toLocaleTimeString()}</span></span>
                      </div>
                    </div>
                    
                    {/* Status Meter */}
                    <div className="text-right space-y-1">
                      <span className="text-[8px] font-mono text-slate-500 uppercase block">State Machine Posture</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                          activeTask.activeStatus === "completed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : activeTask.activeStatus === "failed"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse"
                        }`}>
                          {activeTask.activeStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Strip */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-[#0b1021] border border-slate-950 p-2.5 rounded-lg">
                      <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Total Tokens</span>
                      <p className="text-xs font-mono font-bold text-white mt-0.5">{activeTask.telemetry.tokensUsed || 0}</p>
                    </div>
                    <div className="bg-[#0b1021] border border-slate-950 p-2.5 rounded-lg">
                      <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Estimated Cost</span>
                      <p className="text-xs font-mono font-bold text-emerald-400 mt-0.5">${(activeTask.telemetry.costInUSD || 0).toFixed(5)}</p>
                    </div>
                    <div className="bg-[#0b1021] border border-slate-950 p-2.5 rounded-lg">
                      <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Runtime Latency</span>
                      <p className="text-xs font-mono font-bold text-white mt-0.5">{(activeTask.telemetry.durationMs || 0)} ms</p>
                    </div>
                    <div className="bg-[#0b1021] border border-slate-950 p-2.5 rounded-lg">
                      <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Tool Usage</span>
                      <p className="text-xs font-mono font-bold text-white mt-0.5">
                        {Object.keys(activeTask.telemetry.toolInvocations || {}).length} Invocations
                      </p>
                    </div>
                  </div>

                  {/* Step Progression (DAG list) */}
                  <div className="space-y-3 font-sans">
                    <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Ordered Task Steps ({activeTask.steps.length})</span>
                    <div className="space-y-2.5">
                      {activeTask.steps.map((st, idx) => (
                        <div key={st.stepId} className="p-3 bg-[#0c1223] border border-slate-900 rounded-xl space-y-2 font-sans text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-950/40 w-5 h-5 rounded-full flex items-center justify-center border border-indigo-900/40 shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-slate-200 truncate">{st.name}</span>
                            </div>
                            <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                              st.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : st.status === "failed"
                                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                  : st.status === "running"
                                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse"
                                    : "bg-slate-900 text-slate-500"
                            }`}>
                              {st.status}
                            </span>
                          </div>

                          {/* Incremental Logs inside Steps */}
                          {st.logs && st.logs.length > 0 && (
                            <div className="bg-[#04060b] border border-slate-950 rounded-lg p-2.5 font-mono text-[10.5px] text-slate-400 space-y-1 max-h-[110px] overflow-y-auto leading-relaxed">
                              {st.logs.map((logLine, lIdx) => (
                                <div key={lIdx} className="flex gap-2">
                                  <span className="text-emerald-500 shrink-0">&gt;</span>
                                  <span>{logLine}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 bg-[#070b13]/20 rounded-2xl text-center space-y-3 h-full">
                  <Play className="w-10 h-10 text-slate-600 animate-pulse" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-300">Simulator Idle</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Configure your goal constraints and select an agent to spin up a live, policy-driven task execution sequence.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: INTERACTIVE PLANNER */}
        {activeTab === "planner" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Form Input */}
              <div className="md:col-span-5 bg-[#070b13] border border-slate-900 rounded-xl p-4.5 space-y-4 h-fit font-sans">
                <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Formulate Task Plan</span>
                
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Plain-text Goal</label>
                  <textarea
                    rows={4}
                    value={planGoal}
                    onChange={(e) => setPlanGoal(e.target.value)}
                    className="w-full bg-[#0d1425] border border-[#1e293b] text-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-emerald-500 leading-normal"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Impacted Files (comma-separated)</label>
                  <input
                    type="text"
                    value={planFiles}
                    onChange={(e) => setPlanFiles(e.target.value)}
                    className="w-full bg-[#0d1425] border border-[#1e293b] text-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={handleFormulatePlan}
                  disabled={isPlanning}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  {isPlanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Compass className="w-3.5 h-3.5" />}
                  <span>Formulate Plan Structure</span>
                </button>
              </div>

              {/* Steps Outcome */}
              <div className="md:col-span-7 space-y-4">
                {planResult ? (
                  <div className="bg-[#070b13] border border-slate-900 rounded-xl p-5 space-y-4 font-sans">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white">Generated Plan Profile</h4>
                        <div className="flex items-center gap-2.5 pt-1 text-[10px] font-mono text-slate-500">
                          <span>Task Ref: <span className="text-slate-300">{planResult.taskId}</span></span>
                          <span>Planner v: <span className="text-slate-300">{planResult.planner_version}</span></span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                        PLAN_COMPILED_OK
                      </span>
                    </div>

                    <div className="space-y-2">
                      {planResult.steps.map((st: any, idx: number) => (
                        <div key={st.stepId} className="p-3 bg-[#0c1223] border border-slate-900 rounded-xl flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-950/40 w-5 h-5 rounded-full flex items-center justify-center border border-emerald-900/40 shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-slate-200">{st.name}</span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-500 uppercase">{st.stepId}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 bg-[#070b13]/20 rounded-2xl text-center space-y-3 h-full">
                    <Compass className="w-10 h-10 text-slate-600 animate-pulse" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-300">Planner Screen Empty</h4>
                      <p className="text-xs text-slate-500 max-w-sm mt-1">
                        Trigger the pure task planner to formulate structural steps for your goal constraint.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: CONTEXT COMPILER */}
        {activeTab === "context" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Form Input */}
              <div className="md:col-span-5 bg-[#070b13] border border-slate-900 rounded-xl p-4.5 space-y-4 h-fit font-sans">
                <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Compile Workspace Context</span>
                
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Keywords Query</label>
                  <input
                    type="text"
                    value={contextQuery}
                    onChange={(e) => setContextQuery(e.target.value)}
                    className="w-full bg-[#0d1425] border border-[#1e293b] text-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Priority Files (comma-separated)</label>
                  <input
                    type="text"
                    value={contextFiles}
                    onChange={(e) => setContextFiles(e.target.value)}
                    className="w-full bg-[#0d1425] border border-[#1e293b] text-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={handleCompileContext}
                  disabled={isCompilingContext}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  {isCompilingContext ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                  <span>Compile Context Package</span>
                </button>
              </div>

              {/* Context metrics result */}
              <div className="md:col-span-7 space-y-4">
                {contextResult ? (
                  <div className="bg-[#070b13] border border-slate-900 rounded-xl p-5 space-y-5 font-sans">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white">Pruned context Package</h4>
                        <span className="text-[10px] font-mono text-slate-500 pt-0.5 block">Policy Version: {contextResult.context_policy_version}</span>
                      </div>
                      <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                        COMPRESSED_OK
                      </span>
                    </div>

                    {/* Compression Metrics dashboard */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                      <div className="bg-[#0b1021] border border-slate-900 p-3 rounded-lg text-center">
                        <span className="text-[8px] text-slate-500 block">Raw Bytes Saved</span>
                        <p className="font-bold text-white mt-1 text-sm">
                          {(contextResult.metrics.totalBytesBefore / 1024).toFixed(1)}K &rarr; {(contextResult.metrics.totalBytesAfter / 1024).toFixed(1)}K
                        </p>
                        <span className="text-[9px] text-emerald-400 font-semibold block mt-0.5">-{contextResult.metrics.compressionRatio}%</span>
                      </div>
                      <div className="bg-[#0b1021] border border-slate-900 p-3 rounded-lg text-center">
                        <span className="text-[8px] text-slate-500 block">Estimated Tokens Saved</span>
                        <p className="font-bold text-white mt-1 text-sm">
                          {contextResult.metrics.estimatedTokensBefore} &rarr; {contextResult.metrics.estimatedTokensAfter}
                        </p>
                        <span className="text-[9px] text-emerald-400 font-semibold block mt-0.5">-{contextResult.metrics.tokenReductionRatio}%</span>
                      </div>
                      <div className="bg-[#0b1021] border border-slate-900 p-3 rounded-lg text-center">
                        <span className="text-[8px] text-slate-500 block">Budget Enforced</span>
                        <p className="font-bold text-white mt-1 text-sm">
                          {contextResult.budgetEnforced ? "TRUE" : "FALSE"}
                        </p>
                        <span className="text-[9px] text-slate-500 block mt-0.5">Limit: 8,000 tokens</span>
                      </div>
                    </div>

                    {/* Files included */}
                    <div className="space-y-2">
                      <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Compiled candidate Files ({contextResult.files.length})</span>
                      <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                        {contextResult.files.map((file: string, idx: number) => (
                          <div key={idx} className="p-2 bg-[#0c1121] border border-slate-950 rounded-lg flex items-center gap-2 text-slate-300">
                            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{file}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Truncated files warning */}
                    {contextResult.truncatedFiles && contextResult.truncatedFiles.length > 0 && (
                      <div className="p-3 bg-amber-500/5 border border-amber-500/10 text-amber-400 text-xs rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block uppercase text-[10px] tracking-wider">Files Truncated Due to budget limit:</span>
                          <span className="text-[11px] font-mono block mt-0.5">{contextResult.truncatedFiles.join(", ")}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 bg-[#070b13]/20 rounded-2xl text-center space-y-3 h-full">
                    <Database className="w-10 h-10 text-slate-600 animate-pulse" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-300">Context Compiler Screen Empty</h4>
                      <p className="text-xs text-slate-500 max-w-sm mt-1">
                        Trigger the context builder to compile a token-budget isolated workspace compilation representation.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: VERIFIER REPORTS */}
        {activeTab === "verification" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Form Input */}
              <div className="md:col-span-5 bg-[#070b13] border border-slate-900 rounded-xl p-4.5 space-y-4 h-fit font-sans">
                <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Run Rules Verification</span>
                
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Task Identifier (optional)</label>
                  <input
                    type="text"
                    value={verifyTaskId}
                    onChange={(e) => setVerifyTaskId(e.target.value)}
                    placeholder="E.g., task_verification_run"
                    className="w-full bg-[#0d1425] border border-[#1e293b] text-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">File Paths to Audit (comma-separated)</label>
                  <input
                    type="text"
                    value={verifyFiles}
                    onChange={(e) => setVerifyFiles(e.target.value)}
                    className="w-full bg-[#0d1425] border border-[#1e293b] text-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                  <span>Run Verification Audit</span>
                </button>
              </div>

              {/* Verification scorecard */}
              <div className="md:col-span-7 space-y-4">
                {verificationResult ? (
                  <div className="bg-[#070b13] border border-slate-900 rounded-xl p-5 space-y-4 font-sans">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white">Rule scorecard Report</h4>
                        <span className="text-[10px] font-mono text-slate-500 pt-0.5 block">Policy Version: {verificationResult.verification_policy_version}</span>
                      </div>
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                        verificationResult.success 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {verificationResult.success ? "VERIFICATION_PASSED" : "VERIFICATION_FAILED"}
                      </span>
                    </div>

                    {/* Metric widgets */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono text-xs">
                      <div className="bg-[#0b1021] border border-slate-900 p-2.5 rounded-lg">
                        <span className="text-[8px] text-slate-500 block uppercase">Quality Score</span>
                        <p className={`font-bold mt-1 text-sm ${verificationResult.score >= 90 ? "text-emerald-400" : "text-amber-400"}`}>
                          {verificationResult.score}/100
                        </p>
                      </div>
                      <div className="bg-[#0b1021] border border-slate-900 p-2.5 rounded-lg">
                        <span className="text-[8px] text-slate-500 block uppercase">Rules Executed</span>
                        <p className="font-bold text-white mt-1 text-sm">
                          {verificationResult.telemetry.passedRules}/{verificationResult.telemetry.totalRules} Passed
                        </p>
                      </div>
                      <div className="bg-[#0b1021] border border-slate-900 p-2.5 rounded-lg">
                        <span className="text-[8px] text-slate-500 block uppercase">Errors Count</span>
                        <p className="font-bold text-white mt-1 text-sm">{verificationResult.telemetry.errorsCount}</p>
                      </div>
                      <div className="bg-[#0b1021] border border-slate-900 p-2.5 rounded-lg">
                        <span className="text-[8px] text-slate-500 block uppercase">Latency</span>
                        <p className="font-bold text-white mt-1 text-sm">{verificationResult.telemetry.latencyMs} ms</p>
                      </div>
                    </div>

                    {/* Rules list */}
                    <div className="space-y-2.5">
                      <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Executed Policy Checks</span>
                      {verificationResult.logs.map((log: string, idx: number) => {
                        const isFail = (log || "").includes("[FAIL]");
                        const isWarn = (log || "").includes("[WARN]");
                        return (
                          <div key={idx} className={`p-2.5 bg-[#0c1223] border rounded-lg text-xs flex items-center justify-between gap-3 ${
                            isFail 
                              ? "border-red-500/10 text-red-300" 
                              : isWarn 
                                ? "border-amber-500/10 text-amber-300" 
                                : "border-slate-950 text-slate-300"
                          }`}>
                            <div className="flex items-center gap-2">
                              {isFail ? (
                                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              ) : isWarn ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              )}
                              <span className="font-mono text-[10.5px]">{log}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 bg-[#070b13]/20 rounded-2xl text-center space-y-3 h-full">
                    <Shield className="w-10 h-10 text-slate-600 animate-pulse" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-300">Verifier Screen Empty</h4>
                      <p className="text-xs text-slate-500 max-w-sm mt-1">
                        Run a secure code scan to audit syntax and security posture.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB 5: REFLECTION REPORTS */}
        {activeTab === "reflection" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Form Input */}
              <div className="md:col-span-5 bg-[#070b13] border border-slate-900 rounded-xl p-4.5 space-y-4 h-fit font-sans">
                <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Compute Outcome Reflection</span>
                
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Task ID (optional)</label>
                  <input
                    type="text"
                    value={reflectTaskId}
                    onChange={(e) => setReflectTaskId(e.target.value)}
                    placeholder="E.g., task_12345"
                    className="w-full bg-[#0d1425] border border-[#1e293b] text-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Original Goal</label>
                  <input
                    type="text"
                    value={reflectGoal}
                    onChange={(e) => setReflectGoal(e.target.value)}
                    placeholder="E.g., build calculator math tool with Low risk"
                    className="w-full bg-[#0d1425] border border-[#1e293b] text-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Actual Execution Result Output</label>
                  <textarea
                    rows={4}
                    value={reflectResult}
                    onChange={(e) => setReflectResult(e.target.value)}
                    placeholder="E.g., Result compiled successfully. Computed 450 * 78 = 35100."
                    className="w-full bg-[#0d1425] border border-[#1e293b] text-slate-200 rounded-lg p-3 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={handleReflect}
                  disabled={isReflecting}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  {isReflecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>Execute Critique Review</span>
                </button>
              </div>

              {/* Reflection outcome */}
              <div className="md:col-span-7 space-y-4">
                {reflectionResult ? (
                  <div className="bg-[#070b13] border border-slate-900 rounded-xl p-5 space-y-4 font-sans">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white">Semantic critique Review</h4>
                        <span className="text-[10px] font-mono text-slate-500 pt-0.5 block">Reflection Policy: {reflectionResult.evaluation_policy_version}</span>
                      </div>
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                        reflectionResult.passed 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {reflectionResult.passed ? "CRITIQUE_PASSED" : "CRITIQUE_REJECTED"}
                      </span>
                    </div>

                    {/* Metadata indicators */}
                    <div className="grid grid-cols-3 gap-3 text-center font-mono text-[11px]">
                      <div className="bg-[#0b1021] border border-slate-900 p-2 rounded-lg">
                        <span className="text-[8px] text-slate-500 block">Risk Level</span>
                        <p className={`font-bold uppercase mt-0.5 ${
                          reflectionResult.risk_level === "high" ? "text-red-400" : reflectionResult.risk_level === "medium" ? "text-amber-400" : "text-emerald-400"
                        }`}>{reflectionResult.risk_level}</p>
                      </div>
                      <div className="bg-[#0b1021] border border-slate-900 p-2 rounded-lg">
                        <span className="text-[8px] text-slate-500 block">Confidence Score</span>
                        <p className="font-bold text-white mt-0.5">{reflectionResult.confidence || reflectionResult.confidenceScore}/100</p>
                      </div>
                      <div className="bg-[#0b1021] border border-slate-900 p-2 rounded-lg">
                        <span className="text-[8px] text-slate-500 block">Human Review</span>
                        <p className={`font-bold mt-0.5 ${reflectionResult.requires_human_review ? "text-amber-400" : "text-slate-400"}`}>
                          {reflectionResult.requires_human_review ? "REQUIRED" : "NONE"}
                        </p>
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Critique Reasoning Summary</span>
                      <p className="text-xs text-slate-300 leading-relaxed bg-[#0b1021] border border-slate-950 p-3 rounded-lg font-sans">
                        {reflectionResult.reasoning_summary || reflectionResult.reasoning}
                      </p>
                    </div>

                    {/* Issues */}
                    {reflectionResult.identified_issues && reflectionResult.identified_issues.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Identified Issues ({reflectionResult.identified_issues.length})</span>
                        <div className="space-y-1.5">
                          {reflectionResult.identified_issues.map((iss: string, idx: number) => (
                            <div key={idx} className="p-2 bg-red-500/5 border border-red-500/10 text-red-400 text-xs rounded-lg flex items-center gap-2">
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <span className="font-sans text-[11px]">{iss}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {reflectionResult.recommended_actions && reflectionResult.recommended_actions.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Recommended Actions</span>
                        <div className="space-y-1.5 font-sans">
                          {reflectionResult.recommended_actions.map((act: string, idx: number) => (
                            <div key={idx} className="p-2 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="text-[11px]">{act}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 bg-[#070b13]/20 rounded-2xl text-center space-y-3 h-full">
                    <Eye className="w-10 h-10 text-slate-600 animate-pulse" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-300">Reflection Screen Empty</h4>
                      <p className="text-xs text-slate-500 max-w-sm mt-1">
                        Trigger semantic outcomes analysis and critique recommendations.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB 6: TELEMETRY DASHBOARD */}
        {activeTab === "telemetry" && (
          <div className="space-y-6">
            {isTelemetryLoading && !telemetry ? (
              <div className="flex items-center justify-center py-12 text-slate-500 font-mono text-xs">
                Querying Kernel Telemetry registry...
              </div>
            ) : telemetry ? (
              <div className="space-y-6">
                
                {/* Aggregate cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center font-mono text-xs">
                  
                  <div className="bg-[#070b13] border border-slate-900 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider block">Total Pipeline Runs</span>
                    <h3 className="text-xl font-bold text-white mt-1.5">
                      {telemetry.runtime.totalExecutions}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-2 text-[9px] text-slate-400">
                      <span className="text-emerald-400">{telemetry.runtime.successfulExecutions} OK</span>
                      <span>•</span>
                      <span className="text-red-400">{telemetry.runtime.failedExecutions} ERR</span>
                    </div>
                  </div>

                  <div className="bg-[#070b13] border border-slate-900 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider block">LLM Tokens Consumed</span>
                    <h3 className="text-xl font-bold text-white mt-1.5">
                      {telemetry.aggregated.totalTokens.toLocaleString()}
                    </h3>
                    <span className="text-[9px] text-slate-400 block mt-1 font-sans">Prompt & completions</span>
                  </div>

                  <div className="bg-[#070b13] border border-slate-900 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider block">Estimated Financial Cost</span>
                    <h3 className="text-xl font-bold text-emerald-400 mt-1.5">
                      ${telemetry.aggregated.totalCost.toFixed(5)}
                    </h3>
                    <span className="text-[9px] text-slate-400 block mt-1 font-sans">Accumulated USD cost</span>
                  </div>

                  <div className="bg-[#070b13] border border-slate-900 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider block">Average Latency</span>
                    <h3 className="text-xl font-bold text-white mt-1.5">
                      {telemetry.runtime.averageDurationMs.toFixed(0)} ms
                    </h3>
                    <span className="text-[9px] text-slate-400 block mt-1 font-sans">Per task run duration</span>
                  </div>

                </div>

                {/* Tool Invocations Chart and telemetry details */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 font-sans">
                  
                  {/* Tool bar stats */}
                  <div className="md:col-span-6 bg-[#070b13] border border-slate-900 rounded-xl p-5 space-y-4">
                    <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Capabilities Invocation Counts</span>
                    
                    {Object.keys(telemetry.aggregated.toolCounts || {}).length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-4">No tools executed in the current session</p>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(telemetry.aggregated.toolCounts).map(([tool, count]: any) => (
                          <div key={tool} className="space-y-1 text-xs">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="text-slate-300 font-bold">{tool}</span>
                              <span className="text-emerald-400 font-semibold">{count} runs</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full" 
                                style={{ width: `${Math.min(100, (count / 10) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SRE Policy boundaries */}
                  <div className="md:col-span-6 bg-[#070b13] border border-slate-900 rounded-xl p-5 space-y-4 font-sans text-xs">
                    <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Operational Guardrails Status</span>
                    
                    <div className="space-y-2.5 leading-relaxed text-slate-300">
                      <div className="flex items-center justify-between p-2.5 bg-[#0b1021] border border-slate-950 rounded-lg">
                        <span className="font-semibold">CE-A Isolation Posture</span>
                        <span className="font-mono text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">Enforced</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 bg-[#0b1021] border border-slate-950 rounded-lg">
                        <span className="font-semibold">Least Privilege Level</span>
                        <span className="font-mono text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">Least Mode</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 bg-[#0b1021] border border-slate-950 rounded-lg">
                        <span className="font-semibold">Memory Profiling post</span>
                        <span className="font-mono text-[10px] text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase font-sans">Zero Leaks Obs.</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              <div className="text-center text-slate-500 text-xs font-mono py-10">
                No telemetry data available.
              </div>
            )}
          </div>
        )}

        {/* TAB 7: CAPABILITIES REGISTRY */}
        {activeTab === "tools" && (
          <div className="space-y-6 font-sans text-xs">
            <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">Machine Capabilities Schema Registry ({tools.length})</span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.map((tl) => (
                <div key={tl.id} className="bg-[#070b13] border border-slate-900 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-950 pb-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">{tl.name}</h4>
                      <span className="font-mono text-[10px] text-indigo-400 mt-0.5 block">{tl.id}</span>
                    </div>
                    <span className="text-[8px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
                      {tl.riskLevel} risk
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-400 leading-normal">{tl.description}</p>
                  
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block font-bold">Permissions Needed:</span>
                    <div className="flex flex-wrap gap-1">
                      {tl.permissions.map((p, pIdx) => (
                        <span key={pIdx} className="text-[9px] font-mono bg-[#0b1021] border border-slate-900 text-slate-300 px-1.5 py-0.5 rounded">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#04060b] border border-slate-950 p-2.5 rounded-lg text-[10.5px] font-mono space-y-1.5 overflow-x-auto max-h-[140px]">
                    <span className="text-[8px] text-slate-500 uppercase block font-bold">Input Schema:</span>
                    <pre className="text-indigo-300 whitespace-pre">{JSON.stringify(tl.inputSchema, null, 2)}</pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Footer bar */}
      <div className="bg-[#070b13] border-t border-slate-900 px-4 py-2.5 flex items-center justify-between text-[10px] text-slate-500 font-mono shrink-0">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          Active Session: Studio Connected to Kernel Core
        </span>
        <span>Secure DevOps Architecture</span>
      </div>

    </div>
  );
}
