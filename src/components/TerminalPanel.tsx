import React, { useState, useRef, useEffect } from "react";
import { Terminal, Shield, AlertTriangle, Play, HelpCircle, Check, X, ShieldAlert } from "lucide-react";
import { TerminalLine } from "../types";

interface TerminalPanelProps {
  onExecuteCommand: (cmd: string) => Promise<{ output: string; status: string; securityRequired?: boolean; threatType?: string; message?: string }>;
  terminalLines: TerminalLine[];
  setTerminalLines: React.Dispatch<React.SetStateAction<TerminalLine[]>>;
  onAuditTriggered?: () => void;
}

export default function TerminalPanel({ onExecuteCommand, terminalLines, setTerminalLines, onAuditTriggered }: TerminalPanelProps) {
  const [input, setInput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // High-Risk Command Confirmation Modal State
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [threatType, setThreatType] = useState<string | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [terminalLines]);

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleCommandSubmit = async (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) return;

    // Add command to terminal history view
    const cmdLine: TerminalLine = {
      id: Date.now().toString() + "-cmd",
      type: "command",
      text: trimmed,
      timestamp: new Date().toISOString(),
    };
    setTerminalLines((prev) => [...prev, cmdLine]);
    setHistory((prev) => [trimmed, ...prev.filter(h => h !== trimmed)]);
    setHistoryIndex(-1);

    if (trimmed.toLowerCase() === "clear") {
      setTerminalLines([]);
      setInput("");
      return;
    }

    setIsExecuting(true);
    try {
      const rawRes = await onExecuteCommand(trimmed);
      const response = rawRes || { status: "error", output: "No response returned from command execution service.", securityRequired: false };

      if (response.securityRequired) {
        // High Risk command intercepted
        setPendingCommand(trimmed);
        setThreatType(response.threatType || "Restricted Command");
        setShowConfirmModal(true);
        setConfirmInput("");
        
        const warningLine: TerminalLine = {
          id: Date.now().toString() + "-warn",
          type: "warn",
          text: `[SEC_GUARD] WARNING: Command intercepted! ${response.message || "Restricted command execution"}`,
          timestamp: new Date().toISOString(),
        };
        setTerminalLines((prev) => [...prev, warningLine]);
      } else {
        const outLine: TerminalLine = {
          id: Date.now().toString() + "-out",
          type: response.status === "error" ? "error" : "output",
          text: response.output || "Command executed successfully.",
          timestamp: new Date().toISOString(),
        };
        setTerminalLines((prev) => [...prev, outLine]);

        // If command was audit, also refresh parents
        if (trimmed.toLowerCase() === "audit" && onAuditTriggered) {
          onAuditTriggered();
        }
      }
    } catch (err: any) {
      const errLine: TerminalLine = {
        id: Date.now().toString() + "-err",
        type: "error",
        text: `Execution Failure: ${err.message || "Unknown error"}`,
        timestamp: new Date().toISOString(),
      };
      setTerminalLines((prev) => [...prev, errLine]);
    } finally {
      setIsExecuting(false);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCommandSubmit(input);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  const approveHighRiskCommand = () => {
    if (confirmInput.toUpperCase() !== "CONFIRM") return;
    
    if (pendingCommand) {
      const approvedLine: TerminalLine = {
        id: Date.now().toString() + "-sys",
        type: "system",
        text: `[SEC_GUARD] Command overriding code accepted. Executing restricted command bypass...\n$ ${pendingCommand}\nOutput: Permission denied by underlying container context. Command blocked safely in dry-run mode.`,
        timestamp: new Date().toISOString(),
      };
      setTerminalLines((prev) => [...prev, approvedLine]);
    }
    
    setShowConfirmModal(false);
    setPendingCommand(null);
    setThreatType(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#070b12] border border-[#1e293b] rounded-lg overflow-hidden shadow-2xl" id="terminal-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d1527] border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-mono text-xs font-semibold tracking-wider text-slate-300">AZIZ_ASSISTANT SECURE_SHELL v1.2</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-mono text-[10px] text-emerald-400">HARDENING_MAX</span>
          </div>
          <button 
            onClick={() => handleCommandSubmit("help")} 
            className="flex items-center gap-1 font-mono text-[10px] text-slate-400 hover:text-white transition-colors"
            title="Help instructions"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help</span>
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div 
        ref={containerRef}
        onClick={focusInput}
        className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300 space-y-2.5 min-h-[220px]"
      >
        <div className="text-slate-500 text-[11px] border-b border-slate-900 pb-2 mb-3">
          Aziz Assistant Autonomic Terminal Context. Type <span className="text-emerald-400">help</span> to list secure DevOps diagnostic commands.
          Dangerous actions automatically trigger authorization overlays.
        </div>

        {terminalLines.map((line) => {
          if (line.type === "command") {
            return (
              <div key={line.id} className="flex items-start gap-1">
                <span className="text-emerald-400">aziz@sec-ops:~$</span>
                <span className="text-white font-medium break-all">{line.text}</span>
              </div>
            );
          } else if (line.type === "warn") {
            return (
              <div key={line.id} className="p-2.5 rounded bg-amber-950/20 border border-amber-600/30 text-amber-300 whitespace-pre-wrap leading-relaxed">
                <div className="flex items-center gap-1.5 mb-1 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>SECURITY GUARD ALERT</span>
                </div>
                {line.text}
              </div>
            );
          } else if (line.type === "error") {
            return (
              <div key={line.id} className="p-2.5 rounded bg-red-950/20 border border-red-600/30 text-red-300 whitespace-pre-wrap leading-relaxed">
                <div className="flex items-center gap-1.5 mb-1 font-bold">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                  <span>EXECUTION EXCEPTION</span>
                </div>
                {line.text}
              </div>
            );
          } else if (line.type === "system") {
            return (
              <div key={line.id} className="p-2.5 rounded bg-slate-900 border border-emerald-500/20 text-emerald-400 whitespace-pre-wrap leading-relaxed">
                {line.text}
              </div>
            );
          } else {
            return (
              <div key={line.id} className="whitespace-pre-wrap leading-relaxed text-slate-300 break-words pl-1">
                {line.text}
              </div>
            );
          }
        })}

        {isExecuting && (
          <div className="flex items-center gap-2 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Agent thinking & validating sandbox permissions...</span>
          </div>
        )}
      </div>

      {/* Terminal Input Footer */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#070b12] border-t border-[#1e293b]">
        <span className="font-mono text-xs text-emerald-400 select-none shrink-0">aziz@sec-ops:~$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isExecuting}
          className="flex-1 min-w-0 bg-transparent text-white font-mono text-xs focus:outline-none placeholder-slate-600"
          placeholder="Type 'help' or run diagnostics..."
        />
        <button 
          onClick={() => handleCommandSubmit(input)} 
          disabled={isExecuting || !input.trim()}
          className="p-1 rounded text-slate-400 hover:text-white disabled:text-slate-800 disabled:hover:text-slate-800 transition-colors shrink-0"
        >
          <Play className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Security Guard Confirmation Overlay Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-[#0c1220] border-2 border-amber-500/40 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-400 mb-4 pb-2 border-b border-amber-500/10">
              <ShieldAlert className="w-7 h-7 text-amber-500 animate-bounce shrink-0" />
              <div>
                <h3 className="font-mono font-bold text-sm tracking-wide text-white">INTERCEPTED HIGH-RISK TASK</h3>
                <p className="text-[10px] text-amber-400/80 font-mono">Policy Safeguard Guardrails Enabled</p>
              </div>
            </div>

            <p className="font-sans text-xs text-slate-300 mb-4 leading-relaxed">
              Aziz Assistant policies intercepted an unauthorized <strong className="text-amber-400">{threatType}</strong> attempt:
              <code className="block p-2 bg-[#070a14] text-red-400 rounded border border-red-500/10 font-mono text-xs mt-2 break-all">
                {pendingCommand}
              </code>
            </p>

            <div className="mb-4">
              <label className="block font-mono text-[10px] text-slate-400 mb-1">
                Type <span className="text-amber-400 font-bold">CONFIRM</span> to simulate approval of this overriding guard:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#070a14] border border-[#1e293b] rounded text-white font-mono text-xs focus:outline-none focus:border-amber-500/40"
                placeholder="Type CONFIRM here..."
              />
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingCommand(null);
                  setThreatType(null);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-sans text-xs transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel Action</span>
              </button>
              <button
                onClick={approveHighRiskCommand}
                disabled={confirmInput.toUpperCase() !== "CONFIRM"}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800/40 text-white rounded font-sans text-xs font-medium transition-colors disabled:text-slate-500"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve Override</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
