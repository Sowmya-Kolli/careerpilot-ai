import React, { useState } from "react";
import type { JobApplication } from "../context/AppContext";
import { useApp } from "../context/AppContext";
import { sanitizeEmailContent } from "../tools/emailSanitizer";
import { 
  Plus, 
  Search, 
  Calendar,
  X,
  PlusCircle,
  Clock,
  ArrowLeft,
  ChevronRight,
  Globe,
  FileText,
  CheckCircle2,
  Trash,
  Sparkles,
  Mail,
  FolderOpen,
  XOctagon,
  Video,
  FileCode,
  Award,
  Loader2,
  Download,
  Upload,
  User
} from "lucide-react";

const formatNiceDate = (dateStr: string | undefined) => {
  if (!dateStr || dateStr === "Not available" || dateStr === "undefined" || dateStr === "null" || dateStr.trim() === "" || dateStr.toLowerCase().includes("invalid")) {
    return "Not available";
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch (_) {
    return dateStr;
  }
};

export const TrackerView: React.FC = () => {
  const { 
    applications, 
    addManualApplication, 
    deleteApplication, 
    updateApplicationStatus,
    selectedAppId,
    setSelectedAppId,
    toggleStarApplication,
    setView,
    saveApplicationTasks,
    generateDraftReply,
    userName,
    showToast,
    gmailConnected
  } = useApp();

  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftTone, setDraftTone] = useState("Accept");
  const [generatedDraft, setGeneratedDraft] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);

  const handleGenerateDraft = async (emailBody: string, companyName: string) => {
    setIsDrafting(true);
    try {
      const draftText = await generateDraftReply(
        emailBody, 
        draftTone, 
        userName || "Candidate", 
        companyName
      );
      setGeneratedDraft(draftText);
    } catch (e) {
      console.error(e);
      setGeneratedDraft("Failed to generate draft. Please try again.");
    } finally {
      setIsDrafting(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewState, setViewState] = useState<"folders" | "list">("folders");
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [activeTimelineEventId, setActiveTimelineEventId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [emailViewMode, setEmailViewMode] = useState<"html" | "text">("html");

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportCSV = () => {
    const rows = [
      ["Company", "Role", "Status", "Date Type", "Date Value", "Summary", "Next Action", "Confidence", "Match Score"]
    ];

    applications.forEach((app) => {
      const displayDate = getDisplayDateInfo(app);
      rows.push([
        app.company.replace(/"/g, '""'),
        app.role.replace(/"/g, '""'),
        app.currentStatus,
        displayDate.type,
        displayDate.value,
        app.summary.replace(/"/g, '""'),
        app.nextAction.replace(/"/g, '""'),
        String(app.confidence || ""),
        String(app.matchScore || "")
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `careerpilot_opportunities_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
      if (lines.length <= 1) return;

      let importedCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        const cleanValues = matches.map(val => val.replace(/^"|"$/g, '').replace(/""/g, '"').trim());

        if (cleanValues.length < 3) continue;

        const company = cleanValues[0];
        const role = cleanValues[1];
        const status = cleanValues[2] as JobApplication["status"];
        const dateType = cleanValues[3] || "Not available";
        const dateValue = cleanValues[4] || "Not available";
        const summary = cleanValues[5] || "Imported opportunity.";
        const nextAction = cleanValues[6] || "Review details.";

        try {
          await addManualApplication({
            company,
            role,
            status,
            summary,
            date: { type: dateType, value: dateValue },
            nextAction
          });
          importedCount++;
        } catch (err) {
          console.error("Failed to import row:", err);
        }
      }

      showToast({
        type: "success",
        message: `📥 Import Completed`,
        subMessage: `Successfully imported ${importedCount} opportunities from CSV.`,
        duration: 4000
      });
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  React.useEffect(() => {
    if (selectedAppId) {
      const targetApp = applications.find(app => app.id === selectedAppId);
      if (targetApp) {
        const activeEvent = targetApp.timeline.find(evt => evt.id === activeTimelineEventId) || targetApp.timeline[targetApp.timeline.length - 1];
        if (activeEvent?.originalEmailHtml) {
          setEmailViewMode("html");
        } else {
          setEmailViewMode("text");
        }
      }
    }
  }, [selectedAppId, activeTimelineEventId, applications]);

  // Form states
  const [formCompany, setFormCompany] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formStatus, setFormStatus] = useState<JobApplication["status"]>("PENDING");
  const [formSummary, setFormSummary] = useState("");
  const [formDateType, setFormDateType] = useState("Deadline");
  const [formDateValue, setFormDateValue] = useState("");
  const [formNextAction, setFormNextAction] = useState("");

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr || dateStr === "Not available" || dateStr === "undefined") return "Not available";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const getDisplayDateInfo = (app: JobApplication) => {
    const type = "Received";
    const rawDate = app.emailReceivedDate || app.dateAdded || app.createdAt || "Not available";
    const value = formatDisplayDate(rawDate);
    return { type, value };
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany || !formRole) return;

    let finalNextAction = formNextAction;
    if (!finalNextAction) {
      if (formStatus === "INTERVIEW") finalNextAction = "Prepare DSA, projects, and interview concepts.";
      else if (formStatus === "ASSESSMENT") finalNextAction = "Complete assessment before deadline and practice coding problems.";
      else if (formStatus === "OFFER") finalNextAction = "Review offer details and complete onboarding steps.";
      else if (formStatus === "REJECTED") finalNextAction = "Update status and continue applying.";
      else finalNextAction = "Monitor inbox regularly; follow up in 2 weeks if no update is received.";
    }

    addManualApplication({
      company: formCompany,
      role: formRole,
      status: formStatus,
      summary: formSummary || "Manually added application.",
      date: {
        type: formDateType,
        value: formDateValue || "Not available"
      },
      nextAction: finalNextAction
    });

    setFormCompany("");
    setFormRole("");
    setFormStatus("PENDING");
    setFormSummary("");
    setFormDateType("Deadline");
    setFormDateValue("");
    setFormNextAction("");
    setShowAddDrawer(false);
  };

  const filteredApps = applications.filter((app) => {
    const term = searchTerm.toLowerCase();
    
    const matchesCompany = app.company?.toLowerCase().includes(term);
    const matchesRole = app.role?.toLowerCase().includes(term);
    const matchesRecruiterName = app.recruiterName?.toLowerCase().includes(term);
    const matchesRecruiterEmail = app.recruiterEmail?.toLowerCase().includes(term);
    
    const matchesTimeline = (app.timeline || []).some(evt => 
      evt.subject?.toLowerCase().includes(term) ||
      evt.sender?.toLowerCase().includes(term)
    );
    
    const matchesStatusText = app.status?.toLowerCase().includes(term);

    const matchesSearch = matchesCompany || matchesRole || matchesRecruiterName || matchesRecruiterEmail || matchesTimeline || matchesStatusText;
    const matchesStatus = statusFilter === "ALL" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });


  const getStatusBadge = (status: JobApplication["status"]) => {
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
      <span className={`px-2 py-0.5 rounded-full border text-[8px] font-bold tracking-widest uppercase inline-flex items-center gap-1 shadow-sm ${classes}`}>
        <span className="relative flex h-1.5 w-1.5">
          <span className={`animate-ping-slow absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`}></span>
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotClass}`}></span>
        </span>
        {status.replace("_", " ")}
      </span>
    );
  };

  const categoryFolders = [
    {
      id: "ALL",
      label: "All Applications",
      count: applications.length,
      icon: FolderOpen,
      iconBg: "bg-gradient-to-tr from-indigo-500/15 to-indigo-600/10 border-indigo-200/50",
      cardAccent: "border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white/95 to-indigo-50/20 text-indigo-700 hover:shadow-indigo-500/5",
      bullet: "bg-indigo-500",
      textClass: "text-indigo-755"
    },
    {
      id: "OFFER",
      label: "Offers",
      count: applications.filter(a => a.status === "OFFER").length,
      icon: Award,
      iconBg: "bg-gradient-to-tr from-emerald-500/20 to-emerald-600/10 border-emerald-200/50",
      cardAccent: "border-emerald-250 bg-gradient-to-br from-emerald-50/80 via-white/95 to-emerald-50/20 text-emerald-700 hover:shadow-emerald-500/5",
      bullet: "bg-emerald-500",
      textClass: "text-emerald-755"
    },
    {
      id: "INTERVIEW",
      label: "Interviews",
      count: applications.filter(a => a.status === "INTERVIEW").length,
      icon: Video,
      iconBg: "bg-gradient-to-tr from-blue-500/20 to-blue-600/10 border-blue-200/50",
      cardAccent: "border-blue-250 bg-gradient-to-br from-blue-50/80 via-white/95 to-blue-50/20 text-blue-700 hover:shadow-blue-500/5",
      bullet: "bg-blue-500",
      textClass: "text-blue-755"
    },
    {
      id: "ASSESSMENT",
      label: "Assessments",
      count: applications.filter(a => a.status === "ASSESSMENT").length,
      icon: FileCode,
      iconBg: "bg-gradient-to-tr from-yellow-500/20 to-yellow-600/10 border-yellow-200/50",
      cardAccent: "border-yellow-250 bg-gradient-to-br from-yellow-50/80 via-white/95 to-yellow-50/20 text-yellow-700 hover:shadow-yellow-500/5",
      bullet: "bg-yellow-550",
      textClass: "text-yellow-755"
    },
    {
      id: "REJECTED",
      label: "Rejected",
      count: applications.filter(a => a.status === "REJECTED").length,
      icon: XOctagon,
      iconBg: "bg-gradient-to-tr from-rose-500/25 to-rose-600/10 border-rose-200/50",
      cardAccent: "border-rose-250 bg-gradient-to-br from-rose-50/80 via-white/95 to-rose-50/20 text-rose-700 hover:shadow-rose-500/5",
      bullet: "bg-rose-500",
      textClass: "text-rose-705"
    },
    {
      id: "PENDING",
      label: "Pending",
      count: applications.filter(a => a.status === "PENDING").length,
      icon: Clock,
      iconBg: "bg-gradient-to-tr from-orange-500/20 to-orange-600/10 border-orange-200/50",
      cardAccent: "border-orange-255 bg-gradient-to-br from-orange-50/80 via-white/95 to-orange-50/20 text-orange-700 hover:shadow-orange-500/5",
      bullet: "bg-orange-550",
      textClass: "text-orange-705"
    },
  ];

  // ==========================================
  // DETAIL VIEW RENDERING
  // ==========================================
  const selectedApp = applications.find(app => app.id === selectedAppId);

  const formatEmailBody = (text: string) => {
    if (!text) return "";
    const sanitized = sanitizeEmailContent(text);
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return sanitized.split(/\r?\n\r?\n/).map((paragraph, pIdx) => (
      <p key={pIdx} className="mb-4 last:mb-0 whitespace-pre-wrap break-words">
        {paragraph.split(/\r?\n/).map((line, lIdx) => {
          const parts = line.split(urlRegex);
          return (
            <React.Fragment key={lIdx}>
              {parts.map((part, ptIdx) => {
                if (part.match(urlRegex)) {
                  return (
                    <a
                      key={ptIdx}
                      href={part}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-650 hover:text-purple-800 underline break-all font-bold"
                    >
                      {part}
                    </a>
                  );
                }
                return part;
              })}
              <br />
            </React.Fragment>
          );
        })}
      </p>
    ));
  };

  if (selectedApp) {
    const dateInfo = getDisplayDateInfo(selectedApp);


    const getEventIcon = (eventType: string) => {
      switch (eventType) {
        case "OFFER": return "🎉";
        case "INTERVIEW": return "🎤";
        case "ASSESSMENT": return "💻";
        case "PENDING": return "📩";
        case "REJECTED": return "❌";
        default: return "📩";
      }
    };

    const activeEvent = selectedApp.timeline.find(evt => evt.id === activeTimelineEventId) || selectedApp.timeline[selectedApp.timeline.length - 1];

    const origEmail = activeEvent ? {
      from: activeEvent.sender,
      subject: activeEvent.subject,
      receivedDate: activeEvent.receivedDate,
      body: activeEvent.originalEmail,
      bodyHtml: activeEvent.originalEmailHtml
    } : {
      from: `Recruiter <recruiter@${selectedApp.company.toLowerCase().replace(/[^a-z0-9]/g, "") || "company"}.com>`,
      subject: `Application Update - ${selectedApp.role}`,
      receivedDate: selectedApp.dateAdded,
      body: `No original recruiter email body has been logged for this manually created opportunity. \n\nDirect summary context: ${selectedApp.summary}`,
      bodyHtml: undefined
    };

    // Handled using custom Delete Confirmation Modal overlay

    return (
      <div className="max-w-4xl mx-auto space-y-6 page-entrance">
        {/* Detail Header bar */}
        <div className="flex items-center justify-between bg-white/40 dark:bg-slate-900/40 border border-white/50 dark:border-slate-800 p-4.5 rounded-[24px] shadow-sm">
          <button
            onClick={() => {
              setSelectedAppId(null);
              setActiveTimelineEventId(null);
              setViewState("list");
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/80 border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-slate-600 transition shadow-sm active:scale-[0.98]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleStarApplication(selectedApp.id)}
              className={`p-2 rounded-xl transition active:scale-[0.98] border text-xs flex items-center justify-center ${
                selectedApp.isStarred
                  ? "bg-amber-50 border-amber-200 text-amber-500"
                  : "bg-white border-slate-200 text-slate-400 hover:text-slate-655"
              }`}
              title={selectedApp.isStarred ? "Unstar Application" : "Star Application"}
            >
              {selectedApp.isStarred ? "⭐" : "☆"}
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-3.5 py-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100/50 rounded-xl text-rose-655 transition active:scale-[0.98] text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
              title="Delete Application"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>Delete Application</span>
            </button>
          </div>
        </div>

        {/* Brand Card Info */}
        <div className="glass-card p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1.5">
            <h3 className="text-2xl font-black text-slate-900 leading-none flex items-center gap-2">
              <span>{selectedApp.isStarred ? "⭐ " : ""}{selectedApp.company}</span>
            </h3>
            <p className="text-xs text-slate-405 font-bold uppercase tracking-wider leading-none flex items-center gap-2">
              <span>{selectedApp.role}</span>
              {selectedApp.matchScore !== undefined && selectedApp.matchScore > 0 && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-50 text-purple-750 border border-purple-200/50 text-[9px] font-extrabold tracking-wide uppercase">
                  🎯 {Math.round(selectedApp.matchScore * 100)}% Match
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {getStatusBadge(selectedApp.currentStatus)}
            <select
              value={selectedApp.currentStatus}
              onChange={(e) => updateApplicationStatus(selectedApp.id, e.target.value as JobApplication["status"])}
              className="bg-slate-50 border border-slate-200 cursor-pointer rounded-xl px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-505 focus:outline-none hover:bg-slate-100"
            >
              <option value="OFFER">Offer</option>
              <option value="INTERVIEW">Interview</option>
              <option value="ASSESSMENT">Assessment</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Information Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Received Date */}
          <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-150/40 dark:border-slate-800 p-4 rounded-2xl space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-bold text-[9px] uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              <span>Received Date</span>
            </div>
            <span className="text-[11.5px] font-extrabold text-slate-800 dark:text-slate-200 block truncate">
              {formatNiceDate(selectedApp.emailReceivedDate || origEmail.receivedDate)}
            </span>
          </div>

          {/* Action / Deadline date if applicable */}
          <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-150/40 dark:border-slate-800 p-4 rounded-2xl space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-bold text-[9px] uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-purple-500" />
              <span>{dateInfo.type === "Received" ? "Next Action Date" : dateInfo.type}</span>
            </div>
            <span className="text-[11.5px] font-extrabold text-slate-800 dark:text-slate-200 block truncate">
              {dateInfo.value && dateInfo.value !== "Not available" ? formatNiceDate(dateInfo.value) : "Not available"}
            </span>
          </div>

          {/* Mode */}
          <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-150/40 dark:border-slate-800 p-4 rounded-2xl space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-bold text-[9px] uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5 text-purple-500" />
              <span>Mode</span>
            </div>
            <span className="text-[11.5px] font-extrabold text-slate-800 dark:text-slate-200 block truncate">{selectedApp.mode || "Online"}</span>
          </div>

          {/* Source */}
          <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-150/40 dark:border-slate-800 p-4 rounded-2xl space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-bold text-[9px] uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5 text-purple-500" />
              <span>Source</span>
            </div>
            <span className="text-[11.5px] font-extrabold text-slate-800 dark:text-slate-200 block truncate">{selectedApp.source || "Gmail"}</span>
          </div>
        </div>

        {/* Recruiter Details Card */}
        <div className="glass-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100/60 pb-3">
            <User className="w-4 h-4 text-indigo-500" />
            <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Recruiter Details</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-slate-700 dark:text-slate-350">
            <div className="bg-white/40 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Recruiter Name</span>
              <span className="text-slate-800 dark:text-slate-200 font-extrabold">{selectedApp.recruiterName || origEmail.from.split('<')[0].replace(/['"]/g, '').trim() || "Not available"}</span>
            </div>
            <div className="bg-white/40 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Recruiter Email</span>
              <span className="text-slate-800 dark:text-slate-200 font-extrabold truncate block" title={selectedApp.recruiterEmail || origEmail.from.match(/<([^>]+)>/)?.[1] || origEmail.from}>
                {selectedApp.recruiterEmail || origEmail.from.match(/<([^>]+)>/)?.[1] || origEmail.from || "Not available"}
              </span>
            </div>
            <div className="bg-white/40 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Email Subject</span>
              <span className="text-slate-800 dark:text-slate-200 font-extrabold truncate block" title={origEmail.subject}>{origEmail.subject || "Not available"}</span>
            </div>
          </div>
        </div>

        {/* Timeline Event View */}
        {selectedApp.timeline && selectedApp.timeline.length > 0 && (
          <div className="glass-card p-6 shadow-sm space-y-4">
            <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>Application Timeline</span>
            </h4>
            <div className="space-y-3 pt-1">
              {selectedApp.timeline.map((evt, idx) => {
                const hasExtractedDate = evt.extractedDate && 
                  evt.extractedDate !== "Not available" && 
                  evt.extractedDate !== "undefined" && 
                  evt.extractedDate !== "null" && 
                  evt.extractedDate.trim() !== "";
                return (
                  <div key={evt.id || idx} className="flex items-center justify-between p-3.5 bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-base shrink-0 shadow-sm">
                        {getEventIcon(evt.eventType)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-205 block leading-tight truncate">{evt.subject}</span>
                        <span className="text-[10px] text-slate-450 dark:text-slate-400 font-bold block mt-1">
                          Received: {formatNiceDate(evt.receivedDate)} {hasExtractedDate ? `| Action Date: ${formatNiceDate(evt.extractedDate)}` : ""}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTimelineEventId(evt.id)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition shrink-0 ${
                        activeEvent?.id === evt.id
                          ? "bg-purple-650 text-white shadow-sm"
                          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      View Email
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3 Main Sections */}
        <div className="space-y-6">
          {/* Section 1: Original Recruiter Email Viewer */}
          <div className="glass-card p-6 shadow-sm space-y-4">
            <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-500" />
              <span>Original Recruiter Email</span>
            </h4>
            
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-2xl shadow-sm overflow-hidden">
              {/* Header Info */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-850 bg-slate-50/30 dark:bg-slate-900/30 space-y-2 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                  <span className="text-slate-400 dark:text-slate-500 font-bold w-16">From:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-extrabold">{origEmail.from}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                  <span className="text-slate-400 dark:text-slate-500 font-bold w-16">Subject:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-extrabold">{origEmail.subject}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                  <span className="text-slate-400 dark:text-slate-500 font-bold w-16">Date:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-extrabold">{origEmail.receivedDate}</span>
                </div>
              </div>

              {/* Toggle Mode Tab Switcher & Draft Response Ingestion */}
              <div className="flex border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 p-2.5 gap-2 select-none justify-between items-center">
                <div className="flex gap-2">
                  {origEmail.bodyHtml && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEmailViewMode("html")}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                          emailViewMode === "html"
                            ? "bg-white dark:bg-slate-900 text-purple-750 dark:text-purple-400 shadow-sm border border-slate-150/20 dark:border-slate-800"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        }`}
                      >
                        Rich HTML
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailViewMode("text")}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                          emailViewMode === "text"
                            ? "bg-white dark:bg-slate-900 text-purple-750 dark:text-purple-400 shadow-sm border border-slate-150/20 dark:border-slate-800"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        }`}
                      >
                        Plain Text
                      </button>
                    </>
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setGeneratedDraft("");
                    setDraftTone(
                      selectedApp.currentStatus === "INTERVIEW" ? "Accept" :
                      selectedApp.currentStatus === "OFFER" ? "Accept" :
                      selectedApp.currentStatus === "ASSESSMENT" ? "Accept" : "Follow Up"
                    );
                    setShowDraftModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-gradient-to-tr from-purple-650 to-indigo-600 hover:from-purple-700 hover:to-indigo-750 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-lg shadow-sm hover:shadow active:scale-95 transition flex items-center gap-1 shrink-0"
                >
                  📩 Draft Response
                </button>
              </div>

              {/* Email Body Container */}
              <div className="p-6 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs leading-relaxed font-medium max-h-[500px] overflow-y-auto custom-scrollbar">
                {emailViewMode === "html" && origEmail.bodyHtml ? (
                  <iframe
                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="utf-8">
                          <style>
                            body {
                              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                              font-size: 13.5px;
                              line-height: 1.6;
                              color: #334155;
                              background-color: #ffffff;
                              margin: 8px;
                              padding: 0;
                              word-break: break-word;
                            }
                            img {
                              max-width: 100%;
                              height: auto;
                            }
                            a {
                              color: #6366f1;
                              text-decoration: underline;
                            }
                            a:hover {
                              color: #4f46e5;
                            }
                          </style>
                        </head>
                        <body>
                          ${origEmail.bodyHtml}
                        </body>
                      </html>
                    `}
                    title="Email Content"
                    className="w-full min-h-[380px] border-0 rounded-xl bg-white"
                  />
                ) : (
                  formatEmailBody(origEmail.body)
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Gemini AI Summary */}
          <div className="glass-card p-6 shadow-sm space-y-3">
            <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Gemini AI Analysis</span>
            </h4>
            <p className="text-xs text-slate-655 leading-relaxed bg-slate-50/60 p-4 rounded-xl border border-slate-150/40 font-semibold">
              {activeEvent ? activeEvent.summary : selectedApp.summary}
            </p>
          </div>

          {/* Section 3: Recommended Actions */}
          <div className="glass-card p-6 shadow-sm space-y-3.5">
            <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-500" />
              <span>Recommended Next Actions</span>
            </h4>
            <div className="space-y-2.5">
              {(() => {
                const activeStatus = activeEvent ? activeEvent.eventType : selectedApp.currentStatus;
                const recs = (() => {
                  switch (activeStatus) {
                    case "ASSESSMENT":
                      return [
                        "Complete assessment before deadline",
                        "Revise DSA concepts",
                        "Check test requirements"
                      ];
                    case "INTERVIEW":
                      return [
                        "Prepare projects",
                        "Review required skills",
                        "Check meeting details"
                      ];
                    case "OFFER":
                      return [
                        "Review offer details",
                        "Complete onboarding steps"
                      ];
                    case "REJECTED":
                      return [
                        "Archive opportunity",
                        "Continue tracking active applications"
                      ];
                    default:
                      return [
                        "Review email details",
                        "Respond to recruiter if needed"
                      ];
                  }
                })();
                const checkedTasks = selectedApp.checkedTasks || [];
                return recs.map((line, idx) => {
                  const isChecked = checkedTasks.includes(line);
                  return (
                    <label key={idx} className="flex items-start gap-2.5 p-3 bg-white/40 border border-slate-100 hover:border-purple-200 rounded-xl cursor-pointer select-none transition-all duration-200">
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => {
                          const updated = isChecked
                            ? checkedTasks.filter(t => t !== line)
                            : [...checkedTasks, line];
                          saveApplicationTasks(selectedApp.id, updated);
                        }}
                        className="w-4 h-4 mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer" 
                      />
                      <span className={`text-xs font-semibold text-slate-700 transition ${isChecked ? "line-through text-slate-400 font-medium" : ""}`}>{line}</span>
                    </label>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Custom Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowDeleteModal(false)}>
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-slate-100/50">
                <h3 className="font-extrabold text-slate-900 text-sm">Delete this tracked application?</h3>
              </div>
              <div className="p-6">
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  This removes CareerPilot tracking data only.
                  <br />
                  <br />
                  <span className="text-indigo-650 font-extrabold">Your original Gmail emails remain safe.</span>
                </p>
              </div>
              <div className="px-6 py-4 bg-slate-55 border-t border-slate-100 flex justify-end gap-3 font-semibold">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-xs rounded-xl transition text-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteApplication(selectedApp.id);
                    setSelectedAppId(null);
                    setShowDeleteModal(false);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-xl shadow-md transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Recruiter Response Draft Generator Modal */}
        {showDraftModal && selectedApp && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowDraftModal(false)}>
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-250 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/50 to-blue-50/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-200/50 flex items-center justify-center text-purple-655 shadow-sm animate-pulse">
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
                    <label className="text-[9px] font-bold text-slate-455 uppercase tracking-widest block">Response Type (Tone)</label>
                    <select
                      value={draftTone}
                      onChange={(e) => setDraftTone(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-75"
                    >
                      <option value="Accept">Accept Interview/Offer</option>
                      <option value="Reschedule">Request Rescheduling</option>
                      <option value="Decline">Decline / Withdraw Application</option>
                      <option value="Follow Up">Check Status / General Inquiry</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handleGenerateDraft(origEmail.body, selectedApp.company)}
                    disabled={isDrafting}
                    className="px-5 py-2.5 bg-purple-650 hover:bg-purple-750 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 shrink-0 flex items-center gap-1.5"
                  >
                    {isDrafting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
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
                  <label className="text-[9px] font-bold text-slate-405 uppercase tracking-widest block">Generated Email Reply</label>
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
                            duration: 3550
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
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-xs font-bold rounded-xl transition text-slate-605"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // FOLDERS & LIST ROW VIEW RENDERING
  // ==========================================
  return (
    <div className="space-y-6 page-entrance">
      
      {viewState === "folders" ? (
        <>
          {/* Categories header bar */}
          <div className="flex justify-between items-center bg-white/40 border border-white/50 p-5 rounded-[24px] shadow-sm">
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-none">Applications Tracker</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Select a category folder to view and manage opportunities</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportCSV}
                accept=".csv"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition active:scale-[0.98]"
                title="Import from CSV file"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition active:scale-[0.98]"
                title="Export to CSV file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => setShowAddDrawer(true)}
                className="px-4.5 py-2.5 btn-premium text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Application</span>
              </button>
            </div>
          </div>

          {/* Top Section: category folders grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryFolders.map((folder) => {
              const FolderIcon = folder.icon;
              return (
                <div
                  key={folder.id}
                  onClick={() => {
                    setStatusFilter(folder.id);
                    setViewState("list");
                  }}
                  className={`cursor-pointer backdrop-blur-md border border-white/60 hover:border-purple-450 hover:shadow-[0_20px_40px_rgba(108,77,246,0.08)] rounded-[28px] p-6 flex flex-col justify-between h-48 transition-all duration-300 group relative overflow-hidden active:scale-[0.98] ${folder.cardAccent}`}
                >
                  {/* Faint background decorative glow */}
                  <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all duration-300" />
                  
                  <div className="flex justify-between items-start">
                    <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110 ${folder.iconBg}`}>
                      <FolderIcon className="w-6.5 h-6.5" />
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full ${folder.bullet} shadow-sm`} />
                  </div>
                  
                  <div className="mt-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{folder.label}</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className={`text-4xl font-extrabold leading-none ${folder.textClass}`}>{folder.count}</span>
                      <span className="text-[10px] text-slate-450 font-extrabold uppercase tracking-widest">Apps</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Back button and List header */}
          <div className="space-y-4">
            <button
              onClick={() => {
                setViewState("folders");
                setSelectedAppIds([]);
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-purple-650 hover:text-purple-750 transition active:scale-[0.98] w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Back to folders</span>
            </button>
            <div className="flex justify-between items-center bg-white/40 border border-white/50 p-5 rounded-[24px] shadow-sm">
              <div>
                <h2 className="text-xl font-black text-slate-900 leading-none">
                  {categoryFolders.find(f => f.id === statusFilter)?.label || "Applications"}
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Tracked opportunities in this category</p>
              </div>
              
              <div className="flex items-center gap-3">
                {selectedAppIds.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm("Delete this application and all related timeline emails?")) {
                        selectedAppIds.forEach((id) => deleteApplication(id));
                        setSelectedAppIds([]);
                      }
                    }}
                    className="px-4 py-2.5 bg-rose-50 border border-rose-150 hover:bg-rose-100/50 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition active:scale-[0.98] shadow-sm animate-in fade-in slide-in-from-right-2 duration-200"
                  >
                    <Trash className="w-4 h-4" />
                    <span>Delete Selected ({selectedAppIds.length})</span>
                  </button>
                )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition active:scale-[0.98]"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import CSV</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition active:scale-[0.98]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => setShowAddDrawer(true)}
                  className="px-4.5 py-2.5 btn-premium text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Application</span>
                </button>
              </div>
              </div>
            </div>
          </div>

          {/* Search Filter bar */}
          <div className="relative w-full bg-white/40 border border-white/50 p-3 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-450 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search target company or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white/80 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl text-xs focus:outline-none transition-all text-slate-700 font-medium"
              />
            </div>
            
            {filteredApps.length > 0 && (
              <button
                onClick={() => {
                  const allFilteredIds = filteredApps.map(a => a.id);
                  const allSelected = allFilteredIds.every(id => selectedAppIds.includes(id));
                  if (allSelected) {
                    setSelectedAppIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                  } else {
                    setSelectedAppIds(prev => {
                      const newSelection = [...prev];
                      allFilteredIds.forEach(id => {
                        if (!newSelection.includes(id)) {
                          newSelection.push(id);
                        }
                      });
                      return newSelection;
                    });
                  }
                }}
                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] text-slate-505 font-extrabold uppercase tracking-wide rounded-xl transition"
              >
                {filteredApps.every(a => selectedAppIds.includes(a.id)) ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>

          {/* Inbox rows list container */}
          {filteredApps.length > 0 ? (
            <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredApps.map((app) => {
                let statusColor = "bg-[#EDE9FE]";
                if (app.currentStatus === "OFFER") statusColor = "bg-[#047857]";
                else if (app.currentStatus === "INTERVIEW") statusColor = "bg-[#1D4ED8]";
                else if (app.currentStatus === "ASSESSMENT") statusColor = "bg-[#B45309]";
                else if (app.currentStatus === "REJECTED") statusColor = "bg-[#B91C1C]";
                else if (app.currentStatus === "PENDING") statusColor = "bg-[#C2410C]";

                const dateInfo = getDisplayDateInfo(app);

                return (
                  <div 
                    key={app.id} 
                    className="w-full flex items-center justify-between p-5 bg-white/60 hover:bg-white border border-slate-100 hover:border-purple-200 hover:shadow-sm rounded-2xl cursor-pointer gap-4 transition-all duration-200 min-h-[76px]"
                    onClick={() => setSelectedAppId(app.id)}
                  >
                    {/* Checkbox and Star and Indicator dot */}
                    <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedAppIds.includes(app.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAppIds(prev => [...prev, app.id]);
                          } else {
                            setSelectedAppIds(prev => prev.filter(id => id !== app.id));
                          }
                        }}
                        className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500/20 cursor-pointer"
                      />
                      <button
                        onClick={() => toggleStarApplication(app.id)}
                        className={`text-base focus:outline-none transition active:scale-120 ${
                          app.isStarred ? "text-amber-500 hover:text-amber-600" : "text-slate-300 hover:text-slate-400"
                        }`}
                      >
                        {app.isStarred ? "⭐" : "☆"}
                      </button>
                      <span className={`w-3.5 h-3.5 rounded-full ${statusColor} shadow-inner`} />
                    </div>

                    {/* Company Name and Role */}
                    <div className="min-w-0 flex-1 pl-1">
                      <span className="font-extrabold text-sm text-slate-905 block leading-tight truncate">
                        {app.company}
                      </span>
                      <span className="text-xs text-slate-500 font-medium block mt-1 truncate">
                        {app.role}
                        {app.matchScore !== undefined && app.matchScore > 0 && (
                          <span className="ml-2.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/50 text-[9px] font-extrabold tracking-wide">
                            🎯 {Math.round(app.matchScore * 100)}% Match
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Right: Date, Badge, View Details Button */}
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block leading-none mb-1">
                          {dateInfo.type}
                        </span>
                        <span className="text-xs font-black text-slate-805 leading-none block">
                          {dateInfo.value}
                        </span>
                      </div>

                      <div className="shrink-0">
                        {getStatusBadge(app.currentStatus)}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppId(app.id);
                        }}
                        className="text-purple-655 hover:text-purple-800 text-[11px] font-extrabold uppercase tracking-wider transition flex items-center gap-0.5"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card rounded-[32px] p-16 text-center space-y-6 shadow-md py-24 flex flex-col items-center justify-center w-full border-dashed border-2 border-purple-200/40">
              <div className="w-16 h-16 bg-gradient-to-tr from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl flex items-center justify-center mx-auto text-purple-655 shadow-inner">
                <FolderOpen className="w-8 h-8 text-purple-600" />
              </div>
              
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  No Job Applications Yet
                </h4>
                <p className="text-xs text-slate-450 dark:text-slate-500 max-w-sm mx-auto leading-relaxed font-semibold">
                  {gmailConnected 
                    ? "Start an inbox sync scan or manually log your first opportunity to begin tracking."
                    : "Connect Gmail to begin tracking your recruitment journey."
                  }
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                {gmailConnected ? (
                  <button
                    onClick={() => setView("intelligence")}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Scan Recruiter Emails</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setView("settings")}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition active:scale-95"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Connect Gmail Ingest</span>
                  </button>
                )}
                
                <button
                  onClick={() => setShowAddDrawer(true)}
                  className="px-6 py-2.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
                >
                  <span>Add Application</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Manual Application Modal/Drawer */}
      {showAddDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md">
          <div className="bg-white/90 backdrop-blur-lg rounded-[24px] border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-250">
            <div className="px-6 py-5 border-b border-slate-100/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-purple-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Add Tracker Application</h3>
              </div>
              <button onClick={() => setShowAddDrawer(false)} className="text-slate-400 hover:text-slate-650 transition p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit}>
              <div className="p-6 space-y-4 max-h-[460px] overflow-y-auto custom-scrollbar font-semibold text-slate-700">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Company *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Google"
                      value={formCompany}
                      onChange={(e) => setFormCompany(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 focus:bg-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-800 font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Role *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Software Engineer"
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 focus:bg-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-800 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Current Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as JobApplication["status"])}
                      className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-700 font-bold uppercase tracking-wider"
                    >
                      <option value="OFFER">Offer</option>
                      <option value="INTERVIEW">Interview</option>
                      <option value="ASSESSMENT">Assessment</option>
                      <option value="PENDING">Pending</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Date Type Label</label>
                    <select
                      value={formDateType}
                      onChange={(e) => setFormDateType(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-700 font-bold uppercase tracking-wider"
                    >
                      <option value="Deadline">Deadline</option>
                      <option value="Assessment Deadline">Assessment Deadline</option>
                      <option value="Interview Date">Interview Date</option>
                      <option value="Joining Date">Joining Date</option>
                      <option value="Not available">Not available</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Date Value</label>
                  <input
                    type="text"
                    placeholder="e.g. June 22, 2026"
                    value={formDateValue}
                    onChange={(e) => setFormDateValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 focus:bg-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-800 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Summary</label>
                  <input
                    type="text"
                    placeholder="e.g. Applied via career page"
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 focus:bg-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-800 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Recommended Next Action (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Leave empty for automated role recommendation guidelines..."
                    value={formNextAction}
                    onChange={(e) => setFormNextAction(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 focus:bg-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-800 custom-scrollbar font-sans font-medium"
                  />
                </div>

              </div>
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100/50 flex justify-end gap-3 font-semibold">
                <button
                  type="button"
                  onClick={() => setShowAddDrawer(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-xs rounded-xl transition text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-xl shadow-md shadow-purple-150 transition animate-in fade-in duration-200"
                >
                  Add Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



    </div>
  );
};
