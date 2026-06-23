import React, { useState } from "react";
import { Sparkles, Mail, ShieldAlert, Cpu, LayoutDashboard, ArrowRight, RefreshCw } from "lucide-react";
import { useApp } from "../context/AppContext";

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { connectGmailAccount, enableDemoMode } = useApp();
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleConnectGmail = async () => {
    setIsConnecting(true);
    setErrorMsg("");
    try {
      await connectGmailAccount();
      localStorage.setItem("careerpilot_onboarded", "true");
      onComplete();
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
      onComplete();
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to initialize demo workspace.");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-lg animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        
        {/* Left Side Accent */}
        <div className="md:w-5/12 bg-gradient-to-br from-purple-700 via-indigo-750 to-blue-600 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-xl -ml-10 -mb-10" />
          
          <div className="relative z-10 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center border border-white/10">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
            </div>
            <span className="font-extrabold text-sm tracking-tight uppercase">CareerPilot AI</span>
          </div>

          <div className="relative z-10 space-y-3.5 my-8 md:my-0">
            <h2 className="text-2xl font-black leading-tight tracking-tight">
              Welcome to CareerPilot AI 👋
            </h2>
            <p className="text-[11.5px] text-purple-100/90 leading-relaxed font-semibold">
              Your AI-powered recruiter email organizer and job application command center.
            </p>
          </div>

          <div className="relative z-10 text-[9.5px] text-purple-250 font-bold uppercase tracking-widest leading-none">
            V1.0.0 (Kaggle Capstone)
          </div>
        </div>

        {/* Right Side Onboarding Flow */}
        <div className="md:w-7/12 p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div>
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block mb-0.5">Quick Onboarding</span>
              <h3 className="font-extrabold text-slate-900 text-base leading-none">Get Started in 3 Simple Steps</h3>
            </div>

            {/* Steps Container */}
            <div className="space-y-4">
              
              {/* Step 1 */}
              <div className="flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100/60 flex items-center justify-center shrink-0 text-purple-600">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="text-[11px] leading-normal font-semibold text-slate-600">
                  <span className="font-bold text-slate-905 block text-xs">Step 1: 🔗 Connect Gmail Securely</span>
                  CareerPilot connects using Google OAuth with read-only permission.
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold">
                    <span className="text-emerald-600">✓ Read recruiter emails</span>
                    <span className="text-rose-500">✗ Send emails</span>
                    <span className="text-rose-500">✗ Delete emails</span>
                    <span className="text-rose-500">✗ Modify your inbox</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100/60 flex items-center justify-center shrink-0 text-indigo-650">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="text-[11px] leading-normal font-semibold text-slate-600">
                  <span className="font-bold text-slate-905 block text-xs">Step 2: 🤖 Run AI Mail Scan</span>
                  Gemini-powered agents analyze recruiter emails and automatically extract:
                  <span className="block mt-1 font-bold text-indigo-600">
                    • company • role • status • deadlines • important actions
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100/60 flex items-center justify-center shrink-0 text-blue-600">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <div className="text-[11px] leading-normal font-semibold text-slate-600">
                  <span className="font-bold text-slate-905 block text-xs">Step 3: 📊 Track Everything Automatically</span>
                  CareerPilot automatically organizes applications, interview schedules, test assessments, offers, and deadlines.
                </div>
              </div>

            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3.5">
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
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 shrink-0"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Connecting Google...</span>
                  </>
                ) : (
                  <>
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
            
            <div className="text-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                🔒 Privacy guaranteed. Data is processed locally.
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
