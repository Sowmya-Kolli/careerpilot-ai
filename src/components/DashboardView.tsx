import React from "react";
import { useApp } from "../context/AppContext";
import API_BASE_URL from "../config/api";
import { 
  Briefcase, 
  Video, 
  Clock, 
  TrendingUp,
  X,
  RefreshCw,
  Mail,
  Calendar,
  Activity,
  ChevronRight,
  ListTodo
} from "lucide-react";

const CountUp: React.FC<{ value: number }> = ({ value }) => {
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setCurrent(end);
      return;
    }
    const duration = 600; // ms
    const increment = end / (duration / 16); // ~60fps
    let timer: any = null;
    
    const animate = () => {
      start += increment;
      if (start >= end) {
        setCurrent(end);
      } else {
        setCurrent(Math.floor(start));
        timer = requestAnimationFrame(animate);
      }
    };
    animate();
    
    return () => {
      if (timer) cancelAnimationFrame(timer);
    };
  }, [value]);

  return <>{current}</>;
};

export const DashboardView: React.FC<{ setView: (view: string) => void }> = ({ setView }) => {
  const { 
    applications, 
    displayName, 
    demoMode, 
    apiKey, 
    connectGmailAccount, 
    enableDemoMode, 
    gmailConnected, 
    scanGmailWithGemini, 
    isProcessing, 
    activityLogs, 
    gmailLastSync,
    careerGoal,
    preferredRoles
  } = useApp();

  const [isConnecting, setIsConnecting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");
  const [showWelcomeModal, setShowWelcomeModal] = React.useState(() => {
    const onboarded = localStorage.getItem("careerpilot_onboarded") === "true";
    const welcomeShown = localStorage.getItem("careerpilot_welcome_shown") === "true";
    return onboarded && !welcomeShown && !demoMode && !gmailConnected;
  });

  const [backendOnline, setBackendOnline] = React.useState(false);
  const [showScanModal, setShowScanModal] = React.useState(false);
  const [scanStep, setScanStep] = React.useState<"idle" | "fetching" | "processing" | "completed">("idle");
  const [scanStats, setScanStats] = React.useState<any>(null);

  const formatProcessingTime = (ms: number | undefined): string => {
    if (ms === undefined) return "N/A";
    if (ms < 1000) {
      return `${ms} ms`;
    }
    return `${(ms / 1000).toFixed(1)} seconds`;
  };

  React.useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/applications?email=test@test.com`, { method: "GET" });
        setBackendOnline(res.ok || res.status === 404 || res.status === 400 || res.status === 401 || res.status === 403);
      } catch (e) {
        setBackendOnline(false);
      }
    };
    checkBackend();
  }, []);

  const handleIngestScan = async () => {
    setShowScanModal(true);
    setScanStep("fetching");
    setScanStats(null);
    try {
      const stats = await scanGmailWithGemini(10);
      setScanStep("processing");
      await new Promise(r => setTimeout(r, 1200));
      setScanStats(stats);
      setScanStep("completed");
    } catch (err) {
      console.error(err);
      setScanStep("idle");
      setShowScanModal(false);
      alert("Gmail Ingestion Failed. Check your connection properties.");
    }
  };

  const handleConnectGmail = async () => {
    setIsConnecting(true);
    setErrorMsg("");
    try {
      await connectGmailAccount();
      localStorage.setItem("careerpilot_onboarded", "true");
    } catch (err: any) {
      setErrorMsg(err.message || "Google Connection Failed.");
    } finally {
      setIsConnecting(false);
    }
  };

  // Dynamic calculations using actual data
  const totalCount = applications.length;
  const interviewCount = applications.filter((a) => a.status === "INTERVIEW").length;
  const assessmentCount = applications.filter((a) => a.status === "ASSESSMENT").length;
  const offerCount = applications.filter((a) => a.status === "OFFER").length;
  const pendingCount = applications.filter((a) => a.status === "PENDING").length;

  const calendarEventsCount = applications.reduce((acc, app) => {
    return acc + (app.timeline || []).filter(e => e.extractedDate && e.extractedDate !== "Not available" && e.eventType !== "REJECTED").length;
  }, 0);

  const tasksCount = applications.filter(a => a.nextAction && a.nextAction !== "Not available" && a.nextAction !== "").length;
  const deadlineCount = applications.filter(a => a.status === "ASSESSMENT" && a.deadline && a.deadline !== "Not available").length;

  const statsList = [
    { label: "Applications", value: totalCount, subLabel: "Active opportunities", icon: Briefcase, color: "text-purple-650 bg-purple-500/10 border-purple-500/15" },
    { label: "Upcoming Interviews", value: interviewCount, subLabel: "Discussions booked", icon: Video, color: "text-blue-500 bg-blue-500/10 border-blue-500/15" },
    { label: "Upcoming Deadlines", value: deadlineCount, subLabel: "Time-sensitive tasks", icon: Clock, color: "text-rose-500 bg-rose-500/10 border-rose-500/15" },
    { label: "Tasks", value: tasksCount, subLabel: "Action items logged", icon: ListTodo, color: "text-teal-500 bg-teal-500/10 border-teal-500/15" },
    { label: "Calendar Events", value: calendarEventsCount, subLabel: "Scheduled dates", icon: Calendar, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/15" }
  ];

  // Donut chart calculations
  const radius = 50;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;

  // Slices configuration based on counts
  const slices = [
    { label: "Offers", count: offerCount, color: "url(#grad-offers)", rawColor: "bg-emerald-500", textCol: "text-emerald-550 dark:text-emerald-400" },
    { label: "Interviews", count: interviewCount, color: "url(#grad-interviews)", rawColor: "bg-blue-500", textCol: "text-blue-550 dark:text-blue-400" },
    { label: "Assessments", count: assessmentCount, color: "url(#grad-assessments)", rawColor: "bg-amber-500", textCol: "text-amber-550 dark:text-amber-400" },
    { label: "Pending", count: pendingCount, color: "url(#grad-pending)", rawColor: "bg-orange-500", textCol: "text-orange-550 dark:text-orange-400" },
    { label: "Rejections", count: applications.filter(a => a.status === "REJECTED").length, color: "url(#grad-rejections)", rawColor: "bg-rose-500", textCol: "text-rose-550 dark:text-rose-455" }
  ];

  let cumulativeOffset = 0;
  const totalWeight = slices.reduce((acc, s) => acc + s.count, 0) || 1;
  const slicesWithOffsets = slices.map((slice) => {
    const percentage = Math.round((slice.count / (totalCount || 1)) * 100);
    const strokeLength = (slice.count / totalWeight) * circumference;
    const strokeOffset = cumulativeOffset;
    cumulativeOffset += strokeLength;
    return { ...slice, strokeLength, strokeOffset, percentage };
  });

  // AI Pipeline Workflow Timeline
  const workflowTimeline = [
    { label: "Gmail Connected", status: gmailConnected, detail: gmailConnected ? "Gmail Inbox Linked Successfully" : "Authorization Required" },
    { label: "Inbox Sync Scanned", status: !!gmailLastSync, detail: gmailLastSync ? `Scanned: ${gmailLastSync}` : "No Sync Completed Yet" },
    { label: "Gemini AI Classified", status: !!(apiKey && totalCount > 0), detail: totalCount > 0 ? "Autonomous Tag Classifications Active" : "Waiting for scan detections" },
    { label: "Applications Added", status: totalCount > 0, detail: `${totalCount} opportunities synced to tracker` },
    { label: "Calendar / Checklists Projected", status: calendarEventsCount > 0 || tasksCount > 0, detail: "Timelines mapped and tasks listed" }
  ];

  const getStatusBadge = (status: string) => {
    let classes = "";
    switch (status) {
      case "OFFER":
        classes = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900";
        break;
      case "INTERVIEW":
        classes = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900";
        break;
      case "ASSESSMENT":
        classes = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900";
        break;
      case "REJECTED":
        classes = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-450 dark:border-rose-900";
        break;
      case "PENDING":
      default:
        classes = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900";
        break;
    }
    return (
      <span className={`px-2 py-0.5 rounded-full border text-[8px] font-bold tracking-widest uppercase shadow-sm ${classes}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="v2-page-container space-y-8 animate-in fade-in duration-300">
      
      {/* Statistics Grid */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-5">
        {statsList.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx} 
              className="glass-card p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:shadow-purple-500/10 dark:hover:shadow-purple-500/5 hover:border-purple-300 dark:hover:border-purple-800 group"
            >
              <div className="flex justify-between items-start w-full">
                <span className="text-[9px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-widest leading-none block">{stat.label}</span>
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-sm shrink-0 ml-2 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 ${stat.color}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-slate-900 dark:text-white block leading-none">
                  <CountUp value={stat.value} />
                </span>
                <span className="text-[9.5px] text-slate-400 dark:text-slate-450 font-semibold mt-1.5 block leading-none">{stat.subLabel}</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Welcome Banner Card */}
      <div className="relative rounded-[28px] border border-slate-200/50 dark:border-slate-800/80 p-8 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-sm overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-purple-500/5 dark:bg-purple-500/10 blur-[80px] pointer-events-none" />
        
        <div className="space-y-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-purple-500/15 text-purple-700 dark:text-purple-300 font-extrabold uppercase px-2.5 py-1 rounded-lg border border-purple-500/10 tracking-wider">
              AI Command Center
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-none">
            {demoMode 
              ? "Good evening, Demo User 👋" 
              : displayName 
                ? `Good evening, ${displayName.trim().split(/\s+/)[0]} 👋` 
                : "Good evening 👋"}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold pt-1">
            <span>Goal: <strong className="text-purple-650 dark:text-purple-400">{careerGoal || "Software Engineer Roles"}</strong></span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span>Target: <strong className="text-blue-500">{preferredRoles || "AI, Cloud, Frontend development"}</strong></span>
          </div>
        </div>

        <div className="shrink-0 relative z-10 w-full md:w-auto">
          {gmailConnected ? (
            <button
              disabled={isProcessing}
              onClick={handleIngestScan}
              className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-650 text-white font-extrabold text-xs rounded-xl shadow-md transition-all duration-200 hover:shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing Ingest...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
                  <span>Trigger Quick Inbox Scan</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleConnectGmail}
              className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              <span>Link Gmail Ingestion</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Columns Layout */}
      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Left Column (Diagnostic Status, Activity Timeline, Log consoles) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* AI Connection Diagnostics Panel */}
          <div className="glass-card p-6 space-y-5">
            <h3 className="font-extrabold text-slate-905 dark:text-white text-sm border-b border-slate-100/50 dark:border-slate-800 pb-3">
              AI Connection Diagnostics
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: "Gmail Connection", active: gmailConnected, label: gmailConnected ? "✓ Connected" : "✕ Disconnected", color: gmailConnected ? "bg-emerald-500" : "bg-rose-500" },
                { name: "Gemini AI API", active: !!apiKey, label: apiKey ? "✓ Ready" : "✕ Key Needed", color: apiKey ? "bg-emerald-500" : "bg-rose-500" },
                { name: "Supabase Connection", active: backendOnline, label: backendOnline ? "✓ Active (DB)" : "✕ Local Fallback", color: backendOnline ? "bg-emerald-500" : "bg-rose-500" },
                { name: "Backend Online", active: backendOnline, label: backendOnline ? "✓ Online" : "✕ Offline", color: backendOnline ? "bg-emerald-500" : "bg-rose-500" }
              ].map((diag, i) => (
                <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 rounded-xl flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    {diag.active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${diag.color}`}></span>
                  </span>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block uppercase tracking-wider text-[8px] font-bold">{diag.name}</span>
                    <span className="text-slate-800 dark:text-slate-300 font-extrabold text-[10px] mt-0.5 block leading-none">{diag.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Pipeline Timeline */}
          <div className="glass-card p-6 space-y-6">
            <h3 className="font-extrabold text-slate-905 dark:text-white text-sm border-b border-slate-100/50 dark:border-slate-800 pb-3">
              Autonomous Execution Workflow
            </h3>

            <div className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-800 space-y-6">
              {workflowTimeline.map((item, idx) => (
                <div key={idx} className="relative">
                  {/* Status checklist check dot */}
                  <div className={`absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shadow-sm ${
                    item.status 
                      ? "bg-emerald-500 border-emerald-500 text-white" 
                      : "bg-white dark:bg-slate-900 border-slate-205 dark:border-slate-800 text-slate-400"
                  }`}>
                    <span className="text-[9px] font-black">{item.status ? "✓" : "◦"}</span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{item.label}</h4>
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold mt-0.5">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Console log output */}
          {activityLogs && activityLogs.length > 0 && (
            <div className="glass-card p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100/50 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-650 animate-pulse" />
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wide">Orchestrator Activity Logs</h3>
                </div>
                <button 
                  onClick={() => setView("activity")}
                  className="text-[9px] font-black text-purple-650 hover:underline uppercase tracking-wide"
                >
                  Full Console View
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 h-32 overflow-y-auto font-mono text-[9px] text-purple-300 space-y-1 scrollbar-thin">
                <div className="text-slate-500 pb-1.5 border-b border-slate-900 mb-1.5 flex justify-between font-sans text-[8px] font-bold">
                  <span>STAMP: {new Date(activityLogs[0].timestamp).toLocaleTimeString()}</span>
                  <span className="text-emerald-400">GUARD: {activityLogs[0].guardrailStatus}</span>
                </div>
                {activityLogs[0].logs.slice(0, 4).map((line, lIdx) => (
                  <div key={lIdx} className="truncate">
                    <span className="text-slate-650 select-none mr-2">&gt;</span>
                    {line}
                  </div>
                ))}
                {activityLogs[0].logs.length > 4 && (
                  <div className="text-[8px] font-sans text-slate-500 italic pl-4">
                    + {activityLogs[0].logs.length - 4} more logs in stream
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column (Quick Actions, Status share charts) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Quick Glass Actions */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm border-b border-slate-100/50 dark:border-slate-800 pb-3">
              Quick Shortcuts
            </h3>

            <div className="grid grid-cols-1 gap-2.5">
              <button 
                onClick={gmailConnected ? handleIngestScan : handleConnectGmail}
                className="group flex items-center justify-between p-3.5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-850 hover:border-purple-300 dark:hover:border-purple-700 hover:-translate-y-0.5 hover:shadow-md hover:shadow-purple-500/5 transition-all duration-305 text-xs font-bold w-full"
              >
                <div className="flex items-center gap-2.5">
                  <RefreshCw className="w-4 h-4 text-purple-500 group-hover:rotate-45 transition-transform duration-300" />
                  <span>Scan Recruiter Inbox</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => setView("tracker")}
                className="group flex items-center justify-between p-3.5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-850 hover:border-purple-300 dark:hover:border-purple-700 hover:-translate-y-0.5 hover:shadow-md hover:shadow-purple-500/5 transition-all duration-305 text-xs font-bold w-full"
              >
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                  <span>Manual Application Log</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => setView("tracker")}
                className="group flex items-center justify-between p-3.5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-850 hover:border-purple-300 dark:hover:border-purple-700 hover:-translate-y-0.5 hover:shadow-md hover:shadow-purple-500/5 transition-all duration-305 text-xs font-bold w-full"
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-pink-500 group-hover:scale-110 transition-transform" />
                  <span>Open Pipeline Tracker</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => setView("calendar")}
                className="group flex items-center justify-between p-3.5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-850 hover:border-purple-300 dark:hover:border-purple-700 hover:-translate-y-0.5 hover:shadow-md hover:shadow-purple-500/5 transition-all duration-305 text-xs font-bold w-full"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-indigo-500 group-hover:rotate-6 transition-transform" />
                  <span>Open Milestones Calendar</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => setView("settings")}
                className="group flex items-center justify-between p-3.5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-850 hover:border-purple-300 dark:hover:border-purple-700 hover:-translate-y-0.5 hover:shadow-md hover:shadow-purple-500/5 transition-all duration-305 text-xs font-bold w-full"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                  <span>Manage Sync Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Status Distribution slice map */}
          {totalCount > 0 && (
            <div className="glass-card p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100/50 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-slate-905 dark:text-white text-sm">Status Distribution</h3>
                <TrendingUp className="w-4.5 h-4.5 text-purple-500" />
              </div>

              <div className="flex justify-center relative">
                <svg width="140" height="140" viewBox="0 0 160 160">
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
                  
                  <circle cx="80" cy="80" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth={strokeWidth} className="dark:stroke-slate-800" />
                  
                  <g transform="rotate(-90 80 80)">
                    {slicesWithOffsets.map((slice, idx) => {
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
                  
                  <text x="80" y="80" textAnchor="middle" className="text-2xl font-black fill-slate-900 dark:fill-white font-sans" style={{ dominantBaseline: 'middle' }}>
                    {totalCount}
                  </text>
                  {/* General */}
                </svg>
              </div>

              <div className="space-y-2 pt-2">
                {slicesWithOffsets.map((slice, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[10px] font-bold p-2 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100/50 dark:border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${slice.rawColor}`} />
                      <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider">{slice.label}</span>
                    </div>
                    <div>
                      <span className="text-slate-800 dark:text-slate-200 font-extrabold">{slice.count}</span>
                      <span className={`pl-1.5 ${slice.textCol}`}>({slice.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Welcome Dialog Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-2xl max-w-sm w-full overflow-hidden p-8 space-y-6 text-center animate-in zoom-in-95 duration-200 relative">
            <button 
              onClick={() => {
                localStorage.setItem("careerpilot_welcome_shown", "true");
                setShowWelcomeModal(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <h3 className="font-extrabold text-slate-905 dark:text-white text-lg leading-tight">Welcome to CareerPilot AI 🚀</h3>
              <p className="text-xs text-slate-505 dark:text-slate-400 font-semibold">How would you like to begin?</p>
            </div>

            {errorMsg && (
              <p className="text-[10px] text-rose-500 font-bold">{errorMsg}</p>
            )}

            <div className="flex flex-col gap-3">
              <button
                disabled={isConnecting}
                onClick={async () => {
                  setIsConnecting(true);
                  setErrorMsg("");
                  try {
                    await connectGmailAccount();
                    localStorage.setItem("careerpilot_welcome_shown", "true");
                    setShowWelcomeModal(false);
                  } catch (err: any) {
                    setErrorMsg(err.message || "Connection failed.");
                  } finally {
                    setIsConnecting(false);
                  }
                }}
                className="py-3 px-4 bg-indigo-600 hover:bg-indigo-750 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md active:scale-95"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Connecting Google...</span>
                  </>
                ) : (
                  <span>Connect Gmail</span>
                )}
              </button>

              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">OR</div>

              <button
                disabled={isConnecting}
                onClick={async () => {
                  setIsConnecting(true);
                  setErrorMsg("");
                  try {
                    await enableDemoMode();
                    localStorage.setItem("careerpilot_welcome_shown", "true");
                    setShowWelcomeModal(false);
                  } catch (err: any) {
                    setErrorMsg("Failed to initialize demo workspace.");
                  } finally {
                    setIsConnecting(false);
                  }
                }}
                className="py-3 px-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-202 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                    <span>Loading Demo...</span>
                  </>
                ) : (
                  <span>Explore Demo Workspace</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Ingestion Progress Modal */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-805 shadow-2xl max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-250 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-50/50 to-blue-50/20 dark:from-slate-900 dark:to-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-200/50 dark:bg-purple-950 dark:border-purple-900 flex items-center justify-center text-purple-650 shadow-sm">
                  <RefreshCw className={`w-4 h-4 ${scanStep !== "completed" ? "animate-spin" : ""}`} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Gmail Ingestion Monitor</h3>
                  <p className="text-[9px] text-slate-405 dark:text-slate-500 font-bold uppercase tracking-wider">Multi-Agent Ingest Stream</p>
                </div>
              </div>
              {scanStep === "completed" && (
                <button 
                  onClick={() => setShowScanModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-8 space-y-6 overflow-y-auto custom-scrollbar">
              
              {/* Progress Steps status visual */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-350">Pipeline Status</span>
                  <span className="text-purple-650 dark:text-purple-400 uppercase tracking-widest text-[10px]">
                    {scanStep === "fetching" && "Ingesting Emails..."}
                    {scanStep === "processing" && "Executing Multi-Agents..."}
                    {scanStep === "completed" && "Ingestion Complete"}
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500 rounded-full"
                    style={{
                      width: scanStep === "fetching" ? "35%" : scanStep === "processing" ? "70%" : "100%"
                    }}
                  />
                </div>
              </div>

              {/* Scan results info */}
              {scanStep === "completed" && scanStats && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  
                  {/* Ingestion Stats List Summary */}
                  <div className="bg-slate-50/50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-150/40 dark:border-slate-800 space-y-3 font-semibold text-slate-700 dark:text-slate-350">
                    <div className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider pb-1.5 border-b border-slate-200/40 dark:border-slate-800">
                      Scan Completed Successfully
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span>Emails Scanned:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{scanStats.fetched}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span>Recruiter Emails Found:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{scanStats.processed}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span>New Applications:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{scanStats.newEmailsProcessed}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span>Existing Applications:</span>
                      <span className="font-bold text-indigo-655 dark:text-indigo-400">{scanStats.existingRecordsUpdated}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span>Tasks Generated:</span>
                      <span className="font-bold text-teal-600 dark:text-teal-400">{scanStats.stats?.tasksCreated ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span>Calendar Events Created:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{scanStats.stats?.calendarEventsCreated ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/40 dark:border-slate-800">
                      <span className="font-bold text-slate-805 dark:text-slate-300">Processing Time:</span>
                      <span className="font-black text-purple-650 dark:text-purple-400">
                        {formatProcessingTime(scanStats.executionTimeMs)}
                      </span>
                    </div>
                  </div>

                  {/* Opportunities listed */}
                  {scanStats.opportunities && scanStats.opportunities.length > 0 && (
                    <div className="space-y-2.5">
                      <span className="text-[9px] font-bold text-slate-405 dark:text-slate-550 uppercase tracking-widest block">Identified Opportunities</span>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                        {scanStats.opportunities.map((opp: any, oppIdx: number) => (
                          <div key={oppIdx} className="flex justify-between items-center p-3 bg-white dark:bg-slate-850 border border-slate-105 dark:border-slate-800 rounded-xl hover:border-purple-250 shadow-sm transition">
                            <div>
                              <span className="font-extrabold text-xs text-slate-855 dark:text-white block leading-tight">{opp.company}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{opp.role}</span>
                            </div>
                            {getStatusBadge(opp.status)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanStats.fetched === 0 && (
                    <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 italic font-semibold">
                      📭 Your inbox is fully synced. No new career emails found.
                    </div>
                  )}

                </div>
              )}

              {/* Waiting states messages */}
              {scanStep !== "completed" && (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <RefreshCw className="w-8 h-8 text-purple-650 animate-spin" />
                  <div className="text-center">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-205 block">
                      {scanStep === "fetching" && "Ingesting new messages from Gmail..."}
                      {scanStep === "processing" && "Executing multi-agent evaluation workflow..."}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                      {scanStep === "fetching" && "Ingesting headers and matching email fingerprints"}
                      {scanStep === "processing" && "Classifying updates, extracting dates, and checking guardrails"}
                    </span>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            {scanStep === "completed" && (
              <div className="px-8 py-4 bg-slate-55 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-805 flex justify-end">
                <button
                  onClick={() => setShowScanModal(false)}
                  className="px-5 py-2.5 bg-purple-650 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition hover:shadow-lg active:scale-95"
                >
                  Done
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
