import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { SAMPLE_EMAILS } from "../tools/emailTool";
import { 
  Sparkles, 
  X, 
  Loader2, 
  CheckCircle,
  Mail,
  RefreshCw,
  AlertCircle,
  Clock
} from "lucide-react";
import type { AgentResponse } from "../tools/geminiClient";

import { sortApplications } from "../context/AppContext";

const RadarScanner: React.FC = () => {
  return (
    <div className="w-40 h-40 relative flex items-center justify-center pointer-events-none select-none my-3">
      {/* Concentric rings */}
      <div className="absolute w-40 h-40 rounded-full border border-purple-500/10 animate-[ping_4s_infinite]" />
      <div className="absolute w-32 h-32 rounded-full border border-indigo-500/20" />
      <div className="absolute w-24 h-24 rounded-full border border-purple-500/30" />
      <div className="absolute w-16 h-16 rounded-full border border-indigo-500/40" />
      
      {/* Rotating sweep line */}
      <div 
        className="absolute w-full h-full rounded-full overflow-hidden"
        style={{
          animation: "spin 2.5s linear infinite"
        }}
      >
        <div 
          className="w-1/2 h-full bg-gradient-to-r from-purple-500/35 to-transparent origin-right"
          style={{
            transform: "rotate(90deg)"
          }}
        />
      </div>

      {/* Pulsing center node */}
      <div className="w-5 h-5 rounded-full bg-purple-600 border border-purple-400 flex items-center justify-center shadow-[0_0_15px_#a855f7] animate-pulse">
        <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
      </div>

      {/* Target points blinking */}
      <div className="absolute top-10 left-10 w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_#a855f7] animate-pulse" />
      <div className="absolute bottom-12 right-12 w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_#6366f1] animate-[pulse_1.5s_infinite_0.5s]" />
      <div className="absolute top-1/2 right-8 w-1.5 h-1.5 rounded-full bg-pink-400 shadow-[0_0_8px_#ec4899] animate-[pulse_2s_infinite_1s]" />
    </div>
  );
};

