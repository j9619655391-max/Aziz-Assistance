import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, ShieldCheck, Send, ShieldAlert, Sparkles, Brain, Cpu, Loader2 } from "lucide-react";
import { Message } from "../types";

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (text: string) => Promise<void>;
  isThinking: boolean;
}

const QUICK_PROMPTS = [
  "Evaluate current security posture and suggest hardening measures.",
  "What is least privilege access and how does OpenClaw enforce it?",
  "What are the dangerous terminal commands that trigger verification gates?",
  "Analyze current AI state memories and suggest improvements."
];

export default function ChatPanel({ messages, onSendMessage, isThinking }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    
    const textToSend = input;
    setInput("");
    await onSendMessage(textToSend);
  };

  const handleQuickPromptClick = async (prompt: string) => {
    if (isThinking) return;
    await onSendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] border border-[#1e293b] rounded-lg overflow-hidden shadow-2xl" id="chat-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0e162b] border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-emerald-400" />
          <span className="font-sans text-xs font-semibold text-slate-300 tracking-wide">OPENCLAW AI_BRAIN INTERACTION</span>
        </div>
        <div className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-mono text-[10px] text-indigo-400">GEMINI_3.5_FLASH</span>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[250px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
            <div className="p-3.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400">
              <Cpu className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold text-white mb-1">OpenClaw AI Session Started</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Autonomous, reliable, security-first companion. Ask questions about your repo's hardening, configurations, or memories.
              </p>
            </div>
            
            {/* Quick Prompts Container */}
            <div className="w-full max-w-md pt-2">
              <span className="block text-[10px] font-mono text-slate-500 text-left mb-2 uppercase tracking-wider">Suggested Diagnostics:</span>
              <div className="grid grid-cols-1 gap-2">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickPromptClick(prompt)}
                    className="text-left text-xs p-2.5 bg-[#0f172a] hover:bg-[#1e293b] border border-[#1e293b] hover:border-indigo-500/30 rounded-lg text-slate-300 hover:text-white transition-all text-ellipsis overflow-hidden"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 select-none ${
                    msg.role === "user"
                      ? "bg-indigo-600/20 border border-indigo-500/30 text-indigo-400"
                      : "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400"
                  }`}
                >
                  {msg.role === "user" ? "U" : "OC"}
                </div>

                {/* Message Content Bubble */}
                <div
                  className={`p-3 rounded-xl border text-xs leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === "user"
                      ? "bg-indigo-950/20 border-indigo-500/30 text-slate-200 rounded-tr-none"
                      : "bg-[#0f172a] border-[#1e293b] text-slate-300 rounded-tl-none"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isThinking && (
              <div className="flex gap-3 max-w-[85%] mr-auto items-center text-slate-500">
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </div>
                <span className="font-mono text-[10px] text-slate-500 animate-pulse">OpenClaw reasoning...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 bg-[#070c17] border-t border-[#1e293b] flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isThinking}
          placeholder={isThinking ? "Awaiting OpenClaw response..." : "Ask OpenClaw about system hardening or code audits..."}
          className="flex-1 bg-[#0b1326] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isThinking}
          className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition-colors shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
