import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { 
  Settings, 
  User, 
  Cpu, 
  CheckCircle2, 
  Trash2, 
  Key, 
  FileText,
  FileSpreadsheet,
  Database,
  RefreshCw,
  Moon,
  Sun,
  Bell,
  Sliders,
  AlertTriangle
} from "lucide-react";

export const SettingsView: React.FC = () => {
  const { 
    apiKey, 
    setApiKey, 
    setUserName, 
    setUserEmail, 
    selectedModel, 
    setSelectedModel, 
    gmailConnected, 
    careerGoal,
    setCareerGoal,
    preferredRoles,
    setPreferredRoles,
    jobSearchStatus,
    setJobSearchStatus,
    applications,
    purgeSystemData,
    gmailProfileImage,
    gmailLastSync,
    connectGmailAccount,
    disconnectGmailAccount,
    cleanupOldApplications,
    profileManuallySaved,
    setProfileManuallySaved,
    gmailProfileEmail,
    gmailProfileName,
    displayName,
    displayEmail,
    demoMode,
    darkMode,
    toggleDarkMode
  } = useApp();

  const [activeTab, setActiveTab] = useState<"account" | "ai" | "appearance" | "notifications" | "data" | "danger">("account");

  const [tempKey, setTempKey] = useState(apiKey);
  const [profileName, setProfileName] = useState(displayName);
  const [profileEmail, setProfileEmail] = useState(displayEmail);
  const [goal, setGoal] = useState(careerGoal || "");
  const [roles, setRoles] = useState(preferredRoles || "");
  const [status, setStatus] = useState(jobSearchStatus || "Actively Looking");

  React.useEffect(() => {
    setProfileName(displayName);
    setProfileEmail(displayEmail);
  }, [displayName, displayEmail]);

  React.useEffect(() => {
    setGoal(careerGoal || "");
    setRoles(preferredRoles || "");
    setStatus(jobSearchStatus || "Actively Looking");
  }, [careerGoal, preferredRoles, jobSearchStatus]);

  const [cleanupMonths, setCleanupMonths] = useState<number>(3);
  const [keepStarred, setKeepStarred] = useState<boolean>(true);

  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [showSavedMsg, setShowSavedMsg] = useState(false);
  const [savedMsgText, setSavedMsgText] = useState("Settings saved successfully!");

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  const triggerSaveNotification = (message: string) => {
    setSavedMsgText(message);
    setShowSavedMsg(true);
    setTimeout(() => setShowSavedMsg(false), 2500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUserName(profileName);
    setUserEmail(profileEmail);
    setCareerGoal(goal);
    setPreferredRoles(roles);
    setJobSearchStatus(status);
    setProfileManuallySaved(true);
    triggerSaveNotification("Candidate profile settings updated!");
  };

  const handleSaveApiKey = () => {
    setApiKey(tempKey);
    triggerSaveNotification("Gemini API key updated!");
  };

  const [gmailError, setGmailError] = useState("");

  const handleConnectGmail = async () => {
    setIsConnectingGmail(true);
    setGmailError("");
    try {
      const result = await connectGmailAccount();
      if (result && !profileManuallySaved) {
        setProfileName(result.name);
        setProfileEmail(result.email);
      }
      triggerSaveNotification("Gmail account linked successfully!");
    } catch (err: any) {
      console.error("Connect Gmail failed:", err);
      setGmailError(err.message || "Google OAuth connection failed.");
      triggerSaveNotification("Gmail connection failed.");
    } finally {
      setIsConnectingGmail(false);
    }
  };

  const handleDisconnectGmail = () => {
    disconnectGmailAccount();
    triggerSaveNotification("Gmail account disconnected.");
  };

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to generate the PDF report.");
      return;
    }

    const offers = applications.filter(a => a.status === "OFFER");
    const interviews = applications.filter(a => a.status === "INTERVIEW");
    const assessments = applications.filter(a => a.status === "ASSESSMENT");

    const appRowsHtml = applications.map(app => {
      let dateText = "N/A";
      if (app.status === "OFFER") dateText = app.joiningDate || "N/A";
      else if (app.status === "INTERVIEW") dateText = app.interviewDate || "N/A";
      else if (app.status === "ASSESSMENT") dateText = app.assessmentDeadline || "N/A";
      else dateText = app.date.value || "N/A";

      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">${app.company}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${app.role}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;"><span style="padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; background: #eee;">${app.status}</span></td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${dateText}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; font-size: 11px;">${app.summary}</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>CareerPilot AI - Career Progress Report</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 40px; }
            h1 { color: #6C4DF6; margin-bottom: 5px; }
            .header { border-bottom: 2px solid #6C4DF6; padding-bottom: 20px; margin-bottom: 30px; }
            .meta-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
            .meta-item { background: #F9FAFB; padding: 12px; border-radius: 8px; border: 1px solid #E5E7EB; }
            .meta-label { font-size: 10px; text-transform: uppercase; color: #6B7280; font-weight: bold; }
            .meta-val { font-size: 14px; font-weight: bold; margin-top: 4px; }
            .stats-grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .stat-card { text-align: center; background: #EEF2FF; padding: 15px; border-radius: 8px; border: 1px solid #C7D2FE; }
            .stat-val { font-size: 24px; font-weight: 900; color: #6C4DF6; }
            .stat-label { font-size: 11px; font-weight: bold; color: #6C4DF6; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; background: #F3F4F6; padding: 10px; border-bottom: 2px solid #E5E7EB; font-size: 12px; text-transform: uppercase; color: #4B5563; }
            tr:nth-child(even) { background: #FAFAFA; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CareerPilot AI - Career Progress Report</h1>
            <p style="color: #6B7280; font-size: 12px; margin: 0;">Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">Candidate Name</div>
              <div class="meta-val">${profileName}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Email Address</div>
              <div class="meta-val">${profileEmail}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Career Goal</div>
              <div class="meta-val">${careerGoal}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Preferred Roles</div>
              <div class="meta-val">${preferredRoles}</div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-val">${applications.length}</div>
              <div class="stat-label">Total Applications</div>
            </div>
            <div class="stat-card" style="background: #ECFDF5; border-color: #A7F3D0;">
              <div class="stat-val" style="color: #059669;">${offers.length}</div>
              <div class="stat-label" style="color: #059669;">Offers</div>
            </div>
            <div class="stat-card" style="background: #EFF6FF; border-color: #BFDBFE;">
              <div class="stat-val" style="color: #2563EB;">${interviews.length}</div>
              <div class="stat-label" style="color: #2563EB;">Interviews</div>
            </div>
            <div class="stat-card" style="background: #FEF3C7; border-color: #FDE68A;">
              <div class="stat-val" style="color: #D97706;">${assessments.length}</div>
              <div class="stat-label" style="color: #D97706;">Assessments</div>
            </div>
          </div>

          <h2>Job Application Tracker</h2>
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th>Status</th>
                <th>Target Date</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              ${appRowsHtml || '<tr><td colspan="5" style="text-align: center; padding: 20px;">No applications tracked yet.</td></tr>'}
            </tbody>
          </table>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportCSV = () => {
    const headers = ["Company", "Role", "Status", "Summary", "Next Action", "Interview Date", "Assessment Deadline", "Joining Date", "Mode", "Location", "Source", "Date Added"];
    const rows = applications.map(app => [
      app.company,
      app.role,
      app.status,
      app.summary,
      app.nextAction,
      app.interviewDate || "N/A",
      app.assessmentDeadline || "N/A",
      app.joiningDate || "N/A",
      app.mode || "Online",
      app.location || "Remote",
      app.source || "Gmail",
      app.dateAdded
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${(val || "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `careerpilot_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerSaveNotification("Excel CSV exported successfully!");
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(applications, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `careerpilot_backup_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerSaveNotification("JSON Backup exported successfully!");
  };

  const handleCleanup = () => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - cleanupMonths);

    const oldApps = applications.filter((app) => {
      const appDate = new Date(app.dateAdded || app.lastActivityDate || new Date());
      return appDate < cutoffDate;
    });

    const totalOld = oldApps.length;
    if (totalOld === 0) {
      triggerSaveNotification(`No applications older than ${cleanupMonths} month${cleanupMonths > 1 ? "s" : ""} found.`);
      return;
    }

    const starredPreserved = keepStarred ? oldApps.filter(app => app.isStarred).length : 0;
    const toDelete = totalOld - starredPreserved;

    const confirmMessage = `${totalOld} old application${totalOld > 1 ? "s" : ""} found.\n\n${toDelete} application${toDelete !== 1 ? "s" : ""} will be deleted.\n\n${starredPreserved} starred application${starredPreserved !== 1 ? "s" : ""} will be preserved.\n\nDo you want to continue?`;
    
    if (window.confirm(confirmMessage)) {
      cleanupOldApplications(cleanupMonths, keepStarred);
      triggerSaveNotification(`Cleaned up ${toDelete} old application record${toDelete !== 1 ? "s" : ""}!`);
    }
  };

  const handleClearAllData = async () => {
    if (window.confirm("Are you absolutely sure you want to clear all tracked applications and activity logs? This will delete all recruitment entries from Supabase while preserving your settings, credentials, and dark mode preference.")) {
      await purgeSystemData();
      triggerSaveNotification("All applications and logs have been purged!");
    }
  };

  return (
    <div className="v2-page-container space-y-8 animate-in fade-in duration-300">
      
      {/* Settings Title Header */}
      <div className="flex justify-between items-center glass-card p-5 shadow-sm">
        <div>
          <h2 className="v2-header">System Settings</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-semibold">Configure your recruitment tracking agent environment</p>
        </div>
        <Settings className="w-5 h-5 text-indigo-500" />
      </div>

      <div className="grid md:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Sidebar Tabs Navigation */}
        <div className="md:col-span-4 space-y-2.5">
          {[
            { id: "account", label: "Candidate Profile", icon: User },
            { id: "ai", label: "AI Connections", icon: Cpu },
            { id: "appearance", label: "Appearance", icon: Sliders },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "data", label: "Data Management", icon: Database },
            { id: "danger", label: "Danger Zone", icon: AlertTriangle }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-md shadow-purple-500/10"
                    : "bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 border border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300"
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Tab Panel Content Container */}
        <div className="md:col-span-8">
          
          {/* TAB 1: ACCOUNT */}
          {activeTab === "account" && (
            <div className="glass-card p-8 space-y-6 animate-in fade-in duration-200">
              <h3 className="font-extrabold text-sm text-slate-905 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4.5 h-4.5 text-indigo-500" />
                <span>Candidate Profile</span>
              </h3>

              <form onSubmit={handleSaveProfile} className="space-y-4 font-semibold text-slate-700 dark:text-slate-300">
                {gmailConnected && gmailProfileImage && (
                  <div className="flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-150/40 dark:border-slate-800">
                    <img
                      src={gmailProfileImage}
                      alt="Profile"
                      className="w-12 h-12 rounded-full border border-slate-205 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Connected profile</span>
                      <span className="text-xs font-black text-slate-800 dark:text-white block leading-tight">{gmailProfileName}</span>
                      <span className="text-[10px] text-slate-500 block leading-none mt-1">{gmailProfileEmail}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Candidate Name</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition-all text-slate-800 dark:text-slate-205"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
                    <input
                      type="email"
                      required
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition-all text-slate-800 dark:text-slate-205"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Career Goal / Target Role</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Frontend Engineer"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition-all text-slate-800 dark:text-slate-205"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Preferred Roles & Sectors</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AI Product development, Cloud tools, Fintech React roles"
                    value={roles}
                    onChange={(e) => setRoles(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition-all text-slate-800 dark:text-slate-205"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Job Search Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50/60 dark:bg-slate-900/60 border border-slate-205 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer"
                    >
                      <option value="Actively Looking">Actively Looking</option>
                      <option value="Open to Offers">Open to Offers</option>
                      <option value="Not Looking">Not Looking</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Profile Source</label>
                    <div className="px-3.5 py-2.5 bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-805 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 capitalize h-10 flex items-center">
                      {profileManuallySaved ? "Manual Override" : gmailConnected ? "Gmail Sync" : demoMode ? "Sandbox Demo" : "Unsaved User"}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-650 text-white text-xs font-extrabold rounded-xl transition shadow-md active:scale-95"
                >
                  Save Profile Settings
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: AI CONNECTIONS */}
          {activeTab === "ai" && (
            <div className="glass-card p-8 space-y-6 animate-in fade-in duration-200">
              <h3 className="font-extrabold text-sm text-slate-905 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4.5 h-4.5 text-indigo-500" />
                <span>AI Engine & Gmail Ingest</span>
              </h3>

              {/* Gemini configuration */}
              <div className="border border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 p-5 rounded-[20px] space-y-4 font-semibold text-slate-700 dark:text-slate-300">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">Gemini Flash Integrations</span>
                  {apiKey && (
                    <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Saved
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Model API target</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none transition-all font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer"
                  >
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="simulated">Simulated Rules Engine</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Gemini API Key</label>
                  <div className="relative">
                    <Key className="w-3.5 h-3.5 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="password"
                      placeholder="****************"
                      value={tempKey}
                      onChange={(e) => setTempKey(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50/60 dark:bg-slate-900/60 border border-slate-205 dark:border-slate-800 rounded-xl text-xs focus:outline-none transition-all font-mono text-slate-850 dark:text-slate-200"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveApiKey}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition active:scale-95"
                >
                  Update API Key
                </button>
              </div>

              {/* Gmail ingestion status */}
              <div className="border border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 p-5 rounded-[20px] space-y-4">
                <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block border-b border-slate-100 dark:border-slate-800/80 pb-2">Gmail OAuth Account Link</span>
                
                {!gmailConnected ? (
                  <div className="space-y-4 font-semibold text-slate-700">
                    <div className="flex justify-between items-center p-3.5 bg-slate-50/60 dark:bg-slate-900/50 border border-slate-150/40 dark:border-slate-800 rounded-xl">
                      <div className="space-y-0.5">
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">Gmail Account Link</span>
                        <span className="text-[10px] text-rose-505 font-extrabold uppercase tracking-wider">Disconnected</span>
                      </div>
                      
                      <button
                        disabled={isConnectingGmail}
                        onClick={handleConnectGmail}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-755 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isConnectingGmail ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <span>Connect Gmail</span>
                        )}
                      </button>
                    </div>
                    {gmailError && (
                      <div className="p-2 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-700 font-semibold">
                        {gmailError}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 font-semibold text-slate-700">
                    <div className="p-4 bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-150/50 dark:border-emerald-900 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold text-emerald-850 dark:text-emerald-400">Gmail Connection Active</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-250 rounded-lg text-[8px] font-black uppercase tracking-wider">Connected</span>
                      </div>
                      <div className="text-[10.5px] font-semibold text-slate-655 dark:text-slate-400 space-y-2">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Account name</span>
                          <span className="text-slate-850 dark:text-slate-200 font-bold block leading-tight">{gmailProfileName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Connected email</span>
                          <span className="text-slate-850 dark:text-slate-200 font-bold block leading-tight">{gmailProfileEmail}</span>
                        </div>
                        <div className="pt-1.5 border-t border-slate-200/40">
                          <span className="text-slate-400">Last sync:</span> <span className="text-slate-850 dark:text-slate-200 font-bold">{gmailLastSync || "Never synced"}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleDisconnectGmail}
                      className="w-full py-2 bg-rose-50 border border-rose-150 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 active:scale-95"
                    >
                      Disconnect Account
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: APPEARANCE */}
          {activeTab === "appearance" && (
            <div className="glass-card p-8 space-y-6 animate-in fade-in duration-200">
              <h3 className="font-extrabold text-sm text-slate-905 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4.5 h-4.5 text-indigo-500" />
                <span>Appearance Settings</span>
              </h3>

              <div className="border border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 p-5 rounded-[20px] space-y-5">
                <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block border-b border-slate-100 dark:border-slate-805/80 pb-2">Layout Theme</span>
                
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl">
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-white block">Theme Mode</span>
                    <span className="text-[10px] text-slate-400 font-medium">Switch between light and dark configurations</span>
                  </div>
                  
                  <button
                    onClick={toggleDarkMode}
                    className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-50 transition active:scale-95 flex items-center gap-2 font-bold text-xs"
                  >
                    {darkMode ? (
                      <>
                        <Sun className="w-4 h-4 text-amber-500 animate-spin" />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4 text-purple-650 animate-pulse" />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="glass-card p-8 space-y-6 animate-in fade-in duration-200">
              <h3 className="font-extrabold text-sm text-slate-905 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-4.5 h-4.5 text-indigo-500" />
                <span>Notifications Panel</span>
              </h3>

              <div className="border border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 p-5 rounded-[20px] space-y-4 font-semibold text-slate-700 dark:text-slate-350">
                <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block border-b border-slate-100 dark:border-slate-805/80 pb-2">Preferences</span>

                <div className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-white block">Sound Simulations</span>
                    <span className="text-[10px] text-slate-400 font-medium">Play alert sounds when sync tasks resolve</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="w-4.5 h-4.5 rounded text-purple-600 border-slate-300 focus:ring-purple-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-white block">Desktop Popups</span>
                    <span className="text-[10px] text-slate-400 font-medium">Display workspace notifications on recruiter match</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={alertsEnabled}
                    onChange={(e) => setAlertsEnabled(e.target.checked)}
                    className="w-4.5 h-4.5 rounded text-purple-600 border-slate-300 focus:ring-purple-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DATA MANAGEMENT */}
          {activeTab === "data" && (
            <div className="glass-card p-8 space-y-6 animate-in fade-in duration-200">
              <h3 className="font-extrabold text-sm text-slate-905 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4.5 h-4.5 text-indigo-500" />
                <span>Data Management</span>
              </h3>

              {/* Exports panel */}
              <div className="border border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 p-5 rounded-[20px] space-y-4">
                <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block border-b border-slate-100 dark:border-slate-800/80 pb-2">Export Workspace</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={handleExportPDF}
                    className="p-3.5 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 border border-indigo-100/50 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 hover:text-indigo-850 rounded-2xl text-[10px] font-black uppercase tracking-wider transition flex flex-col items-center justify-center gap-2 text-center"
                  >
                    <FileText className="w-5 h-5 text-indigo-650 dark:text-indigo-400" />
                    <span>PDF Report</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 border border-emerald-100/50 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 hover:text-emerald-850 rounded-2xl text-[10px] font-black uppercase tracking-wider transition flex flex-col items-center justify-center gap-2 text-center"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-emerald-650 dark:text-emerald-400" />
                    <span>Excel Export</span>
                  </button>

                  <button
                    onClick={handleExportJSON}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-205 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-905 rounded-2xl text-[10px] font-black uppercase tracking-wider transition flex flex-col items-center justify-center gap-2 text-center"
                  >
                    <Database className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <span>JSON Backup</span>
                  </button>
                </div>
              </div>

              {/* Data cleanup panel */}
              <div className="border border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 p-5 rounded-[20px] space-y-4">
                <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block border-b border-slate-100 dark:border-slate-800/80 pb-2">Data Housekeeping</span>
                
                <div className="space-y-4 font-semibold text-slate-705 dark:text-slate-350">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Timeframe Cleanup Threshold</label>
                    <div className="flex gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {[1, 3, 6].map((m) => (
                        <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                             type="radio"
                             name="cleanupMonths"
                             value={m}
                             checked={cleanupMonths === m}
                             onChange={() => setCleanupMonths(m)}
                             className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-505/20 cursor-pointer"
                          />
                          <span>{m} Month{m > 1 ? "s" : ""}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="keepStarred"
                      checked={keepStarred}
                      onChange={(e) => setKeepStarred(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-650 border-slate-300 focus:ring-indigo-500/20 cursor-pointer"
                    />
                    <label htmlFor="keepStarred" className="text-xs text-slate-750 dark:text-slate-300 font-bold select-none cursor-pointer">
                      Keep starred applications (Recommended)
                    </label>
                  </div>

                  {/* Calculations checklist */}
                  {(() => {
                    const cutoffDate = new Date();
                    cutoffDate.setMonth(cutoffDate.getMonth() - cleanupMonths);

                    const oldApps = applications.filter((app) => {
                      const appDate = new Date(app.dateAdded || app.lastActivityDate || new Date());
                      return appDate < cutoffDate;
                    });

                    const totalOld = oldApps.length;
                    const starredPreserved = keepStarred ? oldApps.filter(app => app.isStarred).length : 0;
                    const toDelete = totalOld - starredPreserved;

                    return (
                      <div className="p-3.5 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1.5 text-[10.5px] text-slate-500 font-semibold shadow-inner">
                        <div className="flex justify-between">
                          <span>Old applications found:</span>
                          <span className="font-bold text-slate-805 dark:text-slate-200">{totalOld}</span>
                        </div>
                        <div className="flex justify-between text-rose-600">
                          <span>Will be removed:</span>
                          <span className="font-bold">{toDelete}</span>
                        </div>
                        <div className="flex justify-between text-emerald-600">
                          <span>Starred entries to preserve:</span>
                          <span className="font-bold">{starredPreserved}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    onClick={handleCleanup}
                    className="w-full py-2.5 bg-indigo-50/50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/40 border border-indigo-150 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-xl transition active:scale-95"
                  >
                    Run Cleanup Pipeline
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DANGER ZONE */}
          {activeTab === "danger" && (
            <div className="glass-card p-8 border-rose-200/50 dark:border-rose-900/40 space-y-6 animate-in fade-in duration-200">
              <h3 className="font-extrabold text-sm text-rose-700 dark:text-rose-450 border-b border-rose-100 dark:border-rose-900 pb-3 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4.5 h-4.5 text-rose-500" />
                <span>Danger Zone</span>
              </h3>

              <div className="p-5 bg-rose-50/30 dark:bg-rose-950/10 border border-rose-150/40 dark:border-rose-900/40 rounded-[20px] space-y-4">
                <div>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white block">Purge All Tracked Data</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal mt-1 font-semibold">
                    This permanently deletes all job applications, events, tasks, timeline dates, and agent activities from your workspace. This action is irreversible. Your profile credentials and API configurations will be preserved.
                  </p>
                </div>

                <button
                  onClick={handleClearAllData}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-750 text-white font-extrabold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                  <span>Execute Purge System Data</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {showSavedMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900/90 dark:bg-slate-950/90 text-white text-xs font-bold px-4.5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-800 dark:border-slate-800/80 animate-in fade-in slide-in-from-bottom-2 duration-300 z-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{savedMsgText}</span>
        </div>
      )}

    </div>
  );
};
