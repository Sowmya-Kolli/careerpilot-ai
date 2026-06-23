import React, { useState } from "react";
import { 
  Sparkles, 
  Mail, 
  ShieldAlert, 
  Cpu, 
  LayoutDashboard, 
  ArrowRight, 
  ArrowLeft,
  RefreshCw,
  FolderOpen,
  Calendar,
  Zap
} from "lucide-react";
import { useApp } from "../context/AppContext";

export const GuideView: React.FC = () => {
  const { connectGmailAccount, enableDemoMode, setView } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isOnboarded = localStorage.getItem("careerpilot_onboarded") === "true";

  const handleConnectGmail = async () => {
    setIsConnecting(true);
    setErrorMsg("");
    try {
      await connectGmailAccount();
      localStorage.setItem("careerpilot_onboarded", "true");
      setView("dashboard");
    } catch (err: any) {
      console.error(err);
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
      setView("dashboard");
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to initialize demo workspace.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCompleteGuide = () => {
    localStorage.setItem("careerpilot_onboarded", "true");
    setView("dashboard");
  };

  const totalSlides = 4;

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleCompleteGuide();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 px-2 page-entrance flex items-center justify-center min-h-[80vh]">
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row relative min-h-[520px]">
        
        {/* Skip button at top right - only show if NOT already onboarded */}
        {!isOnboarded && (
          <button 
            onClick={handleCompleteGuide}
            className="absolute top-6 right-6 z-20 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-550 hover:text-slate-800 text-[10px] font-black uppercase tracking-wider rounded-xl transition active:scale-95 flex items-center gap-1"
          >
            Skip
          </button>
        )}

        {/* Left Side Accent Panel */}
        <div className="md:w-5/12 bg-gradient-to-br from-purple-700 via-indigo-750 to-blue-600 p-8 text-white flex flex-col justify-between relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-xl -ml-10 -mb-10" />
          
          <div className="relative z-10 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center border border-white/10">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
            </div>
            <span className="font-extrabold text-sm tracking-tight uppercase">CareerPilot AI</span>
          </div>

          <div className="relative z-10 space-y-4 my-8 md:my-0">
            <span className="text-[9px] font-black text-purple-200 uppercase tracking-widest block bg-white/10 px-2 py-0.5 rounded-full w-max">
              Slide {currentSlide + 1} of {totalSlides}
            </span>
            <h2 className="text-2xl font-black leading-tight tracking-tight">
              {currentSlide === 0 && "Welcome to CareerPilot AI 🚀"}
              {currentSlide === 1 && "How CareerPilot Works ⚙️"}
              {currentSlide === 2 && "Your Career Workspace 📂"}
              {currentSlide === 3 && "Privacy & User Control 🔒"}
            </h2>
            <p className="text-[11.5px] text-purple-100/90 leading-relaxed font-semibold">
              {currentSlide === 0 && "Your AI-powered recruiter email organizer and application command center"}
              {currentSlide === 1 && "Understand how CareerPilot monitors and structures incoming email updates"}
              {currentSlide === 2 && "Explore features designed to keep your recruiting pipeline moving forward"}
              {currentSlide === 3 && "Complete control over your personal communication data and privacy details"}
            </p>
          </div>

          <div className="relative z-10 text-[9.5px] text-purple-250 font-bold uppercase tracking-widest leading-none">
            V1.0.0 (Kaggle Capstone)
          </div>
        </div>

        {/* Right Side Slide Container */}
        <div className="md:w-7/12 p-8 flex flex-col justify-between min-h-[460px] relative">
          
          {/* Middle Content area */}
          <div className="flex-1 flex flex-col justify-center py-4">
            
            {/* SLIDE 1 */}
            {currentSlide === 0 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h3 className="font-black text-slate-900 text-lg leading-tight">Welcome to CareerPilot AI 🚀</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    "Your AI-powered recruiter email organizer and application command center"
                  </p>
                </div>
                
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  CareerPilot transforms your messy recruitment inbox into an organized hiring dashboard using Gemini-powered AI agents.
                </p>

                <div className="space-y-3 pt-2">
                  {errorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-700 font-bold leading-normal">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600 inline mr-1 -mt-0.5" />
                      {errorMsg}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      disabled={isConnecting}
                      onClick={handleConnectGmail}
                      className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                    >
                      {isConnecting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>Connecting Google...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 text-white" />
                          <span>Connect Gmail</span>
                          <ArrowRight className="w-4 h-4 text-white" />
                        </>
                      )}
                    </button>

                    <button
                      disabled={isConnecting}
                      onClick={handleTryDemo}
                      className="py-3 px-4 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95"
                    >
                      Try Demo Workspace
                    </button>
                  </div>

                  <p className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-wider">
                    🔒 OAuth link is read-only. Demo Workspace mode uses pre-loaded samples.
                  </p>
                </div>
              </div>
            )}

            {/* SLIDE 2 */}
            {currentSlide === 1 && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div>
                  <h3 className="font-black text-slate-900 text-lg leading-tight">How CareerPilot Works</h3>
                  <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Recruitment Data Pipeline</p>
                </div>

                {/* Pipeline visual diagram */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 font-bold text-[10px] text-center shadow-inner">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg">📩</span>
                    <span>Gmail Inbox</span>
                  </div>
                  <span className="text-slate-350 text-xs font-black animate-pulse">➔</span>
                  <div className="flex flex-col items-center gap-1 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl">
                    <span className="text-lg">🤖</span>
                    <span>AI Agent System</span>
                  </div>
                  <span className="text-slate-350 text-xs font-black animate-pulse">➔</span>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg">📊</span>
                    <span>Career Dashboard</span>
                  </div>
                </div>

                {/* Agents detailed info */}
                <div className="grid grid-cols-2 gap-3 text-[10.5px]">
                  <div className="p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl">
                    <span className="font-extrabold text-indigo-650 block mb-0.5">Gmail Scanner Agent</span>
                    <span className="text-slate-500 font-medium leading-normal">Finds recruiter emails inside your inbox.</span>
                  </div>
                  <div className="p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl">
                    <span className="font-extrabold text-indigo-650 block mb-0.5">Gemini Analyzer Agent</span>
                    <span className="text-slate-500 font-medium leading-normal">Extracts company, role, status, and deadlines.</span>
                  </div>
                  <div className="p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl">
                    <span className="font-extrabold text-indigo-650 block mb-0.5">Timeline Agent</span>
                    <span className="text-slate-500 font-medium leading-normal">Maintains chronologically ordered history.</span>
                  </div>
                  <div className="p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl">
                    <span className="font-extrabold text-indigo-650 block mb-0.5">Duplicate Guard Agent</span>
                    <span className="text-slate-500 font-medium leading-normal">Prevents duplicated entries or repeated scans.</span>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 3 */}
            {currentSlide === 2 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div>
                  <h3 className="font-black text-slate-900 text-lg leading-tight">Your Career Workspace</h3>
                  <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Workspace Core Modules</p>
                </div>

                <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                  
                  {/* Dashboard */}
                  <div className="flex gap-3 items-center p-2 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600">
                      <LayoutDashboard className="w-4 h-4" />
                    </div>
                    <div className="text-[11px] leading-tight font-medium text-slate-600">
                      <span className="font-extrabold text-slate-900 block">Dashboard</span>
                      Monitor applications, interviews, offers, and progress counters.
                    </div>
                  </div>

                  {/* Email Intelligence */}
                  <div className="flex gap-3 items-center p-2 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100/60 flex items-center justify-center shrink-0 text-purple-650">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div className="text-[11px] leading-tight font-medium text-slate-600">
                      <span className="font-extrabold text-slate-900 block">Email Intelligence</span>
                      Scan Gmail using secure AI agents.
                    </div>
                  </div>

                  {/* Applications */}
                  <div className="flex gap-3 items-center p-2 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100/60 flex items-center justify-center shrink-0 text-blue-650">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <div className="text-[11px] leading-tight font-medium text-slate-600">
                      <span className="font-extrabold text-slate-900 block">Applications</span>
                      Track opportunity records with complete timeline history.
                    </div>
                  </div>

                  {/* Calendar */}
                  <div className="flex gap-3 items-center p-2 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100/60 flex items-center justify-center shrink-0 text-amber-605">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="text-[11px] leading-tight font-medium text-slate-600">
                      <span className="font-extrabold text-slate-900 block">Calendar</span>
                      Never miss crucial technical interviews or deadline milestones.
                    </div>
                  </div>

                  {/* Agent Activity */}
                  <div className="flex gap-3 items-center p-2 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100/60 flex items-center justify-center shrink-0 text-rose-600">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="text-[11px] leading-tight font-medium text-slate-600">
                      <span className="font-extrabold text-slate-900 block">Agent Activity</span>
                      Understand telemetry, decision pipelines, and processing logs.
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* SLIDE 4 */}
            {currentSlide === 3 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div>
                  <h3 className="font-black text-slate-900 text-lg leading-tight">Privacy & User Control</h3>
                  <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">🔒 Gmail Safety Guarantee</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-2xl space-y-2.5">
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                      <span className="text-xs">✓</span> CareerPilot CAN
                    </span>
                    <ul className="text-[10.5px] text-emerald-800 font-semibold space-y-1.5 leading-tight">
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 shrink-0">✓</span>
                        <span>Read-only Gmail query access</span>
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 shrink-0">✓</span>
                        <span>Let you control and export all data</span>
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 shrink-0">✓</span>
                        <span>Star important applications</span>
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 shrink-0">✓</span>
                        <span>Delete application tracking anytime</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-3 bg-rose-50/40 border border-rose-100 rounded-2xl space-y-2.5">
                    <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider flex items-center gap-1">
                      <span className="text-xs">✗</span> CareerPilot CANNOT
                    </span>
                    <ul className="text-[10.5px] text-rose-800 font-semibold space-y-1.5 leading-tight">
                      <li className="flex items-start gap-1">
                        <span className="text-rose-500 shrink-0">✗</span>
                        <span>Send any emails on your behalf</span>
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-rose-500 shrink-0">✗</span>
                        <span>Modify your Gmail folders/labels</span>
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-rose-500 shrink-0">✗</span>
                        <span>Delete your inbox messages</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-[10px] font-bold text-indigo-700 leading-normal">
                  💡 Original emails in Gmail are left completely untouched. Deletion only removes tracking logs inside this application sandbox.
                </div>
              </div>
            )}

          </div>

          {/* Bottom arrows and slide indicators */}
          <div className="h-14 border-t border-slate-100/80 flex items-center justify-between pt-2 shrink-0">
            <button
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className={`p-2 rounded-xl border border-slate-200 transition ${
                currentSlide === 0 
                  ? "opacity-30 cursor-not-allowed bg-slate-50 text-slate-350" 
                  : "bg-white hover:bg-slate-50 text-slate-650 active:scale-95"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Pagination dots */}
            <div className="flex gap-1.5">
              {[...Array(totalSlides)].map((_, i) => (
                <span 
                  key={i} 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentSlide ? "w-5 bg-indigo-600" : "w-2 bg-slate-200"
                  }`} 
                />
              ))}
            </div>

            {currentSlide === totalSlides - 1 ? (
              <button
                onClick={handleCompleteGuide}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95 flex items-center gap-1"
              >
                <span>Launch CareerPilot</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 rounded-xl transition active:scale-95"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
