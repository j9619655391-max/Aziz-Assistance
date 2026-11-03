import React, { useState } from "react";
import { Brain, ShieldAlert, Plus, Trash2, Calendar, FileText, CheckCircle2, ShieldCheck } from "lucide-react";
import { Memory } from "../types";

interface MemoryVaultProps {
  memories: Memory[];
  onAddMemory: (type: string, content: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteMemory: (id: string) => Promise<void>;
  isLoading: boolean;
}

export default function MemoryVault({ memories, onAddMemory, onDeleteMemory, isLoading }: MemoryVaultProps) {
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("preference");
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsSubmitting(true);
    setAddError(null);
    try {
      const response = await onAddMemory(newType, newContent);
      if (response.success) {
        setNewContent("");
      } else {
        setAddError(response.error || "Failed to save memory context.");
      }
    } catch (err: any) {
      setAddError(err.message || "Network error while saving memory.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "preference":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "style":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "context":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "security":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] border border-[#1e293b] rounded-lg overflow-hidden shadow-2xl" id="memory-vault">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e162b] border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-emerald-400" />
          <span className="font-sans text-xs font-semibold text-slate-300 tracking-wide">ACTIVE STATE MEMORY VAULT</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>CE_AUDIT_OK</span>
        </div>
      </div>

      {/* Memory Rules Disclaimer Banner */}
      <div className="p-3 bg-emerald-500/5 border-b border-emerald-500/10 flex items-start gap-2.5">
        <ShieldCheck className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-400 leading-relaxed font-sans">
          <strong className="text-emerald-400">Memory Rule Guardrails:</strong> OpenClaw stores preferences, coding styles, and project context. Passwords, private keys, API keys, and financial credentials are automatically blocked or redacted.
        </div>
      </div>

      {/* Memory List Container */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[220px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs font-mono">
            Synchronizing AI Memories...
          </div>
        ) : memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 py-6">
            <Brain className="w-8 h-8 text-slate-700 mb-2" />
            <p className="text-xs">No memories recorded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {memories.map((mem) => (
              <div 
                key={mem.id} 
                className="p-3 bg-[#0d1425] border border-[#1e293b] rounded-lg relative group transition-all hover:border-[#334155]"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-semibold uppercase border ${getBadgeColor(mem.type)}`}>
                    {mem.type}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(mem.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="font-mono text-xs text-slate-300 break-words leading-relaxed pr-8">
                  {mem.content}
                </p>
                
                {/* Delete Button */}
                <button
                  onClick={() => onDeleteMemory(mem.id)}
                  className="absolute top-2.5 right-2.5 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10"
                  title="Purge memory"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Memory Input */}
      <form onSubmit={handleSubmit} className="p-3 bg-[#070c17] border-t border-[#1e293b] space-y-2">
        {addError && (
          <div className="p-2 rounded bg-red-950/20 border border-red-600/30 text-red-400 text-[11px] leading-relaxed flex items-start gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
            <span>{addError}</span>
          </div>
        )}
        
        <div className="flex gap-2">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="px-2.5 py-1 bg-[#0b1326] border border-[#1e293b] text-slate-300 text-xs rounded-lg font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="preference">Preference</option>
            <option value="style">Style</option>
            <option value="context">Context</option>
            <option value="security">Security</option>
          </select>
          
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            disabled={isSubmitting}
            placeholder="Record new constraint or preference..."
            className="flex-1 bg-[#0b1326] border border-[#1e293b] rounded-lg px-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          />
          
          <button
            type="submit"
            disabled={!newContent.trim() || isSubmitting}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </form>
    </div>
  );
}
