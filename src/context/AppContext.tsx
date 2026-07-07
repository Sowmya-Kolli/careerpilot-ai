import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AgentResponse } from "../tools/geminiClient";
import { cleanupCompanyName, cleanSummaryText } from "../tools/geminiClient";
import { AgentSystem } from "../agents/AgentSystem";
import type { AgentSystemTelemetry } from "../agents/AgentSystem";
import { fetchEmails, SAMPLE_EMAILS } from "../tools/emailTool";
import type { EmailMessage } from "../tools/emailTool";
import { connectGmail } from "../tools/gmailService";

const API_BASE_URL = "http://localhost:5000";

export interface TimelineEvent {
  id: string;
  gmailMessageId: string;
  threadId: string;
  emailFingerprint: string;
  eventType: string; // e.g., "OFFER", "INTERVIEW", "ASSESSMENT", "PENDING", "REJECTED", "GENERAL UPDATE"
  subject: string;
  sender: string;
  receivedDate: string;
  extractedDate: string;
  summary: string;
  originalEmail: string; // Recruiter email body
  originalEmailHtml?: string; // Rich recruiter email body in HTML format
  source: string; // "Gmail/Gemini", "Manual Entry", etc.
}

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  currentStatus: AgentResponse["status"];
  latestUpdate: string;
  lastActivityDate: string;
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
  emailReceivedDate: string;
  checkedTasks?: string[];

  identifiers: {
    threadIds: string[];
    gmailMessageIds: string[];
    emailFingerprints: string[];
  };

  timeline: TimelineEvent[];

  // Backwards compatibility fields
  status: AgentResponse["status"];
  summary: string;
  joiningDate?: string;
  interviewDate?: string;
  assessmentDeadline?: string;
  deadline?: string;
  date: {
    type: string;
    value: string;
  };
  nextAction: string;
  dateAdded: string;
  confidence: number;
  matchScore?: number;
  emailFingerprint?: string;
  gmailMessageId?: string;
  originalEmail?: {
    from: string;
    subject: string;
    body: string;
    receivedDate: string;
  };
  mode?: string;
  location?: string;
  source?: string;
  recruiterEmail?: string;
  recruiterName?: string;
}

export interface EvaluationReport {
  id: string;
  name: string;
  expectedStatus: string;
  actualStatus: string;
  expectedCompany: string;
  actualCompany: string;
  statusMatch: boolean;
  companyMatch: boolean;
  passed: boolean;
  latencyMs: number;
}

interface AppContextType {
  applications: JobApplication[];
  activityLogs: AgentSystemTelemetry[];
  emails: EmailMessage[];
  apiKey: string;
  isProcessing: boolean;
  evaluations: EvaluationReport[];
  isEvaluating: boolean;
  setApiKey: (key: string) => void;
  processEmailText: (body: string, subject: string, senderEmail?: string, gmailMessageId?: string, customSource?: string, bodyHtml?: string) => Promise<AgentSystemTelemetry>;
  demoMode: boolean;
  enableDemoMode: () => Promise<void>;
  disableDemoMode: () => void;
  toast: { message: string; subMessage?: string; type: "success" | "scan_result"; duration?: number } | null;
  showToast: (toast: { message: string; subMessage?: string; type: "success" | "scan_result"; duration?: number } | null) => void;
  addManualApplication: (app: Omit<JobApplication, "id" | "dateAdded" | "confidence" | "currentStatus" | "latestUpdate" | "lastActivityDate" | "isStarred" | "identifiers" | "timeline" | "createdAt" | "updatedAt" | "emailReceivedDate">) => void;
  deleteApplication: (id: string) => void;
  updateApplicationStatus: (id: string, status: JobApplication["status"]) => void;
  toggleStarApplication: (id: string) => void;
  cleanupOldApplications: (months: number, keepStarred: boolean) => void;
  runSystemEvaluations: () => Promise<void>;
  clearLogs: () => void;
  currentView: string;
  setView: (view: string) => void;
  selectedAppId: string | null;
  setSelectedAppId: (id: string | null) => void;
  userName: string;
  setUserName: (name: string) => void;
  userEmail: string;
  setUserEmail: (email: string) => void;
  profileManuallySaved: boolean;
  setProfileManuallySaved: (saved: boolean) => void;
  gmailProfileEmail: string;
  setGmailProfileEmail: (email: string) => void;
  displayName: string;
  displayEmail: string;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  gmailConnected: boolean;
  setGmailConnected: (connected: boolean) => void;
  careerGoal: string;
  setCareerGoal: (goal: string) => void;
  preferredRoles: string;
  setPreferredRoles: (roles: string) => void;
  jobSearchStatus: string;
  setJobSearchStatus: (status: string) => void;
  gmailProfileName: string;
  gmailProfileImage: string;
  gmailLastSync: string;
  connectGmailAccount: () => Promise<any>;
  disconnectGmailAccount: () => void;
  scanGmailWithGemini: (limit?: number) => Promise<{ fetched: number; processed: number; newEmailsProcessed: number; existingRecordsUpdated: number; duplicatesSkipped: number; opportunities: JobApplication[]; executionTimeMs?: number; stats?: any }>;
  generateDraftReply: (body: string, type: string, candidateName: string, companyName: string) => Promise<string>;
  saveApplicationTasks: (appId: string, checkedTasks: string[]) => Promise<void>;
  jwtToken: string | null;
  setJwtToken: (token: string | null) => void;
  loginUser: (email: string, password: string) => Promise<boolean>;
  registerUser: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logoutUser: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  backendReady: boolean;
  purgeSystemData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const PRE_POPULATED_APPS: JobApplication[] = [];



const getStringHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

export const generateEmailFingerprint = (subject: string, sender: string, date: string, body: string): string => {
  const clean = (s: string) => (s || "").toLowerCase().trim().replace(/\s+/g, " ");
  return `${clean(subject)}|||${clean(sender)}|||${clean(date)}|||${getStringHash(clean(body))}`;
};

export const canUpdateStatus = (currentStatus: string, newStatus: string): boolean => {
  const priority: Record<string, number> = {
    "OFFER": 5,
    "INTERVIEW": 4,
    "ASSESSMENT": 3,
    "APPLIED": 2,
    "PENDING": 2,
    "GENERAL UPDATE": 2,
    "REJECTED": 1
  };
  
  if (currentStatus === newStatus) return false;
  
  const currentRank = priority[currentStatus] || 0;
  const newRank = priority[newStatus] || 0;

  if (newStatus === "REJECTED") {
    return currentStatus !== "OFFER";
  }
  
  if (currentStatus === "REJECTED") {
    return newStatus === "OFFER" || newStatus === "INTERVIEW" || newStatus === "ASSESSMENT";
  }

  return newRank >= currentRank;
};

export const parseDate = (dStr: string | undefined): number => {
  if (!dStr || dStr === "Not available" || dStr.trim() === "") return 0;
  const time = new Date(dStr).getTime();
  return isNaN(time) ? 0 : time;
};

export const sortApplications = (apps: JobApplication[]): JobApplication[] => {
  return [...apps].sort((a, b) => {
    const dateA = parseDate(a.emailReceivedDate);
    const dateB = parseDate(b.emailReceivedDate);
    
    if (dateA !== dateB && dateA > 0 && dateB > 0) {
      return dateB - dateA; // Newest first
    }
    
    const createA = parseDate(a.createdAt || a.dateAdded || a.updatedAt);
    const createB = parseDate(b.createdAt || b.dateAdded || b.updatedAt);
    return createB - createA; // Newest first
  });
};

export const normalizeCompanyForMatching = (c: string): string => {
  let cleaned = (c || "").toLowerCase().trim();
  cleaned = cleaned.replace(/\b(is scheduled|has been scheduled|recruiting team|hiring team)\b/g, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleanupCompanyName(cleaned).toLowerCase().trim();
};

export const isCompanyMatch = (c1: string, c2: string): boolean => {
  const norm1 = normalizeCompanyForMatching(c1);
  const norm2 = normalizeCompanyForMatching(c2);
  return norm1 === norm2;
};

export const isRoleMatch = (r1: string, r2: string): boolean => {
  const clean = (s: string) => {
    let val = (s || "").toLowerCase().trim();
    if (val === "swe" || val === "sde") return "software engineer";
    if (val === "swe intern" || val === "sde intern") return "software engineer intern";
    return val.replace(/[^a-z0-9]/g, "");
  };
  return clean(r1) === clean(r2);
};

export const migrateApplications = (apps: any[]): JobApplication[] => {
  if (!Array.isArray(apps)) return [];
  const savedTasks = localStorage.getItem("careerpilot_app_tasks") || "{}";
  let tasksMap: any = {};
  try {
    tasksMap = JSON.parse(savedTasks);
  } catch (e) {
    console.error(e);
  }

  return apps.map((app) => {
    const createdAt = app.createdAt || app.dateAdded || new Date().toISOString();
    const updatedAt = app.updatedAt || new Date().toISOString();
    const checkedTasks = tasksMap[app.id] || app.checkedTasks || [];

    let emailReceivedDate = app.emailReceivedDate || app.lastActivityDate;
    if (!emailReceivedDate && app.timeline && app.timeline.length > 0) {
      const sortedEvents = [...app.timeline].sort((evtA, evtB) => {
        return parseDate(evtB.receivedDate) - parseDate(evtA.receivedDate);
      });
      if (sortedEvents[0]) {
        emailReceivedDate = sortedEvents[0].receivedDate;
      }
    }
    if (!emailReceivedDate && app.originalEmail?.receivedDate) {
      emailReceivedDate = app.originalEmail.receivedDate;
    }
    if (!emailReceivedDate) {
      emailReceivedDate = new Date().toISOString();
    }

    if (app && app.timeline && app.identifiers) {
      return {
        ...app,
        currentStatus: app.currentStatus || app.status || "PENDING",
        status: app.currentStatus || app.status || "PENDING",
        isStarred: !!app.isStarred,
        createdAt,
        updatedAt,
        emailReceivedDate,
        checkedTasks
      };
    }
    
    const dateValue = app.date?.value || "Not available";
    const receivedDate = emailReceivedDate;
    const emailBody = app.originalEmail?.body || app.summary || "No body content.";
    const subject = app.originalEmail?.subject || `Application Status - ${app.role}`;
    const sender = app.originalEmail?.from || `${app.company} Careers`;

    const fingerprint = app.emailFingerprint || generateEmailFingerprint(
      subject,
      sender,
      receivedDate,
      emailBody
    );

    const firstEvent: TimelineEvent = {
      id: "evt_" + Math.random().toString(36).substr(2, 9),
      gmailMessageId: app.gmailMessageId || "",
      threadId: "",
      emailFingerprint: fingerprint,
      eventType: app.status || "PENDING",
      subject: subject,
      sender: sender,
      receivedDate: receivedDate,
      extractedDate: dateValue,
      summary: app.summary || "",
      originalEmail: emailBody,
      source: app.source || "Manual Entry"
    };

    return {
      ...app,
      currentStatus: app.status || "PENDING",
      status: app.status || "PENDING",
      latestUpdate: subject,
      lastActivityDate: receivedDate,
      isStarred: !!app.isStarred,
      createdAt,
      updatedAt,
      emailReceivedDate,
      checkedTasks,
      identifiers: {
        threadIds: [],
        gmailMessageIds: app.gmailMessageId ? [app.gmailMessageId] : [],
        emailFingerprints: [fingerprint]
      },
      timeline: [firstEvent]
    };
  });
};


const inferEmailMetaData = (body: string, subject: string, senderEmail: string, company: string) => {
  const text = (subject + " " + body).toLowerCase();
  
  let mode = "Online";
  if (text.includes("in-person") || text.includes("on-site") || text.includes("office") || text.includes("onsite")) {
    mode = "In-Person";
  } else if (text.includes("hybrid")) {
    mode = "Hybrid";
  }
  
  let location = "Remote";
  if (mode === "In-Person") {
    if (text.includes("san francisco") || text.includes("sf")) {
      location = "San Francisco, CA";
    } else if (text.includes("new york") || text.includes("nyc")) {
      location = "New York, NY";
    } else if (text.includes("seattle")) {
      location = "Seattle, WA";
    } else if (text.includes("london")) {
      location = "London, UK";
    } else {
      location = "On-site";
    }
  } else if (text.includes("remote")) {
    location = "Remote";
  }
  
  const matchedSample = SAMPLE_EMAILS.find(e => e.senderEmail === senderEmail || (senderEmail && e.senderEmail.toLowerCase().includes(senderEmail.toLowerCase())));
  const from = matchedSample 
    ? `${matchedSample.sender} <${matchedSample.senderEmail}>` 
    : (senderEmail ? `${company} Careers <${senderEmail}>` : `${company} Careers <recruiter@${company.toLowerCase().replace(/[^a-z0-9]/g, "") || "company"}.com>`);
    
  const receivedDate = matchedSample 
    ? new Date(matchedSample.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) 
    : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    
  return {
    mode,
    location,
    source: "CareerPilot/Gmail",
    originalEmail: {
      from,
      subject: subject || `Career Opportunity Update from ${company}`,
      body,
      receivedDate
    }
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ message: string; subMessage?: string; type: "success" | "scan_result"; duration?: number } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const [jwtToken, setJwtTokenInternal] = useState<string | null>(() => {
    return localStorage.getItem("careerpilot_jwt_token");
  });

  const setJwtToken = (token: string | null) => {
    setJwtTokenInternal(token);
    if (token) {
      localStorage.setItem("careerpilot_jwt_token", token);
    } else {
      localStorage.removeItem("careerpilot_jwt_token");
    }
  };

  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers || {});
    if (jwtToken) {
      headers.set("Authorization", `Bearer ${jwtToken}`);
    }
    return fetch(url, {
      ...options,
      headers
    });
  };

