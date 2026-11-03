import React, { useState, useEffect } from "react";
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  Filter,
  Search,
  Download,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Layers,
  Cpu,
  FileText,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Tag,
  Flame,
  HelpCircle,
  Zap,
  RotateCcw,
  CheckSquare
} from "lucide-react";
import { SystemTodoItem, TodoCategory, TodoPriority, TodoStatus } from "../types";

const CATEGORY_LABELS: Record<TodoCategory, { label: string; icon: string; color: string }> = {
  ai_resilience: { label: "AI & LLM Resilience", icon: "🤖", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  persistence: { label: "Data & Storage", icon: "💾", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  freelance_jobs: { label: "Jobs & Freelance Intelligence", icon: "💼", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  email_outreach: { label: "Email & Direct Outreach", icon: "📧", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  recruitment_pipeline: { label: "Recruiter & CRM Pipeline", icon: "👥", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  infrastructure: { label: "System & Infrastructure", icon: "⚙️", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

const STATUS_CONFIG: Record<TodoStatus, { label: string; badge: string; icon: any }> = {
  done: { label: "Done ✅", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  in_progress: { label: "In Progress 🔄", badge: "bg-blue-500/15 text-blue-300 border-blue-500/30", icon: Clock },
  planned: { label: "Planned ⏳", badge: "bg-slate-500/15 text-slate-300 border-slate-500/30", icon: Layers },
  blocked: { label: "Blocked 🛑", badge: "bg-rose-500/15 text-rose-300 border-rose-500/30", icon: AlertCircle },
};

const PRIORITY_CONFIG: Record<TodoPriority, { label: string; badge: string }> = {
  high: { label: "High Priority", badge: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
  medium: { label: "Medium Priority", badge: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  low: { label: "Low Priority", badge: "bg-slate-500/20 text-slate-300 border-slate-500/30" },
};

export default function RoadmapTodoPanel() {
  const [todos, setTodos] = useState<SystemTodoItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  
  // New TODO Modal / Inline Form State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newCategory, setNewCategory] = useState<TodoCategory>("ai_resilience");
  const [newPriority, setNewPriority] = useState<TodoPriority>("medium");
  const [newStatus, setNewStatus] = useState<TodoStatus>("planned");
  const [newDescription, setNewDescription] = useState<string>("");
  const [newExplanation, setNewExplanation] = useState<string>("");
  const [newEffort, setNewEffort] = useState<string>("1-2 days");
  const [newTags, setNewTags] = useState<string>("");

  // Circuit breaker state
  const [circuitStatus, setCircuitStatus] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTodos();
    fetchCircuitStatus();
    const interval = setInterval(fetchCircuitStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchTodos = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/todos");
      const data = await res.json();
      if (data.success && Array.isArray(data.todos)) {
        setTodos(data.todos);
      }
    } catch (err) {
      console.error("Failed to load todos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCircuitStatus = async () => {
    try {
      const res = await fetch("/api/ai/circuit-breaker");
      if (res.ok) {
        const data = await res.json();
        setCircuitStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch circuit breaker status:", err);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: TodoStatus) => {
    const nextStatusMap: Record<TodoStatus, TodoStatus> = {
      done: "planned",
      planned: "in_progress",
      in_progress: "done",
      blocked: "planned",
    };
    const nextStatus = nextStatusMap[currentStatus] || "done";

    // Optimistic UI update
    setTodos(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));

    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        showToast(`Status updated to ${STATUS_CONFIG[nextStatus].label}`);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      fetchTodos();
    }
  };

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSaving(true);
    try {
      const tagsArray = newTags
        .split(",")
        .map(t => t.trim())
        .filter(Boolean);

      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          category: newCategory,
          priority: newPriority,
          status: newStatus,
          description: newDescription.trim(),
          explanation: newExplanation.trim() || "User defined milestone.",
          effortEstimate: newEffort.trim() || "TBD",
          tags: tagsArray,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTodos(prev => [data.todo, ...prev]);
        setShowAddModal(false);
        setNewTitle("");
        setNewDescription("");
        setNewExplanation("");
        setNewTags("");
        showToast("✨ New task added to roadmap successfully!");
      }
    } catch (err) {
      console.error("Error creating todo:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    if (!confirm("Are you sure you want to remove this item from your roadmap?")) return;
    setTodos(prev => prev.filter(t => t.id !== id));
    try {
      await fetch(`/api/todos/${id}`, { method: "DELETE" });
      showToast("Task deleted from roadmap.");
    } catch (err) {
      console.error("Error deleting todo:", err);
      fetchTodos();
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm("Reset roadmap back to default architecture milestones? Any custom items will be restored to defaults.")) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/todos/reset", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setTodos(data.todos);
        showToast("🔄 Roadmap restored to baseline specifications.");
      }
    } catch (err) {
      console.error("Error resetting todos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportMarkdown = () => {
    let md = `# Job Search & IT Intelligence Agent - Roadmap & Milestone Status\n`;
    md += `Exported on: ${new Date().toLocaleString()}\n\n`;
    md += `## Summary Metrics\n`;
    md += `- Total Tasks: ${todos.length}\n`;
    md += `- Completed: ${todos.filter(t => t.status === "done").length} (${Math.round((todos.filter(t => t.status === "done").length / Math.max(1, todos.length)) * 100)}%)\n`;
    md += `- In Progress: ${todos.filter(t => t.status === "in_progress").length}\n`;
    md += `- Planned: ${todos.filter(t => t.status === "planned").length}\n\n`;
    md += `## Task Details\n\n`;

    todos.forEach((t, i) => {
      const statusIcon = t.status === "done" ? "[x]" : "[ ]";
      md += `### ${i + 1}. ${statusIcon} ${t.title}\n`;
      md += `- **Category**: ${CATEGORY_LABELS[t.category]?.label || t.category}\n`;
      md += `- **Status**: ${t.status.toUpperCase()}\n`;
      md += `- **Priority**: ${t.priority.toUpperCase()}\n`;
      md += `- **Effort**: ${t.effortEstimate}\n`;
      md += `- **Description**: ${t.description}\n`;
      md += `- **Architectural Context**: ${t.explanation}\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-agent-roadmap-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    showToast("📋 Roadmap Markdown exported successfully!");
  };

  // Filtered TODO list
  const filteredTodos = todos.filter(item => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.explanation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    const matchesPriority = filterPriority === "all" || item.priority === filterPriority;

    return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
  });

  const totalCount = todos.length;
  const doneCount = todos.filter(t => t.status === "done").length;
  const inProgressCount = todos.filter(t => t.status === "in_progress").length;
  const plannedCount = todos.filter(t => t.status === "planned").length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f172a] border border-indigo-500/40 text-indigo-200 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 text-xs font-mono animate-fade-in">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-5 bg-gradient-to-r from-[#0d1424] via-[#0f1b33] to-[#0d1424] border border-[#1e293b] rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              <ListTodo className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Engineering Roadmap & Remaining TODOs 📋
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Track, prioritize, and manage all architectural milestones, LLM fallback mechanisms, database persistence, and outreach pipelines in real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
          <button
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1e293b] hover:bg-[#334155] text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-all cursor-pointer"
            title="Export as formatted Markdown"
          >
            <Download className="w-4 h-4 text-slate-400" /> Export MD
          </button>
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-2.5 py-2 bg-[#1e293b]/60 hover:bg-[#334155] text-slate-400 hover:text-slate-200 rounded-lg text-xs border border-slate-800 transition-all cursor-pointer"
            title="Reset to default roadmap items"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* LLM Health & Quota Resilience Shield Banner */}
      <div className="p-4 bg-[#0a0f1d] border border-[#1e293b] rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200">AI Quota Shield & Multi-Tier Failover Architecture</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
            Zero Rate-Limit Protection Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-[#0d1527] border border-slate-800 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-mono text-[11px]">Primary Model</span>
              <span className="text-indigo-400 font-bold">Gemini 2.5 Flash</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Handles Google Search grounding for real vacancies when cloud quota is within threshold.
            </p>
          </div>

          <div className="p-3 bg-[#0d1527] border border-slate-800 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-mono text-[11px]">Failover Tier</span>
              <span className="text-purple-400 font-bold">OpenRouter Free LLMs</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Llama 3.3 70B & DeepSeek R1 free failover prevents errors if Gemini returns 429 quota exhaustion.
            </p>
          </div>

          <div className="p-3 bg-[#0d1527] border border-slate-800 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-mono text-[11px]">Zero-Token Mode</span>
              <span className="text-emerald-400 font-bold">Deterministic Engine</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Local ATS keyword scoring, 15-min cache, and local pitch builder ensure 0ms offline execution.
            </p>
          </div>
        </div>

        {circuitStatus?.circuitBreaker?.isOpen && (
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              ⚡ Circuit Breaker Engaged: {circuitStatus.circuitBreaker.reason} (Failover active for {circuitStatus.circuitBreaker.remainingSeconds}s)
            </span>
          </div>
        )}
      </div>

      {/* Progress & Milestone Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-[#0a0f1d] border border-[#1e293b] rounded-xl flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-white font-mono">{totalCount}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Milestones</div>
          </div>
        </div>

        <div className="p-3.5 bg-[#0a0f1d] border border-[#1e293b] rounded-xl flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-400 font-mono">{doneCount}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Completed ({progressPercent}%)</div>
          </div>
        </div>

        <div className="p-3.5 bg-[#0a0f1d] border border-[#1e293b] rounded-xl flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-blue-400 font-mono">{inProgressCount}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">In Progress</div>
          </div>
        </div>

        <div className="p-3.5 bg-[#0a0f1d] border border-[#1e293b] rounded-xl flex items-center gap-3">
          <div className="p-2 bg-slate-500/10 rounded-lg text-slate-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-300 font-mono">{plannedCount}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Planned Roadmap</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-4 bg-[#0a0f1d] border border-[#1e293b] rounded-xl space-y-2">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-slate-400">Roadmap Completion Velocity</span>
          <span className="text-indigo-400 font-bold">{progressPercent}% Completed</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-4 bg-[#0a0f1d] border border-[#1e293b] rounded-xl space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search tasks, descriptions, architectural notes, or tags..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#070b14] border border-[#1e293b] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-xs text-slate-500 hover:text-slate-300"
              >
                ×
              </button>
            )}
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-[#070b14] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Categories ({totalCount})</option>
            {Object.entries(CATEGORY_LABELS).map(([catKey, cat]) => (
              <option key={catKey} value={catKey}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-[#070b14] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="done">Done ✅</option>
            <option value="in_progress">In Progress 🔄</option>
            <option value="planned">Planned ⏳</option>
            <option value="blocked">Blocked 🛑</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="bg-[#070b14] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Task List Section */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center bg-[#0a0f1d] border border-[#1e293b] rounded-xl text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin mx-auto mb-2" />
            <span>Loading roadmap and architectural items...</span>
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="p-8 text-center bg-[#0a0f1d] border border-[#1e293b] rounded-xl text-slate-400 text-xs space-y-2">
            <p>No roadmap items found matching the selected filters.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterCategory("all");
                setFilterStatus("all");
                setFilterPriority("all");
              }}
              className="text-indigo-400 hover:underline font-mono"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          filteredTodos.map(todo => {
            const isDone = todo.status === "done";
            const isExpanded = expandedId === todo.id;
            const categoryMeta = CATEGORY_LABELS[todo.category] || CATEGORY_LABELS.infrastructure;
            const statusMeta = STATUS_CONFIG[todo.status] || STATUS_CONFIG.planned;
            const priorityMeta = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;
            const StatusIcon = statusMeta.icon;

            return (
              <div
                key={todo.id}
                className={`p-4 bg-[#0a0f1d] border rounded-xl transition-all ${
                  isDone
                    ? "border-slate-800/80 bg-opacity-70"
                    : todo.priority === "high"
                    ? "border-indigo-500/30 hover:border-indigo-500/50 shadow-md shadow-indigo-950/20"
                    : "border-[#1e293b] hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Checkbox & Title */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleStatus(todo.id, todo.status)}
                      className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all cursor-pointer ${
                        isDone
                          ? "bg-emerald-500 text-slate-950 shadow-sm"
                          : "border border-slate-600 hover:border-indigo-400 bg-slate-900"
                      }`}
                      title="Click to toggle status (Planned -> In Progress -> Done)"
                    >
                      {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4
                          className={`text-sm font-semibold truncate ${
                            isDone ? "text-slate-400 line-through" : "text-white"
                          }`}
                        >
                          {todo.title}
                        </h4>

                        {/* Category Badge */}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${categoryMeta.color} flex items-center gap-1`}
                        >
                          <span>{categoryMeta.icon}</span>
                          <span>{categoryMeta.label}</span>
                        </span>

                        {/* Status Badge */}
                        <button
                          onClick={() => handleToggleStatus(todo.id, todo.status)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${statusMeta.badge} flex items-center gap-1 cursor-pointer hover:opacity-80`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusMeta.label}</span>
                        </button>

                        {/* Priority Badge */}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${priorityMeta.badge}`}
                        >
                          {priorityMeta.label}
                        </span>

                        {/* Effort Badge */}
                        {todo.effortEstimate && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            ⏱️ {todo.effortEstimate}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {todo.description}
                      </p>

                      {/* Tags */}
                      {todo.tags && todo.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          {todo.tags.map(tag => (
                            <span
                              key={tag}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : todo.id)}
                      className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded transition-all cursor-pointer"
                      title={isExpanded ? "Collapse architectural context" : "Expand architectural context"}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {todo.isCustom && (
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all cursor-pointer"
                        title="Delete custom milestone"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Architectural Explanation Accordion */}
                {isExpanded && (
                  <div className="mt-3.5 pt-3.5 border-t border-slate-800/80 bg-[#070b14] p-3 rounded-lg space-y-2 text-xs animate-fade-in">
                    <div className="flex items-center gap-1.5 text-indigo-400 font-mono text-[11px] font-semibold">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Architectural Context & Operational Value:</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-sans">
                      {todo.explanation}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                      <span>Task ID: {todo.id}</span>
                      <span>Created: {new Date(todo.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Custom Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1220] border border-[#1e293b] rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" /> Add Roadmap Milestone
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTodo} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Milestone Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement Telegram Bot for Instant Job Notifications"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-[#070b14] border border-[#1e293b] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as TodoCategory)}
                    className="w-full bg-[#070b14] border border-[#1e293b] rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([catKey, cat]) => (
                      <option key={catKey} value={catKey}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as TodoPriority)}
                    className="w-full bg-[#070b14] border border-[#1e293b] rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Initial Status</label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as TodoStatus)}
                    className="w-full bg-[#070b14] border border-[#1e293b] rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="planned">Planned ⏳</option>
                    <option value="in_progress">In Progress 🔄</option>
                    <option value="done">Done ✅</option>
                    <option value="blocked">Blocked 🛑</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Functional Description</label>
                <textarea
                  rows={2}
                  placeholder="What will this milestone achieve functionally for the candidate or application?"
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full bg-[#070b14] border border-[#1e293b] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Architectural Context & Why It Matters
                </label>
                <textarea
                  rows={2}
                  placeholder="Technical justification, cost savings, reliability boost, or operational context..."
                  value={newExplanation}
                  onChange={e => setNewExplanation(e.target.value)}
                  className="w-full bg-[#070b14] border border-[#1e293b] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Estimated Effort</label>
                  <input
                    type="text"
                    placeholder="e.g. 2 hours, 1 day, Completed"
                    value={newEffort}
                    onChange={e => setNewEffort(e.target.value)}
                    className="w-full bg-[#070b14] border border-[#1e293b] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. api, telegram, automation"
                    value={newTags}
                    onChange={e => setNewTags(e.target.value)}
                    className="w-full bg-[#070b14] border border-[#1e293b] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
