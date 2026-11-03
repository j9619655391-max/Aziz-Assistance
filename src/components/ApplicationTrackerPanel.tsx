import React, { useState, useEffect } from "react";
import { 
  Briefcase, Calendar, MapPin, DollarSign, RefreshCw, 
  Trash2, Plus, Sparkles, CheckCircle, Clock, AlertTriangle, 
  Send, UserCheck, BarChart2, Star, ChevronRight, CheckCircle2, AlertCircle
} from "lucide-react";
import { Job, ApplicationTrackerEntry, InterviewStageEntry, FollowupEntry } from "../types";
import FollowUpSequenceWidget from "./FollowUpSequenceWidget";

type ApplicationEntry = ApplicationTrackerEntry;

export default function ApplicationTrackerPanel() {
  const [applications, setApplications] = useState<ApplicationEntry[]>([]);
  const [interviews, setInterviews] = useState<InterviewStageEntry[]>([]);
  const [followups, setFollowups] = useState<FollowupEntry[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"tracker" | "interviews" | "followups" | "sequences">("tracker");

  // Form states for new application
  const [showAddAppForm, setShowAddAppForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newSalary, setNewSalary] = useState("");
  const [newRecruiter, setNewRecruiter] = useState("");
  const [newRecruiterEmail, setNewRecruiterEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // Form states for new interview round
  const [showAddInterviewForm, setShowAddInterviewForm] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [newStageName, setNewStageName] = useState<"Phone Screen" | "Technical Round" | "System Design" | "Culture Fit" | "HR & Compensation">("Technical Round");
  const [newInterviewDate, setNewInterviewDate] = useState("");
  const [newFeedback, setNewFeedback] = useState("");

  // Form states for new follow-up
  const [showAddFollowupForm, setShowAddFollowupForm] = useState(false);
  const [selectedFollowupAppId, setSelectedFollowupAppId] = useState("");
  const [newFollowupPerson, setNewFollowupPerson] = useState("");
  const [newFollowupMethod, setNewFollowupMethod] = useState<"Email" | "LinkedIn" | "Phone">("Email");
  const [newFollowupNotes, setNewFollowupNotes] = useState("");
  const [newReminderDate, setNewReminderDate] = useState("");

  useEffect(() => {
    fetchTrackerData();
  }, []);

  const fetchTrackerData = async () => {
    setIsLoading(true);
    try {
      const [resApps, resInts, resFolls] = await Promise.all([
        fetch("/api/employment/v2/applications"),
        fetch("/api/employment/v2/interviews"),
        fetch("/api/employment/v2/followups")
      ]);

      if (resApps.ok) {
        const d = await resApps.json();
        setApplications(d.applications || []);
        if (d.applications?.length > 0) {
          setSelectedAppId(d.applications[0].id);
          setSelectedFollowupAppId(d.applications[0].id);
        }
      }
      if (resInts.ok) {
        const d = await resInts.json();
        setInterviews(d.interviews || []);
      }
      if (resFolls.ok) {
        const d = await resFolls.json();
        setFollowups(d.followups || []);
      }
    } catch (err) {
      console.error("Error fetching tracker dataset:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newCompany) return;

    const payload = {
      job: {
        id: "JOB-APP-" + Date.now(),
        title: newTitle,
        company: newCompany,
        location: newLocation || "Remote",
        salary: newSalary || "Competitive",
        description: "Manually entered job application tracker record.",
        skillsRequired: []
      },
      appliedDate: new Date().toISOString().split("T")[0],
      currentStatus: "Applied",
      recruiterName: newRecruiter,
      recruiterEmail: newRecruiterEmail,
      notes: newNotes
    };

    try {
      const res = await fetch("/api/employment/v2/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchTrackerData();
        setShowAddAppForm(false);
        // Reset fields
        setNewTitle("");
        setNewCompany("");
        setNewLocation("");
        setNewSalary("");
        setNewRecruiter("");
        setNewRecruiterEmail("");
        setNewNotes("");
      }
    } catch (err) {
      console.error("Error saving new tracker application:", err);
    }
  };

  const handleUpdateStatus = async (id: string, currentStatus: "Applied" | "Interviewing" | "Rejected" | "Offer Received") => {
    try {
      const res = await fetch(`/api/employment/v2/applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStatus })
      });
      if (res.ok) {
        setApplications(prev => prev.map(item => item.id === id ? { ...item, currentStatus } : item));
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (!confirm("Remove this application and all scheduled stages?")) return;
    try {
      const res = await fetch(`/api/employment/v2/applications/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setApplications(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error("Error deleting application:", err);
    }
  };

  const handleAddInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId || !newInterviewDate) return;

    const payload = {
      applicationId: selectedAppId,
      stageName: newStageName,
      scheduledDate: newInterviewDate,
      completed: false,
      feedback: newFeedback
    };

    try {
      const res = await fetch("/api/employment/v2/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchTrackerData();
        setShowAddInterviewForm(false);
        setNewFeedback("");
        setNewInterviewDate("");
      }
    } catch (err) {
      console.error("Error adding interview round:", err);
    }
  };

  const handleCompleteInterview = async (id: string, feedback: string) => {
    try {
      const res = await fetch(`/api/employment/v2/interviews/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true, feedback })
      });
      if (res.ok) {
        setInterviews(prev => prev.map(item => item.id === id ? { ...item, completed: true, feedback } : item));
      }
    } catch (err) {
      console.error("Error setting interview as completed:", err);
    }
  };

  const handleDeleteInterview = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`/api/employment/v2/interviews/${id}`, { method: "DELETE" });
      if (res.ok) {
        setInterviews(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error("Error deleting round:", err);
    }
  };

  const handleAddFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowupAppId || !newFollowupPerson) return;

    const payload = {
      applicationId: selectedFollowupAppId,
      contactDate: new Date().toISOString().split("T")[0],
      contactPerson: newFollowupPerson,
      contactMethod: newFollowupMethod,
      status: "pending",
      notes: newFollowupNotes,
      reminderDate: newReminderDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      reminderSent: false
    };

    try {
      const res = await fetch("/api/employment/v2/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchTrackerData();
        setShowAddFollowupForm(false);
        setNewFollowupPerson("");
        setNewFollowupNotes("");
        setNewReminderDate("");
      }
    } catch (err) {
      console.error("Error logging follow-up:", err);
    }
  };

  const handleUpdateFollowupStatus = async (id: string, status: "responded" | "no-reply") => {
    try {
      const res = await fetch(`/api/employment/v2/followups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setFollowups(prev => prev.map(item => item.id === id ? { ...item, status } : item));
      }
    } catch (err) {
      console.error("Error updating followup:", err);
    }
  };

  const handleDeleteFollowup = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`/api/employment/v2/followups/${id}`, { method: "DELETE" });
      if (res.ok) {
        setFollowups(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error("Error deleting followup log:", err);
    }
  };

  const getDaysSince = (dateStr: string) => {
    const start = new Date(dateStr).getTime();
    const diff = Date.now() - start;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days < 0 ? 0 : days;
  };

  return (
    <div className="space-y-6">
      
      {/* Top Selector Menu and Stat summary banner */}
      <div className="bg-[#0a0f1c] border border-[#1e293b] rounded-xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-sans text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            Active Interview & Pipeline Board
          </h3>
          <p className="text-[11px] text-slate-400 leading-normal">
            Track visual development stages, monitor outbound recruiter conversations, and manage smart follow-ups.
          </p>
        </div>

        {/* Pipeline Sub Tabs */}
        <div className="flex bg-[#030712] border border-[#1e293b] p-0.5 rounded-lg gap-0.5 self-stretch md:self-auto text-xs font-sans">
          <button
            onClick={() => setActiveSubTab("tracker")}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              activeSubTab === "tracker" ? "bg-indigo-600/10 text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            📋 App Tracker ({applications.length})
          </button>
          <button
            onClick={() => setActiveSubTab("interviews")}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              activeSubTab === "interviews" ? "bg-indigo-600/10 text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            🤝 Interviews ({interviews.filter(i => !i.completed).length} active)
          </button>
          <button
            onClick={() => setActiveSubTab("followups")}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              activeSubTab === "followups" ? "bg-indigo-600/10 text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            📨 Follow-up Logs ({followups.filter(f => f.status === "pending").length})
          </button>
          <button
            onClick={() => setActiveSubTab("sequences")}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              activeSubTab === "sequences" ? "bg-indigo-600/10 text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            ⚡ Smart 3D/7D Sequences & Webhook Bridge
          </button>
        </div>
      </div>

      {/* Tracker Content Area */}
      {activeSubTab === "tracker" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Logged Job Applications</span>
            <button
              onClick={() => setShowAddAppForm(!showAddAppForm)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs transition-all font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Log Application Manually
            </button>
          </div>

          {showAddAppForm && (
            <form onSubmit={handleAddApplication} className="p-5 bg-[#0a0f1c] border border-[#1e293b] rounded-xl space-y-4 max-w-2xl">
              <div className="border-b border-slate-900 pb-2 mb-2 flex justify-between items-center">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">Log New Application Entry</span>
                <button type="button" onClick={() => setShowAddAppForm(false)} className="text-slate-500 hover:text-white text-xs">✕</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">ROLE TITLE *</label>
                  <input
                    type="text" required placeholder="e.g. IT Operations Associate"
                    value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">COMPANY NAME *</label>
                  <input
                    type="text" required placeholder="e.g. Siemens Global"
                    value={newCompany} onChange={(e) => setNewCompany(e.target.value)}
                    className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">LOCATION</label>
                  <input
                    type="text" placeholder="e.g. Munich, Germany (Hybrid)"
                    value={newLocation} onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">SALARY / BUDGET</label>
                  <input
                    type="text" placeholder="e.g. €75,000 / year"
                    value={newSalary} onChange={(e) => setNewSalary(e.target.value)}
                    className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">RECRUITER NAME</label>
                  <input
                    type="text" placeholder="e.g. Michael Schmidt"
                    value={newRecruiter} onChange={(e) => setNewRecruiter(e.target.value)}
                    className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">RECRUITER EMAIL</label>
                  <input
                    type="email" placeholder="e.g. m.schmidt@siemens.com"
                    value={newRecruiterEmail} onChange={(e) => setNewRecruiterEmail(e.target.value)}
                    className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1">INITIAL NOTES & COVER LETTER SENT DETAILS</label>
                <textarea
                  rows={3} placeholder="Paste link to job post, or enter general notes here..."
                  value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" /> Save Application
              </button>
            </form>
          )}

          {isLoading ? (
            <div className="text-center py-10 font-mono text-slate-500 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-2" />
              Loading system pipeline tracking data...
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12 bg-[#080d1a] border border-[#1e293b]/50 rounded-xl text-slate-500 text-xs">
              No applications logged yet. Log your first job application using the manual button above, or click "Save Job" inside the Matched Board to begin cataloging.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {applications.map((app) => {
                const ageDays = getDaysSince(app.appliedDate);
                const relatedInterviews = interviews.filter(i => i.applicationId === app.id);
                return (
                  <div key={app.id} className="p-5 bg-[#0a0f1d] border border-[#1e293b] rounded-xl space-y-4">
                    
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">{app.job.company}</span>
                          <span className="text-[10px] text-slate-500 font-mono">Applied {ageDays} days ago ({new Date(app.appliedDate).toLocaleDateString()})</span>
                        </div>
                        <h4 className="font-sans text-sm font-bold text-white">{app.job.title}</h4>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 pt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" /> {app.job.location}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <DollarSign className="w-3.5 h-3.5 text-slate-500" /> {app.job.salary}
                          </span>
                        </div>
                      </div>

                      {/* Status select dropdown */}
                      <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
                        <label className="text-[10px] font-mono text-slate-500 uppercase">Status:</label>
                        <select
                          value={app.currentStatus}
                          onChange={(e) => handleUpdateStatus(app.id, e.target.value as any)}
                          className={`bg-[#070b13] border rounded px-2.5 py-1 text-xs font-mono font-semibold focus:outline-none transition-colors cursor-pointer ${
                            app.currentStatus === "Offer Received" ? "border-emerald-500 text-emerald-400" :
                            app.currentStatus === "Interviewing" ? "border-indigo-500 text-indigo-400" :
                            app.currentStatus === "Rejected" ? "border-red-500 text-red-400" :
                            "border-slate-800 text-slate-300"
                          }`}
                        >
                          <option value="Applied">Applied</option>
                          <option value="Interviewing">Interviewing</option>
                          <option value="Offer Received">Offer Received 🎉</option>
                          <option value="Rejected">Rejected</option>
                        </select>

                        <button
                          onClick={() => handleDeleteApplication(app.id)}
                          className="p-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/15 rounded transition-colors cursor-pointer"
                          title="Remove application record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Recruiter & notes block */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div className="p-3 bg-[#070b13] border border-slate-900 rounded-lg text-xs space-y-1 font-sans">
                        <span className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider font-bold">Recruiter Contact:</span>
                        {app.recruiterName ? (
                          <div className="text-slate-300 space-y-0.5 leading-relaxed">
                            <p className="font-semibold">{app.recruiterName}</p>
                            <p className="text-slate-500 font-mono text-[11px]">{app.recruiterEmail || "No email stored"}</p>
                          </div>
                        ) : (
                          <p className="text-slate-600 italic">No direct recruiter listed</p>
                        )}
                      </div>

                      <div className="p-3 bg-[#070b13] border border-slate-900 rounded-lg text-xs space-y-1 font-sans">
                        <span className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider font-bold">Notes & Tracker Activity:</span>
                        <p className="text-slate-300 line-clamp-2 leading-relaxed">{app.notes || "No notes logged."}</p>
                      </div>
                    </div>

                    {/* Linked interview status */}
                    {relatedInterviews.length > 0 && (
                      <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
                        <span className="block text-[9px] font-mono text-indigo-400 uppercase tracking-wider font-bold mb-1.5">Scheduled Interview Rounds:</span>
                        <div className="flex flex-col gap-1.5">
                          {relatedInterviews.map(i => (
                            <div key={i.id} className="flex justify-between items-center text-xs">
                              <span className="text-slate-300 font-sans flex items-center gap-1.5">
                                {i.completed ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-pulse" />
                                )}
                                <span className="font-semibold text-white">{i.stageName}</span>
                                <span className="text-slate-500 font-mono text-[11px]">({new Date(i.scheduledDate).toLocaleDateString()})</span>
                              </span>
                              {i.completed ? (
                                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.2 rounded font-semibold border border-emerald-500/15">PASSED / LOGGED</span>
                              ) : (
                                <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-1.5 py-0.2 rounded font-semibold animate-pulse">UPCOMING</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Interview Pipeline */}
      {activeSubTab === "interviews" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Upcoming Interview Stages</span>
            <button
              onClick={() => setShowAddInterviewForm(!showAddInterviewForm)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs transition-all font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Book Interview Round
            </button>
          </div>

          {showAddInterviewForm && (
            <form onSubmit={handleAddInterview} className="p-5 bg-[#0a0f1c] border border-[#1e293b] rounded-xl space-y-4 max-w-2xl">
              <div className="border-b border-slate-900 pb-2 mb-2 flex justify-between items-center">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">Book Technical or HR Interview Stage</span>
                <button type="button" onClick={() => setShowAddInterviewForm(false)} className="text-slate-500 hover:text-white text-xs">✕</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">SELECT APPLICATION ENTRY *</label>
                  <select
                    value={selectedAppId}
                    onChange={(e) => setSelectedAppId(e.target.value)}
                    className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {applications.map(app => (
                      <option key={app.id} value={app.id}>{app.job.company} - {app.job.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">INTERVIEW STAGE TYPE *</label>
                  <select
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value as any)}
                    className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Phone Screen">Phone Screen / HR Intake</option>
                    <option value="Technical Round">Technical Round (Live Coding/QA)</option>
                    <option value="System Design">System Architecture & Design</option>
                    <option value="Culture Fit">Leadership & Culture Fit</option>
                    <option value="HR & Compensation">HR Final negotiation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">SCHEDULED DATE & TIME *</label>
                  <input
                    type="datetime-local" required
                    value={newInterviewDate} onChange={(e) => setNewInterviewDate(e.target.value)}
                    className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1">INTERVIEW PREP QUESTIONS / RATIONALE FEEDBACK</label>
                <textarea
                  rows={2} placeholder="Add pre-interview details or candidate notes..."
                  value={newFeedback} onChange={(e) => setNewFeedback(e.target.value)}
                  className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg p-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-4 h-4 animate-pulse" /> Register Interview Stage
              </button>
            </form>
          )}

          {interviews.length === 0 ? (
            <div className="text-center py-12 bg-[#080d1a] border border-[#1e293b]/50 rounded-xl text-slate-500 text-xs">
              No interview stages booked. Use the manual form above to log scheduled interview dates.
            </div>
          ) : (
            <div className="space-y-4">
              {interviews.map(i => {
                const parentApp = applications.find(app => app.id === i.applicationId);
                return (
                  <div key={i.id} className="p-4 bg-[#0a0f1d] border border-[#1e293b] rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white uppercase font-sans">{i.stageName}</span>
                        <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/15 px-1.5 rounded font-mono font-semibold">
                          {parentApp ? parentApp.job.company : "External Position"}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400">
                        🗓️ Scheduled Date: {new Date(i.scheduledDate).toLocaleString()} 
                        ({getDaysSince(i.scheduledDate) > 0 ? "Expired" : "Upcoming"})
                      </p>
                      {i.feedback && (
                        <p className="text-xs text-slate-300 font-sans italic leading-relaxed">"Prep/Feedback: {i.feedback}"</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                      {!i.completed ? (
                        <button
                          onClick={() => {
                            const feedback = prompt("Enter interview experience / reviewer feedback notes:") || "";
                            handleCompleteInterview(i.id, feedback);
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Mark Completed ✓
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded font-semibold">
                          Passed / Completed
                        </span>
                      )}

                      <button
                        onClick={() => handleDeleteInterview(i.id)}
                        className="p-1 bg-red-500/15 hover:bg-red-500/20 text-red-400 border border-red-500/15 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Followups */}
      {activeSubTab === "followups" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Outbound Recruiter Contact Logs</span>
            <button
              onClick={() => setShowAddFollowupForm(!showAddFollowupForm)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs transition-all font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Log Follow-up Task
            </button>
          </div>

          {showAddFollowupForm && (
            <form onSubmit={handleAddFollowup} className="p-5 bg-[#0a0f1c] border border-[#1e293b] rounded-xl space-y-4 max-w-2xl">
              <div className="border-b border-slate-900 pb-2 mb-2 flex justify-between items-center">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">Create Outbound Reminder Task</span>
                <button type="button" onClick={() => setShowAddFollowupForm(false)} className="text-slate-500 hover:text-white text-xs">✕</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">SELECT APPLICATION *</label>
                  <select
                    value={selectedFollowupAppId}
                    onChange={(e) => setSelectedFollowupAppId(e.target.value)}
                    className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none cursor-pointer"
                  >
                    {applications.map(app => (
                      <option key={app.id} value={app.id}>{app.job.company} - {app.job.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">CONTACT PERSON NAME *</label>
                  <input
                    type="text" required placeholder="e.g. Sandra Weber (HR)"
                    value={newFollowupPerson} onChange={(e) => setNewFollowupPerson(e.target.value)}
                    className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">CONTACT CHANNEL *</label>
                  <select
                    value={newFollowupMethod}
                    onChange={(e) => setNewFollowupMethod(e.target.value as any)}
                    className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none cursor-pointer"
                  >
                    <option value="Email">Direct Email</option>
                    <option value="LinkedIn">LinkedIn DM</option>
                    <option value="Phone">Phone Call</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">FOLLOW-UP REMINDER DATE</label>
                  <input
                    type="date"
                    value={newReminderDate} onChange={(e) => setNewReminderDate(e.target.value)}
                    className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1">CONTACT CONTENT NOTES</label>
                <textarea
                  rows={2} placeholder="Brief summary of context (e.g. sent resume correction link)..."
                  value={newFollowupNotes} onChange={(e) => setNewFollowupNotes(e.target.value)}
                  className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg p-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" /> Save Follow-up Reminder
              </button>
            </form>
          )}

          {followups.length === 0 ? (
            <div className="text-center py-12 bg-[#080d1a] border border-[#1e293b]/50 rounded-xl text-slate-500 text-xs">
              No followups cataloged. Create a tracking reminder for outbound recruiter emails using the button above.
            </div>
          ) : (
            <div className="space-y-4">
              {followups.map(f => {
                const parentApp = applications.find(app => app.id === f.applicationId);
                return (
                  <div key={f.id} className="p-4 bg-[#0a0f1d] border border-[#1e293b] rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white">Contact to {f.contactPerson}</span>
                        <span className="text-[10px] text-slate-500 font-mono bg-[#070b13] px-1.5 rounded">
                          Via {f.contactMethod}
                        </span>
                        <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 rounded font-semibold border border-indigo-500/15">
                          {parentApp ? parentApp.job.company : "General"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        ⏱️ Target Response Date: {new Date(f.reminderDate).toLocaleDateString()}
                      </p>
                      {f.notes && <p className="text-slate-300 italic">"Context: {f.notes}"</p>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                      {f.status === "pending" ? (
                        <>
                          <button
                            onClick={() => handleUpdateFollowupStatus(f.id, "responded")}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-semibold transition-colors cursor-pointer"
                          >
                            Mark Responded
                          </button>
                          <button
                            onClick={() => handleUpdateFollowupStatus(f.id, "no-reply")}
                            className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-semibold transition-colors cursor-pointer"
                          >
                            No Reply
                          </button>
                        </>
                      ) : (
                        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                          f.status === "responded" 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {f.status === "responded" ? "RESP_RECEIVED" : "NO_RESPONSE"}
                        </span>
                      )}

                      <button
                        onClick={() => handleDeleteFollowup(f.id)}
                        className="p-1 bg-red-500/15 hover:bg-red-500/20 text-red-400 border border-red-500/15 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Smart 3D/7D Drip Sequences & Webhooks */}
      {activeSubTab === "sequences" && (
        <FollowUpSequenceWidget />
      )}

    </div>
  );
}
