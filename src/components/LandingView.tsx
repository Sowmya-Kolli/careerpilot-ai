import React from "react";
import { Sparkles, Brain, FolderHeart, CalendarRange, ShieldCheck, ArrowRight } from "lucide-react";

interface LandingViewProps {
  setView: (view: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ setView }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-20 py-8 px-2 page-entrance">
      
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-10 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50/80 to-blue-50/80 border border-purple-100/50 rounded-full text-[10px] text-purple-700 font-bold tracking-wider uppercase shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
          <span>Your AI-powered job application command center</span>
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-tight tracking-tight">
          CareerPilot AI <span className="text-purple-650">✨</span><br />
          <span className="bg-gradient-to-r from-purple-600 via-indigo-650 to-blue-500 bg-clip-text text-transparent">
            Your AI-powered job application command center
          </span>
        </h1>

        <p className="max-w-xl mx-auto text-slate-550 text-xs md:text-sm leading-relaxed font-semibold">
          Transform recruiter emails into organized application tracking with Gemini-powered automation.
        </p>

        <div className="pt-4 flex justify-center gap-4">
          <button
            onClick={() => setView("dashboard")}
            className="group px-6 py-3.5 btn-premium text-white text-xs font-semibold rounded-2xl shadow-lg flex items-center gap-2 transition"
          >
            <span>🚀 Open Dashboard</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          
          <button
            onClick={() => setView("intelligence")}
            className="px-6 py-3.5 bg-white/80 hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-2xl shadow-sm transition active:scale-[0.98]"
          >
            ✨ Scan Recruiter Email
          </button>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="space-y-12 glass-card p-8 md:p-10 rounded-[24px] shadow-sm">
        <div className="text-center space-y-1.5">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">How It Works</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Automated recruitment monitoring flow</p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 relative items-start">
          {/* Step 1 */}
          <div className="relative space-y-4 text-center md:text-left group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-100 to-purple-50 border border-purple-200 flex items-center justify-center font-extrabold text-purple-700 text-base shadow-sm mx-auto md:mx-0 transition-transform group-hover:scale-105">
              ①
            </div>
            <h3 className="font-bold text-slate-850 text-sm">Connect Gmail</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Link your inbox or select sandbox emails to ingest headers and content automatically.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative space-y-4 text-center md:text-left group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-100 to-blue-50 border border-blue-200 flex items-center justify-center font-extrabold text-blue-700 text-base shadow-sm mx-auto md:mx-0 transition-transform group-hover:scale-105">
              ②
            </div>
            <h3 className="font-bold text-slate-855 text-sm">Gemini analyzes recruiter emails</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Intelligent agents process incoming recruiter communications to understand email context.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative space-y-4 text-center md:text-left group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-100 to-amber-50 border border-amber-200 flex items-center justify-center font-extrabold text-amber-700 text-base shadow-sm mx-auto md:mx-0 transition-transform group-hover:scale-105">
              ③
            </div>
            <h3 className="font-bold text-slate-855 text-sm">Extract company, role, status, and dates</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Structure key parameters including corporate name, position, pipeline milestones, and calendar dates.
            </p>
          </div>

          {/* Step 4 */}
          <div className="relative space-y-4 text-center md:text-left group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-100 to-emerald-50 border border-emerald-200 flex items-center justify-center font-extrabold text-emerald-700 text-base shadow-sm mx-auto md:mx-0 transition-transform group-hover:scale-105">
              ④
            </div>
            <h3 className="font-bold text-slate-855 text-sm">Automatically organize applications</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Updates automatically populate your dashboard tracker cards, calendar charts, and milestones.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="space-y-10">
        <div className="text-center space-y-1.5">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Core System Features</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Advanced capabilities for application tracking</p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Feature 1 */}
          <div className="bg-gradient-to-b from-white to-purple-50/10 border border-purple-100 hover:border-purple-200 p-6 rounded-[24px] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-52">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 border border-purple-200/50 flex items-center justify-center shadow-sm">
              <Brain className="w-5.5 h-5.5 text-purple-600" />
            </div>
            <div className="space-y-2 mt-4">
              <h4 className="font-bold text-xs text-slate-850">AI Email Intelligence</h4>
              <p className="text-[11px] text-slate-450 leading-relaxed font-medium">
                Gemini understands recruiter emails and structures key parameters instantly.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-gradient-to-b from-white to-blue-50/10 border border-blue-100 hover:border-blue-200 p-6 rounded-[24px] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-52">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200/50 flex items-center justify-center shadow-sm">
              <FolderHeart className="w-5.5 h-5.5 text-blue-650" />
            </div>
            <div className="space-y-2 mt-4">
              <h4 className="font-bold text-xs text-slate-850">Smart Application Tracking</h4>
              <p className="text-[11px] text-slate-450 leading-relaxed font-medium">
                Automatically organizes career opportunities into a simple, inbox-style view.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-gradient-to-b from-white to-amber-50/10 border border-amber-100 hover:border-amber-200 p-6 rounded-[24px] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-52">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200/50 flex items-center justify-center shadow-sm">
              <CalendarRange className="w-5.5 h-5.5 text-amber-600" />
            </div>
            <div className="space-y-2 mt-4">
              <h4 className="font-bold text-xs text-slate-850">Deadline Management</h4>
              <p className="text-[11px] text-slate-450 leading-relaxed font-medium">
                Never miss an interview scheduling link, assessment deadline, or offer signing date.
              </p>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="bg-gradient-to-b from-white to-emerald-50/10 border border-emerald-100 hover:border-emerald-200 p-6 rounded-[24px] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-52">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-200/50 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5.5 h-5.5 text-emerald-650" />
            </div>
            <div className="space-y-2 mt-4">
              <h4 className="font-bold text-xs text-slate-850">Privacy First</h4>
              <p className="text-[11px] text-slate-450 leading-relaxed font-medium">
                Your data is stored locally in client-memory and processed with user-controlled consent.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats banner */}
      <section className="rounded-[24px] bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-8 md:p-12 relative overflow-hidden shadow-xl shadow-purple-950/10">
        <div className="absolute right-0 top-0 w-64 h-64 bg-purple-800/20 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-purple-750/10 rounded-full blur-3xl" />
        
        <div className="max-w-xl space-y-6 relative z-10">
          <h3 className="text-xl md:text-2xl font-bold leading-snug tracking-tight">
            Ready to track your career journey?
          </h3>
          <p className="text-purple-200/80 text-[11px] md:text-xs leading-relaxed font-semibold">
            Import recruiting emails directly, view detailed timelines of agent activities, and verify agent accuracy in our sandbox.
          </p>
          <div className="pt-2">
            <button 
              onClick={() => setView("dashboard")} 
              className="px-5 py-2.5 bg-white hover:bg-purple-50 hover:scale-[1.01] active:scale-[0.98] text-purple-950 font-bold rounded-xl text-xs transition shadow-lg shadow-purple-950/10"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