export const EmailIntelligenceView: React.FC = () => {
  const { 
    processEmailText, 
    isProcessing,
    gmailConnected,
    gmailProfileEmail,
    gmailLastSync,
    connectGmailAccount,
    scanGmailWithGemini,
    setView,
    addManualApplication,
    generateDraftReply,
    userName,
    showToast
  } = useApp();

  const [scanMode, setScanMode] = useState<"gmail" | "manual">("gmail");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AgentResponse | null>(null);
  const [isSpamFiltered, setIsSpamFiltered] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDuplicateUpdate, setIsDuplicateUpdate] = useState(false);

  const [gmailScanStep, setGmailScanStep] = useState<"idle" | "fetching" | "filtering" | "analyzing" | "creating" | "syncing" | "complete">("idle");
  const [gmailScanStats, setGmailScanStats] = useState<any | null>(null);
  const [gmailScanError, setGmailScanError] = useState("");

  const formatProcessingTime = (ms: number | undefined): string => {
    if (ms === undefined) return "N/A";
    if (ms < 1000) {
      return `${ms} ms`;
    }
    return `${(ms / 1000).toFixed(1)} seconds`;
  };
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [scanLimit, setScanLimit] = useState<number>(10);

  // Edit states for Human-in-the-loop overrides
  const [editCompany, setEditCompany] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState<AgentResponse["status"]>("PENDING");
  const [editDateType, setEditDateType] = useState("Deadline");
  const [editDateValue, setEditDateValue] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editNextAction, setEditNextAction] = useState("");

  // Draft email states
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftTone, setDraftTone] = useState("Accept");
  const [generatedDraft, setGeneratedDraft] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);

  React.useEffect(() => {
    if (analysisResult) {
      setEditCompany(analysisResult.company);
      setEditRole(analysisResult.role);
      setEditStatus(analysisResult.status);
      setEditDateType(analysisResult.date.type || "Deadline");
      setEditDateValue(analysisResult.date.value || "");
      setEditSummary(analysisResult.summary);
      setEditNextAction(analysisResult.nextAction);
    }
  }, [analysisResult]);

  const handleVerifyAndSync = () => {
    if (!editCompany || !editRole) return;
    addManualApplication({
      company: editCompany,
      role: editRole,
      status: editStatus,
      summary: editSummary,
      date: {
        type: editDateType,
        value: editDateValue || "Not available"
      },
      nextAction: editNextAction
    });
    
    setAnalysisResult(null);
    showToast({
      type: "success",
      message: "✅ Application Orchestrated",
      subMessage: `Successfully synchronized ${editCompany} to your application tracker`,
      duration: 3000
    });
  };

  const handleGenerateDraft = async () => {
    setIsDrafting(true);
    try {
      const draftText = await generateDraftReply(
        body, 
        draftTone, 
        userName || "Candidate", 
        editCompany || "Company"
      );
      setGeneratedDraft(draftText);
    } catch (e) {
      console.error(e);
      setGeneratedDraft("Failed to generate draft. Please try again.");
    } finally {
      setIsDrafting(false);
    }
  };

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
      await new Promise(r => setTimeout(r, 600));
      setGmailScanStep("filtering");
      const stats = await scanGmailWithGemini(scanLimit);
      
      if (stats.fetched > 0) {
        setGmailScanStep("analyzing");
        await new Promise((r) => setTimeout(r, 800));
        setGmailScanStep("creating");
        await new Promise((r) => setTimeout(r, 600));
        setGmailScanStep("syncing");
        await new Promise((r) => setTimeout(r, 500));
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
      const telemetry = await processEmailText(
        body,
        subject,
        senderEmail,
        undefined,
        undefined,
        matchedEmail?.bodyHtml
      );
      
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
                      {[10, 25, 50, 100].map((limit) => (
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
          <div className="glass-card p-8 rounded-[24px] shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center py-10 space-y-6 relative overflow-hidden ai-glow w-full animate-in fade-in duration-300">
            {/* Scanning visual sweep overlay */}
            <div className="absolute inset-0 pointer-events-none bg-slate-50/5 dark:bg-slate-950/5">
              <div className="animate-scan-line"></div>
            </div>
            
            <RadarScanner />
            
            <div className="text-center space-y-1">
              <h4 className="font-extrabold text-slate-800 dark:text-white text-sm flex items-center justify-center gap-1.5">
                {scanMode === "gmail" ? "Gmail Auto-Autopilot Scanning" : "AI Agent Analysis Pipeline"}
                <span className="flex gap-0.5"><span className="animate-bounce">.</span><span className="animate-bounce [animation-delay:0.2s]">.</span><span className="animate-bounce [animation-delay:0.4s]">.</span></span>
              </h4>
              <p className="text-[9px] text-slate-455 dark:text-slate-500 uppercase tracking-widest font-bold">
                Orchestrating multi-agent framework
              </p>
            </div>
            
            {/* Sequential Checklist inside the Loader Card */}
            {scanMode === "gmail" ? (
              <div className="w-full max-w-xs space-y-3 p-4 bg-slate-50/40 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-2xl text-left">
                <span className="text-[9px] font-black text-purple-655 dark:text-purple-400 uppercase tracking-widest block mb-2">Ingestion Timeline</span>
                <div className="space-y-2.5">
                  {[
                    { key: "fetching", label: "Connecting Gmail & Fetching Emails" },
                    { key: "filtering", label: "Filtering Recruiter Emails" },
                    { key: "analyzing", label: "Gemini AI Analysis" },
                    { key: "creating", label: "Creating Applications" },
                    { key: "syncing", label: "Updating Dashboard & Calendar" },
                    { key: "complete", label: "Finished" }
                  ].map((step, sIdx) => {
                    const stepsOrder = ["fetching", "filtering", "analyzing", "creating", "syncing", "complete"];
                    const currentIdx = stepsOrder.indexOf(gmailScanStep);
                    const stepIdx = stepsOrder.indexOf(step.key);
                    
                    if (stepIdx > currentIdx) return null;
                    
                    const isDone = stepIdx < currentIdx || gmailScanStep === "complete";
                    const isActive = gmailScanStep === step.key;
                    
                    return (
                      <div key={step.key} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                        <span className="text-xs shrink-0 select-none">
                          {isDone ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Loader2 className="w-4 h-4 animate-spin text-purple-650" />
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 dark:text-slate-600 w-4">{sIdx + 1}</span>
                          <span className={`text-xs font-semibold ${
                            isActive ? "text-purple-655 dark:text-purple-400 font-extrabold animate-pulse" : "text-slate-800 dark:text-slate-200 font-bold"
                          }`}>
                            {step.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="w-full max-w-xs space-y-2 bg-slate-50/50 dark:bg-slate-950/40 p-4 border border-slate-100 dark:border-slate-850 rounded-2xl">
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-405 dark:text-slate-400 uppercase tracking-wider">
                  <span>Security Guard Check</span>
                  <span className="text-purple-655 animate-pulse">Analyzing...</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-[pulse_1s_infinite]" style={{ width: '100%' }}></div>
                </div>
              </div>
            )}
          </div>
        ) : scanMode === "gmail" && gmailScanStep === "complete" && gmailScanStats ? (
          /* Premium AI Scan Report Card */
          <div className="glass-card p-6 rounded-[28px] shadow-lg space-y-6 animate-in fade-in zoom-in-95 duration-250 border-purple-200/20 ai-glow">
            {/* Header info */}
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-600 shrink-0">
                <Sparkles className="w-4.5 h-4.5 text-purple-500 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest block leading-none">Automated Sync Results</span>
                <h4 className="text-lg font-black text-slate-905 dark:text-white leading-none">AI Scan Report</h4>
              </div>
            </div>

            {/* Ingestion Stats Checklist */}
            <div className="space-y-3.5 font-semibold text-slate-700 dark:text-slate-350 bg-slate-50/50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-850">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Emails Scanned</span>
                </div>
                <strong className="text-slate-900 dark:text-white">{gmailScanStats.fetched}</strong>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Recruiter Emails</span>
                </div>
                <strong className="text-slate-900 dark:text-white">{gmailScanStats.processed}</strong>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Applications Created</span>
                </div>
                <strong className="text-emerald-600 dark:text-emerald-450">{gmailScanStats.newEmailsProcessed}</strong>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Existing Applications</span>
                </div>
                <strong className="text-indigo-650 dark:text-indigo-400">{gmailScanStats.existingRecordsUpdated}</strong>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Tasks Generated</span>
                </div>
                <strong className="text-teal-600 dark:text-teal-400">{gmailScanStats.stats?.tasksCreated ?? 0}</strong>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Calendar Events</span>
                </div>
                <strong className="text-indigo-600 dark:text-indigo-400">{gmailScanStats.stats?.calendarEventsCreated ?? 0}</strong>
              </div>
              
              <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-200/40 dark:border-slate-800">
                <div className="flex items-center gap-2 font-extrabold text-slate-800 dark:text-slate-350">
                  <Clock className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>Processing Time</span>
                </div>
                <strong className="text-purple-650 dark:text-purple-400">{formatProcessingTime(gmailScanStats.executionTimeMs)}</strong>
              </div>
            </div>

            {/* Verification Banner */}
            <div className="p-4 bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5 shadow-sm text-xs text-emerald-700 dark:text-emerald-400">
              <span>🎉</span>
              <span className="font-extrabold">Scan completed successfully</span>
            </div>

            {/* Detected Opportunities list */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-bold text-slate-405 uppercase tracking-widest block">Detected Opportunities</span>
              
              {gmailScanStats.opportunities && gmailScanStats.opportunities.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {sortApplications(gmailScanStats.opportunities).map((opt, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white/70 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 hover:border-purple-200 hover:shadow-sm rounded-2xl transition-all duration-200">
                      <div className="min-w-0 pr-2">
                        <span className="font-extrabold text-xs text-slate-800 dark:text-white block truncate">{opt.company}</span>
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
              <div className="space-y-1 w-full">
                <span className="text-[9px] font-bold text-purple-500 uppercase tracking-widest block mb-0.5">Scanned Result & Verification Panel</span>
                <h4 className="text-lg font-black text-slate-900 leading-none">Human-in-the-Loop Orchestration</h4>
              </div>
            </div>

            {/* Editable Fields Grid */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Company Name</label>
                  <input
                    type="text"
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Job Role</label>
                  <input
                    type="text"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white"
                  >
                    <option value="OFFER">OFFER</option>
                    <option value="INTERVIEW">INTERVIEW</option>
                    <option value="ASSESSMENT">ASSESSMENT</option>
                    <option value="PENDING">PENDING</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="GENERAL UPDATE">GENERAL UPDATE</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Date Type</label>
                    <select
                      value={editDateType}
                      onChange={(e) => setEditDateType(e.target.value)}
                      className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-750 focus:bg-white"
                    >
                      <option value="Deadline">Deadline</option>
                      <option value="Interview Date">Interview Date</option>
                      <option value="Assessment Deadline">Assessment Deadline</option>
                      <option value="Joining Date">Joining Date</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Date Value</label>
                    <input
                      type="text"
                      value={editDateValue}
                      placeholder="Not available"
                      onChange={(e) => setEditDateValue(e.target.value)}
                      className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-semibold text-slate-750 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">AI Summary Override</label>
                <textarea
                  value={editSummary}
                  rows={2}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white custom-scrollbar leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Next Action Recommendations</label>
                <input
                  type="text"
                  value={editNextAction}
                  onChange={(e) => setEditNextAction(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white"
                />
              </div>
            </div>

            {/* Ingestion & Action recommendation */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setGeneratedDraft("");
                  setShowDraftModal(true);
                }}
                className="flex-1 py-3 border border-purple-200 bg-purple-50/50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-2xl transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
              >
                📩 Draft Recruiter Reply
              </button>
              
              <button
                onClick={handleVerifyAndSync}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-2xl transition flex items-center justify-center gap-1.5 shadow-md active:scale-98"
              >
                ✓ Verify & Sync Application
              </button>
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

      {/* AI Recruiter Response Draft Generator Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-250 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/50 to-blue-50/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-200/50 flex items-center justify-center text-purple-650 shadow-sm animate-pulse">
                  📩
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Response Assistant</h3>
                  <p className="text-[9px] text-slate-405 font-bold uppercase tracking-wider">AI Recruiter Draft Generator</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDraftModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-8 space-y-6 overflow-y-auto custom-scrollbar">
              
              {/* Draft configurations options */}
              <div className="flex items-end gap-4 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Response Type (Tone)</label>
                  <select
                    value={draftTone}
                    onChange={(e) => setDraftTone(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  >
                    <option value="Accept">Accept Interview/Offer</option>
                    <option value="Reschedule">Request Rescheduling</option>
                    <option value="Decline">Decline / Withdraw Application</option>
                    <option value="Follow Up">Check Status / General Inquiry</option>
                  </select>
                </div>

                <button
                  onClick={handleGenerateDraft}
                  disabled={isDrafting}
                  className="px-5 py-2.5 bg-purple-655 hover:bg-purple-750 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 shrink-0 flex items-center gap-1.5"
                >
                  {isDrafting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Drafting...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate Draft</span>
                    </>
                  )}
                </button>
              </div>

              {/* Textarea displaying generated draft */}
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Generated Email Reply</label>
                {generatedDraft ? (
                  <div className="space-y-3">
                    <textarea
                      value={generatedDraft}
                      rows={10}
                      onChange={(e) => setGeneratedDraft(e.target.value)}
                      className="w-full p-4.5 bg-slate-900 border border-slate-800 rounded-2xl text-purple-200 font-mono text-[10.5px] leading-relaxed custom-scrollbar focus:outline-none"
                    />
                    
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedDraft);
                        showToast({
                          type: "success",
                          message: "📋 Copied to Clipboard",
                          subMessage: "You can now paste the email reply directly into Gmail",
                          duration: 3500
                        });
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
                    >
                      Copy to Clipboard
                    </button>
                  </div>
                ) : (
                  <div className="p-12 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400 font-semibold bg-slate-50/20 italic">
                    Click 'Generate Draft' to write a contextual email response based on recruiter details.
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 bg-slate-55 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowDraftModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-xs font-bold rounded-xl transition text-slate-600"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
