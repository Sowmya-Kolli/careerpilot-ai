import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  LayoutDashboard,
  BrainCircuit,
  FolderOpen,
  Calendar,
  Zap,
  Settings,
  Home,
  Sparkles,
  Key,
  Menu,
  X,
  CheckCircle,
  HelpCircle
} from "lucide-react";

interface LayoutProps {
  currentView: string;
  setView: (view: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, setView, children }) => {
  const { apiKey, setApiKey, setSelectedAppId, demoMode, disableDemoMode } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);

  React.useEffect(() => {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
    setSelectedAppId(null);
  }, [currentView, setSelectedAppId]);

  const navigationItems = [
    { id: "landing", label: "Home", icon: Home },
    { id: "guide", label: "❓ Guide", icon: HelpCircle },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "intelligence", label: "Email Intelligence", icon: BrainCircuit },
    { id: "tracker", label: "Applications", icon: FolderOpen },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "activity", label: "Agent Activity", icon: Zap },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleSaveKey = () => {
    setApiKey(tempKey);
    setShowKeyModal(false);
  };

  const isOnboarded = localStorage.getItem("careerpilot_onboarded") === "true";

  return (
    <div className="min-h-screen flex bg-premium-gradient text-slate-800 font-sans">
      {/* Mobile Sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-md lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
         fixed inset-y-0 left-0 z-50 w-64 glass-sidebar flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen shadow-xl shadow-slate-100/50
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 bg-white/40">
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => setView("landing")}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-150 transition-transform duration-300 group-hover:scale-105">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">CareerPilot AI</span>
              <div className="text-[9px] font-black text-purple-500 tracking-widest uppercase -mt-0.5">AI RECRUITMENT AGENT</div>
            </div>
          </div>
          <button className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar bg-white/10">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const isDisabled = !isOnboarded && item.id !== "guide";
            return (
              <button
                key={item.id}
                disabled={isDisabled}
                onClick={() => {
                  if (isDisabled) return;
                  setView(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-xl transition-all duration-250 group relative
                  ${isDisabled
                    ? "opacity-40 cursor-not-allowed text-slate-400 pl-4"
                    : isActive 
                      ? "bg-gradient-to-r from-purple-50/80 to-blue-50/50 text-purple-600 shadow-sm border-l-2 border-purple-500 pl-3.5" 
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-55/40 pl-4"}
                `}
              >
                <Icon className={`w-4.5 h-4.5 transition-transform duration-205 group-hover:translate-x-0.5 ${isDisabled ? "text-slate-300" : isActive ? "text-purple-600 scale-105" : "text-slate-450 group-hover:text-slate-700"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 bg-white/20">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/80 border border-slate-100 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="relative flex h-2 w-2">
                <span className={`animate-ping-slow absolute inline-flex h-full w-full rounded-full ${
                  demoMode ? "bg-amber-400" : apiKey ? "bg-emerald-400" : "bg-slate-400"
                } opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  demoMode ? "bg-amber-500" : apiKey ? "bg-emerald-500" : "bg-slate-400"
                }`}></span>
              </div>
              <div className="text-[11px]">
                <span className="font-bold text-slate-800 block -mb-0.5">
                  {demoMode ? "Demo Workspace" : apiKey ? "Gemini Agent" : "No API Key"}
                </span>
                <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block">
                  {demoMode ? "Simulated Mode" : apiKey ? "Live Gemini AI" : "Local Fallback"}
                </span>
              </div>
            </div>
            <button 
              onClick={() => {
                setTempKey(apiKey);
                setShowKeyModal(true);
              }}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition"
              title="Configure API Key"
            >
              <Key className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Warning Banner for Demo Workspace */}
        {demoMode && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[11px] font-black uppercase tracking-wider py-2 px-6 flex items-center justify-between shrink-0 shadow-sm border-b border-orange-500/20">
            <span className="flex items-center gap-1.5">
              <span>⚠️ Demo Workspace Active: Interactive Simulated Recruiter Stream Enabled</span>
            </span>
            <button 
              onClick={disableDemoMode} 
              className="bg-white/20 hover:bg-white/30 text-white font-extrabold px-3 py-1 rounded-xl border border-white/30 transition active:scale-95 text-[10px]"
            >
              Exit Demo Mode
            </button>
          </div>
        )}

        {/* Header bar */}
        <header className="h-16 bg-white/40 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="font-extrabold text-slate-850 text-xs tracking-wide uppercase">
              {currentView === "landing" ? "Overview Portal" : currentView === "tracker" ? "Applications" : currentView === "guide" ? "Guide" : currentView + " Page"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border tracking-wide uppercase ${
              demoMode
                ? "bg-amber-50/80 border-amber-250 text-amber-850 shadow-sm shadow-amber-50/10 animate-pulse"
                : apiKey
                  ? "bg-emerald-50/80 border-emerald-150 text-emerald-700 shadow-sm shadow-emerald-50/10"
                  : "bg-slate-50 border-slate-200 text-slate-500 shadow-sm"
            }`}>
              {demoMode ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Demo Workspace Active</span>
                </>
              ) : apiKey ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Gemini Agent Active</span>
                </>
              ) : (
                <>
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span>Simulated Fallback</span>
                </>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              V1.0.0 (Kaggle Capstone)
            </div>
          </div>
        </header>

        {/* View Component Wrapper */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-transparent">
          {children}
        </main>
      </div>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md">
          <div className="bg-white/90 backdrop-blur-lg rounded-[24px] border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-250">
            <div className="px-6 py-5 border-b border-slate-100/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Configure Gemini API Key</h3>
              </div>
              <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-slate-650 transition p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Provide your Gemini API key to query the live <strong>gemini-1.5-flash</strong> model. If left empty, the application will fallback to a local high-fidelity rules engine to simulate classifications.
              </p>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gemini API Key</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                />
              </div>

              <div className="p-3 bg-indigo-50/60 border border-indigo-100/50 rounded-2xl flex gap-2.5">
                <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-indigo-700 leading-relaxed font-medium">
                  <strong>Security Guardrail Active:</strong> Keys are kept entirely in client memory/localStorage. No keys are ever uploaded to external databases.
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100/50 flex justify-end gap-3 font-semibold">
              <button 
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-xs rounded-xl transition text-slate-600"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveKey}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl shadow-md shadow-indigo-150 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
