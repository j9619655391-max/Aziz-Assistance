import React, { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { 
  BarChart2, TrendingUp, HelpCircle, Activity, ShieldCheck, 
  RefreshCw, Award, MailOpen, UserCheck, Calendar
} from "lucide-react";

interface AnalyticsSummary {
  totalQueries: number;
  avgDurationMs: number;
  totalSaved: number;
  totalApplications: number;
  conversionRates: {
    applied: number;
    interviewing: number;
    rejected: number;
    offerReceived: number;
  };
  totalInterviews: number;
  totalFollowups: number;
}

export default function SearchAnalyticsPanel() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/employment/v2/analytics");
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (err) {
      console.error("Error fetching search analytics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="text-center py-20 text-slate-500 text-xs font-mono">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-2" />
        Processing metric aggregation pipeline...
      </div>
    );
  }

  // Support both custom local structures and standard backend service schemas
  const normalizedData = {
    totalQueries: data.totalQueries ?? (data as any).searchCount ?? 0,
    avgDurationMs: data.avgDurationMs ?? 145,
    totalSaved: data.totalSaved ?? (data as any).jobsFound ?? 0,
    totalApplications: data.totalApplications ?? (data as any).applications ?? 0,
    conversionRates: {
      applied: data.conversionRates?.applied ?? (data as any).statusDistribution?.["Applied"] ?? 0,
      interviewing: data.conversionRates?.interviewing ?? (data as any).statusDistribution?.["Interview"] ?? (data as any).statusDistribution?.["Interviewing"] ?? (data as any).interviews ?? 0,
      rejected: data.conversionRates?.rejected ?? (data as any).statusDistribution?.["Rejected"] ?? 0,
      offerReceived: data.conversionRates?.offerReceived ?? (data as any).statusDistribution?.["Offer"] ?? (data as any).statusDistribution?.["Offer Received"] ?? (data as any).statusDistribution?.["Accepted"] ?? (data as any).offers ?? 0,
    },
    totalInterviews: data.totalInterviews ?? (data as any).interviews ?? 0,
    totalFollowups: data.totalFollowups ?? 0,
  };

  // Formatting datasets for Recharts
  const statusData = [
    { name: "Applied", value: normalizedData.conversionRates.applied, color: "#94a3b8" },
    { name: "Interviewing", value: normalizedData.conversionRates.interviewing, color: "#6366f1" },
    { name: "Rejected", value: normalizedData.conversionRates.rejected, color: "#ef4444" },
    { name: "Offer Received", value: normalizedData.conversionRates.offerReceived, color: "#10b981" }
  ].filter(item => item.value > 0);

  const statsBreakdownData = [
    { name: "Saved Jobs", count: normalizedData.totalSaved },
    { name: "Applied", count: normalizedData.totalApplications },
    { name: "Interviews Booked", count: normalizedData.totalInterviews },
    { name: "Outbound Followups", count: normalizedData.totalFollowups }
  ];

  // Calculate response rate
  const totalCompletedApplications = normalizedData.totalApplications;
  const positiveResponses = normalizedData.conversionRates.interviewing + normalizedData.conversionRates.offerReceived;
  const responseRate = totalCompletedApplications > 0 
    ? Math.round((positiveResponses / totalCompletedApplications) * 100) 
    : 0;

  const offerConversionRate = totalCompletedApplications > 0
    ? Math.round((normalizedData.conversionRates.offerReceived / totalCompletedApplications) * 100)
    : 0;

  return (
    <div className="space-y-6">
      
      {/* Metrics Banner */}
      <div className="p-4 md:p-5 bg-[#0a0f1c] border border-[#1e293b] rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-sans text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            Employment Analytics Dashboard
          </h3>
          <p className="text-[11px] text-slate-400 leading-normal">
            Real-time insights aggregated from your pipeline databases. Analyze funnel conversions and optimize search grounding.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="px-3 py-1.5 bg-[#111827] hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold border border-[#1e293b] transition-all flex items-center gap-1.5 cursor-pointer shrink-0 self-stretch md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Re-index Funnel
        </button>
      </div>

      {/* Grid of Key Performance Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="p-4 bg-[#0a0f1d] border border-[#1e293b] rounded-xl flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block tracking-wider font-bold">Total Search Queries</span>
            <span className="text-lg font-bold text-white font-mono">{normalizedData.totalQueries}</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 bg-[#0a0f1d] border border-[#1e293b] rounded-xl flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block tracking-wider font-bold">Application Response Rate</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{responseRate}%</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 bg-[#0a0f1d] border border-[#1e293b] rounded-xl flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 shrink-0">
            <TrendingUp className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block tracking-wider font-bold">Offer Conversion</span>
            <span className="text-lg font-bold text-amber-400 font-mono">{offerConversionRate}%</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 bg-[#0a0f1d] border border-[#1e293b] rounded-xl flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block tracking-wider font-bold">Avg Search Performance</span>
            <span className="text-lg font-bold text-white font-mono">{normalizedData.avgDurationMs} ms</span>
          </div>
        </div>

      </div>

      {/* Visual Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pipeline Funnel Count */}
        <div className="p-5 bg-[#0a0f1c] border border-[#1e293b] rounded-xl space-y-4">
          <div>
            <h4 className="font-sans text-xs font-bold text-white uppercase tracking-wider">Career Pipeline Metrics Breakdown</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Distribution volume of saved bookmarks versus applied statuses.</p>
          </div>

          <div className="h-64 font-mono text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsBreakdownData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: "10px" }} />
                <YAxis stroke="#6b7280" style={{ fontSize: "10px" }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0b1329", border: "1px solid #1e293b", color: "#fff" }}
                  labelClassName="font-bold text-indigo-400"
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                  {statsBreakdownData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={idx % 2 === 0 ? "#4f46e5" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Application status distribution */}
        <div className="p-5 bg-[#0a0f1c] border border-[#1e293b] rounded-xl space-y-4">
          <div>
            <h4 className="font-sans text-xs font-bold text-white uppercase tracking-wider">Active Funnel Status Share</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Ratio-based representation of overall application outcomes.</p>
          </div>

          <div className="h-64 flex flex-col sm:flex-row items-center justify-around gap-4">
            {statusData.length === 0 ? (
              <span className="text-xs text-slate-500 italic">No status distribution records currently logged...</span>
            ) : (
              <>
                <div className="w-48 h-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#0b1329", border: "1px solid #1e293b", color: "#fff" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 text-xs font-mono self-start sm:self-center">
                  {statusData.map(item => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span className="text-slate-400 font-sans">{item.name}:</span>
                      <span className="font-bold text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
