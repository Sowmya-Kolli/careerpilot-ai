import React, { useEffect, useState } from "react";
import { 
  Sparkles, 
  Brain, 
  ArrowRight, 
  Activity, 
  Flame, 
  ShieldAlert, 
  Mail, 
  Calendar, 
  Video, 
  FileCode, 
  CheckSquare, 
  Lock, 
  Laptop, 
  XOctagon, 
  Briefcase, 
  Zap, 
  ListTodo
} from "lucide-react";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { HeroBackground } from "./HeroBackground";
import { MovingBorderButton } from "./MovingBorderButton";
import { GlowCard } from "./ui/spotlight-card";
import { renderCanvas } from "./ui/canvas";

interface LandingViewProps {
  setView: (view: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ setView }) => {
  const { enableDemoMode } = useApp();
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);

  const handleDemoClick = async () => {
    try {
      await enableDemoMode();
      localStorage.setItem("careerpilot_onboarded", "true");
      setView("dashboard");
    } catch (e) {
      console.error("Demo activation failed:", e);
    }
  };

  // Track global mouse coordinates to feed the parallax background glow
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", handleGlobalMouseMove, { passive: true });
    
    // Initialize the pointer-trail canvas effect
    renderCanvas();

    return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
  }, []);

  // Cycle through workflow steps for the interactive pipeline visualization
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWorkflowStep((prev) => (prev + 1) % 7);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const workflowSteps = [
    { label: "Recruiter Email", desc: "Incoming inbox update", icon: Mail, color: "text-blue-500 bg-blue-500/10", glow: "blue" },
    { label: "Gmail Scan", desc: "Inbox scanner trigger", icon: Sparkles, color: "text-purple-500 bg-purple-500/10", glow: "purple" },
    { label: "Gemini Analysis", desc: "Parsing email content", icon: Brain, color: "text-purple-500 bg-purple-500/10", glow: "purple" },
    { label: "Application Created", desc: "Card added to workspace", icon: Briefcase, color: "text-indigo-500 bg-indigo-500/10", glow: "blue" },
    { label: "Calendar Updated", desc: "Milestones scheduled", icon: Calendar, color: "text-amber-500 bg-amber-500/10", glow: "orange" },
    { label: "Tasks Generated", desc: "Prep checklist generated", icon: ListTodo, color: "text-teal-500 bg-teal-500/10", glow: "green" },
    { label: "Dashboard Updated", desc: "Global metrics updated", icon: Laptop, color: "text-emerald-500 bg-emerald-500/10", glow: "green" }
  ];

  // Motion reveal settings
  const scrollReveal = {
    initial: { opacity: 0, y: 35 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.75, ease: "easeOut" }
  } as const;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-sans text-slate-800 dark:text-slate-200 overflow-x-hidden relative">
      
      {/* Interactive custom background spans the entire viewport height */}
      <HeroBackground />

      {/* Cursor tracking line-trail canvas */}
      <canvas
        id="canvas"
        className="pointer-events-none absolute inset-0 mx-auto z-0"
      ></canvas>
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setView("landing")}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-md">
              <Sparkles className="w-4.5 h-4.5 text-white animate-pulse" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-purple-650 to-blue-600 bg-clip-text text-transparent">
              CareerPilot AI
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setView("login")} 
              className="px-4 py-2 text-xs font-bold text-slate-655 dark:text-slate-350 hover:text-purple-655 dark:hover:text-purple-400 transition active:scale-95"
            >
              Login / Sign Up
            </button>
            <MovingBorderButton onClick={handleDemoClick}>
              Demo Workspace
            </MovingBorderButton>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <motion.section 
        className="max-w-6xl mx-auto px-6 py-32 md:py-36 text-center space-y-8 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20 rounded-full text-[10px] text-purple-750 dark:text-purple-300 font-bold tracking-wider uppercase relative z-10 animate-bounce">
          <Flame className="w-3.5 h-3.5 text-purple-500" />
          <span>Intelligent Job Search Autopilot</span>
        </div>

        <div className="space-y-4 max-w-4xl mx-auto relative z-10">
          <span className="text-xs uppercase font-extrabold tracking-widest text-slate-405 dark:text-slate-500 block">
            CareerPilot AI
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
            Autonomous Career Management Agent
          </h1>
          <p className="text-sm sm:text-base font-extrabold text-purple-655 dark:text-purple-400 tracking-wide uppercase">
            Monitor. Understand. Organize. Never miss an opportunity.
          </p>
        </div>

        <p className="max-w-xl mx-auto text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-semibold leading-relaxed relative z-10">
          Instantly structure recruiter communications, track assessment timelines, schedule interviews, and draft follow-up emails automatically. Let CareerPilot orchestrate your application pipeline.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4 relative z-10">
          <MovingBorderButton onClick={() => setView("login")} className="w-full sm:w-auto">
            <span className="flex items-center gap-1.5 justify-center">
              <span>Login / Sign Up</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </MovingBorderButton>
          
          <button
            onClick={handleDemoClick}
            className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 text-xs font-extrabold rounded-2xl border border-slate-250 dark:border-slate-800 hover:border-purple-305 dark:hover:border-purple-800 transition shadow-sm active:scale-95 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
            <span>Explore Demo Workspace</span>
          </button>
        </div>
      </motion.section>

      {/* Interactive AI Workflow */}
      <motion.section 
        className="max-w-6xl mx-auto px-6 py-12 relative z-10"
        {...scrollReveal}
      >
        <div className="glass-card p-8 border-slate-200/50 dark:border-slate-800/80 shadow-md space-y-8">
          <div className="text-center space-y-2">
            <span className="text-[9px] font-bold text-purple-650 dark:text-purple-400 uppercase tracking-widest block">Automation Chain</span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Active Execution Pipeline</h3>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 relative">
            {workflowSteps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeWorkflowStep === idx;
              return (
                <React.Fragment key={idx}>
                  <GlowCard 
                    glowColor={step.glow as any}
                    customSize={true}
                    className={`flex flex-col items-center justify-center p-4 rounded-[28px] border transition-all duration-300 w-full lg:w-40 h-32 text-center group cursor-pointer ${
                      isActive 
                        ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20 scale-[1.04]" 
                        : "hover:border-purple-300 dark:hover:border-purple-700/60"
                    }`}
                    {...(isActive ? { style: { background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)", border: "1px solid #8b5cf6" } } : {})}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mb-3 transition-transform duration-300 ${
                      isActive ? "bg-white/20 text-white scale-110" : step.color + " group-hover:scale-105"
                    }`}>
                      <Icon className={`w-4.5 h-4.5 ${isActive ? "animate-pulse" : ""}`} />
                    </div>
                    <span className={`text-[10px] font-black leading-tight block ${
                      isActive ? "text-white" : "text-slate-800 dark:text-white"
                    }`}>
                      {step.label}
                    </span>
                    <span className={`text-[8.5px] mt-1 block leading-normal ${
                      isActive ? "text-purple-100" : "text-slate-450 dark:text-slate-500"
                    }`}>
                      {step.desc}
                    </span>
                  </GlowCard>
                  {idx < 6 && (
                    <div className="hidden lg:block text-slate-350 dark:text-slate-800 shrink-0">
                      <ArrowRight className={`w-4 h-4 transition-all duration-300 ${
                        isActive ? "text-purple-500 animate-pulse scale-110" : ""
                      }`} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* Challenge Section */}
      <motion.section 
        className="max-w-6xl mx-auto px-6 py-24 space-y-16 relative z-10"
        {...scrollReveal}
      >
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-655 dark:text-rose-400 text-[10px] font-bold uppercase rounded-lg">
            <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
            <span>The Recruitment Challenge</span>
          </span>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">Recruiter Email Overload</h2>
          <p className="text-xs sm:text-sm text-slate-555 dark:text-slate-400 font-semibold max-w-md mx-auto">
            Job hunting is chaotic. Missed communications lead to forgotten opportunities.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Lost recruiter emails", desc: "Drowning in recruiters' requests, scheduling links, and cold reach outs.", icon: Mail, color: "text-rose-500 bg-rose-500/10 border-rose-200/20" },
            { title: "Missed interview deadlines", desc: "Missing key Zoom links or failing to schedule before slots fill up.", icon: Video, color: "text-rose-500 bg-rose-500/10 border-rose-200/20" },
            { title: "Scattered applications", desc: "Letting test deadlines on HackerRank expire because they sat in spam folders.", icon: FileCode, color: "text-rose-500 bg-rose-500/10 border-rose-200/20" },
            { title: "Lost Opportunities", desc: "Losing out on competitive offers due to slow reply times.", icon: XOctagon, color: "text-rose-500 bg-rose-500/10 border-rose-200/20" }
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <GlowCard 
                key={i}
                glowColor="red"
                customSize={true}
                className="p-6 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.color.split(" ")[1]}`}>
                    <Icon className="w-5 h-5 text-rose-500" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{card.title}</h4>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">{card.desc}</p>
                </div>
              </GlowCard>
            );
          })}
        </div>
      </motion.section>

      {/* Bento Grid Section */}
      <motion.section 
        className="max-w-6xl mx-auto px-6 py-16 relative z-10 space-y-12"
        {...scrollReveal}
      >
        <div className="text-center space-y-3">
          <span className="text-[10px] text-purple-650 dark:text-purple-400 font-extrabold uppercase tracking-widest block">Interactive Modules</span>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Workspace Ecosystem</h2>
        </div>

        {/* Custom Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          
          {/* Row 1 - Col 1: Gmail Intelligence (2/3 width) */}
          <GlowCard 
            glowColor="blue"
            customSize={true}
            className="md:col-span-4 p-6 border-slate-200/50 dark:border-slate-800 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-inner">
                <Mail className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Gmail Intelligence</h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
                Securely reads incoming recruiter message headers, extracts raw email texts, matches tracking tags, and screens out general promotional spam.
              </p>
            </div>
            {/* Visual element placeholder mockup */}
            <div className="mt-4 bg-slate-50 dark:bg-slate-905 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3.5 space-y-2 text-[10px] font-mono text-slate-450 dark:text-slate-500 shadow-inner">
              <div className="flex justify-between items-center text-[9px] border-b border-slate-100 dark:border-slate-800/60 pb-1.5 text-slate-400">
                <span>INBOX SCANNER</span>
                <span className="text-emerald-500 animate-pulse font-bold">ONLINE</span>
              </div>
              <div className="flex items-center gap-2 truncate">
                <span className="text-indigo-500 font-bold">&gt;</span>
                <span>Fetching message headers [Limit: 25]</span>
              </div>
              <div className="flex items-center gap-2 truncate text-slate-655 dark:text-slate-450">
                <span className="text-emerald-500 font-bold">&gt;</span>
                <span>Filtered 8 recruiter messages from spam updates</span>
              </div>
            </div>
          </GlowCard>

          {/* Row 1 - Col 2: AI Summary (1/3 width) */}
          <GlowCard 
            glowColor="purple"
            customSize={true}
            className="md:col-span-2 p-6 border-slate-200/50 dark:border-slate-800 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 shadow-inner">
                <Brain className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Gemini AI Analysis</h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                Condenses multi-round emails into structured summaries, parsing core highlights and action items.
              </p>
            </div>
            {/* Bullet preview mockup */}
            <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-905 border border-slate-100 dark:border-slate-800/80 rounded-xl space-y-1.5 text-[9.5px] font-semibold text-slate-655 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-purple-500 font-bold">✓</span>
                <span>Interview invitation details parsed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-500 font-bold">✓</span>
                <span>Zoom link extracted from email body</span>
              </div>
            </div>
          </GlowCard>

          {/* Row 2 - Col 1: Timeline (1/2 width) */}
          <GlowCard 
            glowColor="purple"
            customSize={true}
            className="md:col-span-3 p-6 border-slate-200/50 dark:border-slate-800 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-inner">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Application Tracking</h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                Traces the progression of status classifications from Applied, to Online Assessment, Interview Rounds, and Offers.
              </p>
            </div>
            {/* Visual vertical track preview */}
            <div className="mt-4 pl-4 border-l border-slate-250 dark:border-slate-800/80 space-y-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-wide">
              <div className="relative">
                <span className="absolute -left-[20px] top-0.5 w-2 h-2 rounded-full bg-emerald-500" />
                <span>Interviews Scheduled</span>
              </div>
              <div className="relative text-slate-350 dark:text-slate-600">
                <span className="absolute -left-[20px] top-0.5 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-750" />
                <span>Assessment Completed</span>
              </div>
            </div>
          </GlowCard>

          {/* Row 2 - Col 2: Calendar (1/2 width) */}
          <GlowCard 
            glowColor="orange"
            customSize={true}
            className="md:col-span-3 p-6 border-slate-200/50 dark:border-slate-800 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-550 shadow-inner">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">AI Calendar</h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                Automatically matches interview invites and online assessments into your personal career milestone calendar.
              </p>
            </div>
            {/* Mini calendar block preview */}
            <div className="mt-4 grid grid-cols-7 gap-1 text-center font-mono text-[8px] font-bold text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/85">
              <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span className="text-purple-500">S</span><span>S</span>
              <span className="opacity-30">18</span><span className="opacity-30">19</span><span className="bg-purple-500/10 text-purple-600 rounded">20</span><span>21</span><span>22</span><span>23</span><span>24</span>
            </div>
          </GlowCard>

          {/* Row 3 - Col 1: Command Dashboard (1/3 width) */}
          <GlowCard 
            glowColor="blue"
            customSize={true}
            className="md:col-span-2 p-6 border-slate-200/50 dark:border-slate-800 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500 shadow-inner">
                <Laptop className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Command Dashboard</h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                Real-time dashboard tracking active pipelines, interview status ratios, and upcoming assessments.
              </p>
            </div>
          </GlowCard>

          {/* Row 3 - Col 2: Preparation Tasks (1/3 width) */}
          <GlowCard 
            glowColor="green"
            customSize={true}
            className="md:col-span-2 p-6 border-slate-200/50 dark:border-slate-800 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-500 shadow-inner">
                <CheckSquare className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Preparation Tasks</h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                Get target lists generated autonomously for each classified round (e.g. practicing system designs or completing HackerRank codes).
              </p>
            </div>
          </GlowCard>

          {/* Row 3 - Col 3: Agent Activity (1/3 width) */}
          <GlowCard 
            glowColor="purple"
            customSize={true}
            className="md:col-span-2 p-6 border-slate-200/50 dark:border-slate-800 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Agent Activity</h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                Full visual transparency of active security guardrails, agent step checkmarks, accuracy checks, and log telemetries.
              </p>
            </div>
          </GlowCard>

        </div>
      </motion.section>

      {/* Architecture Preview */}
      <motion.section 
        className="max-w-6xl mx-auto px-6 py-20 space-y-16 relative z-10"
        {...scrollReveal}
      >
        <div className="text-center space-y-3">
          <span className="text-[10px] text-purple-650 dark:text-purple-400 font-extrabold uppercase tracking-widest block">System Diagram</span>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Technical Architecture Preview</h2>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4 relative max-w-4xl mx-auto">
          {[
            { name: "Gmail", tech: "Inbox Sync OAuth", color: "bg-rose-500/10 text-rose-505 border-rose-550/20", glow: "red" },
            { name: "Express Backend", tech: "Node Server", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", glow: "blue" },
            { name: "Gemini AI", tech: "Google Generative AI", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", glow: "purple" },
            { name: "Supabase", tech: "PostgreSQL DB Tier", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", glow: "green" },
            { name: "Dashboard", tech: "Vite + Tailwind", color: "bg-cyan-500/10 text-cyan-550 border-cyan-500/20", glow: "blue" }
          ].map((node, i) => (
            <React.Fragment key={i}>
              <GlowCard
                glowColor={node.glow as any}
                customSize={true}
                className={`p-6 text-center w-48 transition-all duration-300 ${node.color}`}
              >
                <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">{node.name}</h5>
                <span className="text-[9px] font-bold text-slate-450 dark:text-slate-450 block mt-1 uppercase tracking-widest leading-none">{node.tech}</span>
              </GlowCard>
              {i < 4 && (
                <div className="hidden md:block text-slate-300 dark:text-slate-800 shrink-0">
                  <svg className="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="0" y1="12" x2="24" y2="12" strokeDasharray="4 4" className="animate-[dash_1.5s_linear_infinite]" />
                    <polygon points="18,8 24,12 18,16" fill="currentColor" />
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </motion.section>

      {/* Benefits Section */}
      <motion.section 
        className="bg-slate-100/50 dark:bg-slate-900/30 py-24 border-y border-slate-200/40 dark:border-slate-900 relative z-10"
        {...scrollReveal}
      >
        <div className="max-w-6xl mx-auto px-6 space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Built for Productivity</h2>
            <p className="text-[10px] text-purple-650 dark:text-purple-400 font-bold uppercase tracking-wider">Features engineered for productivity</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Brain, title: "Never miss opportunities", color: "text-purple-650", glow: "purple", desc: "Sorts incoming applications into standardized stages: Offer, Interview, Assessment, Pending, and Rejections, with classification confidence scores." },
              { icon: Calendar, title: "Centralized career management", color: "text-blue-500", glow: "blue", desc: "Automatically extracts date milestones and deadlines, matching scheduling links and syncing them directly to your personal workspace calendar." },
              { icon: Lock, title: "Automated tracking & insights", color: "text-emerald-500", glow: "green", desc: "Your credentials and settings are saved securely on your local storage. Supabase database tables run inside standard secure client domains." }
            ].map((benefit, bIdx) => {
              const Icon = benefit.icon;
              return (
                <GlowCard 
                  key={bIdx} 
                  glowColor={benefit.glow as any}
                  customSize={true}
                  className="p-8 border-slate-200/50 dark:border-slate-800"
                >
                  <Icon className={`w-8 h-8 ${benefit.color}`} />
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white">{benefit.title}</h4>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">{benefit.desc}</p>
                </GlowCard>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* CTA Closing Section */}
      <motion.section 
        className="max-w-4xl mx-auto px-6 py-28 text-center space-y-6 relative z-10"
        {...scrollReveal}
      >
        <h2 className="text-3xl font-black text-slate-905 dark:text-white leading-tight">
          Pilot Your Job Hunt Intelligently
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-semibold max-w-md mx-auto">
          Start organizing your interviews, test assessments, and agent telemetries in minutes.
        </p>
        <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4 max-w-sm mx-auto">
          <MovingBorderButton onClick={() => setView("login")} className="w-full">
            Login / Sign Up
          </MovingBorderButton>
          <button
            onClick={handleDemoClick}
            className="w-full py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-205 border border-slate-250 dark:border-slate-800 font-extrabold text-xs rounded-[20px] transition active:scale-95 shadow-sm"
          >
            Demo Workspace
          </button>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-slate-250/50 dark:border-slate-900 py-10 bg-white dark:bg-slate-950 transition-colors duration-300 relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest gap-4">
          <span>© 2026 CareerPilot AI. Autonomous Recruitment Orchestrator.</span>
          <span>V2.0.0 (Kaggle Capstone Final Release)</span>
        </div>
      </footer>

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -20;
          }
        }
      `}</style>

    </div>
  );
};
