import React, { useState, useEffect } from "react";
import { 
  Briefcase, Star, Trash2, Tag, Calendar, 
  MapPin, DollarSign, Globe, Folder, Filter, 
  ChevronRight, RefreshCw, Sparkles, BookOpen, Clock, Plus, X
} from "lucide-react";
import { Job, SavedJobEntry } from "../types";

export default function SavedJobsPanel() {
  const [savedJobs, setSavedJobs] = useState<SavedJobEntry[]>([]);
  const [collections, setCollections] = useState<Array<{ name: string; count: number; type: "system" | "custom" }>>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>("All Saved");
  const [isLoading, setIsLoading] = useState(false);
  const [notesText, setNotesText] = useState<Record<string, string>>({});
  const [newCategory, setNewCategory] = useState<Record<string, string>>({});
  const [oppScores, setOppScores] = useState<Record<string, any>>({});
  const [scoringJobId, setScoringJobId] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedJobs();
    fetchCollections();
  }, []);

  const fetchSavedJobs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/employment/v2/saved");
      if (res.ok) {
        const data = await res.json();
        setSavedJobs(data.saved || []);
        
        // initialize notes
        const notesObj: Record<string, string> = {};
        data.saved?.forEach((item: SavedJobEntry) => {
          notesObj[item.id] = item.notes;
        });
        setNotesText(notesObj);
      }
    } catch (err) {
      console.error("Error fetching saved jobs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await fetch("/api/employment/v2/collections");
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
      }
    } catch (err) {
      console.error("Error fetching collections:", err);
    }
  };

  const handleUpdateStatus = async (id: string, status: "saved" | "archived" | "favorite") => {
    try {
      const res = await fetch(`/api/employment/v2/saved/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setSavedJobs(prev => prev.map(item => item.id === id ? { ...item, status } : item));
        fetchCollections();
      }
    } catch (err) {
      console.error("Error updating saved job status:", err);
    }
  };

  const handleSaveNotes = async (id: string) => {
    try {
      const res = await fetch(`/api/employment/v2/saved/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesText[id] || "" })
      });
      if (res.ok) {
        setSavedJobs(prev => prev.map(item => item.id === id ? { ...item, notes: notesText[id] } : item));
        alert("Notes updated successfully!");
      }
    } catch (err) {
      console.error("Error saving notes:", err);
    }
  };

  const handleAddCategory = async (id: string) => {
    const cat = newCategory[id]?.trim();
    if (!cat) return;

    const jobItem = savedJobs.find(sj => sj.id === id);
    if (!jobItem) return;

    const currentCategories = jobItem.categories || [];
    if (currentCategories.includes(cat)) {
      setNewCategory(prev => ({ ...prev, [id]: "" }));
      return;
    }

    const updatedCategories = [...currentCategories, cat];
    try {
      const res = await fetch(`/api/employment/v2/saved/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: updatedCategories })
      });
      if (res.ok) {
        setSavedJobs(prev => prev.map(item => item.id === id ? { ...item, categories: updatedCategories } : item));
        setNewCategory(prev => ({ ...prev, [id]: "" }));
        fetchCollections();
      }
    } catch (err) {
      console.error("Error adding category:", err);
    }
  };

  const handleRemoveCategory = async (id: string, catToRemove: string) => {
    const jobItem = savedJobs.find(sj => sj.id === id);
    if (!jobItem) return;

    const updatedCategories = jobItem.categories.filter(c => c !== catToRemove);
    try {
      const res = await fetch(`/api/employment/v2/saved/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: updatedCategories })
      });
      if (res.ok) {
        setSavedJobs(prev => prev.map(item => item.id === id ? { ...item, categories: updatedCategories } : item));
        fetchCollections();
      }
    } catch (err) {
      console.error("Error removing category:", err);
    }
  };

  const handleDeleteSavedJob = async (id: string) => {
    if (!confirm("Are you sure you want to remove this saved job?")) return;
    try {
      const res = await fetch(`/api/employment/v2/saved/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSavedJobs(prev => prev.filter(item => item.id !== id));
        fetchCollections();
      }
    } catch (err) {
      console.error("Error deleting saved job:", err);
    }
  };

  const handleCalculateOpportunityScore = async (id: string, job: Job) => {
    setScoringJobId(id);
    try {
      const res = await fetch("/api/employment/v2/opportunity-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job })
      });
      if (res.ok) {
        const scoreData = await res.json();
        setOppScores(prev => ({ ...prev, [id]: scoreData }));
      }
    } catch (err) {
      console.error("Error generating opportunity score:", err);
    } finally {
      setScoringJobId(null);
    }
  };

  // Filter saved jobs based on collection click
  const filteredJobs = savedJobs.filter(sj => {
    if (selectedCollection === "All Saved") return sj.status !== "archived";
    if (selectedCollection === "Favorites") return sj.status === "favorite";
    if (selectedCollection === "Archived") return sj.status === "archived";

    // Standard static system categories
    if (selectedCollection === "Dream Companies") return sj.status === "favorite";
    if (selectedCollection === "Remote Jobs") {
      const loc = (sj.job?.location || "").toLowerCase();
      const desc = (sj.job?.description || "").toLowerCase();
      return loc.includes("remote") || desc.includes("remote") || desc.includes("work from home");
    }
    if (selectedCollection === "Germany") {
      return (sj.job?.location || "").toLowerCase().includes("germany") || sj.job?.country?.toLowerCase() === "germany";
    }
    if (selectedCollection === "Canada") {
      return (sj.job?.location || "").toLowerCase().includes("canada") || sj.job?.country?.toLowerCase() === "canada";
    }
    if (selectedCollection === "High Salary") {
      return sj.job?.salary ? (sj.job.salary.includes("100") || sj.job.salary.includes("120") || sj.job.salary.includes("150") || sj.job.salary.includes("200") || sj.job.salary.includes("$")) : false;
    }

    // Generic matching against entry's categories
    return (sj.categories || []).includes(selectedCollection);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
      
      {/* Dynamic Collections Sidebar */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-[#0a0f1c] border border-[#1e293b] rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-slate-900">
            <Folder className="w-4 h-4 text-indigo-400" />
            <h3 className="font-sans text-xs font-bold text-slate-200 uppercase tracking-wider">Job Collections</h3>
          </div>

          <div className="space-y-1.5">
            <button
              onClick={() => setSelectedCollection("All Saved")}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs flex justify-between items-center transition-all ${
                selectedCollection === "All Saved" 
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-semibold" 
                  : "text-slate-400 hover:bg-[#111827] hover:text-white"
              }`}
            >
              <span>📂 All Active Saved Jobs</span>
              <span className="font-mono bg-slate-900/80 px-1.5 py-0.5 rounded text-[10px] text-slate-500 border border-slate-800">
                {savedJobs.filter(sj => sj.status !== "archived").length}
              </span>
            </button>

            <button
              onClick={() => setSelectedCollection("Favorites")}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs flex justify-between items-center transition-all ${
                selectedCollection === "Favorites" 
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-semibold" 
                  : "text-slate-400 hover:bg-[#111827] hover:text-white"
              }`}
            >
              <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-500" /> Favorites</span>
              <span className="font-mono bg-slate-900/80 px-1.5 py-0.5 rounded text-[10px] text-slate-500 border border-slate-800">
                {savedJobs.filter(sj => sj.status === "favorite").length}
              </span>
            </button>

            <button
              onClick={() => setSelectedCollection("Archived")}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs flex justify-between items-center transition-all ${
                selectedCollection === "Archived" 
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-semibold" 
                  : "text-slate-400 hover:bg-[#111827] hover:text-white"
              }`}
            >
              <span>📦 Archived Folder</span>
              <span className="font-mono bg-slate-900/80 px-1.5 py-0.5 rounded text-[10px] text-slate-500 border border-slate-800">
                {savedJobs.filter(sj => sj.status === "archived").length}
              </span>
            </button>
          </div>

          <div className="my-3 border-t border-slate-900"></div>

          <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">Smart Folders</span>
          <div className="space-y-1">
            {collections.map(col => (
              <button
                key={col.name}
                onClick={() => setSelectedCollection(col.name)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex justify-between items-center transition-all ${
                  selectedCollection === col.name 
                    ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/15 font-semibold" 
                    : "text-slate-400 hover:bg-[#111827] hover:text-white"
                }`}
              >
                <span className="truncate">🏷️ {col.name}</span>
                <span className="font-mono text-[9px] bg-slate-900/80 px-1 py-0.2 rounded text-slate-500">
                  {col.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Saved Jobs Render list */}
      <div className="lg:col-span-9 space-y-4">
        
        <div className="flex items-center justify-between p-4 bg-[#0a0f1c] border border-[#1e293b] rounded-xl">
          <div>
            <h3 className="font-sans text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
              {selectedCollection} ({filteredJobs.length})
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Refined career matches cataloged within your offline-safe encrypted system vault.
            </p>
          </div>
          <button 
            onClick={fetchSavedJobs}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
            title="Reload database"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-slate-500 text-xs font-mono">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-2" />
            Reading local collection cache...
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-16 bg-[#080d1a] border border-[#1e293b]/50 rounded-xl text-slate-500 text-xs font-sans">
            No saved jobs found matching collection filter "{selectedCollection}". Go to "Matched Board" to bookmark positions.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((sj) => {
              const scoreObj = oppScores[sj.id];
              return (
                <div key={sj.id} className="p-5 bg-[#0a0f1d] border border-[#1e293b] rounded-xl flex flex-col space-y-4">
                  
                  {/* Job Details Row */}
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">
                          {sj.job.company}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Saved on {new Date(sj.addedDate).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-sans text-sm font-bold text-white flex items-center gap-1.5">
                        {sj.job.title}
                        {sj.status === "favorite" && <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" /> {sj.job.location}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <DollarSign className="w-3.5 h-3.5 text-slate-500" /> {sj.job.salary || "Not Specified"}
                        </span>
                        {sj.job.visaSponsorship && (
                          <span className="flex items-center gap-0.5 text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-1 rounded">
                            <Globe className="w-3 h-3" /> Visa Sponsored
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Left status actions */}
                    <div className="flex items-start gap-2 self-start md:self-auto shrink-0">
                      
                      {/* Favorite button toggle */}
                      <button
                        onClick={() => handleUpdateStatus(sj.id, sj.status === "favorite" ? "saved" : "favorite")}
                        className={`p-1.5 rounded border transition-colors cursor-pointer ${
                          sj.status === "favorite" 
                            ? "bg-amber-500/15 border-amber-500/30 text-amber-400" 
                            : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                        }`}
                        title="Favorite"
                      >
                        <Star className={`w-4 h-4 ${sj.status === "favorite" ? "fill-amber-400" : ""}`} />
                      </button>

                      {/* Archive button toggle */}
                      <button
                        onClick={() => handleUpdateStatus(sj.id, sj.status === "archived" ? "saved" : "archived")}
                        className={`px-2 py-1.5 rounded border text-xs font-semibold transition-colors cursor-pointer ${
                          sj.status === "archived" 
                            ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-400" 
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                        title={sj.status === "archived" ? "Send to Inbox" : "Archive"}
                      >
                        {sj.status === "archived" ? "Unarchive" : "Archive"}
                      </button>

                      {/* Remove item */}
                      <button
                        onClick={() => handleDeleteSavedJob(sj.id)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded transition-colors cursor-pointer"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="p-3 bg-[#070b13] border border-[#1e293b]/40 rounded-lg text-xs text-slate-300 leading-relaxed font-sans">
                    <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">Role Description Summary:</span>
                    <p className="line-clamp-2">{sj.job.description}</p>
                  </div>

                  {/* Opportunity Score Block */}
                  <div className="bg-[#080c16] border border-[#131d35] p-3.5 rounded-lg space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                        <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                        AI Opportunity Suitability Score
                      </div>
                      
                      {!scoreObj ? (
                        <button
                          onClick={() => handleCalculateOpportunityScore(sj.id, sj.job)}
                          disabled={scoringJobId === sj.id}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          {scoringJobId === sj.id ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" /> Evaluating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" /> Compute Score
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-slate-500">SCORE:</span>
                          <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded border ${
                            scoreObj.overallScore >= 80 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" :
                            scoreObj.overallScore >= 60 ? "bg-amber-500/10 text-amber-400 border-amber-500/25" :
                            "bg-red-500/10 text-red-400 border-red-500/25"
                          }`}>
                            {scoreObj.overallScore} / 100
                          </span>
                        </div>
                      )}
                    </div>

                    {scoreObj && (
                      <div className="space-y-3 text-xs font-sans">
                        {/* Sub-scores grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px] font-mono">
                          <div className="bg-slate-950/80 p-2 border border-slate-900 rounded-lg">
                            <span className="text-slate-500 block">SKILL MATCH</span>
                            <span className="font-bold text-white text-xs">{scoreObj.skillMatch}%</span>
                          </div>
                          <div className="bg-slate-950/80 p-2 border border-slate-900 rounded-lg">
                            <span className="text-slate-500 block">EST. SALARY</span>
                            <span className="font-bold text-white text-xs">{scoreObj.salary}/100</span>
                          </div>
                          <div className="bg-slate-950/80 p-2 border border-slate-900 rounded-lg">
                            <span className="text-slate-500 block">LOCATION FIT</span>
                            <span className="font-bold text-white text-xs">{scoreObj.location}%</span>
                          </div>
                          <div className="bg-slate-950/80 p-2 border border-slate-900 rounded-lg">
                            <span className="text-slate-500 block">VISA POLICY</span>
                            <span className="font-bold text-white text-xs">{scoreObj.visa}%</span>
                          </div>
                          <div className="bg-slate-950/80 p-2 border border-slate-900 rounded-lg">
                            <span className="text-slate-500 block">CAREER GROWTH</span>
                            <span className="font-bold text-white text-xs">{scoreObj.careerGrowth}%</span>
                          </div>
                          <div className="bg-slate-950/80 p-2 border border-slate-900 rounded-lg">
                            <span className="text-slate-500 block">COMPETITION</span>
                            <span className="font-bold text-white text-xs">{scoreObj.competition}%</span>
                          </div>
                          <div className="bg-slate-950/80 p-2 border border-slate-900 rounded-lg">
                            <span className="text-slate-500 block">COMPANY RATING</span>
                            <span className="font-bold text-white text-xs">{scoreObj.companyRating}%</span>
                          </div>
                          <div className="bg-slate-950/80 p-2 border border-slate-900 rounded-lg">
                            <span className="text-slate-500 block">LEARNING SCORE</span>
                            <span className="font-bold text-white text-xs">{scoreObj.learningOpportunity}%</span>
                          </div>
                        </div>

                        {/* Text summaries */}
                        <div className="space-y-1.5 p-2.5 bg-slate-950/40 border border-slate-900 rounded-lg text-[11px] text-slate-300 leading-normal">
                          <span className="font-bold text-indigo-300 block">AI Rationale:</span>
                          <p>{scoreObj.rationales?.overallScore || scoreObj.rationales?.skillMatch || "Overall score calculated based on composite candidate suitability model."}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Categories Row */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-900/60">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider font-bold">Assigned Collections/Categories:</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {sj.categories.length === 0 ? (
                        <span className="text-[11px] text-slate-600 italic">No custom categories...</span>
                      ) : (
                        sj.categories.map(cat => (
                          <span key={cat} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 rounded text-[11px]">
                            <Tag className="w-3 h-3 shrink-0" /> {cat}
                            <button 
                              onClick={() => handleRemoveCategory(sj.id, cat)}
                              className="text-indigo-400 hover:text-red-400 font-bold ml-1 text-[9px] focus:outline-none"
                            >
                              ✕
                            </button>
                          </span>
                        ))
                      )}

                      <div className="flex gap-1.5 items-center ml-2">
                        <input
                          type="text"
                          placeholder="New category..."
                          value={newCategory[sj.id] || ""}
                          onChange={(e) => setNewCategory(prev => ({ ...prev, [sj.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && handleAddCategory(sj.id)}
                          className="bg-[#070b13] border border-[#1e293b] rounded-md px-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500 max-w-[120px]"
                        />
                        <button
                          onClick={() => handleAddCategory(sj.id)}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Notes Area */}
                  <div className="pt-2 border-t border-slate-900/60 space-y-1.5">
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Personal Application Notes:</label>
                    <div className="flex gap-2">
                      <textarea
                        rows={2}
                        placeholder="Add personal notes (e.g. recruiter contacts, referral names, salary requirements)..."
                        value={notesText[sj.id] || ""}
                        onChange={(e) => setNotesText(prev => ({ ...prev, [sj.id]: e.target.value }))}
                        className="flex-1 bg-[#070b13] border border-[#1e293b] rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 leading-normal"
                      />
                      <button
                        onClick={() => handleSaveNotes(sj.id)}
                        className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs transition-colors font-semibold self-end py-2"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
        
      </div>

    </div>
  );
}
