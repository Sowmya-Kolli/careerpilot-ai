import React from "react";
import { useApp } from "../context/AppContext";
import { 
  Terminal, 
  Cpu, 
  Mail
} from "lucide-react";

export const AgentActivityView: React.FC = () => {
  const { 
    activityLogs, 
    clearLogs 
  } = useApp();

  // Sort logs by timestamp newest first
  const sortedLogs = React.useMemo(() => {
    return [...activityLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activityLogs]);

  return (
    <div className="v2-page-container space-y-8 animate-in fade-in duration-300">
      
      {/* Header section */}
      <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800/80 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-none">
            Agent Activity Console
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
            Real-time multi-agent execution telemetry and security validation
          </p>
        </div>
        
        {activityLogs.length > 0 && (
          <button
            onClick={clearLogs}
            className="px-3.5 py-2 border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-655 dark:text-slate-400 text-xs font-semibold rounded-xl transition active:scale-95 shadow-sm"
          >
            Clear Telemetry Logs
          </button>
        )}
      </div>

      {/* Main Console content */}
      <section className="space-y-6">
        
        {/* Terminal Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-slate-400 rounded-t-2xl border-b border-slate-850 text-[10px] font-mono font-bold uppercase tracking-wider">
          <Terminal className="w-3.5 h-3.5 text-purple-400" />
          <span>Active Ingestion Streams & Telemetries</span>
        </div>

        {/* Logs List Container */}
        <div className="space-y-4">
          {sortedLogs.length > 0 ? (
            sortedLogs.map((log, idx) => {
              const hasStructured = log.structuredPayload && typeof log.structuredPayload === "object";
              const isGmailScan = hasStructured && log.structuredPayload.stats;
              const isSuccess = log.guardrailStatus === "PASSED";
              
              return (
                <div 
                  key={idx}
                  className="glass-card p-6 rounded-2xl hover:border-purple-250 transition duration-200 space-y-4"
                >
                  {/* Log meta header */}
                  <div className="flex justify-between items-center border-b border-slate-100/60 dark:border-slate-800/80 pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8.5 h-8.5 rounded-lg border flex items-center justify-center shrink-0 shadow-sm ${
                        isSuccess 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900" 
                          : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900"
                      }`}>
                        <Cpu className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block tracking-wider leading-none mb-1">Agent Action</span>
                        <h4 className="text-xs font-extrabold text-slate-905 dark:text-white leading-none capitalize">
                          {log.agent ? log.agent.replace("-", " ") : "System Sync"}
                        </h4>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <span className="text-[10px] font-bold text-slate-455 dark:text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase ${
                        isSuccess 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900" 
                          : "bg-purple-50 text-purple-755 border border-purple-100 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900"
                      }`}>
                        {log.guardrailStatus || "PASSED"}
                      </span>
                    </div>
                  </div>

                  {/* Core Payload content */}
                  {hasStructured ? (
                    isGmailScan ? (
                      /* Structured Gmail Scan Card */
                      <div className="space-y-4 font-semibold">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-purple-500" />
                          <span className="font-extrabold text-xs text-slate-905 dark:text-white">
                            Gmail Inbox Scanning Agent Run
                          </span>
                        </div>

                        <div className="pl-6 space-y-4">
                          {/* Chronological steps list */}
                          <div className="relative pl-5 border-l-2 border-slate-100 dark:border-slate-805 space-y-2.5 my-3">
                            {log.structuredPayload.steps.map((stepStr: string, sIdx: number) => {
                              return (
                                <div key={sIdx} className="relative text-[10px] text-slate-650 dark:text-slate-400 leading-relaxed font-bold">
                                  <span className="absolute -left-[24px] top-0.5 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[7px] font-black shadow-sm">
                                    ✓
                                  </span>
                                  <span>{stepStr}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Quick statistics checklist */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-850 text-[10px] text-slate-600 dark:text-slate-400">
                            <div>📥 Scanned: <span className="font-bold text-slate-900 dark:text-white">{log.structuredPayload.stats.emailsScanned}</span></div>
                            <div>🎯 Match: <span className="font-bold text-slate-900 dark:text-white">{log.structuredPayload.stats.careerEmailsDetected} recruiter</span></div>
                            <div>✨ Created: <span className="font-bold text-emerald-600 dark:text-emerald-400">{log.structuredPayload.stats.newApplicationsAdded} apps</span></div>
                            <div>🔄 Updated: <span className="font-bold text-indigo-650 dark:text-indigo-400">{log.structuredPayload.stats.existingApplicationsUpdated} apps</span></div>
                            <div>📋 Tasks: <span className="font-bold text-teal-650 dark:text-teal-400">{log.structuredPayload.stats.tasksCreated} tasks</span></div>
                            <div>📅 Events: <span className="font-bold text-indigo-600 dark:text-indigo-400">{log.structuredPayload.stats.calendarEventsCreated} calendar</span></div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Structured Manual Run Card */
                      <div className="space-y-4 font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="text-base shrink-0">📧</span>
                          <span className="font-extrabold text-xs text-slate-905 dark:text-white">
                            Recruitment Email Intel Analysis
                          </span>
                        </div>

                        <div className="pl-6 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <div>
                              <span className="font-black text-slate-850 dark:text-white block">{log.structuredPayload.company}</span>
                              <span className="text-[10px] text-slate-455 dark:text-slate-400 font-bold block">{log.structuredPayload.role}</span>
                            </div>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                              log.structuredPayload.category === 'OFFER' ? 'bg-emerald-100 text-emerald-800' :
                              log.structuredPayload.category === 'INTERVIEW' ? 'bg-indigo-100 text-indigo-800' :
                              log.structuredPayload.category === 'ASSESSMENT' ? 'bg-purple-100 text-purple-800' :
                              'bg-slate-100 text-slate-855'
                            }`}>
                              {log.structuredPayload.category}
                            </span>
                          </div>

                          {/* Chronological steps list */}
                          <div className="relative pl-5 border-l-2 border-slate-100 dark:border-slate-805 space-y-2.5 my-3">
                            {log.structuredPayload.steps.map((stepStr: string, sIdx: number) => (
                              <div key={sIdx} className="relative text-[10px] text-slate-655 dark:text-slate-400 leading-relaxed font-bold">
                                <span className="absolute -left-[24px] top-0.5 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[7px] font-black shadow-sm">
                                  ✓
                                </span>
                                <span>{stepStr}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850 text-[10px] text-slate-500">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5 leading-none">Confidence</span>
                              <span className="text-xs font-black text-slate-800 dark:text-slate-205">{Math.round(log.structuredPayload.confidence * 100)}%</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5 leading-none">Status</span>
                              <span className="text-xs font-extrabold text-emerald-600">Completed</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    /* Flat system log or custom legacy log */
                    <div className="space-y-3 pl-6">
                      <div className="flex items-start gap-2">
                        <span className="text-xs shrink-0">⚙️</span>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider leading-none">
                            System
                          </span>
                          <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 leading-normal block">
                            {log.logs && log.logs[0] ? log.logs[0] : "Refreshed workspace metrics."}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="glass-card rounded-[24px] p-20 text-center space-y-4 shadow-sm border-dashed border-2 border-purple-200/40">
              <div className="w-12 h-12 bg-purple-500/10 border border-purple-200/20 rounded-2xl flex items-center justify-center mx-auto text-purple-600 shadow-inner">
                <Terminal className="w-6 h-6 text-purple-650" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-905 dark:text-white text-sm">
                  No Telemetry Available
                </h4>
                <p className="text-xs text-slate-455 dark:text-slate-500 max-w-xs mx-auto leading-relaxed font-semibold">
                  Logs from pipeline executions and agent classification steps will appear here in real-time.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
  );
};
