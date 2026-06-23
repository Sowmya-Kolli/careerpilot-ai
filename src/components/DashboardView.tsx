import React from "react";
import { useApp } from "../context/AppContext";
import { 
  Briefcase, 
  Video, 
  FileCode, 
  Award, 
  XOctagon, 
  Clock, 
  Sparkles, 
  ArrowRight,
  TrendingUp
} from "lucide-react";

export const DashboardView: React.FC<{ setView: (view: string) => void }> = ({ setView }) => {
  const { applications, displayName, demoMode, apiKey, connectGmailAccount, enableDemoMode } = useApp();
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  const handleConnectGmail = async () => {
    setIsConnecting(true);
    setErrorMsg("");
    try {
      await connectGmailAccount();
      localStorage.setItem("careerpilot_onboarded", "true");
    } catch (err: any) {
      setErrorMsg(err.message || "Google OAuth connection failed.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTryDemo = async () => {
    setIsConnecting(true);
    setErrorMsg("");
    try {
      await enableDemoMode();
      localStorage.setItem("careerpilot_onboarded", "true");
    } catch (err: any) {
      setErrorMsg("Failed to initialize demo workspace.");
    } finally {
      setIsConnecting(false);
    }
  };

  // Metrics calculations
  const totalCount = applications.length;
  const interviewCount = applications.filter((a) => a.status === "INTERVIEW").length;
  const assessmentCount = applications.filter((a) => a.status === "ASSESSMENT").length;
  const offerCount = applications.filter((a) => a.status === "OFFER").length;
  const rejectCount = applications.filter((a) => a.status === "REJECTED").length;
  const pendingCount = applications.filter((a) => a.status === "PENDING").length;
  const generalUpdateCount = applications.filter((a) => a.status === "GENERAL UPDATE").length;

  const stats = [
    { label: "Total Applications", value: totalCount, subLabel: "Applications tracked", icon: Briefcase, color: "text-purple-650 bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 border-purple-100/50" },
    { label: "Interviews", value: interviewCount, subLabel: "Interviews scheduled", icon: Video, color: "text-blue-600 bg-gradient-to-tr from-blue-500/10 to-sky-500/10 border-blue-100/50" },
    { label: "Assessments", value: assessmentCount, subLabel: "Assessments tracked", icon: FileCode, color: "text-amber-600 bg-gradient-to-tr from-amber-500/10 to-yellow-500/10 border-amber-100/50" },
    { label: "Offers", value: offerCount, subLabel: "Offers received", icon: Award, color: "text-emerald-600 bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 border-emerald-100/50" },
    { label: "Rejected", value: rejectCount, subLabel: "Rejections recorded", icon: XOctagon, color: "text-rose-600 bg-gradient-to-tr from-rose-500/10 to-red-500/10 border-rose-100/50" },
    { label: "Pending", value: pendingCount, subLabel: "Pending review", icon: Clock, color: "text-orange-500 bg-gradient-to-tr from-orange-500/10 to-amber-400/10 border-orange-200/50" },
  ];

  // SVG Donut Chart configuration
  const radius = 50;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius; // ~314.16

  const statusDistribution = [
    { label: "Offers", count: offerCount, color: "url(#grad-offers)", rawColor: "bg-emerald-500", textCol: "text-emerald-700" },
    { label: "Interviews", count: interviewCount, color: "url(#grad-interviews)", rawColor: "bg-blue-500", textCol: "text-blue-700" },
    { label: "Assessments", count: assessmentCount, color: "url(#grad-assessments)", rawColor: "bg-amber-500", textCol: "text-amber-700" },
    { label: "Pending", count: pendingCount, color: "url(#grad-pending)", rawColor: "bg-orange-500", textCol: "text-orange-700" },
    { label: "Rejections", count: rejectCount, color: "url(#grad-rejections)", rawColor: "bg-rose-500", textCol: "text-rose-700" },
    { label: "General Updates", count: generalUpdateCount, color: "url(#grad-general)", rawColor: "bg-purple-500", textCol: "text-purple-700" },
  ].filter((d) => d.count > 0);

  const distributionSum = statusDistribution.reduce((sum, item) => sum + item.count, 0);

  let accumulatedPercentage = 0;
  const slices = statusDistribution.map((dist) => {
    const pct = distributionSum > 0 ? dist.count / distributionSum : 0;
    const strokeLength = circumference * pct;
    const strokeOffset = circumference - (circumference * accumulatedPercentage);
    accumulatedPercentage += pct;
    return {
      ...dist,
      percentage: Math.round(pct * 100),
      strokeLength,
      strokeOffset
    };
  });

  const recentUpdates = applications.slice(0, 5);

  const getStatusBadge = (status: string) => {
    let classes = "";
    let dotClass = "";
    switch (status) {
      case "OFFER":
        classes = "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]";
        dotClass = "bg-[#047857]";
        break;
      case "INTERVIEW":
        classes = "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]";
        dotClass = "bg-[#1D4ED8]";
        break;
      case "ASSESSMENT":
        classes = "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]";
        dotClass = "bg-[#B45309]";
        break;
      case "REJECTED":
        classes = "bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5]";
        dotClass = "bg-[#B91C1C]";
        break;
      case "PENDING":
        classes = "bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]";
        dotClass = "bg-[#C2410C]";
        break;
      case "GENERAL UPDATE":
      default:
        classes = "bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]";
        dotClass = "bg-[#6D28D9]";
        break;
    }
    return (
      <span className={`px-2 py-0.5 rounded-full border text-[8px] font-bold tracking-widest uppercase inline-flex items-center gap-1 shadow-sm ${classes}`}>
        <span className="relative flex h-1 w-1">
          <span className={`animate-ping-slow absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`}></span>
          <span className={`relative inline-flex rounded-full h-1 w-1 ${dotClass}`}></span>
        </span>
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="space-y-8 page-entrance">
      
      {/* Header greeting */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40 border border-white/50 p-5 rounded-[24px] shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 leading-none">
            {demoMode 
              ? "Good evening, Demo User 👋" 
              : displayName 
                ? `Good evening, ${displayName.trim().split(/\s+/)[0]} 👋` 
                : "Good evening 👋"}
          </h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Your recruitment pipeline overview</p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border tracking-wide uppercase ${
          apiKey 
            ? "bg-emerald-50/80 border-emerald-150 text-emerald-700 shadow-sm shadow-emerald-50/10" 
            : "bg-amber-50/80 border-amber-200 text-amber-700 shadow-sm shadow-amber-50/10"
        }`}>
          {apiKey ? "Gemini Agent Active" : "Demo Mode"}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div 
              key={i} 
              className="glass-card glass-card-hover p-4 rounded-[20px] shadow-sm flex flex-col justify-between"
            >
              <div className="flex justify-between items-start w-full">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block leading-tight">{stat.label}</span>
                <div className={`w-8.5 h-8.5 rounded-xl border flex items-center justify-center shadow-sm shrink-0 ml-2 ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-black text-slate-900 block leading-none">{stat.value}</span>
                <span className="text-[9px] text-slate-400 font-semibold mt-1.5 block leading-none">{stat.subLabel}</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Conditional Content Layout */}
      {totalCount === 0 ? (
        <section className="glass-card rounded-[24px] p-16 text-center space-y-5 shadow-sm py-24 flex flex-col items-center justify-center">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl flex items-center justify-center text-purple-650 shadow-inner animate-pulse">
            <Briefcase className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-900 text-sm">
              No applications tracked yet
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed font-semibold">
              Connect Gmail or try demo mode to start.
            </p>
          </div>

          {errorMsg && (
            <p className="text-[10px] text-rose-500 font-bold">{errorMsg}</p>
          )}

          <div className="flex gap-3">
            <button
              disabled={isConnecting}
              onClick={handleConnectGmail}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition disabled:opacity-50"
            >
              <span>Connect Gmail</span>
            </button>
            <button
              disabled={isConnecting}
              onClick={handleTryDemo}
              className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
            >
              <span>Try Demo Workspace</span>
            </button>
          </div>
        </section>
      ) : (
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Donut Chart visual distribution */}
          <section className="lg:col-span-7 space-y-6">
            <div className="glass-card p-6 rounded-[24px] shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100/50 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Application Distribution</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Milestone shares</p>
                </div>
                <TrendingUp className="w-4.5 h-4.5 text-purple-500" />
              </div>

              <div className="grid sm:grid-cols-12 gap-6 items-center">
                {/* Donut SVG */}
                <div className="sm:col-span-6 flex justify-center">
                  <div className="relative w-[200px] h-[200px]">
                    <svg width="200" height="200" viewBox="0 0 160 160" className="mx-auto">
                      <defs>
                        <linearGradient id="grad-offers" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient id="grad-interviews" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="100%" stopColor="#2563EB" />
                        </linearGradient>
                        <linearGradient id="grad-assessments" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#F59E0B" />
                          <stop offset="100%" stopColor="#D97706" />
                        </linearGradient>
                        <linearGradient id="grad-pending" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FDBA74" />
                          <stop offset="100%" stopColor="#C2410C" />
                        </linearGradient>
                        <linearGradient id="grad-rejections" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#EF4444" />
                          <stop offset="100%" stopColor="#DC2626" />
                        </linearGradient>
                        <linearGradient id="grad-general" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#C084FC" />
                          <stop offset="100%" stopColor="#6D28D9" />
                        </linearGradient>
                      </defs>
                      
                      {/* Gray track background */}
                      <circle cx="80" cy="80" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth={strokeWidth} />
                      
                      <g transform="rotate(-90 80 80)">
                        {slices.map((slice, idx) => {
                          if (slice.count === 0) return null;
                          return (
                            <circle
                              key={idx}
                              cx="80"
                              cy="80"
                              r={radius}
                              fill="transparent"
                              stroke={slice.color}
                              strokeWidth={strokeWidth}
                              strokeDasharray={`${slice.strokeLength} ${circumference - slice.strokeLength}`}
                              strokeDashoffset={slice.strokeOffset}
                              strokeLinecap="round"
                              className="transition-all duration-300 hover:stroke-[16px] cursor-pointer"
                            />
                          );
                        })}
                      </g>
                      
                      {/* Center labels */}
                      <text x="80" y="76" textAnchor="middle" className="text-2xl font-black fill-slate-900 font-sans" style={{ dominantBaseline: 'middle' }}>
                        {totalCount}
                      </text>
                      <text x="80" y="94" textAnchor="middle" className="text-[7.5px] font-bold fill-slate-400 uppercase tracking-widest font-sans">
                        Applications Tracked
                      </text>
                    </svg>
                  </div>
                </div>

                {/* Legend list */}
                <div className="sm:col-span-6 space-y-3">
                  {slices.map((slice, idx) => {
                    const pct = slice.percentage;
                    return (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-white/40 border border-slate-100 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${slice.rawColor} shadow-sm`} />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{slice.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-800">{slice.count}</span>
                          <span className={`text-[10px] font-bold pl-2 ${slice.textCol}`}>({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick onboarding action banner */}
            <div className="bg-gradient-to-r from-purple-50/60 to-indigo-50/60 border border-purple-100/50 p-6 rounded-[24px] shadow-sm flex items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-purple-850 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                  <span>Simulate Automated Scans</span>
                </div>
                <p className="text-[11px] text-purple-950/70 max-w-md leading-relaxed font-semibold">
                  Test the email monitoring pipeline immediately. Choose from default recruiter templates or paste a custom recruiter text inside the scanner.
                </p>
              </div>
              <button
                onClick={() => setView("intelligence")}
                className="px-4 py-2.5 btn-premium text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md transition whitespace-nowrap"
              >
                <span>Scan Inbox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>

          {/* Recent Updates Feed */}
          <section className="lg:col-span-5">
            <div className="glass-card p-6 rounded-[24px] shadow-sm h-full flex flex-col">
              <div className="mb-4">
                <h3 className="font-extrabold text-slate-900 text-sm">Latest Recruiter Updates</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Latest events detected by agents</p>
              </div>

              <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[360px] pr-1 custom-scrollbar">
                {recentUpdates.map((app) => (
                  <div 
                    key={app.id} 
                    onClick={() => setView("tracker")}
                    className="group border border-slate-100/80 bg-white/60 hover:bg-white hover:border-purple-250 hover:shadow-md p-5 rounded-[22px] transition-all duration-300 cursor-pointer flex flex-col space-y-4"
                  >
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 tracking-tight leading-tight">{app.company}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{app.role}</p>
                    </div>

                    <div className="space-y-3.5 border-t border-slate-100/80 pt-4">
                      <div>
                        <span className="text-[9px] font-bold text-slate-405 uppercase tracking-widest block mb-0.5">Detected Event</span>
                        <span className="text-xs text-slate-700 font-semibold">{app.date.type}</span>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-slate-405 uppercase tracking-widest block mb-0.5">Important Date</span>
                        <span className="text-xs text-slate-700 font-semibold">
                          {app.date.value !== "Not available" ? app.date.value : app.dateAdded}
                        </span>
                      </div>

                      <div className="pt-1">
                        {getStatusBadge(app.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
