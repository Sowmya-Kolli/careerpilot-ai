import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { 
  Settings, 
  User, 
  Mail, 
  Cpu, 
  CheckCircle2, 
  Trash2, 
  Download,
  Key,
  Check,
  FileText,
  FileSpreadsheet,
  Database,
  Sparkles,
  RefreshCw
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
    preferredRoles,
    applications,
    clearLogs,
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
    demoMode
  } = useApp();

  const [tempKey, setTempKey] = useState(apiKey);
  const [profileName, setProfileName] = useState(displayName);
  const [profileEmail, setProfileEmail] = useState(displayEmail);

  React.useEffect(() => {
    setProfileName(displayName);
    setProfileEmail(displayEmail);
  }, [displayName, displayEmail]);

  const [cleanupMonths, setCleanupMonths] = useState<number>(3);
  const [keepStarred, setKeepStarred] = useState<boolean>(true);

  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [showSavedMsg, setShowSavedMsg] = useState(false);
  const [savedMsgText, setSavedMsgText] = useState("Settings saved successfully!");

  const triggerSaveNotification = (message: string) => {
    setSavedMsgText(message);
    setShowSavedMsg(true);
    setTimeout(() => setShowSavedMsg(false), 2500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUserName(profileName);
    setUserEmail(profileEmail);
    setProfileManuallySaved(true);
    triggerSaveNotification("Candidate profile updated!");
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

          <h2>Application History</h2>
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th>Status</th>
                <th>Key Date</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              ${appRowsHtml || '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #999;">No applications tracked yet.</td></tr>'}
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

  const handleClearAllData = () => {
    if (window.confirm("Are you absolutely sure you want to clear all CareerPilot AI data? This will permanently delete all application tracking entries, logs, and settings.")) {
      localStorage.removeItem("hiretrack_apps");
      localStorage.removeItem("hiretrack_logs");
      localStorage.removeItem("hiretrack_api_key");
      localStorage.removeItem("careerpilot_username");
      localStorage.removeItem("careerpilot_useremail");
      localStorage.removeItem("careerpilot_profile_manually_saved");
      localStorage.removeItem("careerpilot_gmail_profile_email");
      localStorage.removeItem("careerpilot_selectedmodel");
      localStorage.removeItem("careerpilot_gmailconnected");
      localStorage.removeItem("careerpilot_careergoal");
      localStorage.removeItem("careerpilot_preferredroles");
      localStorage.removeItem("careerpilot_jobsearchstatus");
      localStorage.removeItem("careerpilot_gmail_token");
      localStorage.removeItem("careerpilot_gmail_profile_name");
      localStorage.removeItem("careerpilot_gmail_profile_image");
      localStorage.removeItem("careerpilot_gmail_last_sync");
      localStorage.removeItem("careerpilot_demomode");
      localStorage.removeItem("careerpilot_onboarded");
      clearLogs();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 page-entrance">
      <div className="flex justify-between items-center glass-card p-5 shadow-sm">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm">System Settings</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-semibold">Configure your recruitment tracking agent environment</p>
        </div>
        <Settings className="w-5 h-5 text-indigo-500" />
      </div>

      <div className="grid md:grid-cols-12 gap-8 items-start">
        {/* Left side: Candidate Profile & Connected Accounts */}
        <div className="md:col-span-6 space-y-6">
          {/* Candidate Profile Card */}
          <div className="glass-card p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-4.5 h-4.5 text-indigo-500" />
              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Candidate Profile</h4>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 font-semibold text-slate-700">
              {gmailConnected && gmailProfileImage && (
                <div className="flex items-center gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-150/40">
                  <img
                    src={gmailProfileImage}
                    alt="Profile"
                    className="w-12 h-12 rounded-full border border-slate-200 shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Connected profile</span>
                    <span className="text-xs font-black text-slate-800 block leading-tight">{gmailProfileName}</span>
                    <span className="text-[10px] text-slate-550 block leading-none mt-1">{gmailProfileEmail}</span>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Name</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/60 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Email</label>
                  <input
                    type="email"
                    required
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/60 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Profile Source</label>
                  <div className="px-3.5 py-2 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 capitalize">
                    {profileManuallySaved ? "Manual" : gmailConnected ? "Gmail" : demoMode ? "Demo" : "New User (Empty)"}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 btn-premium text-white text-xs font-semibold rounded-xl transition shadow-md"
              >
                Save Profile
              </button>
            </form>
          </div>

          {/* Connected Accounts Card */}
          <div className="glass-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Mail className="w-4.5 h-4.5 text-indigo-500" />
              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Connected Accounts</h4>
            </div>

            {!gmailConnected ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3.5 bg-slate-50/60 border border-slate-150/40 rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-xs font-extrabold text-slate-800 block">Gmail Connection</span>
                    <span className="text-[10px] text-rose-505 font-extrabold uppercase tracking-wider">Disconnected</span>
                  </div>
                  
                  <button
                    disabled={isConnectingGmail}
                    onClick={handleConnectGmail}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5"
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
              <div className="space-y-4">
                <div className="p-3.5 bg-emerald-50/30 border border-emerald-150/50 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold text-emerald-850">Gmail connection status</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-250 rounded-lg text-[8px] font-black uppercase tracking-wider">Connected</span>
                  </div>
                  <div className="text-[10.5px] font-semibold text-slate-655 space-y-2">
                    {gmailProfileName && (
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Name</span>
                        <span className="text-slate-850 font-bold block leading-tight">{gmailProfileName}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Connected account</span>
                      <span className="text-slate-850 font-bold block leading-tight">{gmailProfileEmail}</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200/40">
                      <span className="text-slate-450 block text-[9px] uppercase tracking-wider">Permission Scope</span>
                      <span className="text-emerald-600 font-extrabold">✓ Gmail Read Only</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200/40">
                      <span className="text-slate-400">Last sync:</span> <span className="text-slate-850 font-bold">{gmailLastSync || "Never synced"}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDisconnectGmail}
                  className="w-full py-2 bg-rose-50 border border-rose-150/50 hover:bg-rose-100/55 text-rose-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 active:scale-[0.98]"
                >
                  Disconnect Account
                </button>
              </div>
            )}

            {/* Trust Indicator */}
            <div className="p-3.5 bg-slate-50/80 border border-slate-150/40 rounded-xl space-y-2.5">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <span>🔒 Secure Gmail Connection</span>
              </span>
              <div className="text-[10.5px] font-semibold text-slate-500 space-y-1 leading-relaxed">
                <p>CareerPilot uses read-only Gmail access. Your emails remain safely in your account.</p>
                <div className="grid grid-cols-1 gap-0.5 text-[9.5px] font-extrabold uppercase text-slate-450 pt-1 border-t border-slate-100">
                  <span className="text-rose-500">✗ We cannot send emails</span>
                  <span className="text-rose-500">✗ We cannot edit or delete emails</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side: AI Config & Data Management */}
        <div className="md:col-span-6 space-y-6">
          {/* AI Engine Configuration Card */}
          <div className="glass-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Cpu className="w-4.5 h-4.5 text-indigo-500" />
              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">AI Engine Configuration</h4>
            </div>

            <div className="space-y-4 font-semibold text-slate-700">
              <div className="p-3.5 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 border border-purple-100/40 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                    <span>Gemini AI Engine</span>
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[8px] font-bold uppercase tracking-wider">Active</span>
                </div>

                <div className="space-y-2">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100/60 pb-1">Capabilities</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] font-semibold text-slate-655">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Recruiter email understanding</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Status classification</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Date extraction</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Action recommendations</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Settings container */}
              <div className="border border-slate-150/40 bg-white/40 p-4.5 rounded-[20px] space-y-4">
                <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">Advanced Settings</span>
                
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Model</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-600 uppercase tracking-wider cursor-pointer"
                  >
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="simulated">Simulated Rules Engine</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">API Key</label>
                    {apiKey && (
                      <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Saved
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Key className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="password"
                      placeholder="****************"
                      value={tempKey}
                      onChange={(e) => setTempKey(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50/60 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveApiKey}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition active:scale-[0.98]"
                >
                  Update API Key
                </button>
              </div>
            </div>
          </div>

          {/* Data Management Card */}
          <div className="glass-card p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Download className="w-4.5 h-4.5 text-indigo-500" />
              <h4 className="font-extrabold text-xs text-slate-805 uppercase tracking-wider">Data Management</h4>
            </div>

            <div className="space-y-5">
              <div>
                <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block mb-2.5">Export Application Data</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={handleExportPDF}
                    className="p-3.5 bg-indigo-50/40 hover:bg-indigo-50 border border-indigo-100/50 hover:border-indigo-200 text-indigo-700 hover:text-indigo-850 rounded-2xl text-[10px] font-black uppercase tracking-wider transition flex flex-col items-center justify-center gap-2 text-center"
                    title="Generate printable PDF report"
                  >
                    <FileText className="w-5 h-5 text-indigo-650" />
                    <span>PDF Report</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="p-3.5 bg-emerald-50/40 hover:bg-emerald-50 border border-emerald-100/50 hover:border-emerald-250 text-emerald-700 hover:text-emerald-850 rounded-2xl text-[10px] font-black uppercase tracking-wider transition flex flex-col items-center justify-center gap-2 text-center"
                    title="Download CSV spreadsheet"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-emerald-650" />
                    <span>Excel Export</span>
                  </button>

                  <button
                    onClick={handleExportJSON}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-905 rounded-2xl text-[10px] font-black uppercase tracking-wider transition flex flex-col items-center justify-center gap-2 text-center"
                    title="Backup full database as raw JSON"
                  >
                    <Database className="w-5 h-5 text-slate-650" />
                    <span>JSON Backup</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100/80 space-y-4">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block mb-2">Cleanup Old Records</span>
                  <p className="text-[10px] text-slate-450 leading-normal mb-3 font-medium">
                    Remove old application records while optionally preserving those you have starred. Deletes records older than the selected timeframe.
                  </p>
                </div>

                <div className="space-y-3 font-semibold text-slate-700">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Delete applications older than</label>
                    <div className="flex gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                           type="radio"
                           name="cleanupMonths"
                           value={1}
                           checked={cleanupMonths === 1}
                           onChange={() => setCleanupMonths(1)}
                           className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500/20"
                        />
                        <span>1 Month</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                           type="radio"
                           name="cleanupMonths"
                           value={3}
                           checked={cleanupMonths === 3}
                           onChange={() => setCleanupMonths(3)}
                           className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500/20"
                        />
                        <span>3 Months</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                           type="radio"
                           name="cleanupMonths"
                           value={6}
                           checked={cleanupMonths === 6}
                           onChange={() => setCleanupMonths(6)}
                           className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500/20"
                        />
                        <span>6 Months</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="keepStarred"
                      checked={keepStarred}
                      onChange={(e) => setKeepStarred(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-650 border-slate-305 focus:ring-indigo-500/20 cursor-pointer"
                    />
                    <label htmlFor="keepStarred" className="text-xs text-slate-750 font-bold select-none cursor-pointer">
                      Keep starred applications (Highly recommended)
                    </label>
                  </div>

                  {/* Dynamic cleanup statistics panel */}
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
                      <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl space-y-1.5 text-[10.5px] text-slate-500 font-semibold shadow-inner">
                        <div className="flex justify-between">
                          <span>Old records found:</span>
                          <span className="font-bold text-slate-800">{totalOld} record{totalOld !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex justify-between text-rose-600">
                          <span>Will be deleted:</span>
                          <span className="font-bold">{toDelete} record{toDelete !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex justify-between text-emerald-600">
                          <span>Starred applications preserved:</span>
                          <span className="font-bold">{starredPreserved} record{starredPreserved !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    onClick={handleCleanup}
                    className="w-full py-2 bg-indigo-50/50 hover:bg-indigo-105 border border-indigo-150 text-indigo-700 text-xs font-bold rounded-xl transition active:scale-[0.98] text-center"
                  >
                    Run Data Cleanup
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100/80">
                <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block mb-2">Clear Application Data</span>
                <p className="text-[10px] text-slate-450 leading-normal mb-3 font-medium">
                  Permanently delete all tracked application entries, agent sync logs, and cached configuration parameters from local storage.
                </p>
                <button
                  onClick={handleClearAllData}
                  className="w-full py-2.5 bg-rose-50 border border-rose-150 hover:bg-rose-100/55 text-rose-700 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Purge System Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSavedMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900/90 text-white text-xs font-bold px-4.5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-300 z-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{savedMsgText}</span>
        </div>
      )}
    </div>
  );
};
