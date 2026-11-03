import React, { useState, useEffect } from "react";
import { 
  Clock, Trash2, Search, Calendar, Zap, HardDrive, 
  RefreshCw, CheckCircle, Plus, FileText, ChevronRight 
} from "lucide-react";

import { SearchHistoryEntry } from "../types";

export default function SearchHistoryPanel() {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notesText, setNotesText] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/employment/v2/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
        
        // initialize notes map
        const notesObj: Record<string, string> = {};
        data.history?.forEach((item: SearchHistoryEntry) => {
          notesObj[item.id] = item.userNotes || "";
        });
        setNotesText(notesObj);
      }
    } catch (err) {
      console.error("Error fetching search logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotes = async (id: string) => {
    try {
      const res = await fetch("/api/employment/v2/history/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes: notesText[id] || "" })
      });
      if (res.ok) {
        setHistory(prev => prev.map(item => item.id === id ? { ...item, userNotes: notesText[id] } : item));
        alert("Search query notes updated!");
      }
    } catch (err) {
      console.error("Error saving query notes:", err);
    }
  };

  const handleClearAllHistory = async () => {
    if (!confirm("Are you sure you want to permanently clear all search history from your encrypted vault?")) return;
    try {
      const res = await fetch("/api/employment/v2/history", {
        method: "DELETE"
      });
      if (res.ok) {
        setHistory([]);
        setNotesText({});
      }
    } catch (err) {
      console.error("Error clearing search history:", err);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Informational header */}
      <div className="p-4 md:p-5 bg-[#0a0f1c] border border-[#1e293b] rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-sans text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-indigo-400" />
            Job Search History & Grounding Logs
          </h3>
          <p className="text-[11px] text-slate-400 leading-normal">
            A secure record of your live job search queries. Aziz Assistant tracks performance metrics to refine future match rankings.
          </p>
        </div>

        <div className="flex gap-2 shrink-0 self-stretch md:self-auto">
          <button
            onClick={fetchHistory}
            className="px-3 py-1.5 bg-[#111827] hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold border border-[#1e293b] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sync Logs
          </button>
          
          {history.length > 0 && (
            <button
              onClick={handleClearAllHistory}
              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold border border-red-500/15 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Purge History Vault
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500 text-xs font-mono">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-2" />
          Reading search history stream...
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16 bg-[#080d1a] border border-[#1e293b]/50 rounded-xl text-slate-500 text-xs font-sans leading-relaxed">
          No search history logged yet. Use the "Matched Board" tab to run job search queries and watch logs capture live data in real-time.
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div key={item.id} className="p-4 bg-[#0a0f1d] border border-[#1e293b] rounded-xl space-y-4">
              
              {/* Row 1 Details */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-indigo-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-sans text-xs font-bold text-white flex items-center gap-1.5">
                      Query: <span className="font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/15">"{item.query}"</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Timestamp: {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Performance indicators */}
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                  <span className="bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    📁 RESULTS: {item.resultsCount} jobs
                  </span>
                  <span className="bg-slate-900 border border-[#131d35] text-indigo-400 px-2 py-0.5 rounded flex items-center gap-1">
                    <Zap className="w-3 h-3 animate-pulse text-indigo-400" /> DURATION: {item.durationMs}ms
                  </span>
                  <span className="bg-slate-900 border border-slate-800 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">
                    SOURCE: {item.provider}
                  </span>
                </div>
              </div>

              {/* Row 2 Custom notes */}
              <div className="pt-2 border-t border-slate-900 flex gap-3 items-end">
                <div className="flex-1 space-y-1 text-xs">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Query Purpose / Rationale Notes:</label>
                  <textarea
                    rows={1}
                    placeholder="E.g., Tested hybrid Munich DevOps queries for visa requirements..."
                    value={notesText[item.id] || ""}
                    onChange={(e) => setNotesText(prev => ({ ...prev, [item.id]: e.target.value }))}
                    className="w-full bg-[#070b13] border border-[#1e293b] rounded-md px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={() => handleSaveNotes(item.id)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors shrink-0"
                >
                  Save Notes
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
