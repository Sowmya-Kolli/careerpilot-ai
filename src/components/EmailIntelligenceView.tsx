import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { SAMPLE_EMAILS } from "../tools/emailTool";
import { 
  Sparkles, 
  Calendar, 
  Loader2, 
  CheckCircle,
  Mail,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import type { AgentResponse } from "../tools/geminiClient";
import type { JobApplication } from "../context/AppContext";
import { sortApplications } from "../context/AppContext";

export const EmailIntelligenceView: React.FC = () => {
  const { 
    processEmailText, 
    isProcessing,
    gmailConnected,
    gmailProfileEmail,
    gmailLastSync,
    connectGmailAccount,
    scanGmailWithGemini,
    setView
  } = useApp();

  const [scanMode, setScanMode] = useState<"gmail" | "manual">("gmail");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AgentResponse | null>(null);
  const [isSpamFiltered, setIsSpamFiltered] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDuplicateUpdate, setIsDuplicateUpdate] = useState(false);

  const [gmailScanStep, setGmailScanStep] = useState<"idle" | "fetching" | "analyzing" | "complete">("idle");
  const [gmailScanStats, setGmailScanStats] = useState<{ fetched: number; processed: number; newEmailsProcessed: number; existingRecordsUpdated: number; duplicatesSkipped: number; opportunities: JobApplication[] } | null>(null);
  const [gmailScanError, setGmailScanError] = useState("");
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [scanLimit, setScanLimit] = useState<number>(50);

  const handleConnectGmail = async () => {
    setIsConnectingGmail(true);
    setGmailScanError("");
    try {
      await connectGmailAccount();
    } catch (err: any) {
      setGmailScanError(err.message || "Failed to link Google account.");
    } finally {
      setIsConnectingGmail(false);
    }
  };

  const handleGmailScan = async () => {
    setGmailScanError("");
    setGmailScanStats(null);
    setGmailScanStep("fetching");

    try {
      const stats = await scanGmailWithGemini(scanLimit);
      
      if (stats.fetched > 0) {
        setGmailScanStep("analyzing");
        await new Promise((r) => setTimeout(r, 1200));
      }

      setGmailScanStats(stats);
      setGmailScanStep("complete");
    } catch (err: any) {
      console.error(err);
      setGmailScanStep("idle");
      if (err.message?.includes("quota") || err.message?.includes("Quota")) {
        setGmailScanError("API quota exceeded. Please try again later.");
      } else if (err.message?.includes("permission") || err.message?.includes("denied")) {
        setGmailScanError("Gmail access permission denied. Please reconnect Gmail.");
      } else if (err.message?.includes("cancelled") || err.message?.includes("closed")) {
        setGmailScanError("Gmail OAuth sign-in was cancelled.");
      } else {
        setGmailScanError(err.message || "An unexpected error occurred during the Gmail scan.");
      }
    }
  };

  const handleSelectTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedTemplateId(id);
    setErrorMessage("");
    setIsSpamFiltered(false);
    setIsDuplicateUpdate(false);

    if (id === "custom") {
      setSubject("");
      setBody("");
      return;
    }

    const email = SAMPLE_EMAILS.find((m) => m.id === id);
    if (email) {
      setSubject(email.subject);
      setBody(email.body);
    }
  };

  const handleAnalyze = async () => {
    if (!body.trim()) {
      setErrorMessage("Please input email body text to analyze.");
      return;
    }
    setErrorMessage("");
    setIsSpamFiltered(false);
    setIsDuplicateUpdate(false);
    setAnalysisResult(null);

    const matchedEmail = SAMPLE_EMAILS.find((m) => m.id === selectedTemplateId);
    const senderEmail = matchedEmail ? matchedEmail.senderEmail : "";

    try {
      const telemetry = await processEmailText(body, subject, senderEmail);
      
      if (!telemetry.isJobRelated) {
        setIsSpamFiltered(true);
      } else {
        setAnalysisResult(telemetry.result);
        setIsDuplicateUpdate(!!telemetry.isDuplicateUpdate);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("System failed to execute email analysis. Please try again.");
    }
  };

  // Status badge with pulsing dot animation
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
      <span className={`px-2.5 py-1 rounded-full border text-[8.5px] font-bold tracking-widest uppercase inline-flex items-center gap-1.5 shadow-sm ${classes}`}>
        <span className="relative flex h-1.5 w-1.5">
          <span className={`animate-ping-slow absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`}></span>
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotClass}`}></span>
        </span>
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8 items-start page-entrance">
      
      {/* Left Panel: Inputs */}
      <section className="lg:col-span-6 space-y-6">
        <div className="glass-card p-6 rounded-[24px] shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">AI Recruiter Email Scanner</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Automate application tracking via Gmail or Manual Paste</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
              <Mail className="w-4.5 h-4.5 text-purple-500/80" />
            </div>
          </div>

          {/* Ingestion Mode Switcher */}
          <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-150/40">
            <button
              onClick={() => {
                setScanMode("gmail");
                setGmailScanError("");
              }}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg text-center transition-all ${
                scanMode === "gmail"
                  ? "bg-white text-purple-750 shadow-sm border border-slate-150/20"
                  : "text-slate-450 hover:text-slate-655"
              }`}
            >
              Gmail Ingestion
            </button>
            <button
              onClick={() => {
                setScanMode("manual");
                setGmailScanError("");
              }}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg text-center transition-all ${
                scanMode === "manual"
                  ? "bg-white text-purple-750 shadow-sm border border-slate-150/20"
                  : "text-slate-450 hover:text-slate-655"
              }`}
            >
              Manual Ingestion
            </button>
          </div>

          {scanMode === "gmail" ? (
            /* Gmail Scan View */
            <div className="space-y-5">
              {!gmailConnected ? (
                <div className="p-4 bg-slate-50/50 border border-slate-150/40 rounded-2xl text-center space-y-3.5">
                  <p className="text-xs font-semibold text-slate-550 leading-relaxed max-w-xs mx-auto">
                    Connect your Gmail account to securely monitor and filter recruiter communications automatically.
                  </p>
                  <button
                    disabled={isConnectingGmail}
                    onClick={handleConnectGmail}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] disabled:opacity-50"
                  >
                    {isConnectingGmail ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Connecting Account...</span>
                      </>
                    ) : (
                      <span>Connect Gmail Account</span>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 bg-emerald-50/20 border border-emerald-100 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Status</span>
                      <span className="text-emerald-600 font-bold uppercase tracking-wider">Connected</span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-700">
                      Account: <span className="text-slate-905 font-extrabold">{gmailProfileEmail}</span>
                    </div>
                    {gmailLastSync && (
                      <div className="text-[10px] text-slate-455 font-medium">
                        Last sync: <span className="font-bold">{gmailLastSync}</span>
                      </div>
                    )}
                  </div>

                  {/* Scan Limit Selector */}
                  <div className="space-y-2 p-3.5 bg-slate-50/50 border border-slate-150/40 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Analyze Scan Range
                    </span>
                    <div className="flex gap-4 items-center">
                      {[25, 50, 100].map((limit) => (
                        <label key={limit} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
                          <input
                            type="radio"
                            name="scanLimit"
                            value={limit}
                            checked={scanLimit === limit}
                            onChange={() => setScanLimit(limit)}
                            className="w-3.5 h-3.5 text-indigo-600 border-slate-300 focus:ring-indigo-500/20"
                          />
                          <span>Latest {limit}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGmailScan}
                    disabled={isProcessing}
                    className="w-full py-3.5 btn-premium text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Scanning Gmail...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Scan Gmail with Gemini</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {gmailScanError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-medium">{gmailScanError}</span>
                </div>
              )}

              {gmailScanStep !== "idle" && (
                <div className="p-5 bg-purple-50/30 border border-purple-100/40 rounded-2xl space-y-4">
                  <span className="text-[9px] font-bold text-purple-650 uppercase tracking-widest block">Agent Ingestion Flow</span>
                  
                  <div className="space-y-4">
                    {/* Step 1: Fetching */}
                    <div className="flex items-center gap-3">
                      <span className="text-base shrink-0">
                        {gmailScanStep === "fetching" ? "🟣" : (gmailScanStep === "analyzing" || gmailScanStep === "complete" ? "🟢" : "⚪")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 w-4">1</span>
                        <span className={`text-xs font-semibold ${
                          gmailScanStep === "fetching" ? "text-purple-750 font-bold" : "text-slate-650"
                        }`}>
                          Fetching emails from Gmail
                        </span>
                      </div>
                    </div>

                    {/* Step 2: Analyzing */}
                    <div className="flex items-center gap-3">
                      <span className="text-base shrink-0">
                        {gmailScanStep === "analyzing" ? "🟣" : (gmailScanStep === "complete" ? "🟢" : "⚪")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 w-4">2</span>
                        <span className={`text-xs font-semibold ${
                          gmailScanStep === "analyzing" ? "text-purple-750 font-bold" : "text-slate-650"
                        }`}>
                          Gemini analyzing messages
                        </span>
                      </div>
                    </div>

                    {/* Step 3: Tracker updated */}
                    <div className="flex items-center gap-3">
                      <span className="text-base shrink-0">
                        {gmailScanStep === "complete" ? "🟢" : "⚪"}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 w-4">3</span>
                        <span className={`text-xs font-semibold ${
                          gmailScanStep === "complete" ? "text-slate-900 font-extrabold" : "text-slate-450"
                        }`}>
                          Applications detected & tracker updated
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Manual Scan View */
            <div className="space-y-5">
              {/* Quick Select Template */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Load Sandbox Email Templates</label>
                <select
                  value={selectedTemplateId}
                  onChange={handleSelectTemplate}
                  className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold text-slate-600"
                >
                  <option value="">-- Choose template email --</option>
                  <option value="gmail_001">Google - Interview Invitation</option>
                  <option value="gmail_002">Amazon - Coding Assessment</option>
                  <option value="gmail_003">Stripe - Job Offer</option>
                  <option value="gmail_004">Meta - Rejection Response</option>
                  <option value="gmail_005">Netflix - Application Confirmed</option>
                  <option value="gmail_006">Duolingo - Spam/Newsletter (Filter Test)</option>
                  <option value="custom">Custom Email Input</option>
                </select>
              </div>

              {/* Subject input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Subject (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Google Interview Schedule"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={selectedTemplateId !== "custom" && selectedTemplateId !== ""}
                  className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-700 font-medium"
                />
              </div>

              {/* Body input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Body Content</label>
                <textarea
                  placeholder="Paste recruiter email text here..."
                  rows={8}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={selectedTemplateId !== "custom" && selectedTemplateId !== ""}
                  className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-700 font-mono text-[10px] leading-relaxed custom-scrollbar"
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              {/* Run Button */}
              <button
                onClick={handleAnalyze}
                disabled={isProcessing}
                className="w-full py-3.5 btn-premium disabled:bg-purple-400 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Running Agent Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>✨ Analyze with Gemini</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Right Panel: AI generated intelligence card */}
      <section className="lg:col-span-6 space-y-4">
        {isDuplicateUpdate && analysisResult && !isProcessing && scanMode === "manual" && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-250 text-emerald-700 rounded-xl flex gap-2 text-xs font-semibold items-center animate-in slide-in-from-top-2 duration-300 shadow-sm">
            <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span>Existing application updated</span>
          </div>
        )}
        
        {isProcessing ? (
          <div className="glass-card p-8 rounded-[24px] shadow-lg border border-slate-200 flex flex-col items-center justify-center py-24 space-y-6 relative overflow-hidden ai-glow">
            {/* Scanning visual overlay */}
            <div className="absolute inset-0 pointer-events-none bg-slate-50/10">
              <div className="animate-scan-line"></div>
            </div>
            
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-505/10 to-blue-505/10 border border-purple-150/40 flex items-center justify-center text-purple-600">
                <Loader2 className="w-8 h-8 animate-spin text-purple-650" />
              </div>
              <div className="absolute -inset-2 bg-purple-500/5 rounded-full blur-sm animate-pulse"></div>
            </div>
            
            <div className="text-center space-y-2">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center justify-center gap-1.5">
                AI Agent Analyzing Email<span className="flex gap-0.5"><span className="animate-bounce">.</span><span className="animate-bounce [animation-delay:0.2s]">.</span><span className="animate-bounce [animation-delay:0.4s]">.</span></span>
              </h4>
              <p className="text-[10px] text-slate-450 uppercase tracking-widest font-bold">
                Ingesting recruiting metrics...
              </p>
            </div>
            
            <div className="w-full max-w-xs space-y-2 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
              <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Pipeline Monitor Check</span>
                <span className="text-purple-655 animate-pulse">Scanning...</span>
              </div>
              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        ) : scanMode === "gmail" && gmailScanStep === "complete" && gmailScanStats ? (
          /* Redesigned Gmail Scan Completion Card */
          <div className="glass-card p-6 rounded-[24px] shadow-md space-y-6 animate-in fade-in zoom-in-95 duration-200 border-purple-100/50 ai-glow">
            {/* Header info */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-purple-500 uppercase tracking-widest block mb-0.5">Live Gmail Scanned Results</span>
                <h4 className="text-xl font-black text-slate-900 leading-none">✨ Scan Completed</h4>
              </div>
            </div>

            {/* Ingestion Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Emails Scanned */}
              <div className="bg-white/50 border border-slate-150/40 p-4 rounded-2xl">
                <span className="text-slate-450 font-bold text-[10px] uppercase tracking-wider block">📥 Emails scanned</span>
                <span className="text-xl font-black text-slate-800 block mt-1">{gmailScanStats.fetched}</span>
              </div>

              {/* New Emails Processed */}
              <div className="bg-white/50 border border-slate-150/40 p-4 rounded-2xl">
                <span className="text-slate-450 font-bold text-[10px] uppercase tracking-wider block">✨ New emails processed</span>
                <span className="text-xl font-black text-emerald-600 block mt-1">{gmailScanStats.newEmailsProcessed}</span>
              </div>

              {/* Existing Records Updated */}
              <div className="bg-white/50 border border-slate-150/40 p-4 rounded-2xl">
                <span className="text-slate-450 font-bold text-[10px] uppercase tracking-wider block">🔄 Existing records updated</span>
                <span className="text-xl font-black text-indigo-600 block mt-1">{gmailScanStats.existingRecordsUpdated}</span>
              </div>

              {/* Duplicates Skipped */}
              <div className="bg-white/50 border border-slate-150/40 p-4 rounded-2xl">
                <span className="text-slate-450 font-bold text-[10px] uppercase tracking-wider block">🛡️ Duplicates skipped</span>
                <span className="text-xl font-black text-amber-600 block mt-1">{gmailScanStats.duplicatesSkipped}</span>
              </div>
            </div>

            {/* Detected Opportunities list */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-405 uppercase tracking-widest block">Detected Opportunities</span>
              
              {gmailScanStats.opportunities && gmailScanStats.opportunities.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {sortApplications(gmailScanStats.opportunities).map((opt, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white/70 hover:bg-white border border-slate-100 hover:border-purple-200 hover:shadow-sm rounded-2xl transition-all duration-200">
                      <div className="min-w-0 pr-2">
                        <span className="font-extrabold text-xs text-slate-800 block truncate">{opt.company}</span>
                        <div className="text-[10px] text-slate-500 font-bold flex flex-wrap gap-x-1.5 gap-y-0.5 items-center mt-0.5">
                          <span className="text-purple-655 font-semibold">{opt.role}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-450 truncate block">{opt.date.type}: {opt.date.value}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {getStatusBadge(opt.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50/40 border border-slate-150/40 rounded-2xl text-center text-xs text-slate-400 font-semibold">
                  No recruiter emails or new career opportunities identified.
                </div>
              )}
            </div>

            {/* Actions */}
            <button
              onClick={() => setView("tracker")}
              className="w-full py-3.5 btn-premium text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition"
            >
              <span>View Applications →</span>
            </button>
          </div>
        ) : scanMode === "manual" && isSpamFiltered ? (
          <div className="glass-card p-8 rounded-[24px] shadow-sm text-center space-y-4 py-16">
            <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
              <AlertCircle className="w-6 h-6 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-sm">Security Guard Check Triggered</h4>
              <p className="text-[11px] text-slate-550 max-w-sm mx-auto leading-relaxed font-semibold">
                The **Email Monitor Agent** successfully scanned the text but flagged it as <strong>not career-related</strong>.
              </p>
            </div>
            <div className="p-3.5 bg-slate-50/80 border border-slate-200/60 rounded-xl text-left max-w-xs mx-auto">
              <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider mb-0.5">Audit Verdict:</span>
              <span className="text-[11px] text-slate-455 font-medium">Filtered out spam, newsletters, or unrelated correspondence from entering your workspace.</span>
            </div>
          </div>
        ) : scanMode === "manual" && analysisResult ? (
          <div className="glass-card p-6 rounded-[24px] shadow-md space-y-6 animate-in fade-in zoom-in-95 duration-200 border-purple-100/50 ai-glow">
            {/* Header info */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-purple-500 uppercase tracking-widest block mb-0.5">Scanned Result</span>
                <h4 className="text-xl font-black text-slate-900 leading-none">{analysisResult.company}</h4>
                <span className="text-xs text-slate-405 font-bold uppercase tracking-wider block mt-0.5">{analysisResult.role}</span>
              </div>
              {getStatusBadge(analysisResult.status)}
            </div>

            {/* Gemini Processing Indicators */}
            <div className="p-4 bg-emerald-50/40 border border-emerald-150/40 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold text-emerald-850 uppercase tracking-wider block">Gemini Processing Indicators</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-semibold text-emerald-850">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Company identified</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Application status classified</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Important date extracted</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Recommended action generated</span>
                </div>
              </div>
            </div>

            {/* AI Summary card */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">AI Generated Summary</span>
              <p className="text-xs text-slate-600 bg-slate-50/60 border border-slate-150/40 p-3.5 rounded-2xl leading-relaxed font-semibold">
                {analysisResult.summary}
              </p>
            </div>

            {/* Deadline & Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-slate-405 font-bold text-[9px] uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>{analysisResult.date.type}</span>
                </div>
                <span className="text-xs font-extrabold text-slate-800 pl-4.5 block">
                  {analysisResult.date.value}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-slate-405 font-bold text-[9px] uppercase tracking-wider">
                  <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                  <span>Confidence</span>
                </div>
                <div className="flex items-center gap-2 pl-4.5">
                  <span className="text-xs font-extrabold text-slate-800">
                    {Math.round(analysisResult.confidence * 100)}%
                  </span>
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-650 h-full rounded-full" 
                      style={{ width: `${analysisResult.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recommended Next Action */}
            <div className="bg-purple-50/60 border border-purple-100/50 p-4 rounded-2xl space-y-2">
              <div className="flex items-center gap-1.5 text-purple-800 font-extrabold text-xs">
                <CheckCircle className="w-4 h-4 text-purple-650" />
                <span>Recommended Next Action</span>
              </div>
              <p className="text-[11px] text-purple-955 leading-relaxed pl-5.5 font-medium">
                {analysisResult.nextAction}
              </p>
            </div>

            {/* Telemetry info banner */}
            <div className="text-[9px] text-slate-405 font-bold uppercase tracking-wider flex items-center justify-between pt-2.5 border-t border-slate-100">
              <span>Guardrails: PASSED</span>
              <span>Model: gemini-1.5-flash</span>
            </div>
          </div>
        ) : (
          <div className="glass-card p-8 rounded-[24px] shadow-sm text-center h-full flex flex-col justify-center py-24">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl flex items-center justify-center mx-auto text-purple-600 mb-4 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <h4 className="font-extrabold text-slate-850 text-sm">Awaiting Scanner Input</h4>
            <p className="text-xs text-slate-405 max-w-xs mx-auto leading-relaxed mt-1 font-semibold">
              Configure your API key or select one of the sandbox emails in the left panel to trigger the agent pipeline.
            </p>
          </div>
        )}
      </section>

    </div>
  );
};
