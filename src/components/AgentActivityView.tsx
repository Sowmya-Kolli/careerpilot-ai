import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { 
  Terminal, 
  ShieldCheck, 
  Play, 
  Cpu, 
  Clock,
  FileCheck,
  Zap,
  Mail,
  Tag,
  Building,
  Lightbulb,
  Lock,
  RefreshCw,
  ArrowDown
} from "lucide-react";

export const AgentActivityView: React.FC = () => {
  const { 
    activityLogs, 
    evaluations, 
    isEvaluating, 
    runSystemEvaluations,
    clearLogs 
  } = useApp();

  const [selectedLogIndex] = useState<number>(0);

  // Evaluation calculations
  const totalEvals = evaluations.length;
  const passedEvals = evaluations.filter((e) => e.passed).length;
  const accuracy = totalEvals > 0 ? Math.round((passedEvals / totalEvals) * 100) : 0;
  const avgLatency = totalEvals > 0 ? Math.round(evaluations.reduce((acc, curr) => acc + curr.latencyMs, 0) / totalEvals) : 0;

  // Sort logs by timestamp newest first
  const sortedLogs = React.useMemo(() => {
    return [...activityLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activityLogs]);

  // Selected active log telemetry
  const activeLog = sortedLogs.length > 0 && selectedLogIndex < sortedLogs.length
    ? sortedLogs[selectedLogIndex]
    : sortedLogs.length > 0 ? sortedLogs[0] : null;

  return (
    <div className="space-y-8 page-entrance">
      
      {/* Metrics Row */}
      <section className="grid md:grid-cols-2 gap-6">
        
        {/* Run Evaluation Box */}
        <div className="glass-card p-6 rounded-[24px] shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-650" />
              <h3 className="font-extrabold text-slate-900 text-sm">Evaluation System</h3>
            </div>
            <p className="text-[11px] text-slate-450 leading-relaxed font-semibold">
              Execute diagnostic test suites using `evaluations/email_tests.json` to evaluate agent classification, company resolution accuracy, and response latencies.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runSystemEvaluations}
              disabled={isEvaluating}
              className="px-4.5 py-2.5 btn-premium text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition"
            >
              {isEvaluating ? (
                <>
                  <Zap className="w-4 h-4 animate-spin text-white" />
                  <span>Evaluating Sandbox...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-white" fill="white" />
                  <span>Run Sandbox Evaluations</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Evaluation Summary Stats */}
        <div className="glass-card p-6 rounded-[24px] shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-purple-650" />
              <h3 className="font-extrabold text-slate-900 text-sm">Evaluation Results</h3>
            </div>
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Diagnostic telemetry summary from the last runs</p>
          </div>

          {totalEvals > 0 ? (
            <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-3">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-widest leading-none">Accuracy</span>
                <span className={`text-lg font-black leading-none ${accuracy === 100 ? "text-emerald-600" : "text-purple-650"}`}>
                  {accuracy}%
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-widest leading-none">Latency</span>
                <span className="text-lg font-black text-slate-900 leading-none">{avgLatency}ms</span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-widest leading-none">Pass Rate</span>
                <span className="text-lg font-black text-slate-900 leading-none">{passedEvals}/{totalEvals}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-2 italic font-semibold">
              No evaluation test runs executed in this session.
            </div>
          )}
        </div>

      </section>

      {/* Live Evaluations Panel */}
      {evaluations.length > 0 && (
        <section className="glass-card rounded-[24px] p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Test Suite Report</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Telemetry outputs mapped from evaluations/email_tests.json</p>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-150">
                  <th className="py-2.5 px-4 font-bold text-slate-450 uppercase tracking-widest text-[9px]">Test Case</th>
                  <th className="py-2.5 px-4 font-bold text-slate-455 uppercase tracking-widest text-[9px]">Expected status</th>
                  <th className="py-2.5 px-4 font-bold text-slate-455 uppercase tracking-widest text-[9px]">Actual status</th>
                  <th className="py-2.5 px-4 font-bold text-slate-455 uppercase tracking-widest text-[9px]">Company status</th>
                  <th className="py-2.5 px-4 font-bold text-slate-455 uppercase tracking-widest text-[9px]">Latency</th>
                  <th className="py-2.5 px-4 font-bold text-slate-455 uppercase tracking-widest text-[9px] text-right">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {evaluations.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/40">
                    <td className="py-3 px-4 font-bold text-slate-800">{report.name}</td>
                    <td className="py-3 px-4 text-slate-450 font-bold uppercase tracking-wide text-[10px]">{report.expectedStatus}</td>
                    <td className="py-3 px-4 font-bold text-[10px] uppercase">
                      <span className={report.statusMatch ? "text-purple-650" : "text-rose-500"}>
                        {report.actualStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className={report.companyMatch ? "" : "text-rose-500 font-bold"}>
                        {report.actualCompany}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-semibold">{report.latencyMs}ms</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2.5 py-0.75 rounded-full font-bold text-[9px] ${
                        report.passed 
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-sm" 
                          : "bg-gradient-to-r from-rose-500 to-red-400 text-white shadow-sm"
                      }`}>
                        {report.passed ? "PASS" : "FAIL"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Visual Autonomous Agent Workflow Pipeline */}
      {activeLog && activeLog.result && (
        <section className="glass-card p-6 rounded-[24px] shadow-sm space-y-6">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Gemini Agent Activity</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sequential Multi-Agent Execution Flow</p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4.5 bg-slate-50/40 border border-slate-150/40 rounded-2xl">
            {/* Step 1: Ingest */}
            <div className="flex flex-col items-center text-center space-y-1 md:w-1/7">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-650">
                <Mail className="w-5 h-5 animate-pulse" />
              </div>
              <span className="text-[10px] font-black text-slate-800 uppercase block">Email Ingest</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[80px]">{activeLog.result.company}</span>
            </div>

            <ArrowDown className="w-4 h-4 text-slate-300 md:rotate-270 shrink-0" />

            {/* Step 2: Filter */}
            <div className="flex flex-col items-center text-center space-y-1 md:w-1/7">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-650">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-slate-800 uppercase block">Monitor Check</span>
              <span className="text-[9px] text-emerald-600 font-black uppercase">Job Related</span>
            </div>

            <ArrowDown className="w-4 h-4 text-slate-300 md:rotate-270 shrink-0" />

            {/* Step 3: Classifier */}
            <div className="flex flex-col items-center text-center space-y-1 md:w-1/7">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-650">
                <Tag className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-slate-800 uppercase block">Classification</span>
              <span className="text-[9px] text-purple-600 font-black uppercase">{activeLog.result.status}</span>
            </div>

            <ArrowDown className="w-4 h-4 text-slate-300 md:rotate-270 shrink-0" />

            {/* Step 4: Summary */}
            <div className="flex flex-col items-center text-center space-y-1 md:w-1/7">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-650">
                <Building className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-slate-800 uppercase block">Extraction</span>
              <span className="text-[9px] text-slate-450 font-bold uppercase truncate max-w-[80px]">{activeLog.result.role}</span>
            </div>

            <ArrowDown className="w-4 h-4 text-slate-300 md:rotate-270 shrink-0" />

            {/* Step 5: Action */}
            <div className="flex flex-col items-center text-center space-y-1 md:w-1/7">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-650">
                <Lightbulb className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-slate-800 uppercase block">Next Action</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[80px]" title={activeLog.result.nextAction}>Guidelines</span>
            </div>

            <ArrowDown className="w-4 h-4 text-slate-300 md:rotate-270 shrink-0" />

            {/* Step 6: Guardrails */}
            <div className="flex flex-col items-center text-center space-y-1 md:w-1/7">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-650">
                <Lock className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-slate-800 uppercase block">Guardrails</span>
              <span className="text-[9px] text-emerald-600 font-black uppercase">{activeLog.guardrailStatus}</span>
            </div>

            <ArrowDown className="w-4 h-4 text-slate-300 md:rotate-270 shrink-0" />

            {/* Step 7: Update */}
            <div className="flex flex-col items-center text-center space-y-1 md:w-1/7">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-650">
                <RefreshCw className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-slate-800 uppercase block">Board Sync</span>
              <span className="text-[9px] text-purple-600 font-black uppercase">Completed</span>
            </div>
          </div>
        </section>
      )}

      {/* Split grid: Skills & Activity Timelines */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Agent Modules */}
        <section className="lg:col-span-5 space-y-6">
          <div className="glass-card p-6 rounded-[24px] shadow-sm space-y-5">
            <div>
              <h3 className="font-extrabold text-slate-905 text-sm">Agent Modules</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active autonomous pipelines</p>
            </div>

            <div className="space-y-4">
              {/* Module 1: Email Scanner */}
              <div className="flex items-start gap-3.5 p-4 bg-white/60 border border-slate-100 hover:border-purple-200 rounded-2xl shadow-sm hover:shadow transition-all duration-200">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-lg shrink-0">
                  📩
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-805">Email Scanner Agent</h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">Processed recruiter emails from inbox streams.</p>
                </div>
              </div>

              {/* Module 2: Gemini Analyzer */}
              <div className="flex items-start gap-3.5 p-4 bg-white/60 border border-slate-100 hover:border-purple-200 rounded-2xl shadow-sm hover:shadow transition-all duration-200">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-lg shrink-0">
                  🧠
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-805">Gemini Analyzer Agent</h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">Extracted company name, position role, and key dates.</p>
                </div>
              </div>

              {/* Module 3: Calendar Agent */}
              <div className="flex items-start gap-3.5 p-4 bg-white/60 border border-slate-100 hover:border-purple-200 rounded-2xl shadow-sm hover:shadow transition-all duration-200">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg shrink-0">
                  📅
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-805">Calendar Agent</h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">Created status milestones and syncs calendar schedules.</p>
                </div>
              </div>

              {/* Module 4: Duplicate Guard Agent */}
              <div className="flex items-start gap-3.5 p-4 bg-white/60 border border-slate-100 hover:border-purple-200 rounded-2xl shadow-sm hover:shadow transition-all duration-200">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-lg shrink-0">
                  🛡️
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-850">Duplicate Guard Agent</h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">Prevented repeated entries by matching message fingerprints.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Execution Logs */}
        <section className="lg:col-span-7">
          <div className="glass-card p-6 rounded-[24px] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Recent Agent Runs</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Execution checkpoints of recruitment agent workflows</p>
              </div>
              {activityLogs.length > 0 && (
                <button 
                  onClick={clearLogs} 
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-[10px] text-slate-505 font-extrabold uppercase tracking-wide rounded-xl transition active:scale-[0.98]"
                >
                  Clear Logs
                </button>
              )}
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
              {sortedLogs.length > 0 ? (
                sortedLogs.map((log, index) => {
                  const dateObj = new Date(log.timestamp);
                  const todayStr = new Date().toDateString();
                  const logDateStr = dateObj.toDateString();
                  const dateFormatted = logDateStr === todayStr 
                    ? `Today ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : `${dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                  return (
                    <div 
                      key={index} 
                      className="border border-slate-100 bg-white/60 hover:bg-white p-5 rounded-[22px] shadow-sm hover:shadow-md transition-all duration-300 space-y-4"
                    >
                      {/* Date Header */}
                      <div className="flex items-center gap-2 text-[10px] text-slate-450 font-bold uppercase tracking-wider border-b border-slate-100 pb-3">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{dateFormatted}</span>
                      </div>

                      {/* Main Message */}
                      <div className="space-y-3.5">
                        <div className="flex items-start gap-2">
                          <span className="text-sm shrink-0">✨</span>
                          <span className="font-extrabold text-xs text-slate-800 leading-tight">
                            {log.result 
                              ? `Gemini analyzed ${log.result.company} email`
                              : "Gemini analyzed email header (Filtered: Unrelated content)"}
                          </span>
                        </div>

                        {log.result && (
                          <div className="space-y-3 pl-6">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Result:</span>
                              <span className="text-xs text-slate-805 font-extrabold capitalize">{log.result.status.toLowerCase().replace("_", " ")} detected</span>
                            </div>

                            <div className="space-y-3.5 pt-2 border-t border-slate-100/60">
                              <span className="text-[9px] font-black text-slate-450 uppercase block tracking-wider mb-2">Agent Execution Details</span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-semibold text-slate-655">
                                
                                {/* Gmail Scanner Agent */}
                                <div className="p-3 bg-purple-50/20 border border-purple-100/40 rounded-xl space-y-1">
                                  <span className="text-[9px] font-black text-purple-600 uppercase block tracking-wider">Gmail Scanner Agent</span>
                                  <div className="space-y-0.5 text-slate-705 text-[10px]">
                                    <div className="flex items-center gap-1">
                                      <span className="text-emerald-600 font-extrabold">✓</span>
                                      <span>Emails retrieved</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Gemini Analyzer Agent */}
                                <div className="p-3 bg-indigo-50/20 border border-indigo-100/40 rounded-xl space-y-1">
                                  <span className="text-[9px] font-black text-indigo-650 uppercase block tracking-wider">Gemini Analyzer Agent</span>
                                  <div className="space-y-0.5 text-slate-705 text-[10px]">
                                    <div className="flex items-center gap-1">
                                      <span className="text-emerald-600 font-extrabold">✓</span>
                                      <span>Classification completed</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-emerald-600 font-extrabold">✓</span>
                                      <span>Information extracted</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Timeline Agent */}
                                <div className="p-3 bg-blue-50/20 border border-blue-100/40 rounded-xl space-y-1">
                                  <span className="text-[9px] font-black text-blue-650 uppercase block tracking-wider">Timeline Agent</span>
                                  <div className="space-y-0.5 text-slate-705 text-[10px]">
                                    <div className="flex items-center gap-1">
                                      <span className="text-emerald-600 font-extrabold">✓</span>
                                      <span>Existing records checked</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-emerald-600 font-extrabold">✓</span>
                                      <span>History updated</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Duplicate Guard Agent */}
                                <div className="p-3 bg-emerald-50/20 border border-emerald-100/40 rounded-xl space-y-1">
                                  <span className="text-[9px] font-black text-emerald-650 uppercase block tracking-wider">Duplicate Guard Agent</span>
                                  <div className="space-y-0.5 text-slate-705 text-[10px]">
                                    <div className="flex items-center gap-1">
                                      <span className="text-emerald-600 font-extrabold">✓</span>
                                      <span>Message IDs verified</span>
                                    </div>
                                  </div>
                                </div>

                              </div>
                            </div>

                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5 font-sans leading-none">Confidence score</span>
                                <span className="text-xs font-black text-slate-800">{Math.round(log.result.confidence * 100)}%</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5 font-sans leading-none">Status:</span>
                                <span className="text-xs font-extrabold text-emerald-600">Completed</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {!log.result && (
                          <div className="pl-6">
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5 font-sans leading-none">Verdict</span>
                                <span className="text-xs font-bold text-slate-500">Unrelated message</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5 font-sans leading-none">Status:</span>
                                <span className="text-xs font-extrabold text-slate-500">Skipped</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-2xl">
                  <Terminal className="w-8 h-8 text-slate-350 mb-2 animate-pulse" />
                  <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Run your first AI scan</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