  const loginUser = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        setJwtToken(data.token);
        setUserEmail(data.email);
        setUserName(data.name || "");
        setProfileManuallySaved(true);
        setView("dashboard");
        return true;
      }
    } catch (e) {
      console.error("Login failed:", e);
    }
    return false;
  };

  const registerUser = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      if (res.ok) {
        return { success: true };
      } else {
        const data = await res.json();
        return { success: false, error: data.error || "Registration failed" };
      }
    } catch (e) {
      console.error("Registration failed:", e);
      return { success: false, error: "Network error occurred" };
    }
  };

  const logoutUser = () => {
    setJwtToken(null);
    setUserEmail("");
    setUserName("");
    setProfileManuallySaved(false);
    setView("landing");
  };

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("careerpilot_darkmode") === "true";
  });

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem("careerpilot_darkmode", String(next));
      return next;
    });
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const showToast = (t: { message: string; subMessage?: string; type: "success" | "scan_result"; duration?: number } | null) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast(t);
    if (t && t.duration) {
      toastTimeoutRef.current = setTimeout(() => {
        setToast(null);
      }, t.duration);
    }
  };

  const [applications, setApplications] = useState<JobApplication[]>(() => {
    const saved = localStorage.getItem("hiretrack_apps");
    const parsed = saved ? JSON.parse(saved) : PRE_POPULATED_APPS;
    return migrateApplications(parsed);
  });

  const [activityLogs, setActivityLogs] = useState<AgentSystemTelemetry[]>(() => {
    const saved = localStorage.getItem("hiretrack_logs");
    return saved ? JSON.parse(saved) : [];
  });

  const [apiKey, setApiKeyInternal] = useState<string>(() => {
    const saved = localStorage.getItem("hiretrack_api_key");
    if (saved) return saved;
    return import.meta.env.VITE_GEMINI_API_KEY || "";
  });

  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [evaluations, setEvaluations] = useState<EvaluationReport[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const [currentView, setView] = useState<string>(() => {
    const token = localStorage.getItem("careerpilot_jwt_token");
    const onboarded = localStorage.getItem("careerpilot_onboarded") === "true";
    const demo = localStorage.getItem("careerpilot_demomode") === "true";
    if (token || demo) {
      return onboarded ? "dashboard" : "guide";
    }
    return "landing";
  });
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const [userName, setUserName] = useState<string>(() => {
    const saved = localStorage.getItem("careerpilot_username");
    return saved || "";
  });

  const [userEmail, setUserEmail] = useState<string>(() => {
    const saved = localStorage.getItem("careerpilot_useremail");
    return saved || "";
  });

  const [profileManuallySaved, setProfileManuallySaved] = useState<boolean>(() => {
    return localStorage.getItem("careerpilot_profile_manually_saved") === "true";
  });

  const [gmailProfileEmail, setGmailProfileEmail] = useState<string>(() => {
    return localStorage.getItem("careerpilot_gmail_profile_email") || "";
  });

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const saved = localStorage.getItem("careerpilot_selectedmodel");
    return saved || "gemini-1.5-flash";
  });

  const [gmailConnected, setGmailConnected] = useState<boolean>(() => {
    const saved = localStorage.getItem("careerpilot_gmailconnected");
    return saved ? JSON.parse(saved) : false;
  });

  const [demoMode, setDemoMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("careerpilot_demomode");
    return saved === "true";
  });

  const [backendReady, setBackendReady] = useState<boolean>(false);

  const [careerGoal, setCareerGoal] = useState<string>(() => {
    const saved = localStorage.getItem("careerpilot_careergoal");
    return saved || "Software Engineer";
  });

  const [preferredRoles, setPreferredRoles] = useState<string>(() => {
    const saved = localStorage.getItem("careerpilot_preferredroles");
    return saved || "Backend, Full Stack, AI Engineer";
  });

  const [jobSearchStatus, setJobSearchStatus] = useState<string>(() => {
    const saved = localStorage.getItem("careerpilot_jobsearchstatus");
    return saved || "Actively Applying";
  });

  const [gmailProfileName, setGmailProfileName] = useState<string>(() => {
    return localStorage.getItem("careerpilot_gmail_profile_name") || "";
  });

  const [gmailProfileImage, setGmailProfileImage] = useState<string>(() => {
    return localStorage.getItem("careerpilot_gmail_profile_image") || "";
  });

  const [gmailLastSync, setGmailLastSync] = useState<string>(() => {
    return localStorage.getItem("careerpilot_gmail_last_sync") || "";
  });

  const agentSystem = new AgentSystem();

  // Computed dynamic profile values based on priority rules
  const displayName = (() => {
    if (profileManuallySaved && userName) {
      return userName;
    }
    if (gmailConnected && gmailProfileName) {
      return gmailProfileName;
    }
    if (demoMode) {
      return "Demo User";
    }
    return "";
  })();

  const displayEmail = (() => {
    if (profileManuallySaved && userEmail) {
      return userEmail;
    }
    if (gmailConnected && gmailProfileEmail) {
      return gmailProfileEmail;
    }
    if (demoMode) {
      return "demo@careerpilot.ai";
    }
    return "";
  })();

  useEffect(() => {
    localStorage.setItem("hiretrack_apps", JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    localStorage.setItem("hiretrack_logs", JSON.stringify(activityLogs));
  }, [activityLogs]);

  useEffect(() => {
    localStorage.setItem("hiretrack_api_key", apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem("careerpilot_username", userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem("careerpilot_useremail", userEmail);
  }, [userEmail]);

  useEffect(() => {
    localStorage.setItem("careerpilot_profile_manually_saved", String(profileManuallySaved));
  }, [profileManuallySaved]);

  useEffect(() => {
    localStorage.setItem("careerpilot_gmail_profile_email", gmailProfileEmail);
  }, [gmailProfileEmail]);

  useEffect(() => {
    localStorage.setItem("careerpilot_selectedmodel", selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem("careerpilot_gmailconnected", JSON.stringify(gmailConnected));
  }, [gmailConnected]);

  useEffect(() => {
    localStorage.setItem("careerpilot_careergoal", careerGoal);
  }, [careerGoal]);

  useEffect(() => {
    localStorage.setItem("careerpilot_preferredroles", preferredRoles);
  }, [preferredRoles]);

  useEffect(() => {
    localStorage.setItem("careerpilot_jobsearchstatus", jobSearchStatus);
  }, [jobSearchStatus]);

  useEffect(() => {
    localStorage.setItem("careerpilot_gmail_profile_name", gmailProfileName);
  }, [gmailProfileName]);

  useEffect(() => {
    localStorage.setItem("careerpilot_gmail_profile_image", gmailProfileImage);
  }, [gmailProfileImage]);

  useEffect(() => {
    localStorage.setItem("careerpilot_gmail_last_sync", gmailLastSync);
  }, [gmailLastSync]);

  useEffect(() => {
    localStorage.setItem("careerpilot_demomode", String(demoMode));
  }, [demoMode]);

  const refreshApplicationsAndLogs = async () => {
    if (!displayEmail || demoMode) return;
    try {
      const appsRes = await authFetch(`${API_BASE_URL}/api/applications?email=${encodeURIComponent(displayEmail)}`);
      if (appsRes.ok) {
        const data = await appsRes.json();
        const mapped = data.map((app: any) => ({
          ...app,
          status: app.currentStatus,
          isStarred: !!(app.isStarred ?? app.starred ?? app.is_starred),
          recruiterEmail: app.recruiterEmail || app.recruiter_email || "",
          recruiterName: app.recruiterName || app.recruiter_name || "",
          emailReceivedDate: app.emailReceivedDate || app.lastUpdated?.split('T')[0] || "Not available",
          identifiers: {
            threadIds: Array.from(new Set((app.timeline || []).map((e: any) => e.threadId).filter(Boolean))),
            gmailMessageIds: Array.from(new Set((app.timeline || []).map((e: any) => e.gmailMessageId).filter(Boolean))),
            emailFingerprints: Array.from(new Set((app.timeline || []).map((e: any) => e.emailFingerprint).filter(Boolean))),
          },
          date: {
            type: "Received",
            value: app.emailReceivedDate || app.lastUpdated?.split('T')[0] || "Not available",
          }
        }));
        setApplications(mapped);
      }

      const logsRes = await authFetch(`${API_BASE_URL}/api/agent/logs?email=${encodeURIComponent(displayEmail)}`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        const mappedLogs = logsData.map((log: any) => {
          let parsedPayload: any = null;
          try {
            if (log.message && log.message.startsWith('{') && log.message.endsWith('}')) {
              parsedPayload = JSON.parse(log.message);
            }
          } catch (e) {
            console.error("Failed to parse structured log JSON:", e);
          }

          if (parsedPayload) {
            return {
              isJobRelated: parsedPayload.type === "scan_run" || parsedPayload.status === "SUCCESS",
              result: parsedPayload.type === "manual_run" ? {
                company: parsedPayload.company,
                role: parsedPayload.role,
                status: parsedPayload.category,
                date: { type: "Target Date", value: "Not available" },
                summary: parsedPayload.summary || "Manual execution details extracted.",
                nextAction: "Review application logs",
                confidence: parsedPayload.confidence || 1.0
              } : null,
              logs: parsedPayload.steps || [],
              skillsUsed: parsedPayload.type === "scan_run" ? ["email_monitor", "email_classifier", "email_summarizer"] : ["manual_orchestrator"],
              toolsCalled: [],
              guardrailStatus: "PASSED",
              guardrailLogs: [],
              timestamp: log.timestamp || new Date().toISOString(),
              structuredPayload: parsedPayload
            };
          }

          return {
            isJobRelated: log.isJobRelated || false,
            result: null,
            logs: log.message ? [log.message] : [],
            skillsUsed: log.skillsUsed ? log.skillsUsed.split(",") : [],
            toolsCalled: log.toolsCalled ? log.toolsCalled.split(",") : [],
            guardrailStatus: log.guardrailStatus || "PASSED",
            guardrailLogs: log.guardrailLogs ? log.guardrailLogs.split("\n") : [],
            timestamp: log.timestamp || new Date().toISOString()
          };
        });
        setActivityLogs(mappedLogs);
      }
    } catch (err) {
      console.warn("Failed to fetch applications and logs from backend:", err);
    }
  };

  useEffect(() => {
    if (!displayEmail || demoMode) return;

    const syncUserAndLoad = async () => {
      try {
        const syncRes = await authFetch(`${API_BASE_URL}/api/users/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: displayEmail,
            name: displayName || userName || "",
            careerGoal,
            preferredRoles,
            jobSearchStatus,
          }),
        });

        if (syncRes.ok) {
          const userObj = await syncRes.json();
          if (userObj.gmailConnected) {
            setGmailConnected(true);
            setGmailProfileEmail(userObj.gmailEmail || "");
            setGmailProfileName(userObj.gmailName || "");
            setGmailProfileImage(userObj.gmailPicture || "");
            localStorage.setItem("careerpilot_gmailconnected", "true");
            localStorage.setItem("careerpilot_gmail_profile_email", userObj.gmailEmail || "");
            localStorage.setItem("careerpilot_gmail_profile_name", userObj.gmailName || "");
            localStorage.setItem("careerpilot_gmail_profile_image", userObj.gmailPicture || "");
          } else {
            setGmailConnected(false);
            setGmailProfileEmail("");
            setGmailProfileName("");
            setGmailProfileImage("");
            localStorage.setItem("careerpilot_gmailconnected", "false");
            localStorage.setItem("careerpilot_gmail_profile_email", "");
            localStorage.setItem("careerpilot_gmail_profile_name", "");
            localStorage.setItem("careerpilot_gmail_profile_image", "");
          }
          await refreshApplicationsAndLogs();
        }
      } catch (err) {
        console.error("Error syncing user and loading data from backend:", err);
      }
    };

    syncUserAndLoad();
  }, [displayEmail, displayName, careerGoal, preferredRoles, jobSearchStatus, demoMode]);


  useEffect(() => {
    if (demoMode) {
      setBackendReady(true);
      return;
    }
    let active = true;
    let timer: any = null;
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/health`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'ok' || data.databaseReady) {
            if (active) {
              setBackendReady(true);
              return;
            }
          }
        }
      } catch (e) {
        // Ignored
      }
      if (active) {
        timer = setTimeout(checkHealth, 1000);
      }
    };
    checkHealth();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [demoMode]);

  useEffect(() => {
    const getEmails = async () => {
      const data = await fetchEmails();
      setEmails(data);
    };
    getEmails();
  }, []);

  const setApiKey = (key: string) => {
    setApiKeyInternal(key);
  };

  const processEmailText = async (body: string, subject: string, senderEmail: string = "", gmailMessageId?: string, customSource?: string, bodyHtml?: string): Promise<AgentSystemTelemetry> => {
    setIsProcessing(true);
    try {
      if (demoMode) {
        const telemetry = await agentSystem.processEmail(body, subject, apiKey, senderEmail);
        
        const receivedDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        const fingerprint = generateEmailFingerprint(subject, senderEmail, receivedDate, body);
        
        let isDuplicate = false;
        if (gmailMessageId) {
          isDuplicate = applications.some((app) => app.identifiers.gmailMessageIds.includes(gmailMessageId));
        }
        if (!isDuplicate) {
          isDuplicate = applications.some((app) => app.identifiers.emailFingerprints.includes(fingerprint));
        }
        telemetry.isDuplicateUpdate = isDuplicate;

        telemetry.checks = {
          messageIdChecked: true,
          duplicateScanCompleted: true,
          existingAppDetected: false,
          timelineUpdated: false
        };

        if (isDuplicate) {
          telemetry.logs.push(`[Agent Orchestrator] Duplicate email ignored. Message ID: ${gmailMessageId || "N/A"}`);
          return telemetry;
        }

        if (telemetry.isJobRelated && telemetry.result) {
          const res = telemetry.result;
          res.company = cleanupCompanyName(res.company, body, subject, senderEmail);
          res.summary = cleanSummaryText(res.summary, res.company, res.company);
          
          const meta = inferEmailMetaData(body, subject, senderEmail, res.company);

          const extractedDate = res.status === "OFFER" ? (res.joiningDate || "Not available")
            : res.status === "INTERVIEW" ? (res.interviewDate || "Not available")
            : res.status === "ASSESSMENT" ? (res.assessmentDeadline || "Not available")
            : "Not available";

          const newEvent: TimelineEvent = {
            id: "evt_" + Math.random().toString(36).substr(2, 9),
            gmailMessageId: gmailMessageId || "",
            threadId: "",
            emailFingerprint: fingerprint,
            eventType: res.status,
            subject: subject || `Application Status Update`,
            sender: meta.originalEmail.from,
            receivedDate: meta.originalEmail.receivedDate,
            extractedDate: extractedDate,
            summary: res.summary,
            originalEmail: body,
            originalEmailHtml: bodyHtml || "",
            source: customSource || "Manual paste"
          };
          
          setApplications((prev) => {
            let existingIndex = prev.findIndex((app) => {
              const isCompMatch = isCompanyMatch(app.company, res.company);
              const isRoleM = isRoleMatch(app.role, res.role);
              return isCompMatch && isRoleM;
            });

            if (existingIndex >= 0) {
              const existingApp = prev[existingIndex];
              telemetry.checks!.existingAppDetected = true;
              telemetry.checks!.timelineUpdated = true;

              const oldStatus = existingApp.currentStatus;
              const newStatus = res.status;
              let statusProgressionText = "";
              let updatedStatus = oldStatus;

              if (canUpdateStatus(oldStatus, newStatus)) {
                updatedStatus = newStatus;
                statusProgressionText = `${oldStatus} → ${newStatus}`;
                telemetry.checks!.statusProgressed = statusProgressionText;
              }

              const getMergedDate = (newVal: string | undefined, oldVal: string | undefined): string => {
                if (!newVal || newVal === "Not available" || newVal.trim() === "") {
                  return oldVal || "Not available";
                }
                return newVal;
              };

              const mergedJoiningDate = getMergedDate(res.joiningDate, existingApp.joiningDate);
              const mergedInterviewDate = getMergedDate(res.interviewDate, existingApp.interviewDate);
              const mergedAssessmentDeadline = getMergedDate(res.assessmentDeadline, existingApp.assessmentDeadline);
              const mergedDeadline = getMergedDate(res.deadline, existingApp.deadline);

              let finalDateType = existingApp.date.type;
              let finalDateValue = existingApp.date.value;

              if (updatedStatus === "OFFER") {
                finalDateType = "Joining Date";
                finalDateValue = mergedJoiningDate;
              } else if (updatedStatus === "INTERVIEW") {
                finalDateType = "Interview Date";
                finalDateValue = mergedInterviewDate;
              } else if (updatedStatus === "ASSESSMENT") {
                finalDateType = "Assessment Deadline";
                finalDateValue = mergedAssessmentDeadline;
              }

              const updatedApp: JobApplication = {
                ...existingApp,
                currentStatus: updatedStatus,
                status: updatedStatus,
                summary: res.summary,
                joiningDate: mergedJoiningDate,
                interviewDate: mergedInterviewDate,
                assessmentDeadline: mergedAssessmentDeadline,
                deadline: mergedDeadline,
                date: {
                  type: finalDateType,
                  value: finalDateValue
                },
                nextAction: res.nextAction,
                confidence: res.confidence,
                lastActivityDate: meta.originalEmail.receivedDate,
                latestUpdate: subject || `Status: ${updatedStatus}`,
                identifiers: {
                  threadIds: existingApp.identifiers.threadIds,
                  gmailMessageIds: gmailMessageId && !existingApp.identifiers.gmailMessageIds.includes(gmailMessageId)
                    ? [...existingApp.identifiers.gmailMessageIds, gmailMessageId]
                    : existingApp.identifiers.gmailMessageIds,
                  emailFingerprints: !existingApp.identifiers.emailFingerprints.includes(fingerprint)
                    ? [...existingApp.identifiers.emailFingerprints, fingerprint]
                    : existingApp.identifiers.emailFingerprints
                },
                timeline: [...existingApp.timeline, newEvent],
                updatedAt: new Date().toISOString(),
                emailReceivedDate: meta.originalEmail.receivedDate
              };
              const newApps = [...prev];
              newApps[existingIndex] = updatedApp;
              return newApps;
            } else {
              telemetry.checks!.existingAppDetected = false;
              telemetry.checks!.timelineUpdated = true;

              const newApp: JobApplication = {
                id: "app_" + Math.random().toString(36).substr(2, 9),
                company: res.company,
                role: res.role,
                currentStatus: res.status,
                status: res.status,
                summary: res.summary,
                joiningDate: res.joiningDate || "Not available",
                interviewDate: res.interviewDate || "Not available",
                assessmentDeadline: res.assessmentDeadline || "Not available",
                deadline: res.deadline || "Not available",
                date: res.date,
                nextAction: res.nextAction,
                dateAdded: new Date().toISOString().split("T")[0],
                confidence: res.confidence,
                mode: meta.mode,
                location: meta.location,
                source: customSource || meta.source,
                latestUpdate: subject || `Status: ${res.status}`,
                lastActivityDate: meta.originalEmail.receivedDate,
                isStarred: false,
                identifiers: {
                  threadIds: [],
                  gmailMessageIds: gmailMessageId ? [gmailMessageId] : [],
                  emailFingerprints: [fingerprint]
                },
                timeline: [newEvent],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                emailReceivedDate: meta.originalEmail.receivedDate
              };
              return [newApp, ...prev];
            }
          });
        }
        return telemetry;
      }

      const response = await authFetch(`${API_BASE_URL}/api/agent/analyze-text?email=${encodeURIComponent(displayEmail)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          body,
          senderEmail,
          bodyHtml: bodyHtml || "",
          source: customSource || "Manual paste"
        })
      });

      if (!response.ok) {
        throw new Error("Backend text analysis failed");
      }

      const telemetry = await response.json();
      await refreshApplicationsAndLogs();
      return telemetry;
    } finally {
      setIsProcessing(false);
    }
  };

  const addManualApplication = async (app: Omit<JobApplication, "id" | "dateAdded" | "confidence" | "currentStatus" | "latestUpdate" | "lastActivityDate" | "isStarred" | "identifiers" | "timeline" | "createdAt" | "updatedAt" | "emailReceivedDate">) => {
    if (demoMode) {
      const cleanedCompany = cleanupCompanyName(app.company);
      const cleanedSummary = cleanSummaryText(app.summary || "Manually added application.", cleanedCompany, app.company);
      const joiningDate = app.date.type === "Joining Date" ? app.date.value : "Not available";
      const interviewDate = app.date.type === "Interview Date" ? app.date.value : "Not available";
      const assessmentDeadline = app.date.type === "Assessment Deadline" ? app.date.value : "Not available";
      const receivedDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

      const manualEvent: TimelineEvent = {
        id: "evt_" + Math.random().toString(36).substr(2, 9),
        gmailMessageId: "",
        threadId: "",
        emailFingerprint: "",
        eventType: app.status,
        subject: `Application Status - ${app.role}`,
        sender: `Recruiter <recruiter@${cleanedCompany.toLowerCase().replace(/[^a-z0-9]/g, "") || "company"}.com>`,
        receivedDate: receivedDate,
        extractedDate: app.date.value || "Not available",
        summary: cleanedSummary,
        originalEmail: `No original email captured. This opportunity was tracked manually. \n\nDirect summary context: ${cleanedSummary}`,
        source: "Manual Entry"
      };

      const newApp: JobApplication = {
        company: cleanedCompany,
        role: app.role,
        status: app.status,
        summary: cleanedSummary,
        joiningDate,
        interviewDate,
        assessmentDeadline,
        deadline: "Not available",
        date: app.date,
        nextAction: app.nextAction,
        id: "app_" + Math.random().toString(36).substr(2, 9),
        dateAdded: new Date().toISOString().split("T")[0],
        confidence: 1.0,
        mode: app.date.type === "Interview Date" || app.date.type === "Assessment Deadline" ? "Online" : "Remote",
        location: "Remote",
        source: "Manual Entry",
        currentStatus: app.status,
        latestUpdate: `Application manually tracked`,
        lastActivityDate: receivedDate,
        isStarred: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emailReceivedDate: receivedDate,
        identifiers: {
          threadIds: [],
          gmailMessageIds: [],
          emailFingerprints: []
        },
        timeline: [manualEvent]
      };
      setApplications((prev) => [newApp, ...prev]);
      return;
    }

    try {
      const res = await authFetch(`${API_BASE_URL}/api/applications?email=${encodeURIComponent(displayEmail)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company: app.company,
          role: app.role,
          status: app.status,
          summary: app.summary || "Manually added application.",
          dateType: app.date.type,
          dateValue: app.date.value || "Not available",
          nextAction: app.nextAction,
        }),
      });

      if (res.ok) {
        await refreshApplicationsAndLogs();
        showToast({
          type: "success",
          message: "✅ Opportunity Added",
          subMessage: `Successfully added ${app.company} - ${app.role}`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Failed to add manual application:", error);
    }
  };

  const deleteApplication = async (id: string) => {
    // Optimistic local state update to remove card immediately without page refresh
    setApplications((prev) => prev.filter((app) => app.id !== id));
    if (selectedAppId === id) {
      setSelectedAppId(null);
    }

    if (demoMode) return;

    try {
      const res = await authFetch(`${API_BASE_URL}/api/applications/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await refreshApplicationsAndLogs();
        showToast({
          type: "success",
          message: "🗑️ Opportunity Deleted",
          duration: 3000,
        });
      } else {
        await refreshApplicationsAndLogs();
      }
    } catch (error) {
      console.error("Failed to delete application:", error);
      await refreshApplicationsAndLogs();
    }
  };

  const updateApplicationStatus = async (id: string, status: JobApplication["status"]) => {
    if (demoMode) {
      setApplications((prev) =>
        prev.map((app) => {
          if (app.id === id) {
            let newDateType = app.date.type;
            let newNextAction = app.nextAction;

            if (status === "ASSESSMENT") {
              newDateType = "Assessment Deadline";
              newNextAction = "Complete assessment before deadline and practice coding problems.";
            } else if (status === "INTERVIEW") {
              newDateType = "Interview Date";
              newNextAction = "Prepare DSA, projects, and interview concepts.";
            } else if (status === "OFFER") {
              newDateType = "Joining Date";
              newNextAction = "Review offer details and complete onboarding steps.";
            } else if (status === "REJECTED") {
              newDateType = "Not available";
              newNextAction = "Update status and continue applying.";
            }

            let newDateValue = app.date.value;
            if (status === "OFFER" && app.joiningDate && app.joiningDate !== "Not available") {
              newDateValue = app.joiningDate;
            } else if (status === "INTERVIEW" && app.interviewDate && app.interviewDate !== "Not available") {
              newDateValue = app.interviewDate;
            } else if (status === "ASSESSMENT" && app.assessmentDeadline && app.assessmentDeadline !== "Not available") {
              newDateValue = app.assessmentDeadline;
            }

            const receivedDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
            
            const newEvent: TimelineEvent = {
              id: "evt_" + Math.random().toString(36).substr(2, 9),
              gmailMessageId: "",
              threadId: "",
              emailFingerprint: "",
              eventType: status,
              subject: `Status manually updated to ${status}`,
              sender: "User",
              receivedDate: receivedDate,
              extractedDate: newDateValue || "Not available",
              summary: `Application status manually changed to ${status}.`,
              originalEmail: `Application status was manually updated to ${status} by the user.`,
              source: "Manual Entry"
            };

            return { 
              ...app, 
              status,
              currentStatus: status,
              date: {
                type: newDateType,
                value: newDateValue
              },
              nextAction: newNextAction,
              lastActivityDate: receivedDate,
              latestUpdate: `Status manually updated to ${status}`,
              timeline: [...app.timeline, newEvent],
              updatedAt: new Date().toISOString(),
              emailReceivedDate: receivedDate
            };
          }
          return app;
        })
      );
      return;
    }

    try {
      const res = await authFetch(`${API_BASE_URL}/api/applications/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        await refreshApplicationsAndLogs();
        showToast({
          type: "success",
          message: `🔄 Status Updated to ${status}`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const toggleStarApplication = async (id: string) => {
    // Optimistic update
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, isStarred: !app.isStarred } : app))
    );

    if (demoMode) return;

    try {
      const res = await authFetch(`${API_BASE_URL}/api/applications/${id}/star`, {
        method: "PUT",
      });

      if (!res.ok) {
        // Rollback state on error
        setApplications((prev) =>
          prev.map((app) => (app.id === id ? { ...app, isStarred: !app.isStarred } : app))
        );
      } else {
        await refreshApplicationsAndLogs();
      }
    } catch (error) {
      console.error("Failed to toggle star:", error);
      // Rollback state on error
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, isStarred: !app.isStarred } : app))
      );
    }
  };

  const cleanupOldApplications = (months: number, keepStarred: boolean) => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    
    setApplications((prev) =>
      prev.filter((app) => {
        const appDate = new Date(app.dateAdded || app.lastActivityDate || new Date());
        const isOld = appDate < cutoffDate;
        if (isOld) {
          if (keepStarred && app.isStarred) {
            return true;
          }
          return false;
        }
        return true;
      })
    );
  };

  const clearLogs = async () => {
    if (demoMode) {
      setActivityLogs([]);
      return;
    }

    try {
      const res = await authFetch(`${API_BASE_URL}/api/agent/logs/clear?email=${encodeURIComponent(displayEmail)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setActivityLogs([]);
      }
    } catch (error) {
      console.error("Failed to clear logs:", error);
    }
  };

  const purgeSystemData = async () => {
    if (demoMode) {
      setApplications([]);
      setActivityLogs([]);
      localStorage.setItem("hiretrack_apps", JSON.stringify([]));
      localStorage.setItem("hiretrack_logs", JSON.stringify([]));
      return;
    }

    try {
      const res = await authFetch(`${API_BASE_URL}/api/reset`, {
        method: "POST",
      });

      if (res.ok) {
        setApplications([]);
        setActivityLogs([]);
        await refreshApplicationsAndLogs();
        showToast({
          type: "success",
          message: "🧹 System Data Purged",
          subMessage: "Applications and activity logs cleared successfully.",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Failed to purge system data:", error);
    }
  };

  const runSystemEvaluations = async () => {
    setIsEvaluating(true);
    setEvaluations([]);
    
    try {
      const testsResponse = await fetch("/evaluations/email_tests.json");
      let tests = [];
      if (testsResponse.ok) {
        tests = await testsResponse.json();
      } else {
        tests = [
          {
            id: "test_interview",
            name: "Google Interview Invitation",
            subject: "Interview with Google for Software Engineer",
            body: "Hi applicant, we were impressed by your resume and would like to schedule a 45-minute technical interview. Please use this calendar link to schedule by Friday, June 26, 2026. Best, Google Recruiting Team.",
            expected: { company: "Google", role: "Software Engineer", status: "INTERVIEW", deadline: "2026-06-26" }
          },
          {
            id: "test_assessment",
            name: "Amazon Coding Assessment",
            subject: "Amazon Software Dev Intern Online Assessment",
            body: "Thank you for applying to Amazon. We have sent you an invitation to take our Online Coding Assessment. You have 5 days to complete it. The deadline is June 24, 2026. Good luck!",
            expected: { company: "Amazon", role: "Software Dev Intern", status: "ASSESSMENT", deadline: "2026-06-24" }
          },
          {
            id: "test_offer",
            name: "Stripe Job Offer",
            subject: "Offer from Stripe!",
            body: "Dear candidate, we are thrilled to offer you the position of Frontend Engineer at Stripe. We've attached your offer letter detailing the base salary and equity. Please sign and return it by June 30, 2026.",
            expected: { company: "Stripe", role: "Frontend Engineer", status: "OFFER", deadline: "2026-06-30" }
          },
          {
            id: "test_rejection",
            name: "Meta Application Rejection",
            subject: "Your application to Meta",
            body: "Thank you for taking the time to interview with Meta. Unfortunately, we will not be moving forward with your application at this time. We will keep your profile in our database for future opportunities.",
            expected: { company: "Meta", role: "Not available", status: "REJECTED", deadline: "Not available" }
          }
        ];
      }

      const results: EvaluationReport[] = [];

      for (const test of tests) {
        const start = performance.now();
        const telemetry = await agentSystem.processEmail(test.body, test.subject, apiKey);
        const end = performance.now();

        const actualCompany = telemetry.result?.company || "Not available";
        const actualStatus = telemetry.result?.status || "GENERAL UPDATE";

        const companyMatch = actualCompany.toLowerCase() === test.expected.company.toLowerCase();
        const statusMatch = actualStatus === test.expected.status;
        const passed = companyMatch && statusMatch;

        results.push({
          id: test.id,
          name: test.name,
          expectedStatus: test.expected.status,
          actualStatus,
          expectedCompany: test.expected.company,
          actualCompany,
          statusMatch,
          companyMatch,
          passed,
          latencyMs: Math.round(end - start)
        });
      }

      setEvaluations(results);
    } catch (error) {
      console.error("Evaluation run failed:", error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const connectGmailAccount = async () => {
    try {
      const result = await connectGmail();
      
      let profileEmail = "";
      let profileName = "";
      let profileImage = "";

      if (!demoMode) {
        try {
          const res = await authFetch(`${API_BASE_URL}/api/auth/google/save`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              code: result.code
            })
          });

          if (!res.ok) {
            throw new Error("Failed to link Google account on backend.");
          }

          const backendProfile = await res.json();
          profileEmail = backendProfile.email || "";
          profileName = backendProfile.name || "";
          profileImage = backendProfile.picture || "";
        } catch (e) {
          console.error("Failed to persist linked Google account to backend:", e);
          throw e;
        }
      } else {
        profileEmail = "demo@gmail.com";
        profileName = "Demo User";
        profileImage = "";
      }

      setGmailProfileName(profileName);
      setGmailProfileImage(profileImage);
      setGmailProfileEmail(profileEmail);
      setGmailConnected(true);

      localStorage.setItem("careerpilot_gmail_profile_email", profileEmail);
      localStorage.setItem("careerpilot_gmail_profile_name", profileName);
      localStorage.setItem("careerpilot_gmail_profile_image", profileImage);
      localStorage.setItem("careerpilot_gmailconnected", "true");

      if (!profileManuallySaved) {
        setUserName(profileName);
        setUserEmail(profileEmail);
        localStorage.setItem("careerpilot_username", profileName);
        localStorage.setItem("careerpilot_useremail", profileEmail);
      }

      showToast({
        type: "success",
        message: "✅ Gmail Connected Successfully",
        subMessage: "CareerPilot is ready to analyze recruiter emails.",
        duration: 4000
      });

      return { email: profileEmail, name: profileName, picture: profileImage };
    } catch (err: any) {
      console.error("Gmail Connection Error:", err);
      throw err;
    }
  };

  const disconnectGmailAccount = () => {
    setGmailProfileName("");
    setGmailProfileImage("");
    setGmailProfileEmail("");
    setGmailLastSync("");
    setGmailConnected(false);

    localStorage.removeItem("careerpilot_gmail_profile_name");
    localStorage.removeItem("careerpilot_gmail_profile_image");
    localStorage.removeItem("careerpilot_gmail_profile_email");
    localStorage.removeItem("careerpilot_gmail_last_sync");
    localStorage.setItem("careerpilot_gmailconnected", "false");

    if (!profileManuallySaved) {
      setUserName("");
      setUserEmail("");
      localStorage.removeItem("careerpilot_username");
      localStorage.removeItem("careerpilot_useremail");
    }
  };

  const scanGmailWithGemini = async (limit: number = 50): Promise<{ fetched: number; processed: number; newEmailsProcessed: number; existingRecordsUpdated: number; duplicatesSkipped: number; opportunities: JobApplication[]; executionTimeMs?: number; stats?: any }> => {
    if (!gmailConnected) {
      throw new Error("Gmail is not connected. Please link your Gmail account.");
    }

    setIsProcessing(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/agent/scan?limit=${limit}`, {
        method: "POST",
      });

      if (!res.ok) {
        let errMsg = "Gmail scan failed.";
        try {
          const errData = await res.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      
      await refreshApplicationsAndLogs();

      const syncTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
      setGmailLastSync(syncTime);
      localStorage.setItem("careerpilot_gmail_last_sync", syncTime);

      showToast({
        type: "scan_result",
        message: "Scan Complete",
        subMessage: `Scanned ${data.fetched} emails\nDetected ${data.processed} recruiter emails\nAdded ${data.newEmailsProcessed} new applications\nUpdated ${data.existingRecordsUpdated} existing applications`,
        duration: 4000
      });

      const mappedOpportunities = (data.opportunities || []).map((app: any) => ({
        ...app,
        status: app.currentStatus,
        isStarred: !!(app.isStarred ?? app.starred ?? app.is_starred),
        recruiterEmail: app.recruiterEmail || app.recruiter_email || "",
        recruiterName: app.recruiterName || app.recruiter_name || "",
        identifiers: {
          threadIds: Array.from(new Set((app.timeline || []).map((e: any) => e.threadId).filter(Boolean))),
          gmailMessageIds: Array.from(new Set((app.timeline || []).map((e: any) => e.gmailMessageId).filter(Boolean))),
          emailFingerprints: Array.from(new Set((app.timeline || []).map((e: any) => e.emailFingerprint).filter(Boolean))),
        },
        date: {
          type: app.currentStatus === "OFFER" ? "Joining Date"
            : app.currentStatus === "INTERVIEW" ? "Interview Date"
            : app.currentStatus === "ASSESSMENT" ? "Assessment Deadline"
            : "Not available",
          value: app.currentStatus === "OFFER" ? (app.joiningDate || "Not available")
            : app.currentStatus === "INTERVIEW" ? (app.interviewDate || "Not available")
            : app.currentStatus === "ASSESSMENT" ? (app.assessmentDeadline || "Not available")
            : "Not available",
        }
      }));

      return {
        fetched: data.fetched,
        processed: data.processed,
        newEmailsProcessed: data.newEmailsProcessed,
        existingRecordsUpdated: data.existingRecordsUpdated,
        duplicatesSkipped: data.duplicatesSkipped,
        opportunities: sortApplications(mappedOpportunities),
        executionTimeMs: data.executionTimeMs,
        stats: data.stats
      };
    } finally {
      setIsProcessing(false);
    }
  };

  const enableDemoMode = async () => {
    setDemoMode(true);
    localStorage.setItem("careerpilot_demomode", "true");

    const getRelativeDateStr = (daysOffset: number): string => {
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    };

    const getRelativeISODateStr = (daysOffset: number): string => {
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      return d.toISOString();
    };

    const getRelativeShortDateStr = (daysOffset: number): string => {
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      return d.toISOString().split("T")[0];
    };

    const demoApps: JobApplication[] = [
      // 1. Google: ASSESSMENT, Tomorrow
      {
        id: "demo_app_google",
        company: "Google",
        role: "Software Engineer Intern",
        currentStatus: "ASSESSMENT",
        status: "ASSESSMENT",
        summary: "Coding assessment invitation on HackerRank. Covers advanced data structures, algorithms, and logical problem-solving.",
        joiningDate: "Not available",
        interviewDate: "Not available",
        assessmentDeadline: getRelativeDateStr(1),
        deadline: getRelativeDateStr(1),
        date: {
          type: "Assessment Deadline",
          value: getRelativeDateStr(1)
        },
        nextAction: "Complete the coding assessment on HackerRank; practice arrays, strings, and graph algorithms.",
        dateAdded: getRelativeShortDateStr(-5),
        confidence: 0.98,
        mode: "Online",
        location: "Mountain View, CA",
        source: "Demo Inbox",
        latestUpdate: "Google Online Assessment Invitation",
        lastActivityDate: getRelativeDateStr(0),
        isStarred: true,
        identifiers: {
          threadIds: ["thread_google"],
          gmailMessageIds: ["msg_google_1", "msg_google_2"],
          emailFingerprints: ["fingerprint_google_1", "fingerprint_google_2"]
        },
        timeline: [
          {
            id: "evt_google_1",
            gmailMessageId: "msg_google_1",
            threadId: "thread_google",
            emailFingerprint: "fingerprint_google_1",
            eventType: "PENDING",
            subject: "Your application to Google: Software Engineer Intern",
            sender: "Google Recruiting Team <careers-noreply@google.com>",
            receivedDate: getRelativeDateStr(-5),
            extractedDate: "Not available",
            summary: "Thank you for applying for the Software Engineer Intern position at Google. Your resume is under review by our talent acquisition team.",
            originalEmail: "Hi Candidate,\n\nThank you for your application for the Software Engineer Intern role at Google. We have received your application and our team is currently reviewing it. We will be in touch if your background matches our needs.\n\nBest,\nGoogle Recruiting Team.",
            source: "Demo Inbox"
          },
          {
            id: "evt_google_2",
            gmailMessageId: "msg_google_2",
            threadId: "thread_google",
            emailFingerprint: "fingerprint_google_2",
            eventType: "ASSESSMENT",
            subject: "Google Online Assessment Invitation",
            sender: "Google Assessment Team <oa-noreply@google.com>",
            receivedDate: getRelativeDateStr(0),
            extractedDate: getRelativeDateStr(1),
            summary: "You are invited to complete the Google Online Assessment. The assessment must be completed within 24 hours.",
            originalEmail: "Dear Candidate,\n\nThank you for your interest in Google. We would like to invite you to complete our online coding assessment on HackerRank. Please complete it by tomorrow to keep your application moving forward.\n\nGood luck!\nGoogle Technical Assessment Support.",
            source: "Demo Inbox"
          }
        ],
        createdAt: getRelativeISODateStr(-5),
        updatedAt: getRelativeISODateStr(0),
        emailReceivedDate: getRelativeDateStr(0)
      },
      // 2. Microsoft: INTERVIEW, 2 days later
      {
        id: "demo_app_microsoft",
        company: "Microsoft",
        role: "Software Engineer Intern",
        currentStatus: "INTERVIEW",
        status: "INTERVIEW",
        summary: "Technical video interview invitation over Teams. The discussion will cover coding, system design, and behavioral questions.",
        joiningDate: "Not available",
        interviewDate: getRelativeDateStr(2),
        assessmentDeadline: "Not available",
        deadline: getRelativeDateStr(2),
        date: {
          type: "Interview Date",
          value: getRelativeDateStr(2)
        },
        nextAction: "Prepare for technical interview focusing on system design, data structures, and behavioral questions.",
        dateAdded: getRelativeShortDateStr(-10),
        confidence: 0.95,
        mode: "Online",
        location: "Redmond, WA",
        source: "Demo Inbox",
        latestUpdate: "Microsoft Technical Interview Schedule Confirmation",
        lastActivityDate: getRelativeDateStr(-1),
        isStarred: true,
        identifiers: {
          threadIds: ["thread_microsoft"],
          gmailMessageIds: ["msg_ms_1", "msg_ms_2"],
          emailFingerprints: ["fingerprint_ms_1", "fingerprint_ms_2"]
        },
        timeline: [
          {
            id: "evt_ms_1",
            gmailMessageId: "msg_ms_1",
            threadId: "thread_microsoft",
            emailFingerprint: "fingerprint_ms_1",
            eventType: "PENDING",
            subject: "Application Confirmation - Microsoft Software Engineer Intern",
            sender: "Microsoft Careers <careers@microsoft.com>",
            receivedDate: getRelativeDateStr(-10),
            extractedDate: "Not available",
            summary: "Your application for the Software Engineer Intern role at Microsoft Redmond has been received.",
            originalEmail: "Hi Candidate,\n\nWe have received your application for the Software Engineer Intern position. Our recruiting team is screening candidates and will reach out with next steps.\n\nWarm regards,\nMicrosoft Careers Team.",
            source: "Demo Inbox"
          },
          {
            id: "evt_ms_2",
            gmailMessageId: "msg_ms_2",
            threadId: "thread_microsoft",
            emailFingerprint: "fingerprint_ms_2",
            eventType: "INTERVIEW",
            subject: "Microsoft Technical Interview Schedule Confirmation",
            sender: "Microsoft Recruiting <interviews@microsoft.com>",
            receivedDate: getRelativeDateStr(-1),
            extractedDate: getRelativeDateStr(2),
            summary: "Technical video interview confirmed for 2 days from now via Microsoft Teams link.",
            originalEmail: "Hi Candidate,\n\nWe are pleased to invite you for a 45-minute technical interview. This discussion will be conducted on Microsoft Teams. Please confirm the interview date scheduled for June 28, 2026.\n\nBest,\nMicrosoft Recruiting.",
            source: "Demo Inbox"
          }
        ],
        createdAt: getRelativeISODateStr(-10),
        updatedAt: getRelativeISODateStr(-1),
        emailReceivedDate: getRelativeDateStr(-1)
      },
      // 3. Amazon: PENDING, Applied
      {
        id: "demo_app_amazon",
        company: "Amazon",
        role: "SDE Intern",
        currentStatus: "PENDING",
        status: "PENDING",
        summary: "Application confirmation received. Currently under review for the SDE Intern opportunity.",
        joiningDate: "Not available",
        interviewDate: "Not available",
        assessmentDeadline: "Not available",
        deadline: "Not available",
        date: {
          type: "Not available",
          value: "Not available"
        },
        nextAction: "Monitor inbox for assessment invitation or recruitment updates.",
        dateAdded: getRelativeShortDateStr(-4),
        confidence: 0.90,
        mode: "Online",
        location: "Seattle, WA",
        source: "Demo Inbox",
        latestUpdate: "Amazon Application Confirmation",
        lastActivityDate: getRelativeDateStr(-4),
        isStarred: false,
        identifiers: {
          threadIds: ["thread_amazon"],
          gmailMessageIds: ["msg_amazon_1"],
          emailFingerprints: ["fingerprint_amazon_1"]
        },
        timeline: [
          {
            id: "evt_amazon_1",
            gmailMessageId: "msg_amazon_1",
            threadId: "thread_amazon",
            emailFingerprint: "fingerprint_amazon_1",
            eventType: "PENDING",
            subject: "Amazon Application Confirmation",
            sender: "Amazon Student Programs <no-reply@amazon.com>",
            receivedDate: getRelativeDateStr(-4),
            extractedDate: "Not available",
            summary: "Application received for SDE Intern role and is being processed in our portal.",
            originalEmail: "Dear applicant,\n\nThank you for applying to the SDE Intern position. This email confirms we received your application. We will contact you soon regarding online assessments.\n\nSincerely,\nAmazon Student Programs.",
            source: "Demo Inbox"
          }
        ],
        createdAt: getRelativeISODateStr(-4),
        updatedAt: getRelativeISODateStr(-4),
        emailReceivedDate: getRelativeDateStr(-4)
      },
      // 4. Infosys: REJECTED
      {
        id: "demo_app_infosys",
        company: "Infosys",
        role: "System Engineer",
        currentStatus: "REJECTED",
        status: "REJECTED",
        summary: "Not selected for System Engineer role after preliminary screening.",
        joiningDate: "Not available",
        interviewDate: "Not available",
        assessmentDeadline: "Not available",
        deadline: "Not available",
        date: {
          type: "Not available",
          value: "Not available"
        },
        nextAction: "Archive opportunity and focus on other active applications.",
        dateAdded: getRelativeShortDateStr(-20),
        confidence: 0.99,
        mode: "Online",
        location: "Bangalore, India",
        source: "Demo Inbox",
        latestUpdate: "Infosys Application Status Update",
        lastActivityDate: getRelativeDateStr(-15),
        isStarred: false,
        identifiers: {
          threadIds: ["thread_infosys"],
          gmailMessageIds: ["msg_infosys_1", "msg_infosys_2"],
          emailFingerprints: ["fingerprint_infosys_1", "fingerprint_infosys_2"]
        },
        timeline: [
          {
            id: "evt_infosys_1",
            gmailMessageId: "msg_infosys_1",
            threadId: "thread_infosys",
            emailFingerprint: "fingerprint_infosys_1",
            eventType: "PENDING",
            subject: "Thank you for applying to Infosys",
            sender: "Infosys Talent Acquisition <talent@infosys.com>",
            receivedDate: getRelativeDateStr(-20),
            extractedDate: "Not available",
            summary: "Thank you for applying for the System Engineer position. Your credentials have been stored.",
            originalEmail: "Dear applicant,\n\nThank you for your interest in the System Engineer position at Infosys. Your application has been logged.\n\nRegards,\nInfosys Recruitment.",
            source: "Demo Inbox"
          },
          {
            id: "evt_infosys_2",
            gmailMessageId: "msg_infosys_2",
            threadId: "thread_infosys",
            emailFingerprint: "fingerprint_infosys_2",
            eventType: "REJECTED",
            subject: "Infosys Application Status Update",
            sender: "Infosys Careers Support <noreply-careers@infosys.com>",
            receivedDate: getRelativeDateStr(-15),
            extractedDate: "Not available",
            summary: "Infosys decided not to move forward with the candidate for the System Engineer position.",
            originalEmail: "Hi Candidate,\n\nWe appreciated the opportunity to review your profile. Unfortunately, we are not moving forward with your application for the System Engineer position at this time. We wish you the best in your search.\n\nSincerely,\nInfosys Talent Acquisition.",
            source: "Demo Inbox"
          }
        ],
        createdAt: getRelativeISODateStr(-20),
        updatedAt: getRelativeISODateStr(-15),
        emailReceivedDate: getRelativeDateStr(-15)
      },
      // 5. TCS: OFFER, joining 10 days later
      {
        id: "demo_app_tcs",
        company: "TCS",
        role: "Digital Role",
        currentStatus: "OFFER",
        status: "OFFER",
        summary: "Formal job offer received for the TCS Digital Role. Document verification and joining checklist sent.",
        joiningDate: getRelativeDateStr(10),
        interviewDate: "Not available",
        assessmentDeadline: "Not available",
        deadline: getRelativeDateStr(10),
        date: {
          type: "Joining Date",
          value: getRelativeDateStr(10)
        },
        nextAction: "Review offer package details, discuss salary compensation, and sign the offer letter.",
        dateAdded: getRelativeShortDateStr(-30),
        confidence: 0.97,
        mode: "On-site",
        location: "Mumbai, India",
        source: "Demo Inbox",
        latestUpdate: "TCS Job Offer: Digital Role",
        lastActivityDate: getRelativeDateStr(-5),
        isStarred: true,
        identifiers: {
          threadIds: ["thread_tcs"],
          gmailMessageIds: ["msg_tcs_1", "msg_tcs_2", "msg_tcs_3"],
          emailFingerprints: ["fingerprint_tcs_1", "fingerprint_tcs_2", "fingerprint_tcs_3"]
        },
        timeline: [
          {
            id: "evt_tcs_1",
            gmailMessageId: "msg_tcs_1",
            threadId: "thread_tcs",
            emailFingerprint: "fingerprint_tcs_1",
            eventType: "PENDING",
            subject: "Application Confirmation - TCS Digital Role",
            sender: "TCS Talent Acquisition <recruit@tcs.com>",
            receivedDate: getRelativeDateStr(-30),
            extractedDate: "Not available",
            summary: "Application confirmation received for the high-end Digital Role track at TCS.",
            originalEmail: "Hi Candidate,\n\nThis is to confirm your application for the TCS Digital Role. Our assessment board will contact you shortly.\n\nRegards,\nTata Consultancy Services.",
            source: "Demo Inbox"
          },
          {
            id: "evt_tcs_2",
            gmailMessageId: "msg_tcs_2",
            threadId: "thread_tcs",
            emailFingerprint: "fingerprint_tcs_2",
            eventType: "INTERVIEW",
            subject: "TCS Technical Interview Invitation",
            sender: "TCS Recruitment Panel <interviews@tcs.com>",
            receivedDate: getRelativeDateStr(-25),
            extractedDate: getRelativeDateStr(-22),
            summary: "Invitation to technical panel interview covering advanced algorithms, cloud, and project discussion.",
            originalEmail: "Hi Candidate,\n\nWe would like to invite you for a technical panel interview on MS Teams. Please schedule your slot accordingly.\n\nBest,\nTCS HR Panel.",
            source: "Demo Inbox"
          },
          {
            id: "evt_tcs_3",
            gmailMessageId: "msg_tcs_3",
            threadId: "thread_tcs",
            emailFingerprint: "fingerprint_tcs_3",
            eventType: "OFFER",
            subject: "TCS Job Offer: Digital Role",
            sender: "TCS Offers Team <offers@tcs.com>",
            receivedDate: getRelativeDateStr(-5),
            extractedDate: getRelativeDateStr(10),
            summary: "Congratulations! Formal job offer letter for the TCS Digital Role with a joining date of June 6, 2026.",
            originalEmail: "Dear Candidate,\n\nWe are absolutely thrilled to offer you the position of Digital Software Engineer at TCS. Your start date will be June 6, 2026. Please find details of your offer letter in the portal.\n\nCongratulations!\nTCS Offer Board.",
            source: "Demo Inbox"
          }
        ],
        createdAt: getRelativeISODateStr(-30),
        updatedAt: getRelativeISODateStr(-5),
        emailReceivedDate: getRelativeDateStr(-5)
      },
      // 6. Zoho: PENDING
      {
        id: "demo_app_zoho",
        company: "Zoho",
        role: "Software Developer",
        currentStatus: "PENDING",
        status: "PENDING",
        summary: "Application submitted and received. Recruiter screen schedule in progress.",
        joiningDate: "Not available",
        interviewDate: "Not available",
        assessmentDeadline: "Not available",
        deadline: "Not available",
        date: {
          type: "Not available",
          value: "Not available"
        },
        nextAction: "Follow up with recruitment team if no response within a week.",
        dateAdded: getRelativeShortDateStr(-6),
        confidence: 0.88,
        mode: "Online",
        location: "Chennai, India",
        source: "Demo Inbox",
        latestUpdate: "Application received for Software Developer at Zoho",
        lastActivityDate: getRelativeDateStr(-6),
        isStarred: false,
        identifiers: {
          threadIds: ["thread_zoho"],
          gmailMessageIds: ["msg_zoho_1"],
          emailFingerprints: ["fingerprint_zoho_1"]
        },
        timeline: [
          {
            id: "evt_zoho_1",
            gmailMessageId: "msg_zoho_1",
            threadId: "thread_zoho",
            emailFingerprint: "fingerprint_zoho_1",
            eventType: "PENDING",
            subject: "Application received for Software Developer at Zoho",
            sender: "Zoho Careers Panel <hr-noreply@zoho.com>",
            receivedDate: getRelativeDateStr(-6),
            extractedDate: "Not available",
            summary: "Zoho confirmed the receipt of your software developer application.",
            originalEmail: "Hi Candidate,\n\nThank you for applying to Zoho. Your application is under review. We will contact you if your skills match our requirements.\n\nWarmly,\nZoho Recruitment.",
            source: "Demo Inbox"
          }
        ],
        createdAt: getRelativeISODateStr(-6),
        updatedAt: getRelativeISODateStr(-6),
        emailReceivedDate: getRelativeDateStr(-6)
      },
      // 7. Netflix: ASSESSMENT, 3 days later
      {
        id: "demo_app_netflix",
        company: "Netflix",
        role: "SDE Intern",
        currentStatus: "ASSESSMENT",
        status: "ASSESSMENT",
        summary: "Online Coding Assessment invitation on CodeSignal.",
        joiningDate: "Not available",
        interviewDate: "Not available",
        assessmentDeadline: getRelativeDateStr(3),
        deadline: getRelativeDateStr(3),
        date: {
          type: "Assessment Deadline",
          value: getRelativeDateStr(3)
        },
        nextAction: "Complete Netflix OA on CodeSignal.",
        dateAdded: getRelativeShortDateStr(-2),
        confidence: 0.96,
        mode: "Online",
        location: "Los Gatos, CA",
        source: "Demo Inbox",
        latestUpdate: "Netflix Coding Challenge Invitation",
        lastActivityDate: getRelativeDateStr(-1),
        isStarred: false,
        identifiers: {
          threadIds: ["thread_netflix"],
          gmailMessageIds: ["msg_netflix_1"],
          emailFingerprints: ["fingerprint_netflix_1"]
        },
        timeline: [
          {
            id: "evt_netflix_1",
            gmailMessageId: "msg_netflix_1",
            threadId: "thread_netflix",
            emailFingerprint: "fingerprint_netflix_1",
            eventType: "ASSESSMENT",
            subject: "Netflix Coding Challenge Invitation",
            sender: "Netflix Student Programs <codesignal@netflix.com>",
            receivedDate: getRelativeDateStr(-1),
            extractedDate: getRelativeDateStr(3),
            summary: "Invitation to complete the Netflix technical screen on CodeSignal. Focus on system design heuristics.",
            originalEmail: "Dear applicant,\n\nWe invite you to take the Netflix online coding challenge. Please complete the assessment within 4 days to remain in consideration.\n\nNetflix Recruiting.",
            source: "Demo Inbox"
          }
        ],
        createdAt: getRelativeISODateStr(-2),
        updatedAt: getRelativeISODateStr(-1),
        emailReceivedDate: getRelativeDateStr(-1)
      },
      // 8. Stripe: ASSESSMENT, 4 days later
      {
        id: "demo_app_stripe",
        company: "Stripe",
        role: "Frontend Developer",
        currentStatus: "ASSESSMENT",
        status: "ASSESSMENT",
        summary: "Take-home frontend coding assessment invitation.",
        joiningDate: "Not available",
        interviewDate: "Not available",
        assessmentDeadline: getRelativeDateStr(4),
        deadline: getRelativeDateStr(4),
        date: {
          type: "Assessment Deadline",
          value: getRelativeDateStr(4)
        },
        nextAction: "Complete Stripe frontend assessment.",
        dateAdded: getRelativeShortDateStr(-3),
        confidence: 0.94,
        mode: "Online",
        location: "San Francisco, CA",
        source: "Demo Inbox",
        latestUpdate: "Stripe Frontend Engineering Assessment",
        lastActivityDate: getRelativeDateStr(-1),
        isStarred: false,
        identifiers: {
          threadIds: ["thread_stripe"],
          gmailMessageIds: ["msg_stripe_1"],
          emailFingerprints: ["fingerprint_stripe_1"]
        },
        timeline: [
          {
            id: "evt_stripe_1",
            gmailMessageId: "msg_stripe_1",
            threadId: "thread_stripe",
            emailFingerprint: "fingerprint_stripe_1",
            eventType: "ASSESSMENT",
            subject: "Stripe Frontend Engineering Assessment",
            sender: "Stripe Engineering Recruiting <dev@stripe.com>",
            receivedDate: getRelativeDateStr(-1),
            extractedDate: getRelativeDateStr(4),
            summary: "Take-home coding problem focusing on creating API integrations and responsive UI components.",
            originalEmail: "Hi Candidate,\n\nPlease complete our frontend engineering take-home assignment. The link expires in 5 days.\n\nStripe Engineering Board.",
            source: "Demo Inbox"
          }
        ],
        createdAt: getRelativeISODateStr(-3),
        updatedAt: getRelativeISODateStr(-1),
        emailReceivedDate: getRelativeDateStr(-1)
      },
      // 9. Airbnb: ASSESSMENT, 5 days later
      {
        id: "demo_app_airbnb",
        company: "Airbnb",
        role: "Software Engineer",
        currentStatus: "ASSESSMENT",
        status: "ASSESSMENT",
        summary: "Technical online coding challenge on HackerRank.",
        joiningDate: "Not available",
        interviewDate: "Not available",
        assessmentDeadline: getRelativeDateStr(5),
        deadline: getRelativeDateStr(5),
        date: {
          type: "Assessment Deadline",
          value: getRelativeDateStr(5)
        },
        nextAction: "Complete Airbnb online coding test.",
        dateAdded: getRelativeShortDateStr(-1),
        confidence: 0.92,
        mode: "Online",
        location: "San Francisco, CA",
        source: "Demo Inbox",
        latestUpdate: "Airbnb Coding Assessment",
        lastActivityDate: getRelativeDateStr(0),
        isStarred: false,
        identifiers: {
          threadIds: ["thread_airbnb"],
          gmailMessageIds: ["msg_airbnb_1"],
          emailFingerprints: ["fingerprint_airbnb_1"]
        },
        timeline: [
          {
            id: "evt_airbnb_1",
            gmailMessageId: "msg_airbnb_1",
            threadId: "thread_airbnb",
            emailFingerprint: "fingerprint_airbnb_1",
            eventType: "ASSESSMENT",
            subject: "Airbnb Coding Assessment",
            sender: "Airbnb Talent Team <noreply@airbnb.com>",
            receivedDate: getRelativeDateStr(0),
            extractedDate: getRelativeDateStr(5),
            summary: "Please complete the technical online evaluation consisting of core algorithmic problems.",
            originalEmail: "Dear applicant,\n\nWe invite you to schedule and complete our algorithm screen within 5 days.\n\nAirbnb Recruiting.",
            source: "Demo Inbox"
          }
        ],
        createdAt: getRelativeISODateStr(-1),
        updatedAt: getRelativeISODateStr(0),
        emailReceivedDate: getRelativeDateStr(0)
      },
      // 10. Apple: INTERVIEW, 5 days later
      {
        id: "demo_app_apple",
        company: "Apple",
        role: "iOS Engineer",
        currentStatus: "INTERVIEW",
        status: "INTERVIEW",
        summary: "Technical interview scheduled over Zoom covering iOS fundamentals.",
        joiningDate: "Not available",
        interviewDate: getRelativeDateStr(5),
        assessmentDeadline: "Not available",
        deadline: getRelativeDateStr(5),
        date: {
          type: "Interview Date",
          value: getRelativeDateStr(5)
        },
        nextAction: "Prepare Swift memory management and UI layout concepts.",
        dateAdded: getRelativeShortDateStr(-7),
        confidence: 0.97,
        mode: "Online",
        location: "Cupertino, CA",
        source: "Demo Inbox",
        latestUpdate: "Apple Technical Screen Scheduled",
        lastActivityDate: getRelativeDateStr(-2),
        isStarred: false,
        identifiers: {
          threadIds: ["thread_apple"],
          gmailMessageIds: ["msg_apple_1", "msg_apple_2"],
          emailFingerprints: ["fingerprint_apple_1", "fingerprint_apple_2"]
        },
        timeline: [
          {
            id: "evt_apple_1",
            gmailMessageId: "msg_apple_1",
            threadId: "thread_apple",
            emailFingerprint: "fingerprint_apple_1",
            eventType: "PENDING",
            subject: "Apple iOS Engineer Application",
            sender: "Apple Recruiting <recruiting@apple.com>",
            receivedDate: getRelativeDateStr(-7),
            extractedDate: "Not available",
            summary: "Thank you for applying to Apple.",
            originalEmail: "Hello,\n\nWe received your application for iOS Developer role. Our team will review and connect shortly.\n\nApple Inc.",
            source: "Demo Inbox"
          },
          {
            id: "evt_apple_2",
            gmailMessageId: "msg_apple_2",
            threadId: "thread_apple",
            emailFingerprint: "fingerprint_apple_2",
            eventType: "INTERVIEW",
            subject: "Apple Technical Screen Scheduled",
            sender: "Apple Team Panel <zoom-interviews@apple.com>",
            receivedDate: getRelativeDateStr(-2),
            extractedDate: getRelativeDateStr(5),
            summary: "Invitation to a Webex meeting for tech screening on Swift APIs.",
            originalEmail: "Hi Candidate,\n\nWe are scheduling your iOS developer screening. Please join the Webex link on July 1, 2026.\n\nRegards,\nApple Recruiting.",
            source: "Demo Inbox"
          }
        ],
        createdAt: getRelativeISODateStr(-7),
        updatedAt: getRelativeISODateStr(-2),
        emailReceivedDate: getRelativeDateStr(-2)
      },
      // 11. Meta: INTERVIEW, 7 days later
      {
        id: "demo_app_meta",
        company: "Meta",
        role: "Product Manager Intern",
        currentStatus: "INTERVIEW",
        status: "INTERVIEW",
        summary: "Product design and execution case interview with a Lead PM.",
        joiningDate: "Not available",
        interviewDate: getRelativeDateStr(7),
        assessmentDeadline: "Not available",
        deadline: getRelativeDateStr(7),
        date: {
          type: "Interview Date",
          value: getRelativeDateStr(7)
        },
        nextAction: "Prepare product sense, product design, and execution cases.",
        dateAdded: getRelativeShortDateStr(-8),
        confidence: 0.96,
        mode: "Online",
        location: "Menlo Park, CA",
        source: "Demo Inbox",
        latestUpdate: "Meta Loop Interview Invite",
        lastActivityDate: getRelativeDateStr(-3),
        isStarred: false,
        identifiers: {
          threadIds: ["thread_meta"],
          gmailMessageIds: ["msg_meta_1", "msg_meta_2"],
          emailFingerprints: ["fingerprint_meta_1", "fingerprint_meta_2"]
        },
        timeline: [
          {
            id: "evt_meta_1",
            gmailMessageId: "msg_meta_1",
            threadId: "thread_meta",
            emailFingerprint: "fingerprint_meta_1",
            eventType: "PENDING",
            subject: "We've received your Meta Application",
            sender: "Meta Student Careers <careers@meta.com>",
            receivedDate: getRelativeDateStr(-8),
            extractedDate: "Not available",
            summary: "Meta application logged.",
            originalEmail: "Hi Candidate,\n\nWe received your application for PM Intern role.\n\nMeta Recruiting.",
            source: "Demo Inbox"
          },
          {
            id: "evt_meta_2",
            gmailMessageId: "msg_meta_2",
            threadId: "thread_meta",
            emailFingerprint: "fingerprint_meta_2",
            eventType: "INTERVIEW",
            subject: "Meta Loop Interview Invite",
            sender: "Meta PM Recruiting <loop@meta.com>",
            receivedDate: getRelativeDateStr(-3),
            extractedDate: getRelativeDateStr(7),
            summary: "Scheduled for interview loop covering design & product sense.",
            originalEmail: "Dear Candidate,\n\nWe would like to invite you for your Product Loop interviews. Your session is scheduled on July 3, 2026.\n\nBest,\nMeta PM Recruiting.",
            source: "Demo Inbox"
          }
        ],
        createdAt: getRelativeISODateStr(-8),
        updatedAt: getRelativeISODateStr(-3),
        emailReceivedDate: getRelativeDateStr(-3)
      },
      // 12. Tesla: REJECTED, 12 days ago
      {
        id: "demo_app_tesla",
        company: "Tesla",
        role: "Robotics Intern",
        currentStatus: "REJECTED",
        status: "REJECTED",
        summary: "Not selected for Robotics Intern position after first technical round.",
        joiningDate: "Not available",
        interviewDate: "Not available",
        assessmentDeadline: "Not available",
        deadline: "Not available",
        date: {
          type: "Not available",
          value: "Not available"
        },
        nextAction: "Focus on other active applications.",
        dateAdded: getRelativeShortDateStr(-18),
        confidence: 0.98,
        mode: "On-site",
        location: "Palo Alto, CA",
        source: "Demo Inbox",
        latestUpdate: "Tesla Application Status",
        lastActivityDate: getRelativeDateStr(-12),
        isStarred: false,
        identifiers: {
          threadIds: ["thread_tesla"],
          gmailMessageIds: ["msg_tesla_1", "msg_tesla_2"],
          emailFingerprints: ["fingerprint_tesla_1", "fingerprint_tesla_2"]
        },
        timeline: [
          {
            id: "evt_tesla_1",
            gmailMessageId: "msg_tesla_1",
            threadId: "thread_tesla",
            emailFingerprint: "fingerprint_tesla_1",
            eventType: "PENDING",
            subject: "Tesla Application Ingested",
            sender: "Tesla Autopilot Recruiting <careers@tesla.com>",
            receivedDate: getRelativeDateStr(-18),
            extractedDate: "Not available",
            summary: "Robotics position application received.",
            originalEmail: "Hello, thank you for applying to Tesla. We will review your qualifications.\n\nTesla HR.",
            source: "Demo Inbox"
          },
          {
            id: "evt_tesla_2",
            gmailMessageId: "msg_tesla_2",
            threadId: "thread_tesla",
            emailFingerprint: "fingerprint_tesla_2",
            eventType: "REJECTED",
            subject: "Tesla Application Status",
            sender: "Tesla Recruiting <noreply@tesla.com>",
            receivedDate: getRelativeDateStr(-12),
            extractedDate: "Not available",
            summary: "Tesla decided to pursue other candidates for the Robotics Intern position.",
            originalEmail: "Hi Candidate, thank you for interviewing. We decided not to move forward at this stage. Good luck in your career search.\n\nTesla Team.",
            source: "Demo Inbox"
          }
        ],
        createdAt: getRelativeISODateStr(-18),
        updatedAt: getRelativeISODateStr(-12),
        emailReceivedDate: getRelativeDateStr(-12)
      },
      // 13. Uber: REJECTED, 14 days ago
      {
        id: "demo_app_uber",
        company: "Uber",
        role: "SDE",
        currentStatus: "REJECTED",
        status: "REJECTED",
        summary: "Not selected for SDE position after code review stage.",
        joiningDate: "Not available",
        interviewDate: "Not available",
        assessmentDeadline: "Not available",
        deadline: "Not available",
        date: {
          type: "Not available",
          value: "Not available"
        },
        nextAction: "Continue applying to other frontend roles.",
        dateAdded: getRelativeShortDateStr(-20),
        confidence: 0.95,
        mode: "Online",
        location: "San Francisco, CA",
        source: "Demo Inbox",
        latestUpdate: "Uber Job Application Decision",
        lastActivityDate: getRelativeDateStr(-14),
        isStarred: false,
        identifiers: {
          threadIds: ["thread_uber"],
          gmailMessageIds: ["msg_uber_1", "msg_uber_2"],
          emailFingerprints: ["fingerprint_uber_1", "fingerprint_uber_2"]
        },
        timeline: [
          {
            id: "evt_uber_1",
            gmailMessageId: "msg_uber_1",
            threadId: "thread_uber",
            emailFingerprint: "fingerprint_uber_1",
            eventType: "PENDING",
            subject: "Uber SDE Application",
            sender: "Uber Recruiting <uber@recruiting.com>",
            receivedDate: getRelativeDateStr(-20),
            extractedDate: "Not available",
            summary: "Uber application received.",
            originalEmail: "Hi Candidate, we received your application. Warmly, Uber.",
            source: "Demo Inbox"
          },
          {
            id: "evt_uber_2",
            gmailMessageId: "msg_uber_2",
            threadId: "thread_uber",
            emailFingerprint: "fingerprint_uber_2",
            eventType: "REJECTED",
            subject: "Uber Job Application Decision",
            sender: "Uber Technical Recruiting <noreply@uber.com>",
            receivedDate: getRelativeDateStr(-14),
            extractedDate: "Not available",
            summary: "Application not chosen for further interview steps.",
            originalEmail: "Hi Candidate,\n\nThank you for taking our assessment. Unfortunately, we are not proceeding with your candidacy. Best,\nUber Engineering.",
            source: "Demo Inbox"
          }
        ],
        createdAt: getRelativeISODateStr(-20),
        updatedAt: getRelativeISODateStr(-14),
        emailReceivedDate: getRelativeDateStr(-14)
      },
      // 14. Salesforce: REJECTED, 20 days ago
      {
        id: "demo_app_salesforce",
        company: "Salesforce",
        role: "Software Engineer",
        currentStatus: "REJECTED",
        status: "REJECTED",
        summary: "Not selected for Software Engineer role after recruiter check.",
        joiningDate: "Not available",
        interviewDate: "Not available",
        assessmentDeadline: "Not available",
        deadline: "Not available",
        date: {
          type: "Not available",
          value: "Not available"
        },
        nextAction: "Prepare for upcoming interviews.",
        dateAdded: getRelativeShortDateStr(-25),
        confidence: 0.94,
        mode: "Online",
        location: "San Francisco, CA",
        source: "Demo Inbox",
        latestUpdate: "Salesforce Application Status Update",
        lastActivityDate: getRelativeDateStr(-20),
        isStarred: false,
        identifiers: {
          threadIds: ["thread_salesforce"],
          gmailMessageIds: ["msg_salesforce_1", "msg_salesforce_2"],
          emailFingerprints: ["fingerprint_salesforce_1", "fingerprint_salesforce_2"]
        },
        timeline: [
          {
            id: "evt_salesforce_1",
            gmailMessageId: "msg_salesforce_1",
            threadId: "thread_salesforce",
            emailFingerprint: "fingerprint_salesforce_1",
            eventType: "PENDING",
            subject: "Salesforce Application Received",
            sender: "Salesforce Recruiting <recruiting@salesforce.com>",
            receivedDate: getRelativeDateStr(-25),
            extractedDate: "Not available",
            summary: "Salesforce software developer application received.",
            originalEmail: "Dear applicant, thanks for applying. Regards, Salesforce.",
            source: "Demo Inbox"
          },
          {
            id: "evt_salesforce_2",
            gmailMessageId: "msg_salesforce_2",
            threadId: "thread_salesforce",
            emailFingerprint: "fingerprint_salesforce_2",
            eventType: "REJECTED",
            subject: "Salesforce Application Status Update",
            sender: "Salesforce Careers Panel <no-reply@salesforce.com>",
            receivedDate: getRelativeDateStr(-20),
            extractedDate: "Not available",
            summary: "Salesforce decided not to proceed to technical panel interviews.",
            originalEmail: "Hello candidate, we appreciate your interest. Unfortunately, we are not moving forward. Best,\nSalesforce Recruiting.",
            source: "Demo Inbox"
          }
        ],
        createdAt: getRelativeISODateStr(-25),
        updatedAt: getRelativeISODateStr(-20),
        emailReceivedDate: getRelativeDateStr(-20)
      },
      // 15. Oracle: REJECTED, 25 days ago
      {
        id: "demo_app_oracle",
        company: "Oracle",
        role: "Database Engineer",
        currentStatus: "REJECTED",
        status: "REJECTED",
        summary: "Not selected for Database Engineer role after resume screen.",
        joiningDate: "Not available",
        interviewDate: "Not available",
        assessmentDeadline: "Not available",
        deadline: "Not available",
        date: {
          type: "Not available",
          value: "Not available"
        },
        nextAction: "Continue seeking database or backend developer roles.",
        dateAdded: getRelativeShortDateStr(-27),
        confidence: 0.99,
        mode: "Online",
        location: "Austin, TX",
        source: "Demo Inbox",
        latestUpdate: "Oracle Database Engineer Position Status",
        lastActivityDate: getRelativeDateStr(-25),
        isStarred: false,
        identifiers: {
          threadIds: ["thread_oracle"],
          gmailMessageIds: ["msg_oracle_1", "msg_oracle_2"],
          emailFingerprints: ["fingerprint_oracle_1", "fingerprint_oracle_2"]
        },
        timeline: [
          {
            id: "evt_oracle_1",
            gmailMessageId: "msg_oracle_1",
            threadId: "thread_oracle",
            emailFingerprint: "fingerprint_oracle_1",
            eventType: "PENDING",
            subject: "Oracle Database Engineer Application",
            sender: "Oracle Careers Portal <careers@oracle.com>",
            receivedDate: getRelativeDateStr(-27),
            extractedDate: "Not available",
            summary: "Oracle database application confirmed.",
            originalEmail: "Dear applicant, application logged in. Oracle.",
            source: "Demo Inbox"
          },
          {
            id: "evt_oracle_2",
            gmailMessageId: "msg_oracle_2",
            threadId: "thread_oracle",
            emailFingerprint: "fingerprint_oracle_2",
            eventType: "REJECTED",
            subject: "Oracle Database Engineer Position Status",
            sender: "Oracle Candidate Center <noreply@oracle.com>",
            receivedDate: getRelativeDateStr(-25),
            extractedDate: "Not available",
            summary: "Oracle decided not to proceed to panel interviews.",
            originalEmail: "Hi Candidate,\n\nWe reviewed your application and decided not to move forward. We wish you success in your future search.\n\nOracle Talent.",
            source: "Demo Inbox"
          }
        ],
        createdAt: getRelativeISODateStr(-27),
        updatedAt: getRelativeISODateStr(-25),
        emailReceivedDate: getRelativeDateStr(-25)
      },
      // 16. ByteDance: PENDING, 8 days ago
      {
        id: "demo_app_bytedance",
        company: "ByteDance",
        role: "Frontend Intern",
        currentStatus: "PENDING",
        status: "PENDING",
        summary: "Application confirmation received for Frontend Intern position.",
        joiningDate: "Not available",
        interviewDate: "Not available",
        assessmentDeadline: "Not available",
        deadline: "Not available",
        date: {
          type: "Not available",
          value: "Not available"
        },
        nextAction: "Monitor inbox for recruitment updates.",
        dateAdded: getRelativeShortDateStr(-8),
        confidence: 0.91,
        mode: "Online",
        location: "Singapore",
        source: "Demo Inbox",
        latestUpdate: "ByteDance Job Application Acknowledgement",
        lastActivityDate: getRelativeDateStr(-8),
        isStarred: false,
        identifiers: {
          threadIds: ["thread_bytedance"],
          gmailMessageIds: ["msg_bytedance_1"],
          emailFingerprints: ["fingerprint_bytedance_1"]
        },
        timeline: [
          {
            id: "evt_bytedance_1",
            gmailMessageId: "msg_bytedance_1",
            threadId: "thread_bytedance",
            emailFingerprint: "fingerprint_bytedance_1",
            eventType: "PENDING",
            subject: "ByteDance Job Application Acknowledgement",
            sender: "ByteDance Recruitment Panel <hr@bytedance.com>",
            receivedDate: getRelativeDateStr(-8),
            extractedDate: "Not available",
            summary: "ByteDance confirmed frontend application receipt.",
            originalEmail: "Dear applicant,\n\nYour application has been received for the Frontend Intern position. Thank you for your interest in ByteDance.\n\nSincerely,\nByteDance Talent Acquisition.",
            source: "Demo Inbox"
          }
        ],
        createdAt: getRelativeISODateStr(-8),
        updatedAt: getRelativeISODateStr(-8),
        emailReceivedDate: getRelativeDateStr(-8)
      },
      // 17. Intel: PENDING, 12 days ago
      {
        id: "demo_app_intel",
        company: "Intel",
        role: "Hardware Engineer",
        currentStatus: "PENDING",
        status: "PENDING",
        summary: "Application under review for Hardware Engineer position.",
        joiningDate: "Not available",
        interviewDate: "Not available",
        assessmentDeadline: "Not available",
        deadline: "Not available",
        date: {
          type: "Not available",
          value: "Not available"
        },
        nextAction: "Check status on Intel careers portal.",
        dateAdded: getRelativeShortDateStr(-12),
        confidence: 0.89,
        mode: "Online",
        location: "Santa Clara, CA",
        source: "Demo Inbox",
        latestUpdate: "Intel Application Confirmation",
        lastActivityDate: getRelativeDateStr(-12),
        isStarred: false,
        identifiers: {
          threadIds: ["thread_intel"],
          gmailMessageIds: ["msg_intel_1"],
          emailFingerprints: ["fingerprint_intel_1"]
        },
        timeline: [
          {
            id: "evt_intel_1",
            gmailMessageId: "msg_intel_1",
            threadId: "thread_intel",
            emailFingerprint: "fingerprint_intel_1",
            eventType: "PENDING",
            subject: "Intel Application Confirmation",
            sender: "Intel Jobs Center <intel@jobs.com>",
            receivedDate: getRelativeDateStr(-12),
            extractedDate: "Not available",
            summary: "Intel confirmed hardware engineer application.",
            originalEmail: "Hello candidate,\n\nWe received your application. It is under screening review.\n\nIntel Careers.",
            source: "Demo Inbox"
          }
        ],
        createdAt: getRelativeISODateStr(-12),
        updatedAt: getRelativeISODateStr(-12),
        emailReceivedDate: getRelativeDateStr(-12)
      },
      // 18. Adobe: PENDING, 14 days ago
      {
        id: "demo_app_adobe",
        company: "Adobe",
        role: "Software Developer",
        currentStatus: "PENDING",
        status: "PENDING",
        summary: "Application confirmed and under preliminary screening.",
        joiningDate: "Not available",
        interviewDate: "Not available",
        assessmentDeadline: "Not available",
        deadline: "Not available",
        date: {
          type: "Not available",
          value: "Not available"
        },
        nextAction: "Follow up on application status.",
        dateAdded: getRelativeShortDateStr(-14),
        confidence: 0.90,
        mode: "Online",
        location: "San Jose, CA",
        source: "Demo Inbox",
        latestUpdate: "Adobe Application Acknowledgement",
        lastActivityDate: getRelativeDateStr(-14),
        isStarred: false,
        identifiers: {
          threadIds: ["thread_adobe"],
          gmailMessageIds: ["msg_adobe_1"],
          emailFingerprints: ["fingerprint_adobe_1"]
        },
        timeline: [
          {
            id: "evt_adobe_1",
            gmailMessageId: "msg_adobe_1",
            threadId: "thread_adobe",
            emailFingerprint: "fingerprint_adobe_1",
            eventType: "PENDING",
            subject: "Adobe Application Acknowledgement",
            sender: "Adobe Talent Team <recruitment@adobe.com>",
            receivedDate: getRelativeDateStr(-14),
            extractedDate: "Not available",
            summary: "Adobe developer application logged.",
            originalEmail: "Hi Candidate, thank you for applying for Software Developer role at Adobe. Your profile is with our recruiters.\n\nAdobe Recruiting.",
            source: "Demo Inbox"
          }
        ],
        createdAt: getRelativeISODateStr(-14),
        updatedAt: getRelativeISODateStr(-14),
        emailReceivedDate: getRelativeDateStr(-14)
      }
    ];

    const mockScanPayload = {
      type: "scan_run",
      status: "SUCCESS",
      steps: [
        "Scan Started",
        "Connected to Gmail",
        "Fetched 25 Emails",
        "Filtered 8 Career Emails",
        "Gemini Analysis Completed",
        "Created 6 Applications",
        "Generated 4 Tasks",
        "Scheduled 2 Calendar Events",
        "Updated Dashboard",
        "Scan Completed (7.3 s)"
      ],
      stats: {
        emailsScanned: 25,
        careerEmailsDetected: 8,
        newApplicationsAdded: 6,
        existingApplicationsUpdated: 2,
        tasksCreated: 4,
        calendarEventsCreated: 2,
        executionTimeMs: 7300
      }
    };

    const mockManualPayload = {
      type: "manual_run",
      status: "SUCCESS",
      company: "Google",
      role: "Software Engineer Intern",
      category: "ASSESSMENT",
      confidence: 0.98,
      summary: "Coding assessment invitation on HackerRank. Covers advanced data structures, algorithms, and logical problem-solving.",
      steps: [
        "Orchestrator Started",
        "Gemini email analysis completed",
        "Created new application card",
        "Generated 3 preparation tasks",
        "Scheduled ASSESSMENT calendar event",
        "Updated Dashboard metrics"
      ],
      stats: {
        company: "Google",
        role: "Software Engineer Intern",
        status: "ASSESSMENT",
        confidence: 0.98,
        newApplicationsAdded: 1,
        existingApplicationsUpdated: 0,
        tasksCreated: 3,
        calendarEventsCreated: 1
      }
    };

    const demoLogs: AgentSystemTelemetry[] = [
      {
        isJobRelated: true,
        result: null,
        logs: mockScanPayload.steps,
        skillsUsed: ["email_monitor", "email_classifier", "email_summarizer"],
        toolsCalled: [],
        guardrailStatus: "PASSED" as const,
        guardrailLogs: [],
        timestamp: getRelativeISODateStr(0),
        isDemoLog: true as any,
        structuredPayload: mockScanPayload
      },
      {
        isJobRelated: true,
        result: {
          company: "Google",
          role: "Software Engineer Intern",
          status: "ASSESSMENT",
          date: { type: "Target Date", value: getRelativeShortDateStr(1) },
          summary: "Coding assessment invitation on HackerRank.",
          nextAction: "Complete practice tests",
          confidence: 0.98
        },
        logs: mockManualPayload.steps,
        skillsUsed: ["manual_orchestrator"],
        toolsCalled: [],
        guardrailStatus: "PASSED" as const,
        guardrailLogs: [],
        timestamp: getRelativeISODateStr(-1),
        isDemoLog: true as any,
        structuredPayload: mockManualPayload
      },
      {
        isJobRelated: false,
        result: null,
        logs: ["System diagnostics verified, 0 pipeline warnings found."],
        skillsUsed: [],
        toolsCalled: [],
        guardrailStatus: "PASSED" as const,
        guardrailLogs: [],
        timestamp: getRelativeISODateStr(-2),
        isDemoLog: true as any
      }
    ];

    setApplications((prev) => {
      const nonDemo = prev.filter(app => app.source !== "Demo Inbox");
      return [...demoApps, ...nonDemo];
    });

    setActivityLogs((prev) => {
      const nonDemo = prev.filter(log => !(log as any).isDemoLog);
      return [...demoLogs, ...nonDemo];
    });
  };

  const disableDemoMode = () => {
    setDemoMode(false);
    localStorage.setItem("careerpilot_demomode", "false");
    
    setApplications((prev) => {
      return prev.filter(app => app.source !== "Demo Inbox");
    });

    setActivityLogs((prev) => {
      return prev.filter(log => !(log as any).isDemoLog);
    });
  };

  const generateDraftReply = async (body: string, type: string, candidateName: string, companyName: string): Promise<string> => {
    setIsProcessing(true);
    try {
      if (demoMode) {
        const prompt = `You are CareerPilot AI, an expert career coordinator agent. Your job is to draft a professional, polite, and contextual email reply from the job candidate to the recruiter.
Generate ONLY the email body itself (including Subject line if applicable, Salutation, Body, and Closing Sign-off) with no other conversational introduction, explanation, markdown formatting, or comments.
Candidate Name: ${candidateName}
Company Name: ${companyName}
Reply Type: ${type}
Original Recruiter Email:
${body}`;
        
        if (apiKey) {
          try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            return result.response.text().trim();
          } catch (e) {
            console.error("Local Gemini draft generation failed:", e);
          }
        }
        return generateLocalDraftFallback(body, type, candidateName, companyName);
      }

      const response = await authFetch(`${API_BASE_URL}/api/agent/draft-reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailBody: body,
          replyType: type,
          candidateName,
          companyName
        })
      });

      if (!response.ok) {
        throw new Error("Backend draft generation failed");
      }

      const data = await response.json();
      return data.draft;
    } catch (err) {
      console.error("Error generating draft:", err);
      return generateLocalDraftFallback(body, type, candidateName, companyName);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateLocalDraftFallback = (_body: string, type: string, candidateName: string, companyName: string): string => {
    const name = candidateName || userName || "Candidate";
    const company = companyName || "Company";
    
    if (type === "Decline") {
      return `Subject: Re: Opportunity Update - ${company}

Dear Recruiting Team,

Thank you for reaching out with updates regarding the opportunity. However, I would like to withdraw my application at this stage as I have recently accepted another offer.

I appreciate your time and consideration, and I hope we can stay in touch for other roles in the future.

Best regards,
${name}`;
    } else if (type === "Reschedule") {
      return `Subject: Re: Interview Scheduling - ${company}

Dear Recruiting Team,

Thank you for the invitation to interview for the position at ${company}. I am very interested in this opportunity.

Unfortunately, I have a schedule conflict at the proposed time. Would it be possible to reschedule for another time? I am generally available next week in the mornings.

Thank you for your flexibility.

Best regards,
${name}`;
    } else if (type === "Accept") {
      return `Subject: Re: Opportunity Update - ${company}

Dear Recruiting Team,

Thank you for the update. I would be happy to proceed with the next steps.

I will review the details and complete any required forms shortly. Please let me know if you need anything else from my side.

Best regards,
${name}`;
    } else {
      return `Subject: Re: Application Update - ${company}

Dear Recruiting Team,

Thank you for reaching out. I wanted to check in on the status of my application for the role at ${company}.

Please let me know if there are any updates or if I can provide any additional details.

Best regards,
${name}`;
    }
  };

  const saveApplicationTasks = async (appId: string, checkedTasks: string[]): Promise<void> => {
    setApplications((prev) => {
      const updated = prev.map((app) => {
        if (app.id === appId) {
          return {
            ...app,
            checkedTasks,
            updatedAt: new Date().toISOString()
          };
        }
        return app;
      });
      const savedTasks = localStorage.getItem("careerpilot_app_tasks") || "{}";
      try {
        const tasksMap = JSON.parse(savedTasks);
        tasksMap[appId] = checkedTasks;
        localStorage.setItem("careerpilot_app_tasks", JSON.stringify(tasksMap));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const sortedApplications = React.useMemo(() => {
    return sortApplications(applications);
  }, [applications]);

  return (
    <AppContext.Provider
      value={{
        applications: sortedApplications,
        activityLogs,
        emails,
        apiKey,
        isProcessing,
        evaluations,
        isEvaluating,
        setApiKey,
        processEmailText,
        addManualApplication,
        deleteApplication,
        updateApplicationStatus,
        toggleStarApplication,
        cleanupOldApplications,
        runSystemEvaluations,
        clearLogs,
        purgeSystemData,
        currentView,
        setView,
        selectedAppId,
        setSelectedAppId,
        userName,
        setUserName,
        userEmail,
        setUserEmail,
        profileManuallySaved,
        setProfileManuallySaved,
        gmailProfileEmail,
        setGmailProfileEmail,
        displayName,
        displayEmail,
        selectedModel,
        setSelectedModel,
        gmailConnected,
        setGmailConnected,
        careerGoal,
        setCareerGoal,
        preferredRoles,
        setPreferredRoles,
        jobSearchStatus,
        setJobSearchStatus,
        gmailProfileName,
        gmailProfileImage,
        gmailLastSync,
        connectGmailAccount,
        disconnectGmailAccount,
        scanGmailWithGemini,
        demoMode,
        enableDemoMode,
        disableDemoMode,
        toast,
        showToast,
        generateDraftReply,
        saveApplicationTasks,
        jwtToken,
        setJwtToken,
        loginUser,
        registerUser,
        logoutUser,
        darkMode,
        toggleDarkMode,
        backendReady
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
